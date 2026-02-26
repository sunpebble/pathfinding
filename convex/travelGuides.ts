import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import {
  deleteGuideFromAggregates,
  insertGuideToAggregates,
  replaceGuideInAggregates,
} from './guideAggregates';
import {
  deleteDestinationsForGuide,
  syncDestinationsInternal,
} from './guideDestinations';
import {
  ensureDisplayFields,
  fillMissingDisplayFields,
} from './lib/displayFields';

/**
 * Travel Guides - Crawled Content from Social Platforms
 */

// Truncation patterns for detecting incomplete content
const TRUNCATION_PATTERNS = [
  /\.{3}$/,
  /…$/,
  /\[查看更多\]$/,
  /\[展开全文\]$/,
  /\[阅读全文\]$/,
  /查看更多$/,
  /展开全文$/,
];

function isContentTruncated(content: string): boolean {
  return TRUNCATION_PATTERNS.some(pattern => pattern.test(content));
}

// Completeness level calculation
const MIN_CONTENT_LENGTH = 200;
const MIN_CONTENT_LENGTH_COMPLETE = 500;

function calculateCompletenessLevel(input: {
  title?: string;
  content?: string;
  coverImageUrl?: string;
  imageUrls?: string[];
  authorName?: string;
  destinations?: string[];
  contentTruncated?: boolean;
  likesCount?: number;
  savesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  qualityScore?: number;
}): 'complete' | 'usable' | 'incomplete' {
  const {
    title,
    content,
    coverImageUrl,
    imageUrls,
    authorName,
    destinations,
    contentTruncated,
    likesCount,
    savesCount,
    commentsCount,
    viewsCount,
    qualityScore,
  } = input;

  const isTruncated
    = contentTruncated || (content ? isContentTruncated(content) : false);
  const hasImages = !!(coverImageUrl || (imageUrls && imageUrls.length > 0));
  const hasTitle = !!(title && title.trim().length > 0);
  const hasAuthor = !!(authorName && authorName.trim().length > 0);
  const hasDestinations = !!(destinations && destinations.length > 0);
  const contentLength = content?.length ?? 0;

  const hasAllCounts
    = likesCount !== undefined
      && likesCount !== null
      && savesCount !== undefined
      && savesCount !== null
      && commentsCount !== undefined
      && commentsCount !== null
      && viewsCount !== undefined
      && viewsCount !== null;

  const hasQualityScore = qualityScore !== undefined && qualityScore !== null;

  if (
    hasTitle
    && hasImages
    && hasAuthor
    && hasDestinations
    && hasAllCounts
    && hasQualityScore
    && contentLength >= MIN_CONTENT_LENGTH_COMPLETE
    && !isTruncated
  ) {
    return 'complete';
  }

  if (hasTitle && contentLength >= MIN_CONTENT_LENGTH && hasImages) {
    return 'usable';
  }

  return 'incomplete';
}

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

const completenessLevelValidator = v.union(
  v.literal('complete'),
  v.literal('usable'),
  v.literal('incomplete'),
);

