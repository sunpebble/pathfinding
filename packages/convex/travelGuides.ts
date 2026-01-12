/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Travel Guides - Crawled Content from Social Platforms
 */

const platformValidator = v.union(
  v.literal('xiaohongshu'),
  v.literal('weibo'),
  v.literal('ctrip'),
  v.literal('douyin'),
  v.literal('tripadvisor')
);

// List travel guides with filters
export const list = query({
  args: {
    platform: v.optional(platformValidator),
    minQuality: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const effectiveLimit = args.limit || 50; // Default limit to prevent memory issues

    // Take limited records before collecting to avoid 16MB limit
    // Note: We fetch more than the limit to allow for quality filtering
    const fetchLimit =
      args.minQuality !== undefined ? effectiveLimit * 3 : effectiveLimit;

    let guides;

    if (args.platform) {
      guides = await ctx.db
        .query('travelGuides')
        .withIndex('by_platform', (q) => q.eq('sourcePlatform', args.platform!))
        .order('desc')
        .take(fetchLimit);
    } else {
      guides = await ctx.db
        .query('travelGuides')
        .order('desc')
        .take(fetchLimit);
    }

    if (args.minQuality !== undefined) {
      guides = guides.filter((g) => g.qualityScore >= args.minQuality!);
    }

    return guides.slice(0, effectiveLimit);
  },
});

