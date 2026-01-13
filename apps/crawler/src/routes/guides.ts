/**
 * Travel Guides API Routes
 * Endpoints for travel guide recommendations, search, and management
 */

import type { GuidePlatform } from '@pathfinding/crawler-types';
import type { Context } from 'hono';
import type { Id } from '../lib/convex.js';
import { Hono } from 'hono';
import { api, convex } from '../lib/convex.js';
import { Errors } from '../middleware/error-handler.js';
import {
  getGuidesByDestination,
  getRecommendations,
  getTrendingGuides,
  searchGuides,
} from '../services/recommendation-engine.js';

export const guidesRouter = new Hono();

/**
 * GET /api/guides/recommendations
 * Get personalized travel guide recommendations
 */
guidesRouter.get('/recommendations', async (c: Context) => {
  const destinationsParam = c.req.query('destinations');
  const tagsParam = c.req.query('tags');
  const platformsParam = c.req.query('platforms');
  const limit = Number(c.req.query('limit')) || 20;
  const offset = Number(c.req.query('offset')) || 0;
  const minQuality = Number(c.req.query('min_quality')) || 0.3;

  const destinations = destinationsParam ? destinationsParam.split(',') : [];
  const tags = tagsParam ? tagsParam.split(',') : [];
  const platforms = platformsParam
    ? (platformsParam.split(',') as GuidePlatform[])
    : undefined;

  const guides = await getRecommendations({
    destinations,
    tags,
    platforms,
    limit,
    offset,
    minQuality,
  });

  return c.json({
    data: guides,
    pagination: {
      limit,
      offset,
      total: guides.length,
    },
  });
});

/**
 * GET /api/guides/search
 * Search travel guides by query
 */
guidesRouter.get('/search', async (c: Context) => {
  const query = c.req.query('q');
  const platformsParam = c.req.query('platforms');
  const destinationsParam = c.req.query('destinations');
  const limit = Number(c.req.query('limit')) || 20;
  const offset = Number(c.req.query('offset')) || 0;

  if (!query) {
    throw Errors.badRequest('Query parameter "q" is required');
  }

  const platforms = platformsParam
    ? (platformsParam.split(',') as GuidePlatform[])
    : undefined;
  const destinations = destinationsParam
    ? destinationsParam.split(',')
    : undefined;

  const guides = await searchGuides(query, {
    platforms,
    destinations,
    limit,
    offset,
  });

  return c.json({
    data: guides,
    query,
    pagination: {
      limit,
      offset,
      total: guides.length,
    },
  });
});

/**
 * GET /api/guides/trending
 * Get trending travel guides
 */
guidesRouter.get('/trending', async (c: Context) => {
  const days = Number(c.req.query('days')) || 7;
  const platformsParam = c.req.query('platforms');
  const limit = Number(c.req.query('limit')) || 10;

  const platforms = platformsParam
    ? (platformsParam.split(',') as GuidePlatform[])
    : undefined;

  const guides = await getTrendingGuides({
    days,
    platforms,
    limit,
  });

  return c.json({
    data: guides,
    period_days: days,
  });
});

/**
 * GET /api/guides/destination/:name
 * Get guides for a specific destination
 */
guidesRouter.get('/destination/:name', async (c: Context) => {
  const destination = decodeURIComponent(c.req.param('name'));
  const platformsParam = c.req.query('platforms');
  const minQuality = Number(c.req.query('min_quality')) || 0.3;
  const limit = Number(c.req.query('limit')) || 20;
  const offset = Number(c.req.query('offset')) || 0;

  const platforms = platformsParam
    ? (platformsParam.split(',') as GuidePlatform[])
    : undefined;

  const guides = await getGuidesByDestination(destination, {
    platforms,
    minQuality,
    limit,
    offset,
  });

  return c.json({
    data: guides,
    destination,
    pagination: {
      limit,
      offset,
      total: guides.length,
    },
  });
});

/**
 * GET /api/guides/:id
 * Get a specific guide by ID
 */
guidesRouter.get('/:id', async (c: Context) => {
  const id = c.req.param('id');

  const guide = await convex.query(api.travelGuides.getById, {
    id: id as Id<'travelGuides'>,
  });

  if (!guide) {
    throw Errors.notFound('Guide');
  }

  return c.json({ data: mapGuide(guide) });
});

/**
 * GET /api/guides
 * List all guides with pagination
 */
guidesRouter.get('/', async (c: Context) => {
  const platformsParam = c.req.query('platforms');
  const minQuality = Number(c.req.query('min_quality')) || 0;
  const limit = Number(c.req.query('limit')) || 20;
  const offset = Number(c.req.query('offset')) || 0;

  const platforms = platformsParam
    ? (platformsParam.split(',') as GuidePlatform[])
    : undefined;

  const guides = await convex.query(api.travelGuides.list, {
    platform: platforms?.[0] as any,
    minQuality,
    limit: limit + offset,
  });

  const data = guides.slice(offset, offset + limit);

  return c.json({
    data: data.map(mapGuide),
    pagination: {
      limit,
      offset,
      total: guides.length,
    },
  });
});

/**
 * GET /api/guides/stats
 * Get statistics about stored guides
 */
guidesRouter.get('/stats', async (c: Context) => {
  const guides = await convex.query(api.travelGuides.list, {});

  const platformCounts: Record<string, number> = {};
  for (const guide of guides) {
    platformCounts[guide.sourcePlatform] =
      (platformCounts[guide.sourcePlatform] || 0) + 1;
  }

  return c.json({
    total: guides.length,
    by_platform: platformCounts,
  });
});

