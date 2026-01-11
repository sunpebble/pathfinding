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
      const pois: any[] = [];

      return c.json({
        data: pois as NormalizedPOI[],
        pagination: {
          total: pois.length,
          limit: params.limit || 20,
          offset: params.offset || 0,
        },
      });
    } catch (error: any) {
      throw Errors.internal(error.message);
    }
  }
);

// GET /api/pois/stats - Get aggregated POI statistics
poisRouter.get('/stats', async (c: Context) => {
  try {
    // Return placeholder stats - full implementation needs Convex aggregation
    return c.json({
      data: {
        total_pois: 0,
        categories: {},
        cities: {},
        top_categories: [],
        top_cities: [],
      },
    });
  } catch (error: any) {
    throw Errors.internal(error.message);
  }
});

// GET /api/pois/:id - Get a specific POI
poisRouter.get('/:id', async (c: Context) => {
  const id = c.req.param('id');

  try {
    const poi = await getPOIById(id);
    if (!poi) {
      throw Errors.notFound('POI');
    }
    return c.json({ data: poi as NormalizedPOI });
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw Errors.internal(error.message);
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
      throw Errors.notFound('POI');
    }

    // Get reviews from Convex - need poiReviews functions
    const reviews: any[] = [];

    return c.json({
      data: reviews,
      pagination: {
        total: reviews.length,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw Errors.internal(error.message);
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
      throw Errors.notFound('POI');
    }

    const nearby = await getNearbyPOIs(poi.location_lat, poi.location_lng, {
      radius,
      category,
      limit,
      excludeId: id,
    });

    return c.json({ data: nearby });
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw Errors.internal(error.message);
  }
});

// GET /api/pois/:id/sources - Get data sources for a POI
poisRouter.get('/:id/sources', async (c: Context) => {
  const id = c.req.param('id');

  try {
    const poi = await getPOIById(id);
    if (!poi) {
      throw Errors.notFound('POI');
    }

    const sources = await getPOISources(id);
    return c.json({ data: sources });
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw Errors.internal(error.message);
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
