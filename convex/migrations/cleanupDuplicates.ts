/**
 * Migration: Clean up duplicate guides
 *
 * This migration finds and removes duplicate guides (same sourcePlatform + sourceExternalId),
 * keeping the best version based on: AI data presence > content length > quality score > crawl time.
 *
 * Run with: npx convex run migrations/cleanupDuplicates:run
 */

import type { Id } from '../_generated/dataModel';
import { v } from 'convex/values';
import { mutation } from '../_generated/server';
import { deleteGuideFromAggregates } from '../guideAggregates';
import { deleteDestinationsForGuide } from '../guideDestinations';

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
 * Find duplicates for a specific platform
 */
export const findDuplicates = mutation({
  args: {
    platform: platformValidator,
  },
  handler: async (ctx, args) => {
    const guides = await ctx.db
      .query('travelGuides')
      .withIndex('by_platform', q => q.eq('sourcePlatform', args.platform))
      .collect();

    // Group by externalId
    const grouped = new Map<string, typeof guides>();
    for (const guide of guides) {
      const key = guide.sourceExternalId;
      const existing = grouped.get(key) || [];
      existing.push(guide);
      grouped.set(key, existing);
    }

    // Find groups with duplicates
    const duplicates: Array<{
      externalId: string;
      count: number;
      ids: Id<'travelGuides'>[];
    }> = [];

    for (const [externalId, group] of grouped) {
      if (group.length > 1) {
        duplicates.push({
          externalId,
          count: group.length,
          ids: group.map(g => g._id),
        });
      }
    }

    return {
      platform: args.platform,
      totalGuides: guides.length,
      duplicateGroups: duplicates.length,
      duplicates: duplicates.slice(0, 20), // Limit output
    };
  },
});

/**
 * Clean up duplicates for a specific platform
 */
export const cleanPlatform = mutation({
  args: {
    platform: platformValidator,
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;

    const guides = await ctx.db
      .query('travelGuides')
      .withIndex('by_platform', q => q.eq('sourcePlatform', args.platform))
      .collect();

    // Group by externalId
    const grouped = new Map<string, typeof guides>();
    for (const guide of guides) {
      const key = guide.sourceExternalId;
      const existing = grouped.get(key) || [];
      existing.push(guide);
      grouped.set(key, existing);
    }

    let deletedCount = 0;
    const deletedIds: Id<'travelGuides'>[] = [];

    for (const [_externalId, group] of grouped) {
      if (group.length <= 1)
        continue;

      // Sort to find best version
      group.sort((a, b) => {
        // Prefer AI data
        const aiDiff = (b.aiProcessedAt ? 1 : 0) - (a.aiProcessedAt ? 1 : 0);
        if (aiDiff !== 0)
          return aiDiff;

        // Prefer longer content
        const contentDiff = (b.content?.length ?? 0) - (a.content?.length ?? 0);
        if (contentDiff !== 0)
          return contentDiff;

        // Prefer higher quality
        const qualityDiff = b.qualityScore - a.qualityScore;
        if (qualityDiff !== 0)
          return qualityDiff;

        // Prefer newer
        return (b.crawledAt ?? 0) - (a.crawledAt ?? 0);
      });

      // Delete all except the first (best)
      for (let i = 1; i < group.length; i++) {
        const guide = group[i];

        if (!dryRun) {
          // Clean up related data
          await deleteDestinationsForGuide(ctx, guide._id);
          await deleteGuideFromAggregates(ctx, guide);
          await ctx.db.delete(guide._id);
        }

        deletedIds.push(guide._id);
        deletedCount++;
      }
    }

    return {
      platform: args.platform,
      dryRun,
      deletedCount,
      deletedIds: deletedIds.slice(0, 50), // Limit output
      message: dryRun
        ? `[DRY RUN] Would delete ${deletedCount} duplicate guides. Run with dryRun: false to execute.`
        : `Deleted ${deletedCount} duplicate guides.`,
    };
  },
});

/**
 * Run cleanup for all platforms
 */
export const run = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;

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

    const results: Record<string, number> = {};
    let totalDeleted = 0;

    for (const platform of platforms) {
      const guides = await ctx.db
        .query('travelGuides')
        .withIndex('by_platform', q => q.eq('sourcePlatform', platform))
        .collect();

      // Group by externalId
      const grouped = new Map<string, typeof guides>();
      for (const guide of guides) {
        const key = guide.sourceExternalId;
        const existing = grouped.get(key) || [];
        existing.push(guide);
        grouped.set(key, existing);
      }

      let deletedCount = 0;

      for (const [_externalId, group] of grouped) {
        if (group.length <= 1)
          continue;

        // Sort to find best version
        group.sort((a, b) => {
          const aiDiff = (b.aiProcessedAt ? 1 : 0) - (a.aiProcessedAt ? 1 : 0);
          if (aiDiff !== 0)
            return aiDiff;
          const contentDiff = (b.content?.length ?? 0) - (a.content?.length ?? 0);
          if (contentDiff !== 0)
            return contentDiff;
          const qualityDiff = b.qualityScore - a.qualityScore;
          if (qualityDiff !== 0)
            return qualityDiff;
          return (b.crawledAt ?? 0) - (a.crawledAt ?? 0);
        });

        // Delete duplicates
        for (let i = 1; i < group.length; i++) {
          const guide = group[i];

          if (!dryRun) {
            await deleteDestinationsForGuide(ctx, guide._id);
            await deleteGuideFromAggregates(ctx, guide);
            await ctx.db.delete(guide._id);
          }

          deletedCount++;
        }
      }

      results[platform] = deletedCount;
      totalDeleted += deletedCount;
    }

    return {
      dryRun,
      totalDeleted,
      byPlatform: results,
      message: dryRun
        ? `[DRY RUN] Would delete ${totalDeleted} duplicate guides across all platforms.`
        : `Deleted ${totalDeleted} duplicate guides across all platforms.`,
    };
  },
});

/**
 * Verify no duplicates remain
 */
export const verify = mutation({
  args: {},
  handler: async (ctx) => {
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

    const duplicatesByPlatform: Record<string, number> = {};
    let totalDuplicates = 0;

    for (const platform of platforms) {
      const guides = await ctx.db
        .query('travelGuides')
        .withIndex('by_platform', q => q.eq('sourcePlatform', platform))
        .collect();

      const externalIds = new Set<string>();
      let duplicates = 0;

      for (const guide of guides) {
        if (externalIds.has(guide.sourceExternalId)) {
          duplicates++;
        }
        else {
          externalIds.add(guide.sourceExternalId);
        }
      }

      duplicatesByPlatform[platform] = duplicates;
      totalDuplicates += duplicates;
    }

    return {
      totalDuplicates,
      byPlatform: duplicatesByPlatform,
      isClean: totalDuplicates === 0,
      message:
        totalDuplicates === 0
          ? '✓ No duplicates found! Database is clean.'
          : `⚠ Found ${totalDuplicates} duplicate records remaining.`,
    };
  },
});