// List travel guides with filters (with display fields guaranteed)
export const list = query({
  args: {
    platform: v.optional(platformValidator),
    minQuality: v.optional(v.number()),
    completenessLevel: v.optional(completenessLevelValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const effectiveLimit = args.limit || 50; // Default limit to prevent memory issues

    // Take limited records before collecting to avoid 16MB limit
    // Note: We fetch more than the limit to allow for quality filtering
    const fetchLimit
      = args.minQuality !== undefined || args.completenessLevel !== undefined
        ? effectiveLimit * 3
        : effectiveLimit;

    let guides;

    // Use completeness index if specified
    if (args.completenessLevel) {
      guides = await ctx.db
        .query('travelGuides')
        .withIndex('by_completeness', q =>
          q.eq('completenessLevel', args.completenessLevel!))
        .order('desc')
        .take(fetchLimit);

      // Additional platform filter if needed
      if (args.platform) {
        guides = guides.filter(g => g.sourcePlatform === args.platform);
      }
    }
    else if (args.platform) {
      guides = await ctx.db
        .query('travelGuides')
        .withIndex('by_platform', q => q.eq('sourcePlatform', args.platform!))
        .order('desc')
        .take(fetchLimit);
    }
    else {
      guides = await ctx.db
        .query('travelGuides')
        .order('desc')
        .take(fetchLimit);
    }

    if (args.minQuality !== undefined) {
      guides = guides.filter(g => g.qualityScore >= args.minQuality!);
    }

    // Apply display field guarantee to all returned guides
    return guides.slice(0, effectiveLimit).map(ensureDisplayFields);
  },
});

// List guide IDs with pagination (lightweight - for bulk operations)
export const listIds = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    const result = await ctx.db
      .query('travelGuides')
      .order('desc')
      .paginate({ numItems: limit, cursor: args.cursor ?? null });

    // Return only essential fields to avoid 16MB limit
    const items = result.page.map(g => ({
      _id: g._id,
      sourceExternalId: g.sourceExternalId,
      sourcePlatform: g.sourcePlatform,
      title: g.title,
      contentLength: g.content?.length || 0,
      qualityScore: g.qualityScore,
      aiProcessedAt: g.aiProcessedAt,
    }));

    return {
      items,
      cursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

// Count total guides
export const count = query({
  args: {},
  handler: async (ctx) => {
    // Use index to count efficiently - iterate without loading full documents
    let count = 0;
    const iter = ctx.db.query('travelGuides').order('desc');
    for await (const _ of iter) {
      count++;
    }
    return count;
  },
});

// Get a guide by platform and external ID
export const getByPlatformAndExternalId = query({
  args: {
    sourcePlatform: platformValidator,
    sourceExternalId: v.string(),
  },
  handler: async (ctx, args) => {
    const guide = await ctx.db
      .query('travelGuides')
      .withIndex('by_platform_external', q =>
        q
          .eq('sourcePlatform', args.sourcePlatform)
          .eq('sourceExternalId', args.sourceExternalId))
      .first();
    if (!guide)
      return null;
    return ensureDisplayFields(guide);
  },
});

// Get a guide by ID (with display fields guaranteed)
export const getById = query({
  args: { id: v.id('travelGuides') },
  handler: async (ctx, args) => {
    const guide = await ctx.db.get(args.id);
    if (!guide)
      return null;
    return ensureDisplayFields(guide);
  },
});

// Update a guide by ID (for content cleaning and updates)
export const update = mutation({
  args: {
    id: v.id('travelGuides'),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    aiSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    // Filter out undefined values
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(id, cleanUpdates);
    }
    return await ctx.db.get(id);
  },
});

// Search travel guides with filters (with display fields guaranteed)
export const search = query({
  args: {
    query: v.optional(v.string()),
    destination: v.optional(v.string()),
    hasAiData: v.optional(v.boolean()),
    daysAgo: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const effectiveLimit = args.limit || 50;
    let guides;

    // If query is provided, use search index
    if (args.query && args.query.trim().length > 0) {
      guides = await ctx.db
        .query('travelGuides')
        .withSearchIndex('search_title', q => q.search('title', args.query!))
        .take(effectiveLimit * 2);
    }
    else {
      guides = await ctx.db
        .query('travelGuides')
        .order('desc')
        .take(effectiveLimit * 2);
    }

    // Apply filters
    if (args.destination) {
      guides = guides.filter(g =>
        g.destinations.some(d =>
          d.toLowerCase().includes(args.destination!.toLowerCase()),
        ),
      );
    }

    if (args.hasAiData) {
      guides = guides.filter(g => g.aiProcessedAt !== undefined);
    }

    if (args.daysAgo) {
      const cutoffTime = Date.now() - args.daysAgo * 24 * 60 * 60 * 1000;
      guides = guides.filter(g => g.crawledAt >= cutoffTime);
    }

    // Apply display field guarantee to all returned guides
    return guides.slice(0, effectiveLimit).map(ensureDisplayFields);
  },
});

// Get destinations from a batch of guides (paginated, lightweight)
// Returns only destinations array to minimize data transfer
export const listDestinationsBatch = query({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Use smaller batch size to stay well under 16MB limit
    const batchSize = args.batchSize || 50;

    const result = await ctx.db
      .query('travelGuides')
      .order('desc')
      .paginate({ numItems: batchSize, cursor: args.cursor ?? null });

    // Return only the destinations arrays (minimal data)
    const destinations = result.page.flatMap(g => g.destinations);

    return {
      destinations,
      cursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

// Get popular destinations - now just aggregates pre-fetched data
// This is called from HTTP action after it has collected all destinations
export const getPopularDestinations = query({
  args: {
    limit: v.optional(v.number()),
    destinations: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    // If destinations are provided, aggregate them (called from HTTP action)
    if (args.destinations && args.destinations.length > 0) {
      const destCounts: Record<string, number> = {};
      for (const dest of args.destinations) {
        destCounts[dest] = (destCounts[dest] || 0) + 1;
      }

      return Object.entries(destCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }));
    }

    // Fallback: fetch a small sample if called directly (for backward compatibility)
    // Use small limit to avoid 16MB error
    const guides = await ctx.db.query('travelGuides').order('desc').take(20);

    const destCounts: Record<string, number> = {};
    for (const guide of guides) {
      for (const dest of guide.destinations) {
        destCounts[dest] = (destCounts[dest] || 0) + 1;
      }
    }

    return Object.entries(destCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  },
});

// Get guides by destination
export const getByDestination = query({
  args: {
    destination: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const destLower = args.destination.toLowerCase();
    const limit = args.limit || 50;

    // Optimization: Scan guideDestinations (lightweight) instead of travelGuides (heavy)
    // guideDestinations contains normalized destinations.
    // If exact match was needed, we could use the index:
    // .withIndex('by_destination', q => q.eq('destination', destLower))
    // Since we need substring match, we scan the lightweight table.
    const guideDestinations = await ctx.db.query('guideDestinations').collect();

    const matchedGuideIds = new Set<Id<'travelGuides'>>();
    for (const gd of guideDestinations) {
      if (gd.destination.includes(destLower)) {
        matchedGuideIds.add(gd.guideId);
      }
    }

    // Fetch only the matching guides
    // This reduces memory usage and IO by avoiding loading full content for non-matching guides
    const guides = await Promise.all(
      Array.from(matchedGuideIds).map(id => ctx.db.get(id)),
    );

    const validGuides = guides.filter(
      (g): g is NonNullable<typeof g> => g !== null,
    );

    // Sort by quality score
    validGuides.sort((a, b) => b.qualityScore - a.qualityScore);

    // Apply limit and ensure display fields (consistency fix)
    return validGuides.slice(0, limit).map(ensureDisplayFields);
  },
});

// Create or update a guide (upsert by platform + external ID)
// Integrates with guideDestinations sync and Aggregates count updates
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
    // Check if guide already exists using the unique index
    const existing = await ctx.db
      .query('travelGuides')
      .withIndex('by_platform_external', q =>
        q
          .eq('sourcePlatform', args.sourcePlatform)
          .eq('sourceExternalId', args.sourceExternalId))
      .first();

    // Prepare base data
    const baseData = {
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
      likesCount: args.likesCount,
      savesCount: args.savesCount,
      commentsCount: args.commentsCount,
      viewsCount: args.viewsCount,
      coverImageUrl: args.coverImageUrl,
      imageUrls: args.imageUrls ?? [],
      publishedAt: args.publishedAt,
      crawledAt: Date.now(),
      qualityScore: args.qualityScore,
      contentHash: args.contentHash,
    };

    // Fill missing display fields with defaults
    const filledData = fillMissingDisplayFields(baseData);

    // Check for content truncation
    const contentTruncated = isContentTruncated(args.content);

    // Calculate completeness level
    const completenessLevel = calculateCompletenessLevel({
      title: args.title,
      content: args.content,
      coverImageUrl: filledData.coverImageUrl,
      imageUrls: filledData.imageUrls,
      authorName: args.authorName,
      destinations: args.destinations,
      contentTruncated,
      likesCount: filledData.likesCount,
      savesCount: filledData.savesCount,
      commentsCount: filledData.commentsCount,
      viewsCount: filledData.viewsCount,
      qualityScore: filledData.qualityScore,
    });

    // Prepare final data (ensure all required fields have values)
    const data = {
      ...filledData,
      // Ensure numeric fields are numbers (fillMissingDisplayFields guarantees this)
      likesCount: filledData.likesCount,
      savesCount: filledData.savesCount,
      commentsCount: filledData.commentsCount,
      viewsCount: filledData.viewsCount,
      qualityScore: filledData.qualityScore,
      // New fields
      contentTruncated,
      completenessLevel,
    };

    let guideId: Id<'travelGuides'>;

    if (existing) {
      // Update existing guide
      const oldDoc = existing;
      await ctx.db.patch(existing._id, data);
      const newDoc = await ctx.db.get(existing._id);

      // Sync destinations (handles diff between old and new)
      await syncDestinationsInternal(ctx, existing._id, args.destinations);

      // Update aggregates (in case platform changed, though unlikely)
      if (newDoc) {
        await replaceGuideInAggregates(ctx, oldDoc, newDoc);
      }

      guideId = existing._id;
    }
    else {
      // Insert new guide
      const id = await ctx.db.insert('travelGuides', data);
      const newDoc = await ctx.db.get(id);

      // Sync destinations for new guide
      await syncDestinationsInternal(ctx, id, args.destinations);

      // Update aggregates (increment count)
      if (newDoc) {
        await insertGuideToAggregates(ctx, newDoc);
      }

      guideId = id;
    }

    // Trigger refetch task if content is truncated and we have a source URL
    if (contentTruncated && args.sourceUrl) {
      await ctx.db.insert('refetchTasks', {
        guideId,
        sourceUrl: args.sourceUrl,
        sourceExternalId: args.sourceExternalId,
        sourcePlatform: args.sourcePlatform,
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
      });
    }

    return {
      id: guideId,
      action: existing ? ('updated' as const) : ('inserted' as const),
      contentTruncated,
      completenessLevel,
    };
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
      }),
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

// Bulk upsert guides with deduplication and statistics
// Returns inserted/updated counts instead of creating duplicates
export const bulkUpsert = mutation({
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
      }),
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;
    const ids: Id<'travelGuides'>[] = [];

    for (const guide of args.guides) {
      // Check if guide already exists
      const existing = await ctx.db
        .query('travelGuides')
        .withIndex('by_platform_external', q =>
          q
            .eq('sourcePlatform', guide.sourcePlatform)
            .eq('sourceExternalId', guide.sourceExternalId))
        .first();

      const data = {
        sourcePlatform: guide.sourcePlatform,
        sourceExternalId: guide.sourceExternalId,
        sourceUrl: guide.sourceUrl,
        title: guide.title,
        content: guide.content,
        contentHtml: guide.contentHtml,
        authorName: guide.authorName,
        authorId: guide.authorId,
        destinations: guide.destinations,
        tags: guide.tags,
        likesCount: guide.likesCount ?? 0,
        savesCount: guide.savesCount ?? 0,
        commentsCount: guide.commentsCount ?? 0,
        viewsCount: guide.viewsCount ?? 0,
        coverImageUrl: guide.coverImageUrl,
        imageUrls: guide.imageUrls ?? [],
        publishedAt: guide.publishedAt,
        crawledAt: Date.now(),
        qualityScore: guide.qualityScore ?? 0,
        contentHash: guide.contentHash,
      };

      if (existing) {
        // Update existing
        const oldDoc = existing;
        await ctx.db.patch(existing._id, data);
        const newDoc = await ctx.db.get(existing._id);

        // Sync destinations
        await syncDestinationsInternal(ctx, existing._id, guide.destinations);

        // Update aggregates
        if (newDoc) {
          await replaceGuideInAggregates(ctx, oldDoc, newDoc);
        }

        ids.push(existing._id);
        updated++;
      }
      else {
        // Insert new
        const id = await ctx.db.insert('travelGuides', data);
        const newDoc = await ctx.db.get(id);

        // Sync destinations
        await syncDestinationsInternal(ctx, id, guide.destinations);

        // Update aggregates
        if (newDoc) {
          await insertGuideToAggregates(ctx, newDoc);
        }

        ids.push(id);
        inserted++;
      }
    }

    return { ids, inserted, updated, total: args.guides.length };
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
    contentMarkdown: v.optional(v.string()),
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

              // Enhanced POI metadata
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

              // Geocoding metadata
              geocodeConfidence: v.optional(v.number()),
              geocodeSource: v.optional(v.string()),
              isManuallyVerified: v.optional(v.boolean()),
              verifiedAt: v.optional(v.number()),
              verifiedBy: v.optional(v.string()),
            }),
          ),
        }),
      ),
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