/**
 * POST /api/guides
 * Create a new travel guide (for testing/seeding)
 */
guidesRouter.post('/', async (c: Context) => {
  const body = await c.req.json();

  const id = await convex.mutation(api.travelGuides.upsert, {
    sourcePlatform: body.source_platform || 'xiaohongshu',
    sourceExternalId: body.source_external_id || `manual_${Date.now()}`,
    sourceUrl: body.source_url,
    title: body.title,
    content: body.content || '',
    contentHtml: body.content_html,
    authorName: body.author_name,
    authorId: body.author_id,
    destinations: body.destinations || [],
    tags: body.tags || [],
    likesCount: body.likes_count || 0,
    savesCount: body.saves_count || 0,
    commentsCount: body.comments_count || 0,
    viewsCount: body.views_count || 0,
    coverImageUrl: body.cover_image_url,
    imageUrls: body.image_urls || [],
    qualityScore: body.quality_score || 0.5,
  });

  const guide = await convex.query(api.travelGuides.getById, { id });
  return c.json({ data: mapGuide(guide) }, 201);
});

/**
 * POST /api/guides/cleanup/duplicates
 * Remove duplicate guides (keep the one with longer content)
 * Uses cursor-based pagination and indexed lookups
 */
guidesRouter.post('/cleanup/duplicates', async (c: Context) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const requestedPlatform = body.platform as
      | 'xiaohongshu'
      | 'weibo'
      | 'ctrip'
      | 'douyin'
      | 'tripadvisor'
      | undefined;

    // Process each platform
    const platforms = requestedPlatform
      ? [requestedPlatform]
      : (['xiaohongshu', 'weibo', 'ctrip', 'douyin', 'tripadvisor'] as const);

    let totalRemoved = 0;
    let totalChecked = 0;
    const results: Record<string, any> = {};

    for (const platform of platforms) {
      let platformRemoved = 0;
      let platformChecked = 0;
      const seenExternalIds = new Set<string>();
      const maxIterations = 500;
      let iterations = 0;
      let cursor: string | undefined;

      // Process using cursor-based pagination
      while (iterations < maxIterations) {
        iterations++;

        // Get batch using cursor
        const batch = await convex.query(
          api.travelGuides.getUniqueExternalIds,
          {
            platform,
            limit: 50,
            cursor,
          }
        );

        if (batch.items.length === 0) {
          break;
        }

        cursor = batch.cursor;

        // Check each externalId for duplicates
        for (const item of batch.items) {
          if (seenExternalIds.has(item.externalId)) continue;
          seenExternalIds.add(item.externalId);
          platformChecked++;

          const dupes = await convex.query(
            api.travelGuides.findDuplicatesForExternalId,
            {
              sourcePlatform: platform,
              sourceExternalId: item.externalId,
            }
          );

          if (dupes.idsToDelete.length > 0) {
            await convex.mutation(api.travelGuides.batchDelete, {
              ids: dupes.idsToDelete as Id<'travelGuides'>[],
            });
            platformRemoved += dupes.idsToDelete.length;
          }
        }

        if (batch.isDone) {
          break;
        }
      }

      results[platform] = {
        removed: platformRemoved,
        checked: platformChecked,
        iterations,
      };
      totalRemoved += platformRemoved;
      totalChecked += platformChecked;
    }

    return c.json({
      success: true,
      message: `Removed ${totalRemoved} duplicates`,
      totalRemoved,
      totalChecked,
      byPlatform: results,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/guides/cleanup/short-content
 * Remove guides with short/truncated content
 */
guidesRouter.post('/cleanup/short-content', async (c: Context) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const minLength = body.min_length || 200;

    const result = await convex.mutation(api.travelGuides.removeShortContent, {
      minLength,
    });
    return c.json({
      success: true,
      message: `Removed ${result.removedCount} guides with content shorter than ${minLength} chars`,
      removedCount: result.removedCount,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Helper to map Convex guide to API response format
function mapGuide(doc: any) {
  return {
    id: doc._id,
    source_platform: doc.sourcePlatform,
    source_external_id: doc.sourceExternalId,
    source_url: doc.sourceUrl,
    title: doc.title,
    content: doc.content,
    content_html: doc.contentHtml,
    author_name: doc.authorName,
    author_id: doc.authorId,
    destinations: doc.destinations,
    tags: doc.tags,
    likes_count: doc.likesCount,
    saves_count: doc.savesCount,
    comments_count: doc.commentsCount,
    views_count: doc.viewsCount,
    cover_image_url: doc.coverImageUrl,
    image_urls: doc.imageUrls,
    published_at: doc.publishedAt
      ? new Date(doc.publishedAt).toISOString()
      : null,
    crawled_at: new Date(doc.crawledAt).toISOString(),
    quality_score: doc.qualityScore,
    content_hash: doc.contentHash,
    created_at: new Date(doc._creationTime).toISOString(),
    updated_at: new Date(doc._creationTime).toISOString(),
    // AI-Enhanced Fields
    ai_processed_at: doc.aiProcessedAt
      ? new Date(doc.aiProcessedAt).toISOString()
      : null,
    ai_summary: doc.aiSummary,
    ai_tips: doc.aiTips,
    ai_best_time: doc.aiBestTime,
    ai_duration: doc.aiDuration,
    ai_budget: doc.aiBudget,
    ai_days: doc.aiDays,
  };
}
