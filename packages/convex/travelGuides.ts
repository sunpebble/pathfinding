import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Travel Guides - Crawled Content from Social Platforms
 */

const platformValidator = v.union(
  v.literal('xiaohongshu'),
  v.literal('weibo'),
  v.literal('ctrip')
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

    // Build query with platform filter using index if available
    let queryBuilder = ctx.db.query('travelGuides');

    if (args.platform) {
      queryBuilder = queryBuilder.withIndex('by_platform', (q) =>
        q.eq('sourcePlatform', args.platform!)
      );
    }

    // Take limited records before collecting to avoid 16MB limit
    // Note: We fetch more than the limit to allow for quality filtering
    const fetchLimit =
      args.minQuality !== undefined ? effectiveLimit * 3 : effectiveLimit;
    let guides = await queryBuilder.order('desc').take(fetchLimit);

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