// Get a guide by ID
export const getById = query({
  args: { id: v.id('travelGuides') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Search guides by destination or tags
export const search = query({
  args: {
    query: v.string(),
    platform: v.optional(platformValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let guides = await ctx.db.query('travelGuides').collect();

    if (args.platform) {
      guides = guides.filter((g) => g.sourcePlatform === args.platform);
    }

    const searchLower = args.query.toLowerCase();
    guides = guides.filter(
      (g) =>
        g.title?.toLowerCase().includes(searchLower) ||
        g.destinations.some((d) => d.toLowerCase().includes(searchLower)) ||
        g.tags.some((t) => t.toLowerCase().includes(searchLower))
    );

    // Sort by quality score
    guides.sort((a, b) => b.qualityScore - a.qualityScore);

    return args.limit ? guides.slice(0, args.limit) : guides;
  },
});

// Get guides by destination
export const getByDestination = query({
  args: {
    destination: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const guides = await ctx.db.query('travelGuides').collect();

    const destLower = args.destination.toLowerCase();
    const filtered = guides.filter((g) =>
      g.destinations.some((d) => d.toLowerCase().includes(destLower))
    );

    // Sort by quality score
    filtered.sort((a, b) => b.qualityScore - a.qualityScore);

    return args.limit ? filtered.slice(0, args.limit) : filtered;
  },
});

// Create or update a guide (upsert by platform + external ID)
export const upsert = mutation({
  args: {
    sourcePlatform: platformValidator,
    sourceExternalId: v.string(),
    sourceUrl: v.optional(v.string()),
    title: v.optional(v.string()),
    content: v.string(),
    contentHtml: v.optional(v.string()),
    authorName: v.optional(v.string()),
    authorId: v.optional(v.string()),
    destinations: v.array(v.string()),
    tags: v.array(v.string()),
    likesCount: v.optional(v.number()),
    savesCount: v.optional(v.number()),
    commentsCount: v.optional(v.number()),
    viewsCount: v.optional(v.number()),
    coverImageUrl: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    publishedAt: v.optional(v.number()),
    qualityScore: v.optional(v.number()),
    contentHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if guide already exists
    const existing = await ctx.db
      .query('travelGuides')
      .withIndex('by_platform_external', (q) =>
        q
          .eq('sourcePlatform', args.sourcePlatform)
          .eq('sourceExternalId', args.sourceExternalId)
      )
      .first();

    const data = {
      sourcePlatform: args.sourcePlatform,
      sourceExternalId: args.sourceExternalId,
      sourceUrl: args.sourceUrl,
      title: args.title,
      content: args.content,
      contentHtml: args.contentHtml,
      authorName: args.authorName,
      authorId: args.authorId,
      destinations: args.destinations,
      tags: args.tags,
      likesCount: args.likesCount ?? 0,
      savesCount: args.savesCount ?? 0,
      commentsCount: args.commentsCount ?? 0,
      viewsCount: args.viewsCount ?? 0,
      coverImageUrl: args.coverImageUrl,
      imageUrls: args.imageUrls ?? [],
      publishedAt: args.publishedAt,
      crawledAt: Date.now(),
      qualityScore: args.qualityScore ?? 0,
      contentHash: args.contentHash,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      return await ctx.db.insert('travelGuides', data);
    }
  },
});

// Bulk insert guides
export const bulkInsert = mutation({
  args: {
    guides: v.array(
      v.object({
        sourcePlatform: platformValidator,
        sourceExternalId: v.string(),
        sourceUrl: v.optional(v.string()),
        title: v.optional(v.string()),
        content: v.string(),
        contentHtml: v.optional(v.string()),
        authorName: v.optional(v.string()),
        authorId: v.optional(v.string()),
        destinations: v.array(v.string()),
        tags: v.array(v.string()),
        likesCount: v.optional(v.number()),
        savesCount: v.optional(v.number()),
        commentsCount: v.optional(v.number()),
        viewsCount: v.optional(v.number()),
        coverImageUrl: v.optional(v.string()),
        imageUrls: v.optional(v.array(v.string())),
        publishedAt: v.optional(v.number()),
        qualityScore: v.optional(v.number()),
        contentHash: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids: Id<'travelGuides'>[] = [];

    for (const guide of args.guides) {
      const id = await ctx.db.insert('travelGuides', {
        ...guide,
        likesCount: guide.likesCount ?? 0,
        savesCount: guide.savesCount ?? 0,
        commentsCount: guide.commentsCount ?? 0,
        viewsCount: guide.viewsCount ?? 0,
        imageUrls: guide.imageUrls ?? [],
        crawledAt: Date.now(),
        qualityScore: guide.qualityScore ?? 0,
      });
      ids.push(id);
    }

    return ids;
  },
});

// Update quality score
export const updateQualityScore = mutation({
  args: {
    id: v.id('travelGuides'),
    qualityScore: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { qualityScore: args.qualityScore });
  },
});

// Update AI-extracted data
export const updateAiData = mutation({
  args: {
    id: v.id('travelGuides'),
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
            })
          ),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...aiData } = args;
    await ctx.db.patch(id, {
      ...aiData,
      aiProcessedAt: Date.now(),
    });
  },
});

// Delete a guide
export const remove = mutation({
  args: { id: v.id('travelGuides') },
  handler: async (ctx, args) => {
    // Also delete associated recommendations
    const recs = await ctx.db
      .query('guideRecommendations')
      .filter((q) => q.eq(q.field('guideId'), args.id))
      .collect();

    for (const rec of recs) {
      await ctx.db.delete(rec._id);
    }

    await ctx.db.delete(args.id);
  },
});

// Remove duplicate guides (keep the one with longer content or higher quality score)
export const removeDuplicates = mutation({
  args: {},
  handler: async (ctx) => {
    const guides = await ctx.db.query('travelGuides').collect();

    // Group by platform + externalId
    const grouped = new Map<string, typeof guides>();
    for (const guide of guides) {
      const key = `${guide.sourcePlatform}:${guide.sourceExternalId}`;
      const existing = grouped.get(key) || [];
      existing.push(guide);
      grouped.set(key, existing);
    }

    let removedCount = 0;
    for (const [_key, group] of grouped) {
      if (group.length > 1) {
        // Sort by content length (desc), then quality score (desc), then crawledAt (desc)
        group.sort((a, b) => {
          const contentDiff =
            (b.content?.length || 0) - (a.content?.length || 0);
          if (contentDiff !== 0) return contentDiff;

          const qualityDiff = b.qualityScore - a.qualityScore;
          if (qualityDiff !== 0) return qualityDiff;

          return (b.crawledAt || 0) - (a.crawledAt || 0);
        });

        // Keep first (best), delete rest
        for (let i = 1; i < group.length; i++) {
          await ctx.db.delete(group[i]._id);
          removedCount++;
        }
      }
    }

    return {
      removedCount,
      totalBefore: guides.length,
      totalAfter: guides.length - removedCount,
    };
  },
});

// Remove guides with truncated/short content
export const removeShortContent = mutation({
  args: { minLength: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const minLength = args.minLength || 200; // Default minimum content length
    const guides = await ctx.db.query('travelGuides').collect();

    let removedCount = 0;
    for (const guide of guides) {
      if (!guide.content || guide.content.length < minLength) {
        await ctx.db.delete(guide._id);
        removedCount++;
      }
    }

    return { removedCount, minLength };
  },
});

// Clear AI data from guides to allow reprocessing (batch mode)
export const clearAllAiData = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    // Only get guides that have AI data
    const guides = await ctx.db
      .query('travelGuides')
      .filter((q) => q.neq(q.field('aiProcessedAt'), undefined))
      .take(limit);

    let clearedCount = 0;
    for (const guide of guides) {
      await ctx.db.patch(guide._id, {
        aiSummary: undefined,
        aiTips: undefined,
        aiBestTime: undefined,
        aiDuration: undefined,
        aiBudget: undefined,
        aiDays: undefined,
        aiProcessedAt: undefined,
      });
      clearedCount++;
    }

    return { clearedCount, hasMore: guides.length === limit };
  },
});

