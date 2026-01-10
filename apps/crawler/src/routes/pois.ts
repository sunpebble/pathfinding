/**
 * POIs API Routes
 * Endpoints for searching and retrieving normalized POI data
 */

import type {
  NormalizedPOI,
  POISearchParams,
} from '@pathfinding/crawler-types';
import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { supabase, TABLES } from '../lib/supabase.js';
import { Errors } from '../middleware/error-handler.js';
import {
  getPipelineStats,
  runNormalizationPipeline,
} from '../processors/pipeline.js';
import {
  getNearbyPOIs,
  getPOIById,
  getPOISources,
} from '../services/poi.service.js';

export const poisRouter = new Hono();

// Validation schemas
const searchPoisSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().positive().max(50000).optional(), // max 50km
  min_rating: z.coerce.number().min(0).max(5).optional(),
  min_quality_score: z.coerce.number().min(0).max(1).optional(),
  limit: z.coerce.number().positive().max(100).optional().default(20),
  offset: z.coerce.number().nonnegative().optional().default(0),
});

// GET /api/pois - Search normalized POIs
poisRouter.get(
  '/',
  zValidator('query', searchPoisSchema as any),
  async (c: Context) => {
    const params = c.req.query() as unknown as POISearchParams;

    let query = supabase
      .from(TABLES.NORMALIZED_POIS)
      .select('*', { count: 'exact' })
      .eq('is_duplicate', false)
      .order('quality_score', { ascending: false });

    // Apply filters
    if (params.category) {
      query = query.eq('category', params.category);
    }

    if (params.city) {
      query = query.eq('city', params.city);
    }

    if (params.min_rating !== undefined) {
      query = query.gte('rating_overall', params.min_rating);
    }

    if (params.min_quality_score !== undefined) {
      query = query.gte('quality_score', params.min_quality_score);
    }

    // Text search
    if (params.query) {
      query = query.textSearch('name', params.query, { type: 'plain' });
    }

    // Geo-spatial search using PostGIS
    if (
      params.lat !== undefined &&
      params.lng !== undefined &&
      params.radius !== undefined
    ) {
      // Use PostGIS ST_DWithin for radius search
      const { data: geoData, error: geoError } = await supabase.rpc(
        'search_pois_by_location',
        {
          search_lat: params.lat,
          search_lng: params.lng,
          radius_meters: params.radius,
          category_filter: params.category || null,
          min_rating_filter: params.min_rating || null,
          result_limit: params.limit || 20,
          result_offset: params.offset || 0,
        }
      );

      if (geoError) {
        // Fallback to bounding box if RPC not available
        console.warn('Geo RPC not available, using bounding box fallback');
        const latDelta = params.radius / 111000;
        const lngDelta =
          params.radius / (111000 * Math.cos((params.lat * Math.PI) / 180));

        query = query
          .gte('location_lat', params.lat - latDelta)
          .lte('location_lat', params.lat + latDelta)
          .gte('location_lng', params.lng - lngDelta)
          .lte('location_lng', params.lng + lngDelta);
      } else {
        return c.json({
          data: geoData as NormalizedPOI[],
          pagination: {
            total: geoData?.length || 0,
            limit: params.limit || 20,
            offset: params.offset || 0,
          },
        });
      }
    }

    // Apply pagination
    query = query.range(
      params.offset || 0,
      (params.offset || 0) + (params.limit || 20) - 1
    );

    const { data, error, count } = await query;

    if (error) {
      throw Errors.internal(error.message);
    }

    return c.json({
      data: data as NormalizedPOI[],
      pagination: {
        total: count || 0,
        limit: params.limit || 20,
        offset: params.offset || 0,
      },
    });
  }
);