// Update guide with AI-enhanced content (title, summary) and recalculate completenessLevel
export const updateWithEnhancement = mutation({
  args: {
    id: v.id('travelGuides'),
    title: v.optional(v.string()),
    aiSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const guide = await ctx.db.get(args.id);
    if (!guide) {
      throw new Error(`Guide not found: ${args.id}`);
    }

    const updates: Record<string, unknown> = {};

    if (args.title) {
      updates.title = args.title;
    }

    if (args.aiSummary) {
      updates.aiSummary = args.aiSummary;
    }

    // Recalculate completeness level with new data
    const newCompletenessLevel = calculateCompletenessLevel({
      title: args.title || guide.title,
      content: guide.content,
      coverImageUrl: guide.coverImageUrl,
      imageUrls: guide.imageUrls,
      authorName: guide.authorName,
      destinations: guide.destinations,
      contentTruncated: guide.contentTruncated,
      likesCount: guide.likesCount,
      savesCount: guide.savesCount,
      commentsCount: guide.commentsCount,
      viewsCount: guide.viewsCount,
      qualityScore: guide.qualityScore,
    });

    updates.completenessLevel = newCompletenessLevel;
    updates.aiProcessedAt = Date.now();

    await ctx.db.patch(args.id, updates);

    return {
      id: args.id,
      previousCompletenessLevel: guide.completenessLevel,
      newCompletenessLevel,
      titleUpdated: !!args.title,
      summaryUpdated: !!args.aiSummary,
    };
  },
});

