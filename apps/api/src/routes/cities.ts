import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { CityEncyclopediaService } from '../services/cityEncyclopediaService';

interface Variables {
  userId: string;
  accessToken: string;
}

// Validation schemas
const TravelSeasonSchema = z.enum([
  'spring',
  'summer',
  'autumn',
  'winter',
  'all_year',
]);

const CrowdLevelSchema = z.enum(['low', 'medium', 'high']);
const PriceLevelSchema = z.enum(['low', 'medium', 'high']);
const WaterSafetySchema = z.enum(['safe', 'boil', 'bottled']);
const CustomImportanceSchema = z.enum(['low', 'medium', 'high']);
const CustomCategorySchema = z.enum([
  'etiquette',
  'religion',
  'dining',
  'dress',
  'gift',
  'gesture',
  'general',
]);

const BasicInfoSchema = z.object({
  population: z.number().positive().optional(),
  populationYear: z.number().int().min(1900).max(2100).optional(),
  area: z.number().positive().optional(),
  elevation: z.number().optional(),
  climate: z.string().optional(),
  climateEn: z.string().optional(),
  motto: z.string().optional(),
  mottoEn: z.string().optional(),
  nicknames: z.array(z.string()).optional(),
  nicknamesEn: z.array(z.string()).optional(),
});

const HistorySchema = z.object({
  foundedYear: z.number().int().optional(),
  historicalNames: z.array(z.string()).optional(),
  briefHistory: z.string().min(10),
  briefHistoryEn: z.string().optional(),
  culturalHighlights: z.array(z.string()),
  culturalHighlightsEn: z.array(z.string()).optional(),
  famousFor: z.array(z.string()),
  famousForEn: z.array(z.string()).optional(),
  worldHeritageSites: z.array(z.string()).optional(),
});

const BestTravelTimeSchema = z.object({
  seasons: z.array(TravelSeasonSchema),
  months: z.array(z.number().int().min(1).max(12)),
  description: z.string().min(5),
  descriptionEn: z.string().optional(),
  weatherNotes: z.string().optional(),
  crowdLevel: CrowdLevelSchema.optional(),
  priceLevel: PriceLevelSchema.optional(),
});

const LocalCustomSchema = z.object({
  category: CustomCategorySchema,
  title: z.string().min(1),
  titleEn: z.string().optional(),
  description: z.string().min(5),
  descriptionEn: z.string().optional(),
  isTaboo: z.boolean(),
  importance: CustomImportanceSchema,
});

const PracticalInfoSchema = z.object({
  voltage: z.string(),
  plugType: z.array(z.string()),
  currency: z.string(),
  currencySymbol: z.string(),
  currencyNameLocal: z.string(),
  currencyNameEn: z.string(),
  tippingCustom: z.string(),
  tippingCustomEn: z.string().optional(),
  waterSafety: WaterSafetySchema,
  waterSafetyNote: z.string().optional(),
  visaRequired: z.boolean().optional(),
  visaNote: z.string().optional(),
  languageOfficial: z.array(z.string()),
  languageCommon: z.array(z.string()),
  emergencyNumber: z.string(),
  ambulanceNumber: z.string(),
  fireNumber: z.string(),
  touristHotline: z.string().optional(),
});

// Public routes (no auth required)
export const publicCityRoutes = new Hono();

/**
 * List cities with encyclopedia data
 * GET /cities?countryCode=CN&limit=50
 */
publicCityRoutes.get(
  '/',
  zValidator(
    'query',
    z.object({
      countryCode: z.string().length(2).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    })
  ),
  async (c) => {
    const { countryCode, limit } = c.req.valid('query');

    const cities = await CityEncyclopediaService.listCitiesWithEncyclopedia(
      { countryCode, limit },
      ''
    );

    return c.json({ data: cities });
  }
);

/**
 * Search cities by name
 * GET /cities/search?q=Tokyo
 */
publicCityRoutes.get(
  '/search',
  zValidator(
    'query',
    z.object({
      q: z.string().min(1),
    })
  ),
  async (c) => {
    const { q } = c.req.valid('query');

    const cities = await CityEncyclopediaService.searchCities(q, '');

    return c.json({ data: cities });
  }
);

