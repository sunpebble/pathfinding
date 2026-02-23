/**
 * Migration: Clean up duplicate guides
 *
 * This migration finds and removes duplicate guides (same sourcePlatform + sourceExternalId),
 * keeping the best version based on: AI data presence > content length > quality score > crawl time.
 *
 * Run with: npx convex run migrations/cleanupDuplicates:run '{"platform": "xiaohongshu"}'
 * Continue: npx convex run migrations/cleanupDuplicates:run '{"platform": "xiaohongshu", "cursor": "..."}'
 */

import type { Doc, Id } from '../_generated/dataModel';
import { v } from 'convex/values';
import { mutation } from '../_generated/server';
import { deleteGuideFromAggregates } from '../guideAggregates';
import { deleteDestinationsForGuide } from '../guideDestinations';

// Very small batch to avoid 16MB limit on large platforms
const BATCH_SIZE = 20;

const platforms = [
  'xiaohongshu',
  'weibo',
  'ctrip',
  'douyin',
  'tripadvisor',
  'tongcheng',
  'mafengwo',
  'qunar',
  'qyer',
] as const;

type Platform = (typeof platforms)[number];

const platformValidator = v.union(
  v.literal('xiaohongshu'),
  v.literal('weibo'),
  v.literal('ctrip'),
  v.literal('douyin'),
  v.literal('tripadvisor'),
  v.literal('tongcheng'),
  v.literal('mafengwo'),
  v.literal('qunar'),
  v.literal('qyer'),
);

/**
 * Score a guide for quality comparison (higher is better)
 * Only uses fields that are always present to minimize data reads
 */
function scoreGuide(
  guide: Pick<
    Doc<'travelGuides'>,
    '_id' | '_creationTime' | 'aiProcessedAt' | 'qualityScore' | 'crawledAt'
  >,
): number {
  let score = 0;
  // AI processed data is most valuable
  if (guide.aiProcessedAt)
    score += 10000;
  // Quality score
  score += guide.qualityScore * 10;
  // Newer is better
  score += (guide.crawledAt ?? 0) / 1000000000;
  // Tie-breaker: creation time
  score += guide._creationTime / 10000000000000;
  return score;
}

/**
 * Find duplicates for a specific platform (paginated)
 * Uses .take(2) to efficiently detect duplicates without loading all data
 */
export const findDuplicates = mutation({
  args: {
    platform: platformValidator,
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query('travelGuides')
      .withIndex('by_platform', q => q.eq('sourcePlatform', args.platform));

    const paginatedResult = await query.paginate({
      numItems: BATCH_SIZE,
      cursor: args.cursor ? (args.cursor as never) : null,
    });

    // For each guide in this batch, check if duplicates exist
    const duplicates: Array<{
      externalId: string;
      count: number;
    }> = [];

    const checkedIds = new Set<string>();

    for (const guide of paginatedResult.page) {
      if (checkedIds.has(guide.sourceExternalId))
        continue;
      checkedIds.add(guide.sourceExternalId);

      // Use take(2) to check if more than 1 exists - much more efficient
      const sameExternalId = await ctx.db
        .query('travelGuides')
        .withIndex('by_platform_external', q =>
          q
            .eq('sourcePlatform', args.platform)
            .eq('sourceExternalId', guide.sourceExternalId))
        .take(2);

      if (sameExternalId.length > 1) {
        duplicates.push({
          externalId: guide.sourceExternalId,
          count: sameExternalId.length,
        });
      }
    }

    return {
      platform: args.platform,
      batchSize: paginatedResult.page.length,
      duplicateGroups: duplicates.length,
      duplicates: duplicates.slice(0, 20),
      isDone: paginatedResult.isDone,
      nextCursor: paginatedResult.isDone
        ? undefined
        : paginatedResult.continueCursor,
    };
  },
});

/**
 * Clean up duplicates for a specific platform (paginated)
 * Uses efficient queries to minimize data reads
 */
export const cleanPlatform = mutation({
  args: {
    platform: platformValidator,
    cursor: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;

    const query = ctx.db
      .query('travelGuides')
      .withIndex('by_platform', q => q.eq('sourcePlatform', args.platform));

    const paginatedResult = await query.paginate({
      numItems: BATCH_SIZE,
      cursor: args.cursor ? (args.cursor as never) : null,
    });

    let deletedCount = 0;
    const deletedIds: Id<'travelGuides'>[] = [];
    const processedExternalIds = new Set<string>();

    for (const guide of paginatedResult.page) {
      if (processedExternalIds.has(guide.sourceExternalId))
        continue;
      processedExternalIds.add(guide.sourceExternalId);

      // First check if duplicates exist with take(2)
      const checkDup = await ctx.db
        .query('travelGuides')
        .withIndex('by_platform_external', q =>
          q
            .eq('sourcePlatform', args.platform)
            .eq('sourceExternalId', guide.sourceExternalId))
        .take(2);

      if (checkDup.length <= 1)
        continue;

      // Only if duplicates exist, fetch all to determine which to keep
      const group = await ctx.db
        .query('travelGuides')
        .withIndex('by_platform_external', q =>
          q
            .eq('sourcePlatform', args.platform)
            .eq('sourceExternalId', guide.sourceExternalId))
        .collect();

      // Sort by score (highest first)
      group.sort((a, b) => scoreGuide(b) - scoreGuide(a));

      // Delete all except the first (best)
      for (let i = 1; i < group.length; i++) {
        const dupGuide = group[i];

        if (!dryRun) {
          await deleteDestinationsForGuide(ctx, dupGuide._id);
          await deleteGuideFromAggregates(ctx, dupGuide);
          await ctx.db.delete(dupGuide._id);
        }

        deletedIds.push(dupGuide._id);
        deletedCount++;
      }
    }

    return {
      platform: args.platform,
      dryRun,
      deletedCount,
      deletedIds: deletedIds.slice(0, 50),
      isDone: paginatedResult.isDone,
      nextCursor: paginatedResult.isDone
        ? undefined
        : paginatedResult.continueCursor,
      message: dryRun
        ? `[DRY RUN] Would delete ${deletedCount} duplicates in this batch.`
        : `Deleted ${deletedCount} duplicates in this batch.`,
    };
  },
});