// Get guides needing enhancement (usable level, prioritized over incomplete)
export const getGuidesForEnhancement = query({
  args: {
    limit: v.optional(v.number()),
    priorityLevel: v.optional(completenessLevelValidator),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const priorityLevel = args.priorityLevel || 'usable';

    // Get guides at the specified completeness level that haven't been AI processed
    const guides = await ctx.db
      .query('travelGuides')
      .withIndex('by_completeness', q =>
        q.eq('completenessLevel', priorityLevel))
      .order('desc')
      .take(limit * 2);

    // Filter to guides missing title or without AI summary
    const needsEnhancement = guides.filter(g => !g.title || !g.aiSummary);

    return needsEnhancement.slice(0, limit).map(g => ({
      _id: g._id,
      title: g.title,
      content: g.content?.slice(0, 1000), // Limit content for API response
      contentLength: g.content?.length || 0,
      completenessLevel: g.completenessLevel,
      hasTitle: !!g.title,
      hasSummary: !!g.aiSummary,
    }));
  },
});

// Delete a guide
// Also cleans up associated data: recommendations, destinations, aggregates
export const remove = mutation({
  args: { id: v.id('travelGuides') },
  handler: async (ctx, args) => {
    // Get the guide before deletion for aggregate update
    const guide = await ctx.db.get(args.id);
    if (!guide)
      return;

    // Delete associated recommendations
    const recs = await ctx.db
      .query('guideRecommendations')
      .filter(q => q.eq(q.field('guideId'), args.id))
      .collect();

    for (const rec of recs) {
      await ctx.db.delete(rec._id);
    }

    // Delete associated destinations
    await deleteDestinationsForGuide(ctx, args.id);

    // Update aggregates (decrement count)
    await deleteGuideFromAggregates(ctx, guide);

    // Delete the guide
    await ctx.db.delete(args.id);
  },
});

