/**
 * Migration: Fill missing display fields for iOS App
 *
 * This migration finds guides with missing display fields and fills them with
 * reasonable defaults to ensure iOS App displays correctly.
 *
 * Run with: npx convex run migrations/fillDisplayFields:run
 * Verify:   npx convex run migrations/fillDisplayFields:verify
 */

import { v } from "convex/values";
import { mutation } from "../_generated/server";
import {
  fillMissingDisplayFields,
  validateDisplayFields,
} from "../lib/displayFields";

const BATCH_SIZE = 50;

/**
 * Run migration to fill missing display fields
 */
export const run = mutation({
  args: {
    cursor: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;

    const result = await ctx.db.query("travelGuides").paginate({
      numItems: BATCH_SIZE,
      cursor: args.cursor ? (args.cursor as never) : null,
    });

    let fixed = 0;
    let skipped = 0;
    const fixedIds: string[] = [];

    for (const guide of result.page) {
      // Check if guide needs fixing
      const validation = validateDisplayFields(guide);

      if (validation.isValid) {
        skipped++;
        continue;
      }

      // Fill missing fields
      const filled = fillMissingDisplayFields(guide);

      if (!dryRun) {
        // Update the guide with filled fields
        await ctx.db.patch(guide._id, {
          title: filled.title,
          coverImageUrl: filled.coverImageUrl,
          authorName: filled.authorName,
          destinations: filled.destinations,
          likesCount: filled.likesCount,
          savesCount: filled.savesCount,
          commentsCount: filled.commentsCount,
          viewsCount: filled.viewsCount,
          qualityScore: filled.qualityScore,
        });
      }

      fixedIds.push(guide._id);
      fixed++;
    }

    return {
      dryRun,
      fixed,
      skipped,
      batchSize: result.page.length,
      fixedIds: fixedIds.slice(0, 10), // Limit output
      isDone: result.isDone,
      nextCursor: result.isDone ? undefined : result.continueCursor,
      message: dryRun
        ? `[DRY RUN] Would fix ${fixed} guides, skipped ${skipped}. ${result.isDone ? "Migration complete!" : "Run again with cursor to continue."}`
        : `Fixed ${fixed} guides, skipped ${skipped}. ${result.isDone ? "Migration complete!" : "Run again with cursor to continue."}`,
    };
  },
});

/**
 * Verify migration - check for remaining guides with missing fields
 */
export const verify = mutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db.query("travelGuides").paginate({
      numItems: BATCH_SIZE,
      cursor: args.cursor ? (args.cursor as never) : null,
    });

    let valid = 0;
    let invalid = 0;
    const invalidGuides: Array<{ id: string; missingFields: string[] }> = [];

    for (const guide of result.page) {
      const validation = validateDisplayFields(guide);

      if (validation.isValid) {
        valid++;
      } else {
        invalid++;
        if (invalidGuides.length < 10) {
          invalidGuides.push({
            id: guide._id,
            missingFields: validation.missingFields,
          });
        }
      }
    }

    return {
      valid,
      invalid,
      batchSize: result.page.length,
      invalidGuides,
      isDone: result.isDone,
      nextCursor: result.isDone ? undefined : result.continueCursor,
      message:
        invalid === 0
          ? `✓ All ${valid} guides in this batch have valid display fields.`
          : `⚠ Found ${invalid} guides with missing display fields in this batch.`,
    };
  },
});

/**
 * Get statistics on display field coverage
 */
export const stats = mutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db.query("travelGuides").paginate({
      numItems: BATCH_SIZE,
      cursor: args.cursor ? (args.cursor as never) : null,
    });

    const fieldStats: Record<string, { present: number; missing: number }> = {
      title: { present: 0, missing: 0 },
      coverImageUrl: { present: 0, missing: 0 },
      authorName: { present: 0, missing: 0 },
      destinations: { present: 0, missing: 0 },
      likesCount: { present: 0, missing: 0 },
      savesCount: { present: 0, missing: 0 },
      commentsCount: { present: 0, missing: 0 },
      viewsCount: { present: 0, missing: 0 },
      qualityScore: { present: 0, missing: 0 },
    };

    for (const guide of result.page) {
      // title
      if (guide.title && guide.title.trim() !== "") {
        fieldStats.title.present++;
      } else {
        fieldStats.title.missing++;
      }

      // coverImageUrl
      if (
        guide.coverImageUrl ||
        (guide.imageUrls && guide.imageUrls.length > 0)
      ) {
        fieldStats.coverImageUrl.present++;
      } else {
        fieldStats.coverImageUrl.missing++;
      }

      // authorName
      if (guide.authorName && guide.authorName.trim() !== "") {
        fieldStats.authorName.present++;
      } else {
        fieldStats.authorName.missing++;
      }

      // destinations
      if (guide.destinations) {
        fieldStats.destinations.present++;
      } else {
        fieldStats.destinations.missing++;
      }

      // count fields
      if (guide.likesCount !== undefined && guide.likesCount !== null) {
        fieldStats.likesCount.present++;
      } else {
        fieldStats.likesCount.missing++;
      }

      if (guide.savesCount !== undefined && guide.savesCount !== null) {
        fieldStats.savesCount.present++;
      } else {
        fieldStats.savesCount.missing++;
      }

      if (guide.commentsCount !== undefined && guide.commentsCount !== null) {
        fieldStats.commentsCount.present++;
      } else {
        fieldStats.commentsCount.missing++;
      }

      if (guide.viewsCount !== undefined && guide.viewsCount !== null) {
        fieldStats.viewsCount.present++;
      } else {
        fieldStats.viewsCount.missing++;
      }

      // qualityScore
      if (guide.qualityScore !== undefined && guide.qualityScore !== null) {
        fieldStats.qualityScore.present++;
      } else {
        fieldStats.qualityScore.missing++;
      }
    }

    return {
      batchSize: result.page.length,
      fieldStats,
      isDone: result.isDone,
      nextCursor: result.isDone ? undefined : result.continueCursor,
    };
  },
});
