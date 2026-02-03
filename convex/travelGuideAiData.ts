/**
 * Travel Guide AI Data - Versioned AI processing results
 *
 * This module manages AI-processed data separately from raw guide data,
 * supporting version control and efficient querying.
 */

import type { Doc, Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';

// ============================================================================
// Validators
// ============================================================================

const poiValidator = v.object({
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
  isManuallyVerified: v.optional(v.boolean()),
  verifiedAt: v.optional(v.number()),
  verifiedBy: v.optional(v.string()),
});

const aiDayValidator = v.object({
  dayNumber: v.number(),
  theme: v.optional(v.string()),
  pois: v.array(poiValidator),
});

const _geocodingMetricsValidator = v.object({
  totalPois: v.number(),
  averageConfidence: v.number(),
  lowConfidenceCount: v.number(),
  manuallyVerifiedCount: v.number(),
  sourceDistribution: v.optional(
    v.object({
      amap: v.optional(v.number()),
      nominatim: v.optional(v.number()),
      overpass: v.optional(v.number()),
      consensus: v.optional(v.number()),
      manual: v.optional(v.number()),
    }),
  ),
  lastUpdated: v.optional(v.number()),
});

// ============================================================================
// Queries
// ============================================================================

/**
 * Get the latest AI data for a guide
 */
export const getLatestAiData = query({
  args: {
    guideId: v.id('travelGuides'),
  },
  handler: async (ctx, args) => {
    // Query by guide, ordered by version descending
    const aiData = await ctx.db
      .query('travelGuideAiData')
      .withIndex('by_guide', q => q.eq('guideId', args.guideId))
      .order('desc')
      .first();

    return aiData;
  },
});

/**
 * Get AI data by specific version
 */
export const getAiDataByVersion = query({
  args: {
    guideId: v.id('travelGuides'),
    version: v.number(),
  },
  handler: async (ctx, args) => {
    const aiData = await ctx.db
      .query('travelGuideAiData')
      .withIndex('by_guide_version', q =>
        q.eq('guideId', args.guideId).eq('version', args.version))
      .first();

    return aiData;
  },
});

/**
 * Get all versions for a guide
 */
export const getAiDataVersions = query({
  args: {
    guideId: v.id('travelGuides'),
  },
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query('travelGuideAiData')
      .withIndex('by_guide', q => q.eq('guideId', args.guideId))
      .order('desc')
      .collect();

    return versions.map(v => ({
      _id: v._id,
      version: v.version,
      processedAt: v.processedAt,
      modelVersion: v.modelVersion,
      hasDays: !!v.aiDays && v.aiDays.length > 0,
      poisCount: v.aiDays?.reduce((sum, day) => sum + day.pois.length, 0) ?? 0,
    }));
  },
});

/**
 * Get guide with its latest AI data (combined query)
 */
export const getGuideWithAiData = query({
  args: {
    guideId: v.id('travelGuides'),
  },
  handler: async (ctx, args) => {
    // Fetch guide and AI data in parallel
    const [guide, aiData] = await Promise.all([
      ctx.db.get(args.guideId),
      ctx.db
        .query('travelGuideAiData')
        .withIndex('by_guide', q => q.eq('guideId', args.guideId))
        .order('desc')
        .first(),
    ]);

    if (!guide) {
      return null;
    }

    return {
      guide,
      aiData,
      hasAiData: !!aiData,
    };
  },
});

/**
 * Get guides with low confidence geocoding
 */
