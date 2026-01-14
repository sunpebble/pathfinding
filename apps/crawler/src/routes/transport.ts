/**
 * Transport Planning API Routes
 * Endpoints for multi-modal transport route planning and comparison
 */

import type {
  CityTransitInfo,
  Coordinate,
  TransportComparison,
  TransportMode,
} from '@pathfinding/types';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { createLogger } from '../lib/logger.js';
import { Errors } from '../middleware/error-handler.js';
import { getAmapTransportService } from '../services/amap-transport.service.js';

const logger = createLogger('TransportRoutes');

export const transportRouter = new Hono();

/**
 * Parse coordinate from query string
 * Accepts formats: "lat,lng" or separate lat/lng params
 */
function parseCoordinate(
  latOrCoord: string | undefined,
  lng?: string
): Coordinate | null {
  if (!latOrCoord) return null;

  // Check if it's a combined format "lat,lng"
  if (latOrCoord.includes(',')) {
    const parts = latOrCoord.split(',');
    if (parts.length !== 2) return null;
    const latitude = parseFloat(parts[0]);
    const longitude = parseFloat(parts[1]);
    if (isNaN(latitude) || isNaN(longitude)) return null;
    return { latitude, longitude };
  }

  // Separate lat/lng params
  if (!lng) return null;
  const latitude = parseFloat(latOrCoord);
  const longitude = parseFloat(lng);
  if (isNaN(latitude) || isNaN(longitude)) return null;
  return { latitude, longitude };
}

/**
 * POST /api/transport/compare
 * Compare multiple transport modes for a route
 *
 * Request body:
 * {
 *   origin: { latitude: number, longitude: number },
 *   destination: { latitude: number, longitude: number },
 *   originName?: string,
 *   destinationName?: string,
 *   city?: string,
 *   modes?: TransportMode[]
 * }
 */
transportRouter.post('/compare', async (c: Context) => {
  const body = await c.req.json();

  const { origin, destination, originName, destinationName, city, modes } =
    body;

  // Validate required fields
  if (!origin?.latitude || !origin?.longitude) {
    throw Errors.badRequest('Origin coordinates are required');
  }
  if (!destination?.latitude || !destination?.longitude) {
    throw Errors.badRequest('Destination coordinates are required');
  }

  logger.info('Comparing transport routes', {
    origin,
    destination,
    city,
    modes,
  });

  const service = getAmapTransportService();
  const comparison = await service.compareRoutes(
    origin,
    destination,
    originName,
    destinationName,
    city
  );

  // Filter by requested modes if specified
  if (modes && Array.isArray(modes) && modes.length > 0) {
    comparison.routes = comparison.routes.filter((route) =>
      modes.includes(route.mode)
    );
  }

  return c.json({
    data: comparison,
  });
});

/**
 * GET /api/transport/compare
 * Compare transport modes using query parameters
 *
 * Query params:
 * - origin: "lat,lng" format
 * - destination: "lat,lng" format
 * - origin_name: optional origin name
 * - destination_name: optional destination name
 * - city: city name for transit routes
 * - modes: comma-separated list of modes to include
 */
transportRouter.get('/compare', async (c: Context) => {
  const originParam = c.req.query('origin');
  const destinationParam = c.req.query('destination');
  const originName = c.req.query('origin_name');
  const destinationName = c.req.query('destination_name');
  const city = c.req.query('city');
  const modesParam = c.req.query('modes');

  const origin = parseCoordinate(originParam);
  const destination = parseCoordinate(destinationParam);

  if (!origin) {
    throw Errors.badRequest(
      'Origin coordinates required in format "lat,lng"'
    );
  }
  if (!destination) {
    throw Errors.badRequest(
      'Destination coordinates required in format "lat,lng"'
    );
  }

  const modes = modesParam
    ? (modesParam.split(',') as TransportMode[])
    : undefined;

  logger.info('Comparing transport routes (GET)', {
    origin,
    destination,
    city,
    modes,
  });

  const service = getAmapTransportService();
  const comparison = await service.compareRoutes(
    origin,
    destination,
    originName,
    destinationName,
    city
  );

  // Filter by requested modes if specified
  if (modes && modes.length > 0) {
    comparison.routes = comparison.routes.filter((route) =>
      modes.includes(route.mode)
    );
  }

  return c.json({
    data: comparison,
  });
});

/**
 * GET /api/transport/walking
 * Get walking route only
 */
transportRouter.get('/walking', async (c: Context) => {
  const originParam = c.req.query('origin');
  const destinationParam = c.req.query('destination');

  const origin = parseCoordinate(originParam);
  const destination = parseCoordinate(destinationParam);

  if (!origin || !destination) {
    throw Errors.badRequest(
      'Origin and destination coordinates required in format "lat,lng"'
    );
  }

  const service = getAmapTransportService();
  const route = await service.getWalkingRoute(origin, destination);

  if (!route) {
    throw Errors.notFound('Walking route');
  }

  return c.json({ data: route });
});

/**
 * GET /api/transport/cycling
 * Get cycling route only
 */
