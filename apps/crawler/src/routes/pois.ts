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
import {
  ApiErrors,
  successResponse,
  successWithPagination,
} from '../lib/api-response.js';
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
  radius: z.coerce.number().positive().max(50000).optional(),
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

    try {
      // Use Convex to get POIs - normalizedPois table
      // Note: Full implementation would need more Convex functions
      const pois: NormalizedPOI[] = [];
      const limit = params.limit || 20;
      const offset = params.offset || 0;

      return successWithPagination(c, pois, {
        total: pois.length,
        limit,
        offset,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return ApiErrors.internal(c, message);
    }
  }
);

// GET /api/pois/stats - Get aggregated POI statistics
poisRouter.get('/stats', async (c: Context) => {
  try {
    // Return placeholder stats - full implementation needs Convex aggregation
    return successResponse(c, {
      total_pois: 0,
      categories: {},
      cities: {},
      top_categories: [],
      top_cities: [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return ApiErrors.internal(c, message);
  }
});

// GET /api/pois/:id - Get a specific POI
poisRouter.get('/:id', async (c: Context) => {
  const id = c.req.param('id');

  try {
    const poi = await getPOIById(id);
    if (!poi) {
      return ApiErrors.notFound(c, 'POI');
    }
    return successResponse(c, poi as NormalizedPOI);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return ApiErrors.internal(c, message);
  }
});

// GET /api/pois/:id/reviews - Get reviews for a POI
poisRouter.get('/:id/reviews', async (c: Context) => {
  const id = c.req.param('id');
  const limit = Number.parseInt(c.req.query('limit') || '20', 10);
  const offset = Number.parseInt(c.req.query('offset') || '0', 10);

  try {
    // Verify POI exists
    const poi = await getPOIById(id);
    if (!poi) {
      return ApiErrors.notFound(c, 'POI');
    }

    // Get reviews from Convex - need poiReviews functions
    const reviews: unknown[] = [];

    return successWithPagination(c, reviews, {
      total: reviews.length,
      limit,
      offset,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return ApiErrors.internal(c, message);
  }
});

// GET /api/pois/:id/nearby - Get nearby POIs
poisRouter.get('/:id/nearby', async (c: Context) => {
  const id = c.req.param('id');
  const radius = Number.parseInt(c.req.query('radius') || '1000', 10);
  const category = c.req.query('category');
  const limit = Number.parseInt(c.req.query('limit') || '10', 10);

  try {
    const poi = await getPOIById(id);
    if (!poi) {
      return ApiErrors.notFound(c, 'POI');
    }

    const nearby = await getNearbyPOIs(poi.location_lat, poi.location_lng, {
      radius,
      category,
      limit,
      excludeId: id,
    });

    return successResponse(c, nearby);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return ApiErrors.internal(c, message);
  }
});

// GET /api/pois/:id/sources - Get data sources for a POI
poisRouter.get('/:id/sources', async (c: Context) => {
  const id = c.req.param('id');

  try {
    const poi = await getPOIById(id);
    if (!poi) {
      return ApiErrors.notFound(c, 'POI');
    }

    const sources = await getPOISources(id);
    return successResponse(c, sources);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return ApiErrors.internal(c, message);
  }
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

    try {
      const result = await runNormalizationPipeline({
        batchSize: params.batch_size ?? 100,
        runDeduplication: params.run_deduplication ?? true,
        platform: params.platform,
        city: params.city,
        category: params.category,
        crawlJobId: params.crawl_job_id,
      });

      return successResponse(c, result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return ApiErrors.internal(c, message);
    }
  }
);

// GET /api/pois/pipeline/stats - Get normalization pipeline stats
poisRouter.get('/pipeline/stats', async (c: Context) => {
  try {
    const stats = await getPipelineStats();
    return successResponse(c, stats);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return ApiErrors.internal(c, message);
  }
});
