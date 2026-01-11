/**
 * Travel Guides API Routes
 * Endpoints for travel guide recommendations, search, and management
 */

import type { GuidePlatform } from '@pathfinding/crawler-types';
import type { Context } from 'hono';
import type { Id } from '../lib/convex.js';
import { Hono } from 'hono';
import { api, convex } from '../lib/convex.js';
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
    return c.json({ error: 'Query parameter "q" is required' }, 400);
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

  try {
    const guide = await convex.query(api.travelGuides.getById, {
      id: id as Id<'travelGuides'>,
    });

    if (!guide) {
      return c.json({ error: 'Guide not found' }, 404);
    }

    return c.json({ data: mapGuide(guide) });
  } catch {
    return c.json({ error: 'Guide not found' }, 404);
  }
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

  try {
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
  } catch {
    return c.json({ error: 'Failed to fetch guides' }, 500);
  }
});

/**
 * GET /api/guides/stats
 * Get statistics about stored guides
 */
guidesRouter.get('/stats', async (c: Context) => {
  try {
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
  } catch {
    return c.json({
      total: 0,
      by_platform: {},
    });
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
  };
}