transportRouter.get('/cycling', async (c: Context) => {
  const originParam = c.req.query('origin');
  const destinationParam = c.req.query('destination');

  const origin = parseCoordinate(originParam);
  const destination = parseCoordinate(destinationParam);

  if (!origin || !destination) {
    throw Errors.badRequest(
      'Origin and destination coordinates required in format "lat,lng"'
    );
  }

  const service = getAmapTransportService();
  const route = await service.getCyclingRoute(origin, destination);

  if (!route) {
    throw Errors.notFound('Cycling route');
  }

  return c.json({ data: route });
});

/**
 * GET /api/transport/driving
 * Get driving route (includes taxi estimate)
 */
transportRouter.get('/driving', async (c: Context) => {
  const originParam = c.req.query('origin');
  const destinationParam = c.req.query('destination');
  const city = c.req.query('city');

  const origin = parseCoordinate(originParam);
  const destination = parseCoordinate(destinationParam);

  if (!origin || !destination) {
    throw Errors.badRequest(
      'Origin and destination coordinates required in format "lat,lng"'
    );
  }

  const service = getAmapTransportService();
  const result = await service.getDrivingRoute(origin, destination, city);

  if (!result.driving && !result.taxi) {
    throw Errors.notFound('Driving route');
  }

  return c.json({
    data: {
      driving: result.driving,
      taxi: result.taxi,
    },
  });
});

/**
 * GET /api/transport/transit
 * Get public transit route
 */
transportRouter.get('/transit', async (c: Context) => {
  const originParam = c.req.query('origin');
  const destinationParam = c.req.query('destination');
  const city = c.req.query('city');

  const origin = parseCoordinate(originParam);
  const destination = parseCoordinate(destinationParam);

  if (!origin || !destination) {
    throw Errors.badRequest(
      'Origin and destination coordinates required in format "lat,lng"'
    );
  }

  if (!city) {
    throw Errors.badRequest('City parameter is required for transit routes');
  }

  const service = getAmapTransportService();
  const route = await service.getTransitRoute(origin, destination, city);

  if (!route) {
    throw Errors.notFound('Transit route');
  }

  return c.json({ data: route });
});

/**
 * GET /api/transport/city/:name
 * Get transit information for a city
 */
transportRouter.get('/city/:name', async (c: Context) => {
  const cityName = decodeURIComponent(c.req.param('name'));

  const service = getAmapTransportService();
  const passes = service.getTransitPasses(cityName);
  const tips = service.getTransitTips(cityName);

  // Build city transit info
  const cityInfo: CityTransitInfo = {
    city: cityName,
    cityZh: cityName,
    hasSubway: [
      '北京',
      '上海',
      '广州',
      '深圳',
      '杭州',
      '成都',
      '西安',
      '南京',
      '武汉',
      '重庆',
      '苏州',
      '天津',
      '厦门',
      '青岛',
      '大连',
      '昆明',
    ].includes(cityName),
    hasBus: true,
    hasBike: true,
    passes,
    tips,
  };

  // Add subway line counts for major cities
  const subwayLines: Record<string, number> = {
    北京: 27,
    上海: 20,
    广州: 16,
    深圳: 16,
    杭州: 12,
    成都: 13,
    西安: 8,
    南京: 13,
    武汉: 12,
    重庆: 12,
  };

  if (subwayLines[cityName]) {
    cityInfo.subwayLines = subwayLines[cityName];
  }

  return c.json({ data: cityInfo });
});

/**
 * GET /api/transport/passes/:city
 * Get transit pass recommendations for a city
 */
transportRouter.get('/passes/:city', async (c: Context) => {
  const cityName = decodeURIComponent(c.req.param('city'));

  const service = getAmapTransportService();
  const passes = service.getTransitPasses(cityName);

  return c.json({
    data: passes,
    city: cityName,
  });
});

/**
 * GET /api/transport/tips/:city
 * Get transit tips for a city
 */
transportRouter.get('/tips/:city', async (c: Context) => {
  const cityName = decodeURIComponent(c.req.param('city'));

  const service = getAmapTransportService();
  const tips = service.getTransitTips(cityName);

  return c.json({
    data: tips,
    city: cityName,
  });
});

/**
 * POST /api/transport/batch
 * Compare routes for multiple origin-destination pairs
 *
 * Request body:
 * {
 *   routes: Array<{
 *     origin: Coordinate,
 *     destination: Coordinate,
 *     originName?: string,
 *     destinationName?: string
 *   }>,
 *   city?: string
 * }
 */
transportRouter.post('/batch', async (c: Context) => {
  const body = await c.req.json();
  const { routes, city } = body;

  if (!routes || !Array.isArray(routes) || routes.length === 0) {
    throw Errors.badRequest('Routes array is required');
  }

  if (routes.length > 10) {
    throw Errors.badRequest('Maximum 10 routes per batch request');
  }

  logger.info('Batch transport comparison', {
    routeCount: routes.length,
    city,
  });

  const service = getAmapTransportService();
  const results: TransportComparison[] = [];

  // Process routes sequentially to respect rate limits
  for (const route of routes) {
    if (!route.origin || !route.destination) {
      continue;
    }

    const comparison = await service.compareRoutes(
      route.origin,
      route.destination,
      route.originName,
      route.destinationName,
      city
    );
    results.push(comparison);
  }

  return c.json({
    data: results,
    count: results.length,
  });
});

export default transportRouter;