// Find duplicate guide IDs by checking platform + externalId (uses index)
export const findDuplicatesForExternalId = query({
  args: {
    sourcePlatform: platformValidator,
    sourceExternalId: v.string(),
  },
  handler: async (ctx, args) => {
    // Use the by_platform_external index for efficient lookup
    const guides = await ctx.db
      .query('travelGuides')
      .withIndex('by_platform_external', q =>
        q
          .eq('sourcePlatform', args.sourcePlatform)
          .eq('sourceExternalId', args.sourceExternalId))
      .collect();

    if (guides.length <= 1) {
      return { idsToDelete: [], kept: guides[0]?._id };
    }

    // Sort to find best one
    const sorted = guides
      .map(g => ({
        _id: g._id,
        contentLength: g.content?.length || 0,
        qualityScore: g.qualityScore,
        crawledAt: g.crawledAt || 0,
        aiProcessedAt: g.aiProcessedAt,
      }))
      .sort((a, b) => {
        const aiDiff = (b.aiProcessedAt ? 1 : 0) - (a.aiProcessedAt ? 1 : 0);
        if (aiDiff !== 0)
          return aiDiff;
        const contentDiff = b.contentLength - a.contentLength;
        if (contentDiff !== 0)
          return contentDiff;
        const qualityDiff = b.qualityScore - a.qualityScore;
        if (qualityDiff !== 0)
          return qualityDiff;
        return b.crawledAt - a.crawledAt;
      });

    return {
      idsToDelete: sorted.slice(1).map(g => g._id),
      kept: sorted[0]._id,
      total: guides.length,
    };
  },
});