/**
 * Run cleanup for a single platform (paginated)
 * Call repeatedly with cursor until isDone is true, then move to next platform
 */
export const run = mutation({
  args: {
    platform: platformValidator,
    cursor: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;

    const query = ctx.db
      .query('travelGuides')
      .withIndex('by_platform', q => q.eq('sourcePlatform', args.platform));

    const paginatedResult = await query.paginate({
      numItems: BATCH_SIZE,
      cursor: args.cursor ? (args.cursor as never) : null,
    });

    let deletedCount = 0;
    const processedExternalIds = new Set<string>();

    for (const guide of paginatedResult.page) {
      if (processedExternalIds.has(guide.sourceExternalId))
        continue;
      processedExternalIds.add(guide.sourceExternalId);

      // First check if duplicates exist with take(2)
      const checkDup = await ctx.db
        .query('travelGuides')
        .withIndex('by_platform_external', q =>
          q
            .eq('sourcePlatform', args.platform)
            .eq('sourceExternalId', guide.sourceExternalId))
        .take(2);

      if (checkDup.length <= 1)
        continue;

      // Only if duplicates exist, fetch all to determine which to keep
      const group = await ctx.db
        .query('travelGuides')
        .withIndex('by_platform_external', q =>
          q
            .eq('sourcePlatform', args.platform)
            .eq('sourceExternalId', guide.sourceExternalId))
        .collect();

      // Sort by score (highest first)
      group.sort((a, b) => scoreGuide(b) - scoreGuide(a));

      // Delete all except the first (best)
      for (let i = 1; i < group.length; i++) {
        const dupGuide = group[i];

        if (!dryRun) {
          await deleteDestinationsForGuide(ctx, dupGuide._id);
          await deleteGuideFromAggregates(ctx, dupGuide);
          await ctx.db.delete(dupGuide._id);
        }

        deletedCount++;
      }
    }

    // Get next platform if this one is done
    const currentIndex = platforms.indexOf(args.platform as Platform);
    const nextPlatform
      = paginatedResult.isDone && currentIndex < platforms.length - 1
        ? platforms[currentIndex + 1]
        : undefined;

    return {
      platform: args.platform,
      dryRun,
      deletedCount,
      batchSize: paginatedResult.page.length,
      isDone: paginatedResult.isDone && !nextPlatform,
      nextCursor: paginatedResult.isDone
        ? undefined
        : paginatedResult.continueCursor,
      nextPlatform,
      message: dryRun
        ? `[DRY RUN] Would delete ${deletedCount} duplicates. ${paginatedResult.isDone ? (nextPlatform ? `Platform done, next: ${nextPlatform}` : 'All platforms done!') : 'Run again with cursor to continue.'}`
        : `Deleted ${deletedCount} duplicates. ${paginatedResult.isDone ? (nextPlatform ? `Platform done, next: ${nextPlatform}` : 'All platforms done!') : 'Run again with cursor to continue.'}`,
    };
  },
});

/**
 * Verify no duplicates remain (paginated per platform)
 * Uses take(2) for efficient duplicate detection
 */
export const verify = mutation({
  args: {
    platform: v.optional(platformValidator),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const platform = args.platform ?? platforms[0];

    const query = ctx.db
      .query('travelGuides')
      .withIndex('by_platform', q => q.eq('sourcePlatform', platform));

    const paginatedResult = await query.paginate({
      numItems: BATCH_SIZE,
      cursor: args.cursor ? (args.cursor as never) : null,
    });

    let duplicatesFound = 0;
    const checkedIds = new Set<string>();

    for (const guide of paginatedResult.page) {
      if (checkedIds.has(guide.sourceExternalId))
        continue;
      checkedIds.add(guide.sourceExternalId);

      // Use take(2) for efficient check
      const sameExternalId = await ctx.db
        .query('travelGuides')
        .withIndex('by_platform_external', q =>
          q
            .eq('sourcePlatform', platform)
            .eq('sourceExternalId', guide.sourceExternalId))
        .take(2);

      if (sameExternalId.length > 1) {
        duplicatesFound++;
      }
    }

    // Get next platform if this one is done
    const currentIndex = platforms.indexOf(platform as Platform);
    const nextPlatform
      = paginatedResult.isDone && currentIndex < platforms.length - 1
        ? platforms[currentIndex + 1]
        : undefined;

    return {
      platform,
      duplicatesFound,
      batchSize: paginatedResult.page.length,
      isDone: paginatedResult.isDone && !nextPlatform,
      nextCursor: paginatedResult.isDone
        ? undefined
        : paginatedResult.continueCursor,
      nextPlatform,
      message:
        duplicatesFound === 0
          ? `✓ No duplicates found in this batch for ${platform}.`
          : `⚠ Found ${duplicatesFound} duplicate groups in this batch for ${platform}.`,
    };
  },
});
