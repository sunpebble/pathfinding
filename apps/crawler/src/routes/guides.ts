/**
 * Travel Guides API Routes
 * Endpoints for travel guide recommendations, search, and management
 */

import type { GuidePlatform } from '@pathfinding/crawler-types';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { supabase } from '../lib/supabase.js';
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
      total: guides.length, // Would need a count query for actual total
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

  const { data, error } = await supabase
    .from('travel_guides')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return c.json({ error: 'Guide not found' }, 404);
  }

  return c.json({ data });
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
  const sortBy = c.req.query('sort') || 'quality_score';
  const sortOrder = c.req.query('order') === 'asc';

  const platforms = platformsParam
    ? (platformsParam.split(',') as GuidePlatform[])
    : undefined;

  let query = supabase
    .from('travel_guides')
    .select('*', { count: 'exact' })
    .gte('quality_score', minQuality)
    .order(sortBy, { ascending: sortOrder })
    .range(offset, offset + limit - 1);

  if (platforms && platforms.length > 0) {
    query = query.in('source_platform', platforms);
  }

  const { data, error, count } = await query;

  if (error) {
    return c.json({ error: 'Failed to fetch guides' }, 500);
  }

  return c.json({
    data: data || [],
    pagination: {
      limit,
      offset,
      total: count || 0,
    },
  });
});

/**
 * GET /api/guides/stats
 * Get statistics about stored guides
 */
guidesRouter.get('/stats', async (c: Context) => {
  const { data: platformCounts } = await supabase
    .from('travel_guides')
    .select('source_platform')
    .then(({ data }) => {
      const counts: Record<string, number> = {};
      for (const row of data || []) {
        counts[row.source_platform] = (counts[row.source_platform] || 0) + 1;
      }
      return { data: counts };
    });

  const { count: totalCount } = await supabase
    .from('travel_guides')
    .select('*', { count: 'exact', head: true });

  return c.json({
    total: totalCount || 0,
    by_platform: platformCounts || {},
  });
});