// Update POI coordinates with manual override
export const updatePoiCoordinates = mutation({
  args: {
    guideId: v.id('travelGuides'),
    dayNumber: v.number(),
    poiIndex: v.number(),
    latitude: v.number(),
    longitude: v.number(),
    verifiedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const guide = await ctx.db.get(args.guideId);
    if (!guide) {
      throw new Error(`Guide not found: ${args.guideId}`);
    }

    if (!guide.aiDays) {
      throw new Error('Guide has no AI-generated itinerary data');
    }

    // Find the day
    const dayIndex = guide.aiDays.findIndex(
      (day) => day.dayNumber === args.dayNumber
    );
    if (dayIndex === -1) {
      throw new Error(`Day ${args.dayNumber} not found in guide`);
    }

    const day = guide.aiDays[dayIndex];
    if (args.poiIndex < 0 || args.poiIndex >= day.pois.length) {
      throw new Error(
        `POI index ${args.poiIndex} out of range (0-${day.pois.length - 1})`
      );
    }

    // Create updated aiDays with the modified POI
    const updatedAiDays = guide.aiDays.map((d, dIdx) => {
      if (dIdx !== dayIndex) return d;
      return {
        ...d,
        pois: d.pois.map((poi, pIdx) => {
          if (pIdx !== args.poiIndex) return poi;
          return {
            ...poi,
            latitude: args.latitude,
            longitude: args.longitude,
            geocodeConfidence: 1.0,
            geocodeSource: 'manual',
            isManuallyVerified: true,
            verifiedAt: Date.now(),
            verifiedBy: args.verifiedBy,
          };
        }),
      };
    });

    // Recalculate geocoding metrics
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

    for (const d of updatedAiDays) {
      for (const poi of d.pois) {
        totalPois++;
        const confidence = poi.geocodeConfidence ?? 0;
        totalConfidence += confidence;
        if (confidence < 0.5) {
          lowConfidenceCount++;
        }
        if (poi.isManuallyVerified) {
          manuallyVerifiedCount++;
        }
        const source = poi.geocodeSource ?? 'unknown';
        if (
          source === 'amap' ||
          source === 'nominatim' ||
          source === 'overpass' ||
          source === 'consensus' ||
          source === 'manual'
        ) {
          sourceDistribution[source] = (sourceDistribution[source] ?? 0) + 1;
        }
      }
    }

    const geocodingMetrics = {
      totalPois,
      averageConfidence: totalPois > 0 ? totalConfidence / totalPois : 0,
      lowConfidenceCount,
      manuallyVerifiedCount,
      sourceDistribution,
      lastUpdated: Date.now(),
    };

    await ctx.db.patch(args.guideId, {
      aiDays: updatedAiDays,
      geocodingMetrics,
    });

    return {
      success: true,
      updatedPoi: {
        dayNumber: args.dayNumber,
        poiIndex: args.poiIndex,
        latitude: args.latitude,
        longitude: args.longitude,
      },
      geocodingMetrics,
    };
  },
});

// Get guides with low confidence geocoding for admin review
export const getGuidesWithLowConfidence = query({
  args: {
    confidenceThreshold: v.optional(v.number()), // Default 0.5
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const threshold = args.confidenceThreshold ?? 0.5;
    const effectiveLimit = args.limit ?? 50;

    // Get all guides with AI data
    const guides = await ctx.db
      .query('travelGuides')
      .filter((q) => q.neq(q.field('aiDays'), undefined))
      .collect();

    // Calculate low confidence POI count for each guide
    const guidesWithStats = guides
      .map((guide) => {
        if (!guide.aiDays) return null;

        let totalPois = 0;
        let lowConfidenceCount = 0;
        let totalConfidence = 0;
        let manuallyVerifiedCount = 0;

        for (const day of guide.aiDays) {
          for (const poi of day.pois) {
            totalPois++;
            const confidence = poi.geocodeConfidence ?? 0;
            totalConfidence += confidence;
            if (confidence < threshold) {
              lowConfidenceCount++;
            }
            if (poi.isManuallyVerified) {
              manuallyVerifiedCount++;
            }
          }
        }

        // Only include guides with low-confidence POIs
        if (lowConfidenceCount === 0) return null;

        return {
          _id: guide._id,
          title: guide.title,
          sourcePlatform: guide.sourcePlatform,
          sourceExternalId: guide.sourceExternalId,
          totalPois,
          lowConfidenceCount,
          averageConfidence: totalPois > 0 ? totalConfidence / totalPois : 0,
          manuallyVerifiedCount,
          unverifiedLowConfidence: lowConfidenceCount - manuallyVerifiedCount,
        };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);

    // Sort by unverified low-confidence count (descending)
    guidesWithStats.sort(
      (a, b) => b.unverifiedLowConfidence - a.unverifiedLowConfidence
    );

    return guidesWithStats.slice(0, effectiveLimit);
  },
});