// Get unique sourceExternalIds using pagination (lightweight)
export const getUniqueExternalIds = query({
  args: {
    platform: platformValidator,
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const result = await ctx.db
      .query('travelGuides')
      .withIndex('by_platform', q => q.eq('sourcePlatform', args.platform))
      .paginate({
        numItems: limit,
        cursor: args.cursor ?? null,
      });

    // Extract externalIds from this page
    const items = result.page.map(g => ({
      id: g._id,
      externalId: g.sourceExternalId,
      platform: g.sourcePlatform,
    }));

    return {
      items,
      cursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

// Batch delete guides by IDs
export const batchDelete = mutation({
  args: {
    ids: v.array(v.id('travelGuides')),
  },
  handler: async (ctx, args) => {
    let deletedCount = 0;
    for (const id of args.ids) {
      try {
        // Get guide for aggregate update
        const guide = await ctx.db.get(id);
        if (guide) {
          // Clean up destinations
          await deleteDestinationsForGuide(ctx, id);
          // Update aggregates
          await deleteGuideFromAggregates(ctx, guide);
        }
        await ctx.db.delete(id);
        deletedCount++;
      }
      catch {
        // Skip if already deleted
      }
    }
    return { deletedCount };
  },
});

/**
 * @deprecated Use bulkUpsert instead. This function will be removed in a future version.
 * The upsert mutation now handles deduplication atomically via the by_platform_external index.
 */
// Remove duplicate guides (keep the one with longer content or higher quality score)
// Uses platform index to batch process and avoid 16MB limit
export const removeDuplicates = mutation({
  args: {
    platform: v.optional(platformValidator),
  },
  handler: async (ctx, args) => {
    // Collect guide metadata using platform index for smaller batches
    interface GuideInfo {
      _id: Id<'travelGuides'>;
      sourcePlatform: string;
      sourceExternalId: string;
      contentLength: number;
      qualityScore: number;
      crawledAt: number;
      aiProcessedAt?: number;
    }

    const allGuides: GuideInfo[] = [];

    // If platform specified, only query that platform
    // Otherwise query all platforms one by one
    const platforms: Array<
      | 'xiaohongshu'
      | 'weibo'
      | 'ctrip'
      | 'douyin'
      | 'tripadvisor'
      | 'qunar'
      | 'tongcheng'
      | 'mafengwo'
      | 'qyer'
    > = args.platform
      ? [args.platform]
      : [
          'xiaohongshu',
          'weibo',
          'ctrip',
          'douyin',
          'tripadvisor',
          'qunar',
          'tongcheng',
          'mafengwo',
          'qyer',
        ];

    for (const platform of platforms) {
      const guides = await ctx.db
        .query('travelGuides')
        .withIndex('by_platform', q => q.eq('sourcePlatform', platform))
        .collect();

      for (const g of guides) {
        allGuides.push({
          _id: g._id,
          sourcePlatform: g.sourcePlatform,
          sourceExternalId: g.sourceExternalId,
          contentLength: g.content?.length || 0,
          qualityScore: g.qualityScore,
          crawledAt: g.crawledAt || 0,
          aiProcessedAt: g.aiProcessedAt,
        });
      }
    }

    // Group by platform + externalId
    const grouped = new Map<string, GuideInfo[]>();
    for (const guide of allGuides) {
      const key = `${guide.sourcePlatform}:${guide.sourceExternalId}`;
      const existing = grouped.get(key) || [];
      existing.push(guide);
      grouped.set(key, existing);
    }

    // Find and delete duplicates
    let removedCount = 0;
    const idsToDelete: Id<'travelGuides'>[] = [];

    for (const [_key, group] of grouped) {
      if (group.length > 1) {
        // Sort by: hasAiData (desc), content length (desc), quality score (desc), crawledAt (desc)
        group.sort((a, b) => {
          // Prefer guides with AI data
          const aiDiff = (b.aiProcessedAt ? 1 : 0) - (a.aiProcessedAt ? 1 : 0);
          if (aiDiff !== 0)
            return aiDiff;

          const contentDiff = b.contentLength - a.contentLength;
          if (contentDiff !== 0)
            return contentDiff;

          const qualityDiff = b.qualityScore - a.qualityScore;
          if (qualityDiff !== 0)
            return qualityDiff;

          return b.crawledAt - a.crawledAt;
        });

        // Keep first (best), mark rest for deletion
        for (let i = 1; i < group.length; i++) {
          idsToDelete.push(group[i]._id);
        }
      }
    }

    // Delete duplicates
    for (const id of idsToDelete) {
      await ctx.db.delete(id);
      removedCount++;
    }

    return {
      removedCount,
      totalBefore: allGuides.length,
      totalAfter: allGuides.length - removedCount,
      uniqueKeys: grouped.size,
      platform: args.platform || 'all',
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
      .filter(q => q.neq(q.field('aiProcessedAt'), undefined))
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
      day => day.dayNumber === args.dayNumber,
    );
    if (dayIndex === -1) {
      throw new Error(`Day ${args.dayNumber} not found in guide`);
    }

    const day = guide.aiDays[dayIndex];
    if (args.poiIndex < 0 || args.poiIndex >= day.pois.length) {
      throw new Error(
        `POI index ${args.poiIndex} out of range (0-${day.pois.length - 1})`,
      );
    }

    // Create updated aiDays with the modified POI
    const updatedAiDays = guide.aiDays.map((d, dIdx) => {
      if (dIdx !== dayIndex)
        return d;
      return {
        ...d,
        pois: d.pois.map((poi, pIdx) => {
          if (pIdx !== args.poiIndex)
            return poi;
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
          source === 'amap'
          || source === 'nominatim'
          || source === 'overpass'
          || source === 'consensus'
          || source === 'manual'
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
      .filter(q => q.neq(q.field('aiDays'), undefined))
      .collect();

    // Calculate low confidence POI count for each guide
    const guidesWithStats = guides
      .map((guide) => {
        if (!guide.aiDays)
          return null;

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
        if (lowConfidenceCount === 0)
          return null;

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
      (a, b) => b.unverifiedLowConfidence - a.unverifiedLowConfidence,
    );

    return guidesWithStats.slice(0, effectiveLimit);
  },
});

// Update enrichment status (used by AI service poller)
export const updateEnrichmentStatus = mutation({
  args: {
    id: v.id('travelGuides'),
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed'),
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const guide = await ctx.db.get(args.id);
    if (!guide) {
      throw new Error(`Guide not found: ${args.id}`);
    }

    const update: Record<string, unknown> = {
      enrichmentStatus: args.status,
    };

    if (args.status === 'processing') {
      update.enrichmentStartedAt = Date.now();
    }

    if (args.status === 'failed' && args.error) {
      update.enrichmentError = args.error;
    }

    if (args.status === 'completed') {
      update.enrichmentError = undefined;
    }

    await ctx.db.patch(args.id, update);
    return { success: true };
  },
});
