/**
 * Migration: Populate guideDestinations table
 *
 * This migration reads all existing travelGuides and creates
 * corresponding records in the guideDestinations auxiliary table.
 *
 * Run with: npx convex run migrations/migrateDestinations:run
 */

import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { syncDestinationsInternal } from "../guideDestinations";

/**
 * Migrate destinations for a batch of guides
 */
export const migrateBatch = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;

    const result = await ctx.db
      .query("travelGuides")
      .paginate({ numItems: batchSize, cursor: args.cursor ?? null });

    let synced = 0;
    let totalDestinations = 0;

    for (const guide of result.page) {
      if (guide.destinations && guide.destinations.length > 0) {
        const { added } = await syncDestinationsInternal(
          ctx,
          guide._id,
          guide.destinations,
        );
        totalDestinations += added;
        synced++;
      }
    }

    return {
      synced,
      totalDestinations,
      cursor: result.continueCursor,
      isDone: result.isDone,
      processedInBatch: result.page.length,
    };
  },
});

/**
 * Run the full migration (call this repeatedly until isDone)
 */
export const run = mutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const batchSize = 50;

    const result = await ctx.db
      .query("travelGuides")
      .paginate({ numItems: batchSize, cursor: args.cursor ?? null });

    let synced = 0;
    let totalDestinations = 0;

    for (const guide of result.page) {
      if (guide.destinations && guide.destinations.length > 0) {
        const { added } = await syncDestinationsInternal(
          ctx,
          guide._id,
          guide.destinations,
        );
        totalDestinations += added;
        synced++;
      }
    }

    return {
      synced,
      totalDestinations,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
      message: result.isDone
        ? "Migration complete!"
        : `Processed ${synced} guides. Run again with cursor to continue.`,
    };
  },
});

/**
 * Verify migration by comparing counts
 */
export const verify = mutation({
  args: {},
  handler: async (ctx) => {
    // Count guides with destinations
    let guidesWithDestinations = 0;
    let totalDestinationsInGuides = 0;

    const guides = await ctx.db.query("travelGuides").collect();
    for (const guide of guides) {
      if (guide.destinations && guide.destinations.length > 0) {
        guidesWithDestinations++;
        totalDestinationsInGuides += guide.destinations.length;
      }
    }

    // Count records in guideDestinations
    const destinationRecords = await ctx.db
      .query("guideDestinations")
      .collect();

    // Get unique guide IDs in guideDestinations
    const uniqueGuideIds = new Set(destinationRecords.map((d) => d.guideId));

    return {
      guidesWithDestinations,
      totalDestinationsInGuides,
      destinationRecordsCount: destinationRecords.length,
      uniqueGuidesInDestinations: uniqueGuideIds.size,
      isComplete: uniqueGuideIds.size === guidesWithDestinations,
      message:
        uniqueGuideIds.size === guidesWithDestinations
          ? "✓ Migration verified successfully!"
          : `⚠ Mismatch: ${guidesWithDestinations} guides have destinations, but only ${uniqueGuideIds.size} are in guideDestinations table.`,
    };
  },
});

/**
 * Clear all destination records (for re-running migration)
 */
export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("guideDestinations").collect();

    for (const dest of all) {
      await ctx.db.delete(dest._id);
    }

    return { deleted: all.length };
  },
});
