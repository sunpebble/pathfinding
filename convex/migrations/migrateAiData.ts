/**
 * Migration: Populate travelGuideAiData table from travelGuides
 *
 * This migration copies AI-processed data from the legacy fields in travelGuides
 * to the new travelGuideAiData table with version management.
 *
 * Run with: npx convex run migrations/migrateAiData:run
 */

import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Migrate AI data for a batch of guides
 */
export const run = mutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 50;

    const result = await ctx.db
      .query("travelGuides")
      .paginate({ numItems: batchSize, cursor: args.cursor ?? null });

    let migrated = 0;
    let skipped = 0;

    for (const guide of result.page) {
      // Skip if no AI data
      if (!guide.aiProcessedAt) {
        skipped++;
        continue;
      }

      // Check if already migrated
      const existing = await ctx.db
        .query("travelGuideAiData")
        .withIndex("by_guide", (q) => q.eq("guideId", guide._id))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      // Migrate AI data
      await ctx.db.insert("travelGuideAiData", {
        guideId: guide._id,
        version: 1,
        aiSummary: guide.aiSummary,
        aiTips: guide.aiTips,
        aiBestTime: guide.aiBestTime,
        aiDuration: guide.aiDuration,
        aiBudget: guide.aiBudget,
        aiDays: guide.aiDays,
        geocodingMetrics: guide.geocodingMetrics,
        processedAt: guide.aiProcessedAt,
        modelVersion: undefined,
      });

      migrated++;
    }

    return {
      migrated,
      skipped,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
      message: result.isDone
        ? `Migration complete! Migrated ${migrated} guides.`
        : `Processed batch: ${migrated} migrated, ${skipped} skipped. Run again with cursor to continue.`,
    };
  },
});

/**
 * Verify migration by comparing counts
 */
export const verify = mutation({
  args: {},
  handler: async (ctx) => {
    // Count guides with AI data in original table
    let guidesWithAiData = 0;
    const guides = await ctx.db.query("travelGuides").collect();
    for (const guide of guides) {
      if (guide.aiProcessedAt) {
        guidesWithAiData++;
      }
    }

    // Count records in travelGuideAiData
    const aiDataRecords = await ctx.db.query("travelGuideAiData").collect();

    // Get unique guide IDs
    const uniqueGuideIds = new Set(aiDataRecords.map((d) => d.guideId));

    return {
      guidesWithAiData,
      aiDataRecordsCount: aiDataRecords.length,
      uniqueGuidesInAiData: uniqueGuideIds.size,
      isComplete: uniqueGuideIds.size === guidesWithAiData,
      message:
        uniqueGuideIds.size === guidesWithAiData
          ? "✓ AI data migration verified successfully!"
          : `⚠ Mismatch: ${guidesWithAiData} guides have AI data, but only ${uniqueGuideIds.size} are in travelGuideAiData table.`,
    };
  },
});

/**
 * Sample verification - check random guides for data consistency
 */
export const verifySample = mutation({
  args: {
    sampleSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sampleSize = args.sampleSize ?? 10;

    // Get guides with AI data
    const guidesWithAi = await ctx.db
      .query("travelGuides")
      .filter((q) => q.neq(q.field("aiProcessedAt"), undefined))
      .take(sampleSize);

    const results: Array<{
      guideId: string;
      title?: string;
      hasAiDataInNewTable: boolean;
      summaryMatches: boolean;
      daysCountMatches: boolean;
    }> = [];

    for (const guide of guidesWithAi) {
      const aiData = await ctx.db
        .query("travelGuideAiData")
        .withIndex("by_guide", (q) => q.eq("guideId", guide._id))
        .first();

      results.push({
        guideId: guide._id,
        title: guide.title?.substring(0, 30),
        hasAiDataInNewTable: !!aiData,
        summaryMatches: guide.aiSummary === aiData?.aiSummary,
        daysCountMatches:
          (guide.aiDays?.length ?? 0) === (aiData?.aiDays?.length ?? 0),
      });
    }

    const allMatch = results.every(
      (r) => r.hasAiDataInNewTable && r.summaryMatches && r.daysCountMatches,
    );

    return {
      sampleSize: results.length,
      results,
      allMatch,
      message: allMatch
        ? "✓ Sample verification passed!"
        : "⚠ Some records do not match. Check results for details.",
    };
  },
});
