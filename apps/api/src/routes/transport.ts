/**
 * Transport Planning API Routes
 * Provides endpoints for multi-modal transport route planning
 * Proxies to the crawler service for AMap API integration
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

const CoordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const TransportModeSchema = z.enum([
  'walking',
  'cycling',
  'driving',
  'taxi',
  'bus',
  'subway',
  'transit',
]);

const CompareRoutesRequestSchema = z.object({
  origin: CoordinateSchema,
  destination: CoordinateSchema,
  originName: z.string().optional(),
  destinationName: z.string().optional(),
  city: z.string().optional(),
  modes: z.array(TransportModeSchema).optional(),
});

const BatchRoutesRequestSchema = z.object({
  routes: z.array(
    z.object({
      origin: CoordinateSchema,
      destination: CoordinateSchema,
      originName: z.string().optional(),
      destinationName: z.string().optional(),
    })
  ).max(10),
  city: z.string().optional(),
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
  const url = `${CRAWLER_URL}/api/transport${path}`;

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
// Public Routes (no auth required for transport info)
// ============================================================================

export const publicTransportRoutes = new Hono();

/**
 * POST /transport/compare
 * Compare multiple transport modes for a route
 */
publicTransportRoutes.post(
  '/compare',
  zValidator('json', CompareRoutesRequestSchema),
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
          error: 'Failed to compare transport routes',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  }
);

/**
 * GET /transport/compare
 * Compare transport modes using query parameters
 */
publicTransportRoutes.get('/compare', async (c) => {
  const origin = c.req.query('origin');
  const destination = c.req.query('destination');
  const originName = c.req.query('origin_name');
  const destinationName = c.req.query('destination_name');
  const city = c.req.query('city');
  const modes = c.req.query('modes');

  if (!origin || !destination) {
    return c.json(
      {
        success: false,
        error: 'Origin and destination coordinates are required',
      },
      400
    );
  }

  try {
    const params = new URLSearchParams({ origin, destination });
    if (originName) params.set('origin_name', originName);
    if (destinationName) params.set('destination_name', destinationName);
    if (city) params.set('city', city);
    if (modes) params.set('modes', modes);

    const response = await fetch(
      `${CRAWLER_URL}/api/transport/compare?${params.toString()}`
    );
    const data = await response.json();
    return c.json(data, response.status as 200);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to compare transport routes',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /transport/walking
 * Get walking route
 */
publicTransportRoutes.get('/walking', async (c) => {
  const origin = c.req.query('origin');
  const destination = c.req.query('destination');

  if (!origin || !destination) {
    return c.json(
      {
        success: false,
        error: 'Origin and destination coordinates are required',
      },
      400
    );
  }

  try {
    const params = new URLSearchParams({ origin, destination });
    const response = await fetch(
      `${CRAWLER_URL}/api/transport/walking?${params.toString()}`
    );
    const data = await response.json();
    return c.json(data, response.status as 200);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to get walking route',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /transport/cycling
 * Get cycling route
 */
publicTransportRoutes.get('/cycling', async (c) => {
  const origin = c.req.query('origin');
  const destination = c.req.query('destination');

  if (!origin || !destination) {
    return c.json(
      {
        success: false,
        error: 'Origin and destination coordinates are required',
      },
      400
    );
  }

  try {
    const params = new URLSearchParams({ origin, destination });
    const response = await fetch(
      `${CRAWLER_URL}/api/transport/cycling?${params.toString()}`
    );
    const data = await response.json();
    return c.json(data, response.status as 200);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to get cycling route',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /transport/driving
 * Get driving route (includes taxi estimate)
 */
publicTransportRoutes.get('/driving', async (c) => {
  const origin = c.req.query('origin');
  const destination = c.req.query('destination');
  const city = c.req.query('city');

  if (!origin || !destination) {
    return c.json(
      {
        success: false,
        error: 'Origin and destination coordinates are required',
      },
      400
    );
  }

  try {
    const params = new URLSearchParams({ origin, destination });
    if (city) params.set('city', city);
    const response = await fetch(
      `${CRAWLER_URL}/api/transport/driving?${params.toString()}`
    );
    const data = await response.json();
    return c.json(data, response.status as 200);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to get driving route',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /transport/transit
 * Get public transit route
 */
publicTransportRoutes.get('/transit', async (c) => {
  const origin = c.req.query('origin');
  const destination = c.req.query('destination');
  const city = c.req.query('city');

  if (!origin || !destination) {
    return c.json(
      {
        success: false,
        error: 'Origin and destination coordinates are required',
      },
      400
    );
  }

  if (!city) {
    return c.json(
      {
        success: false,
        error: 'City parameter is required for transit routes',
      },
      400
    );
  }

  try {
    const params = new URLSearchParams({ origin, destination, city });
    const response = await fetch(
      `${CRAWLER_URL}/api/transport/transit?${params.toString()}`
    );
    const data = await response.json();
    return c.json(data, response.status as 200);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to get transit route',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /transport/city/:name
 * Get transit information for a city
 */
publicTransportRoutes.get('/city/:name', async (c) => {
  const cityName = c.req.param('name');

  try {
    const response = await fetch(
      `${CRAWLER_URL}/api/transport/city/${encodeURIComponent(cityName)}`
    );
    const data = await response.json();
    return c.json(data, response.status as 200);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to get city transit info',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /transport/passes/:city
 * Get transit pass recommendations for a city
 */
publicTransportRoutes.get('/passes/:city', async (c) => {
  const cityName = c.req.param('city');

  try {
    const response = await fetch(
      `${CRAWLER_URL}/api/transport/passes/${encodeURIComponent(cityName)}`
    );
    const data = await response.json();
    return c.json(data, response.status as 200);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to get transit passes',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /transport/tips/:city
 * Get transit tips for a city
 */
publicTransportRoutes.get('/tips/:city', async (c) => {
  const cityName = c.req.param('city');

  try {
    const response = await fetch(
      `${CRAWLER_URL}/api/transport/tips/${encodeURIComponent(cityName)}`
    );
    const data = await response.json();
    return c.json(data, response.status as 200);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to get transit tips',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// ============================================================================
// Protected Routes (auth required for batch operations)
// ============================================================================

export const transportRoutes = new Hono<{ Variables: Variables }>();

/**
 * POST /transport/batch
 * Compare routes for multiple origin-destination pairs
 */
transportRoutes.post(
  '/batch',
  zValidator('json', BatchRoutesRequestSchema),
  async (c) => {
    const body = c.req.valid('json');

    try {
      const response = await proxyToCrawler('/batch', 'POST', body);
      const data = await response.json();
      return c.json(data, response.status as 200);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: 'Failed to process batch transport routes',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  }
);

export default transportRoutes;
