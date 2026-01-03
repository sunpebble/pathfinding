import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { PoiCategorySchema, PoiSearchQuerySchema } from '../models/poi.js';
import { PoiService } from '../services/poiService.js';

interface Variables {
  userId: string;
  accessToken: string;
}

export const poisRoutes = new Hono<{ Variables: Variables }>();

/**
 * Search POIs by keyword and filters
 * GET /pois/search?cityId=xxx&query=西湖&category=attraction
 */
poisRoutes.get(
  '/search',
  zValidator('query', PoiSearchQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const result = await PoiService.search(query, accessToken);
    return c.json(result);
  }
);

/**
 * Get POI recommendations sorted by rating
 * GET /pois/recommend?cityId=xxx&category=restaurant&limit=20
 */
poisRoutes.get(
  '/recommend',
  zValidator(
    'query',
    z.object({
      cityId: z.string().uuid('Invalid city ID'),
      category: PoiCategorySchema.optional(),
      limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const { cityId, category, limit } = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const data = await PoiService.getRecommendations(
      cityId,
      category,
      limit,
      accessToken
    );
    return c.json({ data });
  }
);

/**
 * Get nearby POIs
 * GET /pois/nearby?lat=30.2&lng=120.1&radiusKm=5&category=attraction
 */
poisRoutes.get(
  '/nearby',
  zValidator(
    'query',
    z.object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
      radiusKm: z.coerce.number().min(0).max(100).optional().default(5),
      category: PoiCategorySchema.optional(),
      limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const { lat, lng, radiusKm, category, limit } = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const data = await PoiService.getNearby(
      lat,
      lng,
      radiusKm,
      category,
      limit,
      accessToken
    );
    return c.json({ data });
  }
);

/**
 * Get POI by ID
 * GET /pois/:id
 */
poisRoutes.get('/:id', async (c) => {
  const poiId = c.req.param('id');
  const accessToken = c.get('accessToken');

  const data = await PoiService.getById(poiId, accessToken);
  return c.json({ data });
});
