import type { Database } from '@pathfinding/database';
/**
 * Database-backed rate limiter using the `rate_limits` table.
 *
 * Persists counters across restarts and multiple process instances,
 * making it suitable for production deployments.
 *
 * Falls back to an in-memory Map when the database is unreachable so
 * that a transient DB hiccup doesn't take the API offline.
 *
 * @example
 * ```ts
 * app.use('/api/auth/*', rateLimit({ max: 10, windowSec: 60 }))
 * ```
 */
import type { Context, MiddlewareHandler } from 'hono';
import { rateLimits } from '@pathfinding/database';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { ApiError } from './error-handler.js';

// ── In-memory fallback ────────────────────────────────────────────

/** Entry stored in the in-memory fallback Map. */
interface RateLimitEntry {
  /** Current request count in the window. */
  count: number;
  /** Timestamp (ms) when the current window expires. */
  resetAt: number;
}

/** Result returned from both the DB and memory fallback paths. */
interface RateLimitResult {
  /** Total request count in the current window. */
  count: number;
  /** Remaining requests before the limit is reached. */
  remaining: number;
  /** Timestamp (ms) when the current window expires. */
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();
let lastSweep = 0;

// Lazy, throttled cleanup of expired in-memory entries.
// (No top-level setInterval — Workers forbid timers/I/O in global scope.
// Sweep at most every 60 s, driven by traffic.)
function sweepExpired(now: number): void {
  if (now - lastSweep < 60_000)
    return;
  lastSweep = now;
  for (const [key, entry] of memoryStore) {
    if (entry.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Check and increment the rate limit counter using the in-memory store.
 * Used as a fallback when the database is unreachable.
 */
function memoryFallback(key: string, max: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  sweepExpired(now);
  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowSec * 1000;
    memoryStore.set(key, { count: 1, resetAt });
    return { count: 1, remaining: max - 1, resetAt };
  }

  entry.count++;
  return {
    count: entry.count,
    remaining: Math.max(0, max - entry.count),
    resetAt: entry.resetAt,
  };
}

// ── Options ───────────────────────────────────────────────────────

/** Configuration for the rate limiting middleware. */
interface RateLimitOptions {
  /** Maximum number of requests allowed per window. */
  max: number;
  /** Window duration in seconds. */
  windowSec: number;
  /**
   * Custom key generator for identifying clients.
   * Defaults to the `X-Forwarded-For` or `X-Real-IP` header.
   */
  keyGenerator?: (c: Context) => string;
  /**
   * When `true`, skip the database and use the in-memory store only.
   * Useful for lightweight global rate limits that don't need persistence.
   */
  memoryOnly?: boolean;
}

// ── Middleware ─────────────────────────────────────────────────────

/**
 * Create a rate limiting middleware for Hono.
 *
 * Sets standard `X-RateLimit-Limit` and `X-RateLimit-Remaining` response
 * headers. When the limit is exceeded, responds with `429 Too Many Requests`
 * and a `Retry-After` header.
 *
 * @param options - Rate limit configuration
 * @returns Hono middleware handler
 */
export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const { max, windowSec, keyGenerator, memoryOnly } = options;

  return createMiddleware<{ Variables: { db: Database } }>(async (c, next) => {
    const key = keyGenerator
      ? keyGenerator(c)
      : c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';

    let count: number;
    let remaining: number;
    let retryAfterSec: number | null = null;

    if (memoryOnly) {
      // Fast path — skip database entirely
      const result = memoryFallback(key, max, windowSec);
      count = result.count;
      remaining = result.remaining;
      if (count > max) {
        retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000);
      }
    }
    else {
      try {
        const db = c.get('db');
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
          db.delete(rateLimits).where(lt(rateLimits.expiresAt, now)).catch((cleanupErr) => {
            // Log cleanup failures but don't block the request
            // This is a best-effort background operation
            if (typeof console !== 'undefined') {
              console.warn('Rate limit cleanup failed:', cleanupErr instanceof Error ? cleanupErr.message : cleanupErr);
            }
          });
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
    }

    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(remaining));

    if (count > max) {
      c.header('Retry-After', String(retryAfterSec ?? windowSec));
      throw new ApiError(429, 'Too many requests, please try again later');
    }

    await next();
  });
}
