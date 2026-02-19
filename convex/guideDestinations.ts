import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

/**
 * Guide Destinations - Auxiliary table for O(1) destination lookups
 *
 * This module provides indexed access to guides by destination,
 * avoiding full table scans when querying by destination.
 */

// ============================================================================
// Internal Functions (called from travelGuides mutations)
// ============================================================================

/**
 * Sync destinations for a guide - called when guide is created or updated
 * Handles the diff between old and new destinations
 */
export async function syncDestinationsInternal(
  ctx: MutationCtx,
  guideId: Id<"travelGuides">,
  newDestinations: string[],
): Promise<{ added: number; removed: number }> {
  // Get existing destination records for this guide
  const existing = await ctx.db
    .query("guideDestinations")
    .withIndex("by_guide", (q) => q.eq("guideId", guideId))
    .collect();

  const existingSet = new Set(existing.map((d) => d.destination));
  const newSet = new Set(newDestinations.map((d) => normalizeDestination(d)));

  // Find destinations to add and remove
  const toAdd = [...newSet].filter((d) => !existingSet.has(d));
  const toRemove = existing.filter((d) => !newSet.has(d.destination));

  // Remove old destinations
  for (const dest of toRemove) {
    await ctx.db.delete(dest._id);
  }

  // Add new destinations
  const now = Date.now();
  for (const destination of toAdd) {
    await ctx.db.insert("guideDestinations", {
      guideId,
      destination,
      createdAt: now,
    });
  }

  return { added: toAdd.length, removed: toRemove.length };
}

/**
 * Delete all destinations for a guide - called when guide is deleted
 */
export async function deleteDestinationsForGuide(
  ctx: MutationCtx,
  guideId: Id<"travelGuides">,
): Promise<number> {
  const destinations = await ctx.db
    .query("guideDestinations")
    .withIndex("by_guide", (q) => q.eq("guideId", guideId))
    .collect();

  for (const dest of destinations) {
    await ctx.db.delete(dest._id);
  }

  return destinations.length;
}

/**
 * Normalize destination name for consistent indexing
 */
function normalizeDestination(destination: string): string {
  return destination.trim().toLowerCase();
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get guides by destination using index (O(1) lookup)
 */
export const getByDestination = query({
  args: {
    destination: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedDest = normalizeDestination(args.destination);
    const limit = args.limit ?? 50;

    // Use paginate for efficient cursor-based pagination
    const result = await ctx.db
      .query("guideDestinations")
      .withIndex("by_destination", (q) => q.eq("destination", normalizedDest))
      .paginate({ numItems: limit, cursor: args.cursor ?? null });

    // Fetch the actual guides
    const guides = await Promise.all(
      result.page.map(async (destRecord) => {
        const guide = await ctx.db.get(destRecord.guideId);
        return guide;
      }),
    );

    // Filter out any null guides (in case of orphaned records)
    const validGuides = guides.filter(
      (g): g is NonNullable<typeof g> => g !== null,
    );

    return {
      guides: validGuides,
      cursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

/**
 * Get guide IDs by destination (lightweight version)
 */
export const getGuideIdsByDestination = query({
  args: {
    destination: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedDest = normalizeDestination(args.destination);
    const limit = args.limit ?? 100;

    const result = await ctx.db
      .query("guideDestinations")
      .withIndex("by_destination", (q) => q.eq("destination", normalizedDest))
      .paginate({ numItems: limit, cursor: args.cursor ?? null });

    return {
      guideIds: result.page.map((d) => d.guideId),
      cursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

/**
 * Search destinations by prefix (for autocomplete)
 */
export const searchDestinations = query({
  args: {
    prefix: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const normalizedPrefix = normalizeDestination(args.prefix);
    const limit = args.limit ?? 20;

    // Get unique destinations that match the prefix
    // Note: This still requires some iteration, but is bounded by limit

    // Use the destination index to iterate efficiently
    const allDests = await ctx.db
      .query("guideDestinations")
      .withIndex("by_destination")
      .collect();

    // Group by destination and filter by prefix
    const destCounts = new Map<string, number>();
    for (const d of allDests) {
      if (d.destination.startsWith(normalizedPrefix)) {
        destCounts.set(d.destination, (destCounts.get(d.destination) ?? 0) + 1);
      }
    }

    // Sort by count and return top results
    const sorted = [...destCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return sorted.map(([destination, count]) => ({ destination, count }));
  },
});

/**
 * Count guides for a specific destination
 */
export const countByDestination = query({
  args: {
    destination: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedDest = normalizeDestination(args.destination);

    let count = 0;
    const iter = ctx.db
      .query("guideDestinations")
      .withIndex("by_destination", (q) => q.eq("destination", normalizedDest));

    for await (const _ of iter) {
      count++;
    }

    return count;
  },
});

/**
 * Get all unique destinations with counts
 */
export const getAllDestinations = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    const allDests = await ctx.db.query("guideDestinations").collect();

    // Count occurrences
    const destCounts = new Map<string, number>();
    for (const d of allDests) {
      destCounts.set(d.destination, (destCounts.get(d.destination) ?? 0) + 1);
    }

    // Sort by count descending
    return [...destCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([destination, count]) => ({ destination, count }));
  },
});

// ============================================================================
// Mutations (for manual management and migrations)
// ============================================================================

/**
 * Sync destinations for a single guide (exposed as mutation for migrations)
 */
export const syncDestinations = internalMutation({
  args: {
    guideId: v.id("travelGuides"),
    destinations: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await syncDestinationsInternal(ctx, args.guideId, args.destinations);
  },
});

/**
 * Rebuild all guide destinations from travelGuides table
 * Use for initial migration or data repair
 */
export const rebuildAll = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 50;

    const result = await ctx.db
      .query("travelGuides")
      .paginate({ numItems: batchSize, cursor: args.cursor ?? null });

    let synced = 0;
    let totalAdded = 0;

    for (const guide of result.page) {
      const { added } = await syncDestinationsInternal(
        ctx,
        guide._id,
        guide.destinations,
      );
      synced++;
      totalAdded += added;
    }

    return {
      synced,
      totalAdded,
      cursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

/**
 * Clear all destination records (for testing or reset)
 */
export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("guideDestinations").collect();

    for (const dest of all) {
      await ctx.db.delete(dest._id);
    }

    return { deleted: all.length };
  },
});