// GET /api/pois/stats - Get aggregated POI statistics
poisRouter.get('/stats', async (c: Context) => {
  // Get category distribution
  const { data: categoryStats, error: categoryError } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('category')
    .eq('is_duplicate', false);

  if (categoryError) {
    throw Errors.internal(categoryError.message);
  }

  const categoryDistribution: Record<string, number> = {};
  categoryStats?.forEach((row: { category: string }) => {
    categoryDistribution[row.category] =
      (categoryDistribution[row.category] || 0) + 1;
  });

  // Get city distribution
  const { data: cityStats, error: cityError } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('city')
    .eq('is_duplicate', false)
    .not('city', 'is', null);

  if (cityError) {
    throw Errors.internal(cityError.message);
  }

  const cityDistribution: Record<string, number> = {};
  cityStats?.forEach((row: { city: string | null }) => {
    if (row.city) {
      cityDistribution[row.city] = (cityDistribution[row.city] || 0) + 1;
    }
  });

  // Get total count
  const { count: totalCount, error: countError } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('*', { count: 'exact', head: true })
    .eq('is_duplicate', false);

  if (countError) {
    throw Errors.internal(countError.message);
  }

  return c.json({
    data: {
      total_pois: totalCount || 0,
      categories: categoryDistribution,
      cities: cityDistribution,
      top_categories: Object.entries(categoryDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([category, count]) => ({ category, count })),
      top_cities: Object.entries(cityDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([city, count]) => ({ city, count })),
    },
  });
});

// GET /api/pois/:id - Get a specific POI
poisRouter.get('/:id', async (c: Context) => {
  const id = c.req.param('id');

  const { data, error } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw Errors.notFound('POI');
    }
    throw Errors.internal(error.message);
  }

  return c.json({ data: data as NormalizedPOI });
});

// GET /api/pois/:id/reviews - Get reviews for a POI
poisRouter.get('/:id/reviews', async (c: Context) => {
  const id = c.req.param('id');
  const limit = Number.parseInt(c.req.query('limit') || '20', 10);
  const offset = Number.parseInt(c.req.query('offset') || '0', 10);

  // Verify POI exists
  const { error: poiError } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('id')
    .eq('id', id)
    .single();

  if (poiError) {
    if (poiError.code === 'PGRST116') {
      throw Errors.notFound('POI');
    }
    throw Errors.internal(poiError.message);
  }

  // Get reviews
  const { data, error, count } = await supabase
    .from(TABLES.POI_REVIEWS)
    .select('*', { count: 'exact' })
    .eq('poi_id', id)
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw Errors.internal(error.message);
  }

  return c.json({
    data,
    pagination: {
      total: count || 0,
      limit,
      offset,
    },
  });
});

// GET /api/pois/:id/nearby - Get nearby POIs
poisRouter.get('/:id/nearby', async (c: Context) => {
  const id = c.req.param('id');
  const radius = Number.parseInt(c.req.query('radius') || '1000', 10);
  const category = c.req.query('category');
  const limit = Number.parseInt(c.req.query('limit') || '10', 10);

  // Get the POI first
  const poi = await getPOIById(id);
  if (!poi) {
    throw Errors.notFound('POI');
  }

  // Get nearby POIs
  const nearby = await getNearbyPOIs(poi.location_lat, poi.location_lng, {
    radius,
    category,
    limit,
    excludeId: id,
  });

  return c.json({ data: nearby });
});

// GET /api/pois/:id/sources - Get data sources for a POI
poisRouter.get('/:id/sources', async (c: Context) => {
  const id = c.req.param('id');

  // Verify POI exists
  const poi = await getPOIById(id);
  if (!poi) {
    throw Errors.notFound('POI');
  }

  const sources = await getPOISources(id);

  return c.json({ data: sources });
});

// POST /api/pois/normalize - Run normalization pipeline
const normalizeSchema = z.object({
  batch_size: z.number().positive().max(1000).optional().default(100),
  run_deduplication: z.boolean().optional().default(true),
  platform: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  crawl_job_id: z.string().uuid().optional(),
});

poisRouter.post(
  '/normalize',
  zValidator('json', normalizeSchema as any),
  async (c: Context) => {
    const params = (await c.req.json()) as {
      batch_size?: number;
      run_deduplication?: boolean;
      platform?: string;
      city?: string;
      category?: string;
      crawl_job_id?: string;
    };

    const result = await runNormalizationPipeline({
      batchSize: params.batch_size ?? 100,
      runDeduplication: params.run_deduplication ?? true,
      platform: params.platform,
      city: params.city,
      category: params.category,
      crawlJobId: params.crawl_job_id,
    });

    return c.json({ data: result });
  }
);

// GET /api/pois/pipeline/stats - Get normalization pipeline stats
poisRouter.get('/pipeline/stats', async (c: Context) => {
  const stats = await getPipelineStats();
  return c.json({ data: stats });
});
