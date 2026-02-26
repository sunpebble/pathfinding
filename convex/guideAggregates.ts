/**
 * Guide Aggregates - O(1) count operations using @convex-dev/aggregate
 *
 * This module provides efficient count and sum operations for travel guides
 * without requiring full table scans.
 */

import type { DataModel, Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { TableAggregate } from "@convex-dev/aggregate";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { query } from "./_generated/server";

// ============================================================================
// Aggregate Definitions
// ============================================================================

/**
 * Total guide count aggregate
 * Uses null key since we only need total count
 */
export const guidesAggregate = new TableAggregate<{
  Key: null;
  DataModel: DataModel;
  TableName: "travelGuides";
}>(components.aggregateGuides, {
  sortKey: () => null,
});

/**
 * Guide count by platform aggregate
 * Groups guides by sourcePlatform for efficient per-platform counts
 */
export const guidesByPlatformAggregate = new TableAggregate<{
  Key: string;
  DataModel: DataModel;
  TableName: "travelGuides";
}>(components.aggregateGuidesByPlatform, {
  sortKey: (doc) => doc.sourcePlatform,
});

// ============================================================================
// Aggregate Update Functions (called from mutations)
// ============================================================================

/**
 * Insert a guide into the aggregates
 */
export async function insertGuideToAggregates(
  ctx: MutationCtx,
  doc: Doc<"travelGuides">,
): Promise<void> {
  await guidesAggregate.insert(ctx, doc);
  await guidesByPlatformAggregate.insert(ctx, doc);
}

/**
 * Delete a guide from the aggregates
 */
export async function deleteGuideFromAggregates(
  ctx: MutationCtx,
  doc: Doc<"travelGuides">,
): Promise<void> {
  await guidesAggregate.delete(ctx, doc);
  await guidesByPlatformAggregate.delete(ctx, doc);
}

/**
 * Update a guide in the aggregates (when platform changes)
 */
export async function replaceGuideInAggregates(
  ctx: MutationCtx,
  oldDoc: Doc<"travelGuides">,
  newDoc: Doc<"travelGuides">,
): Promise<void> {
  await guidesAggregate.replace(ctx, oldDoc, newDoc);
  await guidesByPlatformAggregate.replace(ctx, oldDoc, newDoc);
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get total guide count in O(1) time
 */
export const count = query({
  args: {},
  handler: async (ctx) => {
    return await guidesAggregate.count(ctx);
  },
});

/**
 * Get guide count by platform in O(1) time
 */
export const countByPlatform = query({
  args: {
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    return await guidesByPlatformAggregate.count(ctx, {
      bounds: {
        lower: { key: args.platform, inclusive: true },
        upper: { key: args.platform, inclusive: true },
      },
    });
  },
});

/**
 * Get all platform counts
 */
export const countAllPlatforms = query({
  args: {},
  handler: async (ctx) => {
    const platforms = [
      "xiaohongshu",
      "weibo",
      "ctrip",
      "douyin",
      "tripadvisor",
      "tongcheng",
      "mafengwo",
      "qunar",
      "qyer",
    ] as const;

    const counts: Record<string, number> = {};

    for (const platform of platforms) {
      counts[platform] = await guidesByPlatformAggregate.count(ctx, {
        bounds: {
          lower: { key: platform, inclusive: true },
          upper: { key: platform, inclusive: true },
        },
      });
    }

    return {
      total: await guidesAggregate.count(ctx),
      byPlatform: counts,
    };
  },
});
