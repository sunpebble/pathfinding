import type { MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import {
  internalMutation,
  internalQuery,
} from './_generated/server';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function checkHandler(
  ctx: QueryCtx,
  { identifier }: { identifier: string },
) {
  const key = `login_fail:${identifier}`;
  const now = Date.now();
  const record = await ctx.db
    .query('rateLimits')
    .withIndex('by_key', q => q.eq('key', key))
    .first();

  if (
    record
    && record.count >= MAX_FAILED_ATTEMPTS
    && record.expiresAt > now
  ) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.expiresAt - now) / 1000),
    };
  }

  return { allowed: true };
}

export const check = internalQuery({
  args: { identifier: v.string() },
  handler: checkHandler,
});

export async function recordFailureHandler(
  ctx: MutationCtx,
  { identifier }: { identifier: string },
) {
  const key = `login_fail:${identifier}`;
  const now = Date.now();
  const record = await ctx.db
    .query('rateLimits')
    .withIndex('by_key', q => q.eq('key', key))
    .first();

  if (record) {
    if (record.expiresAt < now) {
      // Record expired, reset count
      await ctx.db.patch(record._id, {
        count: 1,
        expiresAt: now + LOCKOUT_DURATION_MS,
      });
    }
    else {
      // Valid window, increment count and slide window
      await ctx.db.patch(record._id, {
        count: record.count + 1,
        expiresAt: now + LOCKOUT_DURATION_MS,
      });
    }
  }
  else {
    // New record
    await ctx.db.insert('rateLimits', {
      key,
      count: 1,
      expiresAt: now + LOCKOUT_DURATION_MS,
    });
  }
}

export const recordFailure = internalMutation({
  args: { identifier: v.string() },
  handler: recordFailureHandler,
});

export async function resetHandler(
  ctx: MutationCtx,
  { identifier }: { identifier: string },
) {
  const key = `login_fail:${identifier}`;
  const record = await ctx.db
    .query('rateLimits')
    .withIndex('by_key', q => q.eq('key', key))
    .first();

  if (record) {
    await ctx.db.delete(record._id);
  }
}

export const reset = internalMutation({
  args: { identifier: v.string() },
  handler: resetHandler,
});
