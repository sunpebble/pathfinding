/**
 * Route Optimization API Routes
 * Provides endpoints for itinerary route optimization
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createLogger } from '../lib/logger.js';
import {
  RouteOptimizerService,
  type DayItinerary,
  type OptimizationOptions,
  type TransportMode,
} from '../services/route-optimizer.service.js';

const logger = createLogger('RouteOptimization');

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

// ============================================================================
// Router
// ============================================================================

export const routeOptimizationRouter = new Hono();

/**
 * POST /optimize/day
 * Optimize a single day's itinerary
 */
routeOptimizationRouter.post(
  '/day',
  zValidator('json', OptimizeDayRequestSchema),
  async (c) => {
    const { day, options } = c.req.valid('json');

    logger.info('Optimizing single day route', {
      dayNumber: day.dayNumber,
      poiCount: day.pois.length,
    });

    try {
      const result = RouteOptimizerService.optimizeDayRoute(
        day as DayItinerary,
        options as OptimizationOptions
      );

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(
        'Day optimization failed',
        error instanceof Error ? error : null
      );
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
 * POST /optimize/itinerary
 * Optimize a full multi-day itinerary
 */
routeOptimizationRouter.post(
  '/itinerary',
  zValidator('json', OptimizeItineraryRequestSchema),
  async (c) => {
    const { days, options } = c.req.valid('json');

    logger.info('Optimizing full itinerary', {
      dayCount: days.length,
      totalPois: days.reduce((sum, d) => sum + d.pois.length, 0),
    });

    try {
      const result = RouteOptimizerService.optimizeItinerary(
        days as DayItinerary[],
        options as OptimizationOptions
      );

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(
        'Itinerary optimization failed',
        error instanceof Error ? error : null
      );
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
 * POST /optimize/compare
 * Compare original and optimized routes without modifying
 */
routeOptimizationRouter.post(
  '/compare',
  zValidator('json', OptimizeDayRequestSchema),
  async (c) => {
    const { day, options } = c.req.valid('json');

    logger.info('Comparing routes', {
      dayNumber: day.dayNumber,
      poiCount: day.pois.length,
    });

    try {
      const result = RouteOptimizerService.optimizeDayRoute(
        day as DayItinerary,
        options as OptimizationOptions
      );

      // Build comparison data
      const comparison = {
        original: {
          order: result.originalOrder.map((poi) => poi.name),
          poiCount: result.originalOrder.length,
        },
        optimized: {
          order: result.optimizedOrder.map((poi) => poi.name),
          poiCount: result.optimizedOrder.length,
        },
        savings: result.savings,
        segments: result.segments,
        feasibilityIssues: result.feasibilityIssues,
        recommendation:
          result.savings.distancePercent > 10
            ? 'strongly_recommended'
            : result.savings.distancePercent > 5
              ? 'recommended'
              : 'optional',
      };

      return c.json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      logger.error(
        'Route comparison failed',
        error instanceof Error ? error : null
      );
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

/**
 * GET /optimize/transport-modes
 * Get available transport modes and their characteristics
 */
routeOptimizationRouter.get('/transport-modes', (c) => {
  const modes = [
    {
      id: 'walking',
      name: '步行',
      nameEn: 'Walking',
      avgSpeedKmh: 5,
      maxRecommendedKm: 1.5,
      icon: 'figure.walk',
    },
    {
      id: 'cycling',
      name: '骑行',
      nameEn: 'Cycling',
      avgSpeedKmh: 15,
      maxRecommendedKm: 10,
      icon: 'bicycle',
    },
    {
      id: 'transit',
      name: '公共交通',
      nameEn: 'Public Transit',
      avgSpeedKmh: 25,
      maxRecommendedKm: 30,
      icon: 'bus.fill',
    },
    {
      id: 'taxi',
      name: '出租车',
      nameEn: 'Taxi',
      avgSpeedKmh: 35,
      maxRecommendedKm: 50,
      icon: 'car.fill',
    },
    {
      id: 'driving',
      name: '自驾',
      nameEn: 'Driving',
      avgSpeedKmh: 40,
      maxRecommendedKm: 100,
      icon: 'car',
    },
  ];

  return c.json({
    success: true,
    data: modes,
  });
});

/**
 * POST /optimize/estimate
 * Estimate travel time and distance between two points
 */
routeOptimizationRouter.post(
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
    const { from, to, transportMode } = c.req.valid('json');

    const distance = RouteOptimizerService.haversineDistance(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude
    );

    const mode =
      transportMode || RouteOptimizerService.suggestTransportMode(distance);
    const duration = RouteOptimizerService.calculateTravelTime(distance, mode);

    return c.json({
      success: true,
      data: {
        from: from.name || `${from.latitude}, ${from.longitude}`,
        to: to.name || `${to.latitude}, ${to.longitude}`,
        distanceKm: Math.round(distance * 100) / 100,
        durationMinutes: duration,
        transportMode: mode,
        suggestedMode: RouteOptimizerService.suggestTransportMode(distance),
      },
    });
  }
);

export default routeOptimizationRouter;
