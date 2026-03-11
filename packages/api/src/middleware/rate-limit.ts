import type { Context } from 'hono';
import { getDb, rateLimits } from '@pathfinding/database';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { ApiError } from './error-handler.js';

/**
 * Database-backed rate limiter using the `rate_limits` table.
 *
 * Persists counters across restarts and multiple process instances,
 * making it suitable for production deployments.
 *
 * Falls back to an in-memory Map when the database is unreachable so
 * that a transient DB hiccup doesn't take the API offline.
 */

// ── In-memory fallback ────────────────────────────────────────────
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

// Clean up expired in-memory entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
}, 60_000);

function memoryFallback(key: string, max: number, windowSec: number): { count: number; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { count: 1, remaining: max - 1, resetAt: now + windowSec * 1000 };
  }

  entry.count++;
  return { count: entry.count, remaining: Math.max(0, max - entry.count), resetAt: entry.resetAt };
}

// ── Options ───────────────────────────────────────────────────────

interface RateLimitOptions {
  /** Maximum requests per window */
  max: number;
  /** Window duration in seconds */
  windowSec: number;
  /** Key generator — defaults to IP address */
  keyGenerator?: (c: Context) => string;
}

/**
 * Rate limiting middleware for Hono.
 *
 * Usage:
 *   app.use('/api/auth/*', rateLimit({ max: 10, windowSec: 60 }))
 */
export function rateLimit(options: RateLimitOptions) {
  const { max, windowSec, keyGenerator } = options;

  return createMiddleware(async (c, next) => {
    const key = keyGenerator
      ? keyGenerator(c)
      : c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';

    let count: number;
    let remaining: number;
    let retryAfterSec: number | null = null;

    try {
      const db = getDb();
      const now = new Date();

      // Try to find an existing non-expired entry for this key
      const existing = await db
        .select()
        .from(rateLimits)
        .where(and(eq(rateLimits.key, key), gt(rateLimits.expiresAt, now)))
        .limit(1);

      if (existing.length === 0) {
        // No active window — create a new entry
        const expiresAt = new Date(now.getTime() + windowSec * 1000);
        await db.insert(rateLimits).values({ key, count: 1, expiresAt });
        count = 1;
        remaining = max - 1;
      }
      else {
        const entry = existing[0]!;
        // Atomically increment the counter
        await db
          .update(rateLimits)
          .set({ count: sql`${rateLimits.count} + 1` })
          .where(eq(rateLimits.id, entry.id));
        count = entry.count + 1;
        remaining = Math.max(0, max - count);

        if (count > max) {
          retryAfterSec = Math.ceil((entry.expiresAt.getTime() - now.getTime()) / 1000);
        }
      }

      // Periodically clean up expired entries (1% chance per request)
      if (Math.random() < 0.01) {
        db.delete(rateLimits).where(lt(rateLimits.expiresAt, now)).catch(() => {});
      }
    }
    catch {
      // Database unavailable — fall back to in-memory
      const result = memoryFallback(key, max, windowSec);
      count = result.count;
      remaining = result.remaining;
      if (count > max) {
        retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000);
      }
    }

    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(remaining));

    if (count > max) {
      c.header('Retry-After', String(retryAfterSec ?? windowSec));
      throw new ApiError(429, '请求过于频繁，请稍后再试');
    }

    await next();
  });
}