/**
 * Get city by ID
 * GET /cities/:id
 */
publicCityRoutes.get('/:id', async (c) => {
  const cityId = c.req.param('id');

  const city = await CityEncyclopediaService.getCity(cityId, '');

  if (!city) {
    return c.json({ error: 'City not found' }, 404);
  }

  return c.json({ data: city });
});

/**
 * Get city with encyclopedia data
 * GET /cities/:id/encyclopedia
 */
publicCityRoutes.get('/:id/encyclopedia', async (c) => {
  const cityId = c.req.param('id');

  const cityWithEncyclopedia =
    await CityEncyclopediaService.getCityWithEncyclopedia(cityId, '');

  if (!cityWithEncyclopedia) {
    return c.json({ error: 'City not found' }, 404);
  }

  return c.json({ data: cityWithEncyclopedia });
});

/**
 * Get cities by country
 * GET /cities/country/:countryCode
 */
publicCityRoutes.get('/country/:countryCode', async (c) => {
  const countryCode = c.req.param('countryCode');

  const cities = await CityEncyclopediaService.listCitiesByCountry(
    countryCode,
    ''
  );

  return c.json({ data: cities });
});

// Protected routes (auth required)
export const cityRoutes = new Hono<{ Variables: Variables }>();

/**
 * Create or update city encyclopedia
 * POST /cities/:id/encyclopedia
 */
cityRoutes.post(
  '/:id/encyclopedia',
  zValidator(
    'json',
    z.object({
      basicInfo: BasicInfoSchema.optional(),
      history: HistorySchema.optional(),
      bestTravelTime: BestTravelTimeSchema.optional(),
      customs: z.array(LocalCustomSchema),
      practicalInfo: PracticalInfoSchema.optional(),
      sources: z.array(z.string()).optional(),
    })
  ),
  async (c) => {
    const cityId = c.req.param('id');
    const data = c.req.valid('json');
    const accessToken = c.get('accessToken');

    // Verify city exists
    const city = await CityEncyclopediaService.getCity(cityId, accessToken);
    if (!city) {
      return c.json({ error: 'City not found' }, 404);
    }

    const id = await CityEncyclopediaService.upsertEncyclopedia(
      {
        cityId,
        ...data,
      },
      accessToken
    );

    return c.json({ data: { id } }, 201);
  }
);

/**
 * Update city encyclopedia
 * PATCH /cities/:id/encyclopedia
 */
cityRoutes.patch(
  '/:id/encyclopedia',
  zValidator(
    'json',
    z.object({
      basicInfo: BasicInfoSchema.optional(),
      history: HistorySchema.optional(),
      bestTravelTime: BestTravelTimeSchema.optional(),
      customs: z.array(LocalCustomSchema).optional(),
      practicalInfo: PracticalInfoSchema.optional(),
      sources: z.array(z.string()).optional(),
    })
  ),
  async (c) => {
    const cityId = c.req.param('id');
    const data = c.req.valid('json');
    const accessToken = c.get('accessToken');

    // Get existing encyclopedia
    const existing = await CityEncyclopediaService.getEncyclopedia(
      cityId,
      accessToken
    );

    if (!existing) {
      return c.json({ error: 'Encyclopedia not found for this city' }, 404);
    }

    const updated = await CityEncyclopediaService.updateEncyclopedia(
      existing.id,
      data,
      accessToken
    );

    return c.json({ data: updated });
  }
);

/**
 * Delete city encyclopedia
 * DELETE /cities/:id/encyclopedia
 */
cityRoutes.delete('/:id/encyclopedia', async (c) => {
  const cityId = c.req.param('id');
  const accessToken = c.get('accessToken');

  // Get existing encyclopedia
  const existing = await CityEncyclopediaService.getEncyclopedia(
    cityId,
    accessToken
  );

  if (!existing) {
    return c.json({ error: 'Encyclopedia not found for this city' }, 404);
  }

  await CityEncyclopediaService.deleteEncyclopedia(existing.id, accessToken);

  return c.json({ success: true });
});
