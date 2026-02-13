import { v } from 'convex/values';
import { mutation } from './_generated/server';

/**
 * Checks and updates rate limit for a given key.
 *
 * @param key - The unique identifier for the rate limit (e.g., IP address, user ID).
 * @param limit - The maximum number of allowed requests within the window.
 * @param windowMs - The time window in milliseconds.
 * @returns Object indicating success and retry time if failed.
 */
export const check = mutation({
  args: {
    key: v.string(),
    limit: v.number(),
    windowMs: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query('rateLimits')
      .withIndex('by_key', q => q.eq('key', args.key))
      .first();

    if (existing) {
      if (existing.expiresAt > now) {
        if (existing.count >= args.limit) {
          // Rate limit exceeded
          return {
            success: false,
            retryAfter: Math.ceil((existing.expiresAt - now) / 1000),
          };
        }
        // Increment count
        await ctx.db.patch(existing._id, { count: existing.count + 1 });
        return { success: true };
      }
      else {
        // Window expired, reset
        await ctx.db.patch(existing._id, {
          count: 1,
          expiresAt: now + args.windowMs,
        });
        return { success: true };
      }
    }
    else {
      // New record
      await ctx.db.insert('rateLimits', {
        key: args.key,
        count: 1,
        expiresAt: now + args.windowMs,
      });
      return { success: true };
    }
  },
});