export const getGuidesWithLowConfidence = query({
  args: {
    confidenceThreshold: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const threshold = args.confidenceThreshold ?? 0.5;
    const limit = args.limit ?? 50;

    // Get all AI data with geocoding metrics
    const allAiData = await ctx.db
      .query('travelGuideAiData')
      .order('desc')
      .collect();

    // Filter for low confidence and deduplicate by guideId (keep latest)
    const seenGuides = new Set<string>();
    const lowConfidenceData: Array<{
      _id: Id<'travelGuideAiData'>;
      guideId: Id<'travelGuides'>;
      version: number;
      averageConfidence: number;
      lowConfidenceCount: number;
      totalPois: number;
    }> = [];

    for (const data of allAiData) {
      // Skip if we've already seen this guide (we're ordered desc, so first is latest)
      if (seenGuides.has(data.guideId))
        continue;
      seenGuides.add(data.guideId);

      // Check if has low confidence
      const metrics = data.geocodingMetrics;
      if (metrics && metrics.averageConfidence < threshold) {
        lowConfidenceData.push({
          _id: data._id,
          guideId: data.guideId,
          version: data.version,
          averageConfidence: metrics.averageConfidence,
          lowConfidenceCount: metrics.lowConfidenceCount,
          totalPois: metrics.totalPois,
        });
      }

      if (lowConfidenceData.length >= limit)
        break;
    }

    // Fetch guide titles
    const results = await Promise.all(
      lowConfidenceData.map(async (data) => {
        const guide = await ctx.db.get(data.guideId);
        return {
          ...data,
          title: guide?.title,
          sourcePlatform: guide?.sourcePlatform,
        };
      }),
    );

    return results;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create new AI data version for a guide
 */
export const createAiData = mutation({
  args: {
    guideId: v.id('travelGuides'),
    aiSummary: v.optional(v.string()),
    aiTips: v.optional(v.array(v.string())),
    aiBestTime: v.optional(v.string()),
    aiDuration: v.optional(v.string()),
    aiBudget: v.optional(v.string()),
    aiDays: v.optional(v.array(aiDayValidator)),
    modelVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the latest version for this guide
    const latestVersion = await ctx.db
      .query('travelGuideAiData')
      .withIndex('by_guide', q => q.eq('guideId', args.guideId))
      .order('desc')
      .first();

    const newVersion = (latestVersion?.version ?? 0) + 1;

    // Calculate geocoding metrics if aiDays provided
    let geocodingMetrics: Doc<'travelGuideAiData'>['geocodingMetrics'];
    if (args.aiDays && args.aiDays.length > 0) {
      let totalPois = 0;
      let totalConfidence = 0;
      let lowConfidenceCount = 0;
      let manuallyVerifiedCount = 0;
      const sourceDistribution: {
        amap?: number;
        nominatim?: number;
        overpass?: number;
        consensus?: number;
        manual?: number;
      } = {};

      for (const day of args.aiDays) {
        for (const poi of day.pois) {
          totalPois++;
          const confidence = poi.geocodeConfidence ?? 0;
          totalConfidence += confidence;
          if (confidence < 0.5)
            lowConfidenceCount++;
          if (poi.isManuallyVerified)
            manuallyVerifiedCount++;

          const source = poi.geocodeSource;
          if (source === 'amap' || source === 'nominatim' || source === 'overpass' || source === 'consensus' || source === 'manual') {
            sourceDistribution[source] = (sourceDistribution[source] ?? 0) + 1;
          }
        }
      }

      geocodingMetrics = {
        totalPois,
        averageConfidence: totalPois > 0 ? totalConfidence / totalPois : 0,
        lowConfidenceCount,
        manuallyVerifiedCount,
        sourceDistribution,
        lastUpdated: Date.now(),
      };
    }

    // Insert new AI data record
    const id = await ctx.db.insert('travelGuideAiData', {
      guideId: args.guideId,
      version: newVersion,
      aiSummary: args.aiSummary,
      aiTips: args.aiTips,
      aiBestTime: args.aiBestTime,
      aiDuration: args.aiDuration,
      aiBudget: args.aiBudget,
      aiDays: args.aiDays,
      geocodingMetrics,
      processedAt: Date.now(),
      modelVersion: args.modelVersion,
    });

    // Update the guide's aiProcessedAt timestamp for backward compatibility
    await ctx.db.patch(args.guideId, {
      aiProcessedAt: Date.now(),
    });

    return { id, version: newVersion };
  },
});

/**
 * Update AI data (creates new version)
 * This is the new implementation that writes to travelGuideAiData table
 */
export const updateAiData = mutation({
  args: {
    guideId: v.id('travelGuides'),
    aiSummary: v.optional(v.string()),
    aiTips: v.optional(v.array(v.string())),
    aiBestTime: v.optional(v.string()),
    aiDuration: v.optional(v.string()),
    aiBudget: v.optional(v.string()),
    aiDays: v.optional(v.array(aiDayValidator)),
    modelVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Delegate to createAiData which handles versioning
    const { guideId, ...aiData } = args;

    // Get the latest version
    const latest = await ctx.db
      .query('travelGuideAiData')
      .withIndex('by_guide', q => q.eq('guideId', guideId))
      .order('desc')
      .first();

    const newVersion = (latest?.version ?? 0) + 1;

    // Merge with existing data if partial update
    const mergedData = {
      aiSummary: aiData.aiSummary ?? latest?.aiSummary,
      aiTips: aiData.aiTips ?? latest?.aiTips,
      aiBestTime: aiData.aiBestTime ?? latest?.aiBestTime,
      aiDuration: aiData.aiDuration ?? latest?.aiDuration,
      aiBudget: aiData.aiBudget ?? latest?.aiBudget,
      aiDays: aiData.aiDays ?? latest?.aiDays,
      modelVersion: aiData.modelVersion ?? latest?.modelVersion,
    };

    // Calculate geocoding metrics
    let geocodingMetrics: Doc<'travelGuideAiData'>['geocodingMetrics'];
    if (mergedData.aiDays && mergedData.aiDays.length > 0) {
      let totalPois = 0;
      let totalConfidence = 0;
      let lowConfidenceCount = 0;
      let manuallyVerifiedCount = 0;
      const sourceDistribution: {
        amap?: number;
        nominatim?: number;
        overpass?: number;
        consensus?: number;
        manual?: number;
      } = {};

      for (const day of mergedData.aiDays) {
        for (const poi of day.pois) {
          totalPois++;
          const confidence = poi.geocodeConfidence ?? 0;
          totalConfidence += confidence;
          if (confidence < 0.5)
            lowConfidenceCount++;
          if (poi.isManuallyVerified)
            manuallyVerifiedCount++;

          const source = poi.geocodeSource;
          if (source === 'amap' || source === 'nominatim' || source === 'overpass' || source === 'consensus' || source === 'manual') {
            sourceDistribution[source] = (sourceDistribution[source] ?? 0) + 1;
          }
        }
      }

      geocodingMetrics = {
        totalPois,
        averageConfidence: totalPois > 0 ? totalConfidence / totalPois : 0,
        lowConfidenceCount,
        manuallyVerifiedCount,
        sourceDistribution,
        lastUpdated: Date.now(),
      };
    }

    // Insert new version
    const id = await ctx.db.insert('travelGuideAiData', {
      guideId,
      version: newVersion,
      ...mergedData,
      geocodingMetrics,
      processedAt: Date.now(),
    });

    // Update guide's aiProcessedAt for backward compatibility
    await ctx.db.patch(guideId, {
      aiProcessedAt: Date.now(),
    });

    return { id, version: newVersion };
  },
});

/**
 * Delete all AI data versions for a guide
 */
export const deleteAiDataForGuide = mutation({
  args: {
    guideId: v.id('travelGuides'),
  },
  handler: async (ctx, args) => {
    const allVersions = await ctx.db
      .query('travelGuideAiData')
      .withIndex('by_guide', q => q.eq('guideId', args.guideId))
      .collect();

    for (const version of allVersions) {
      await ctx.db.delete(version._id);
    }

    return { deleted: allVersions.length };
  },
});

/**
 * Delete a specific AI data version
 */
export const deleteAiDataVersion = mutation({
  args: {
    id: v.id('travelGuideAiData'),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ============================================================================
// Migration Helpers (Internal)
// ============================================================================

/**
 * Migrate AI data from travelGuides to travelGuideAiData (batch)
 */
export const migrateFromGuides = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;

    // Get guides with AI data that haven't been migrated
    const result = await ctx.db
      .query('travelGuides')
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
        .query('travelGuideAiData')
        .withIndex('by_guide', q => q.eq('guideId', guide._id))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      // Migrate AI data
      await ctx.db.insert('travelGuideAiData', {
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
      cursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});
