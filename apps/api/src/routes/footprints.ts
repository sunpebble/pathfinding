/**
 * Travel Footprints API Routes
 * Manages visited cities, countries, and travel statistics
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { api, convex } from '../lib/convex';

interface Variables {
  userId: string;
  accessToken: string;
}

export const footprintsRoutes = new Hono<{ Variables: Variables }>();

// ============================================
// Visited Cities
// ============================================

/**
 * GET /footprints/cities - List user's visited cities
 */
footprintsRoutes.get('/cities', async (c) => {
  const userId = c.get('userId');

  const cities = await convex.query(api.travelFootprints.listVisitedCities, {
    userId,
  });

  return c.json({
    success: true,
    data: cities,
  });
});

/**
 * POST /footprints/cities - Add a visited city
 */
footprintsRoutes.post(
  '/cities',
  zValidator(
    'json',
    z.object({
      cityName: z.string().min(1),
      cityNameEn: z.string().optional(),
      countryCode: z.string().length(2),
      countryName: z.string().min(1),
      countryNameEn: z.string().optional(),
      latitude: z.number(),
      longitude: z.number(),
      visitedAt: z.number(), // Unix timestamp
      notes: z.string().optional(),
      photos: z.array(z.string()).optional(),
      rating: z.number().min(1).max(5).optional(),
      travelGuideId: z.string().optional(),
      itineraryId: z.string().optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const input = c.req.valid('json');

    // Add visited city
    const cityId = await convex.mutation(api.travelFootprints.addVisitedCity, {
      userId,
      ...input,
    });

    // Update or create country record
    await convex.mutation(api.travelFootprints.upsertVisitedCountry, {
      userId,
      countryCode: input.countryCode,
      countryName: input.countryName,
      countryNameEn: input.countryNameEn,
      firstVisitedAt: input.visitedAt,
    });

    // Update travel stats
    await convex.mutation(api.travelFootprints.updateTravelStats, {
      userId,
    });

    return c.json(
      {
        success: true,
        data: { id: cityId },
      },
      201
    );
  }
);

/**
 * PATCH /footprints/cities/:id - Update a visited city
 */
footprintsRoutes.patch(
  '/cities/:id',
  zValidator(
    'json',
    z.object({
      notes: z.string().optional(),
      photos: z.array(z.string()).optional(),
      rating: z.number().min(1).max(5).optional(),
    })
  ),
  async (c) => {
    const cityId = c.req.param('id');
    const input = c.req.valid('json');

    const updated = await convex.mutation(
      api.travelFootprints.updateVisitedCity,
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id: cityId as any,
        ...input,
      }
    );

    return c.json({
      success: true,
      data: updated,
    });
  }
);

/**
 * DELETE /footprints/cities/:id - Remove a visited city
 */
footprintsRoutes.delete('/cities/:id', async (c) => {
  const userId = c.get('userId');
  const cityId = c.req.param('id');

  await convex.mutation(api.travelFootprints.removeVisitedCity, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: cityId as any,
  });

  // Update travel stats
  await convex.mutation(api.travelFootprints.updateTravelStats, {
    userId,
  });

  return c.json({
    success: true,
    data: null,
  });
});

// ============================================
// Visited Countries
// ============================================

/**
 * GET /footprints/countries - List user's visited countries
 */
footprintsRoutes.get('/countries', async (c) => {
  const userId = c.get('userId');

  const countries = await convex.query(
    api.travelFootprints.listVisitedCountries,
    {
      userId,
    }
  );

  return c.json({
    success: true,
    data: countries,
  });
});

// ============================================
// Travel Statistics
// ============================================

/**
 * GET /footprints/stats - Get user's travel statistics
 */
footprintsRoutes.get('/stats', async (c) => {
  const userId = c.get('userId');

  const stats = await convex.query(api.travelFootprints.getTravelStats, {
    userId,
  });

  return c.json({
    success: true,
    data: stats,
  });
});

/**
 * POST /footprints/stats/refresh - Refresh/recalculate travel statistics
 */
footprintsRoutes.post('/stats/refresh', async (c) => {
  const userId = c.get('userId');

  await convex.mutation(api.travelFootprints.updateTravelStats, {
    userId,
  });

  const stats = await convex.query(api.travelFootprints.getTravelStats, {
    userId,
  });

  return c.json({
    success: true,
    data: stats,
  });
});

/**
 * PATCH /footprints/goals - Set travel goals
 */
footprintsRoutes.patch(
  '/goals',
  zValidator(
    'json',
    z.object({
      goalCities: z.number().min(1).optional(),
      goalCountries: z.number().min(1).optional(),
      nextGoalCity: z
        .object({
          cityName: z.string(),
          countryCode: z.string().length(2),
          countryName: z.string(),
          latitude: z.number(),
          longitude: z.number(),
          plannedDate: z.number().optional(),
          notes: z.string().optional(),
        })
        .optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const input = c.req.valid('json');

    await convex.mutation(api.travelFootprints.setTravelGoals, {
      userId,
      ...input,
    });

    const stats = await convex.query(api.travelFootprints.getTravelStats, {
      userId,
    });

    return c.json({
      success: true,
      data: stats,
    });
  }
);

// ============================================
// Timeline
// ============================================

/**
 * GET /footprints/timeline - Get travel timeline
 */
footprintsRoutes.get(
  '/timeline',
  zValidator(
    'query',
    z.object({
      limit: z.coerce.number().int().min(1).max(100).optional().default(20),
      offset: z.coerce.number().int().min(0).optional().default(0),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');

    const timeline = await convex.query(api.travelFootprints.getTravelTimeline, {
      userId,
      limit: query.limit,
      offset: query.offset,
    });

    return c.json({
      success: true,
      data: timeline.data,
      meta: {
        total: timeline.total,
        limit: query.limit,
        offset: query.offset,
        hasMore: timeline.hasMore,
      },
    });
  }
);

// ============================================
// Map Data (GeoJSON format)
// ============================================

/**
 * GET /footprints/map - Get visited locations as GeoJSON for map rendering
 */
footprintsRoutes.get('/map', async (c) => {
  const userId = c.get('userId');

  const [cities, countries] = await Promise.all([
    convex.query(api.travelFootprints.listVisitedCities, { userId }),
    convex.query(api.travelFootprints.listVisitedCountries, { userId }),
  ]);

  // Convert to GeoJSON format
  const cityFeatures = cities.map((city) => ({
    type: 'Feature' as const,
    properties: {
      id: city._id,
      name: city.cityName,
      nameEn: city.cityNameEn,
      countryCode: city.countryCode,
      countryName: city.countryName,
      visitCount: city.visitCount || 1,
      rating: city.rating,
      firstVisited: city.firstVisitedAt || city.visitedAt,
      lastVisited: city.lastVisitedAt || city.visitedAt,
      type: 'city',
    },
    geometry: {
      type: 'Point' as const,
      coordinates: [city.longitude, city.latitude],
    },
  }));

  // List of country codes visited
  const visitedCountryCodes = countries.map((c) => c.countryCode);

  return c.json({
    success: true,
    data: {
      type: 'FeatureCollection' as const,
      features: cityFeatures,
      visitedCountries: visitedCountryCodes,
      summary: {
        totalCities: cities.length,
        totalCountries: countries.length,
      },
    },
  });
});
