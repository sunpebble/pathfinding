/**
 * Route Optimization API Routes
 * Provides endpoints for itinerary route optimization
 * Proxies to the crawler service for actual optimization logic
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

interface Variables {
  userId: string;
  accessToken: string;
}

// ============================================================================
// Validation Schemas
// ============================================================================

const PoiSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  description: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
  duration: z.string().optional(),
  openingHours: z.string().optional(),
  priceInfo: z.string().optional(),
  tips: z.string().optional(),
  rating: z.number().optional(),
  highlights: z.array(z.string()).optional(),
  transportToNext: z
    .object({
      mode: z.string().optional(),
      duration: z.string().optional(),
      distance: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

const DayItinerarySchema = z.object({
  dayNumber: z.number().int().positive(),
  theme: z.string().optional(),
  pois: z.array(PoiSchema),
});

const OptimizationOptionsSchema = z.object({
  preferredTransportMode: z
    .enum(['walking', 'driving', 'transit', 'taxi', 'cycling'])
    .optional(),
  startTime: z.number().int().min(0).max(1440).optional(),
  endTime: z.number().int().min(0).max(1440).optional(),
  considerTimeWindows: z.boolean().optional(),
  returnToStart: z.boolean().optional(),
  maxWalkingDistanceKm: z.number().positive().optional(),
});

const OptimizeDayRequestSchema = z.object({
  day: DayItinerarySchema,
  options: OptimizationOptionsSchema.optional(),
});

const OptimizeItineraryRequestSchema = z.object({
  days: z.array(DayItinerarySchema),
  options: OptimizationOptionsSchema.optional(),
});

// Crawler service URL
const CRAWLER_URL = process.env.CRAWLER_URL || 'http://localhost:3001';

// ============================================================================
// Helper Functions
// ============================================================================

async function proxyToCrawler(
  path: string,
  method: string,
  body?: unknown
): Promise<Response> {
  const url = `${CRAWLER_URL}/api/optimize${path}`;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return fetch(url, options);
}

// ============================================================================
// Public Routes (no auth required for optimization)
// ============================================================================

export const publicRouteOptimizationRoutes = new Hono();

/**
 * GET /route-optimization/transport-modes
 * Get available transport modes and their characteristics
 */
publicRouteOptimizationRoutes.get('/transport-modes', async (c) => {
  try {
    const response = await proxyToCrawler('/transport-modes', 'GET');
    const data = await response.json();
    return c.json(data, response.status as 200);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to fetch transport modes',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /route-optimization/estimate
 * Estimate travel time and distance between two points
 */
publicRouteOptimizationRoutes.post(
  '/estimate',
  zValidator(
    'json',
    z.object({
      from: z.object({
        latitude: z.number(),
        longitude: z.number(),
        name: z.string().optional(),
      }),
      to: z.object({
        latitude: z.number(),
        longitude: z.number(),
        name: z.string().optional(),
      }),
      transportMode: z
        .enum(['walking', 'driving', 'transit', 'taxi', 'cycling'])
        .optional(),
    })
  ),
  async (c) => {
    const body = c.req.valid('json');

    try {
      const response = await proxyToCrawler('/estimate', 'POST', body);
      const data = await response.json();
      return c.json(data, response.status as 200);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: 'Failed to estimate travel',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  }
);

// ============================================================================
// Protected Routes (auth required)
// ============================================================================

export const routeOptimizationRoutes = new Hono<{ Variables: Variables }>();

/**
 * POST /route-optimization/day
 * Optimize a single day's itinerary
 */
routeOptimizationRoutes.post(
  '/day',
  zValidator('json', OptimizeDayRequestSchema),
  async (c) => {
    const body = c.req.valid('json');

    try {
      const response = await proxyToCrawler('/day', 'POST', body);
      const data = await response.json();
      return c.json(data, response.status as 200);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: 'Optimization failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  }
);

/**
 * POST /route-optimization/itinerary
 * Optimize a full multi-day itinerary
 */
routeOptimizationRoutes.post(
  '/itinerary',
  zValidator('json', OptimizeItineraryRequestSchema),
  async (c) => {
    const body = c.req.valid('json');

    try {
      const response = await proxyToCrawler('/itinerary', 'POST', body);
      const data = await response.json();
      return c.json(data, response.status as 200);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: 'Optimization failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  }
);

/**
 * POST /route-optimization/compare
 * Compare original and optimized routes without modifying
 */
routeOptimizationRoutes.post(
  '/compare',
  zValidator('json', OptimizeDayRequestSchema),
  async (c) => {
    const body = c.req.valid('json');

    try {
      const response = await proxyToCrawler('/compare', 'POST', body);
      const data = await response.json();
      return c.json(data, response.status as 200);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: 'Comparison failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  }
);

export default routeOptimizationRoutes;
