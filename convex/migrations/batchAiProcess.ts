/**
 * Batch AI Processing Script
 *
 * Processes guides that haven't been AI-enriched yet.
 *
 * Run with: npx convex run migrations/batchAiProcess:run
 * Check status: npx convex run migrations/batchAiProcess:status
 */

import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';

const BATCH_SIZE = 20;

/**
 * Get guides that need AI processing
 */
export const getPending = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? BATCH_SIZE;

    const result = await ctx.db
      .query('travelGuides')
      .paginate({
        numItems: limit * 10, // Fetch more to find pending ones
        cursor: args.cursor ? (args.cursor as never) : null,
      });

    // Filter guides with enrichmentStatus === 'pending'
    const pending = result.page.filter(g => g.enrichmentStatus === 'pending');

    return {
      guides: pending.slice(0, limit).map(g => ({
        _id: g._id,
        title: g.title,
        contentLength: g.content?.length ?? 0,
        destinations: g.destinations,
        sourcePlatform: g.sourcePlatform,
      })),
      totalInBatch: result.page.length,
      pendingInBatch: pending.length,
      isDone: result.isDone,
      nextCursor: result.isDone ? undefined : result.continueCursor,
    };
  },
});

/**
 * Get AI processing status
 */
export const status = query({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query('travelGuides')
      .paginate({
        numItems: 100,
        cursor: args.cursor ? (args.cursor as never) : null,
      });

    let processed = 0;
    let pending = 0;
    let failed = 0;

    for (const guide of result.page) {
      if (guide.aiProcessedAt) {
        processed++;
      }
      else if (guide.enrichmentStatus === 'failed') {
        failed++;
      }
      else {
        pending++;
      }
    }

    return {
      batchSize: result.page.length,
      processed,
      pending,
      failed,
      isDone: result.isDone,
      nextCursor: result.isDone ? undefined : result.continueCursor,
      message: `Batch: ${processed} processed, ${pending} pending, ${failed} failed`,
    };
  },
});

/**
 * Mark guides as pending enrichment (so the poller picks them up)
 */
export const markPending = mutation({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? BATCH_SIZE;

    const result = await ctx.db
      .query('travelGuides')
      .paginate({
        numItems: limit,
        cursor: args.cursor ? (args.cursor as never) : null,
      });

    let marked = 0;
    let skipped = 0;

    for (const guide of result.page) {
      // Skip if already processed or already pending
      if (guide.aiProcessedAt || guide.enrichmentStatus === 'pending') {
        skipped++;
        continue;
      }

      // Mark as pending for the enrichment poller
      await ctx.db.patch(guide._id, {
        enrichmentStatus: 'pending',
      });
      marked++;
    }

    return {
      marked,
      skipped,
      batchSize: result.page.length,
      isDone: result.isDone,
      nextCursor: result.isDone ? undefined : result.continueCursor,
      message: `Marked ${marked} guides as pending, skipped ${skipped}. ${result.isDone ? 'Complete!' : 'Run again with cursor to continue.'}`,
    };
  },
});

/**
 * Reset failed enrichment status so they can be retried
 */
export const resetFailed = mutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query('travelGuides')
      .paginate({
        numItems: BATCH_SIZE,
        cursor: args.cursor ? (args.cursor as never) : null,
      });

    let reset = 0;

    for (const guide of result.page) {
      if (guide.enrichmentStatus === 'failed') {
        await ctx.db.patch(guide._id, {
          enrichmentStatus: 'pending',
          enrichmentError: undefined,
        });
        reset++;
      }
    }

    return {
      reset,
      batchSize: result.page.length,
      isDone: result.isDone,
      nextCursor: result.isDone ? undefined : result.continueCursor,
    };
  },
});

/**
 * Direct AI data update (for testing or manual processing)
 */
export const updateAiData = mutation({
  args: {
    guideId: v.id('travelGuides'),
    aiSummary: v.optional(v.string()),
    aiTips: v.optional(v.array(v.string())),
    aiBestTime: v.optional(v.string()),
    aiDuration: v.optional(v.string()),
    aiBudget: v.optional(v.string()),
    aiDays: v.optional(
      v.array(
        v.object({
          dayNumber: v.number(),
          theme: v.optional(v.string()),
          pois: v.array(
            v.object({
              name: v.string(),
              type: v.string(),
              description: v.optional(v.string()),
              latitude: v.number(),
              longitude: v.number(),
              address: v.optional(v.string()),
              duration: v.optional(v.string()),
              priceInfo: v.optional(v.string()),
              openingHours: v.optional(v.string()),
              tips: v.optional(v.string()),
              rating: v.optional(v.number()),
              highlights: v.optional(v.array(v.string())),
              transportToNext: v.optional(
                v.object({
                  mode: v.optional(v.string()),
                  duration: v.optional(v.string()),
                  distance: v.optional(v.string()),
                  notes: v.optional(v.string()),
                }),
              ),
              geocodeConfidence: v.optional(v.number()),
              geocodeSource: v.optional(v.string()),
            }),
          ),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const { guideId, ...aiData } = args;

    await ctx.db.patch(guideId, {
      ...aiData,
      aiProcessedAt: Date.now(),
      enrichmentStatus: 'completed',
    });

    return { success: true, guideId };
  },
});
