import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { TippingService } from '../services/tippingService';

interface Variables {
  userId: string;
  accessToken: string;
}

export const tippingRoutes = new Hono<{ Variables: Variables }>();

// Tipping culture enum for validation
const TippingCultureSchema = z.enum([
  'expected',
  'appreciated',
  'optional',
  'not_expected',
  'offensive',
]);

// Scenario type enum for validation
const ScenarioTypeSchema = z.enum([
  'restaurant',
  'hotel',
  'taxi',
  'bar',
  'spa',
  'tour',
  'delivery',
  'hairdresser',
  'other',
]);

/**
 * List all tipping guides
 * GET /tipping/guides
 */
tippingRoutes.get('/guides', async (c) => {
  const accessToken = c.get('accessToken');
  const data = await TippingService.list(accessToken);
  return c.json({ data });
});

/**
 * Get tipping guide by country code
 * GET /tipping/guides/:countryCode
 */
tippingRoutes.get('/guides/:countryCode', async (c) => {
  const countryCode = c.req.param('countryCode').toUpperCase();
  const accessToken = c.get('accessToken');
  const data = await TippingService.getByCountryCode(countryCode, accessToken);
  return c.json({ data });
});

/**
 * Search tipping guides by name
 * GET /tipping/guides/search?q=美国
 */
tippingRoutes.get(
  '/search',
  zValidator(
    'query',
    z.object({
      q: z.string().min(1, 'Search query is required'),
    })
  ),
  async (c) => {
    const { q } = c.req.valid('query');
    const accessToken = c.get('accessToken');
    const data = await TippingService.searchByName(q, accessToken);
    return c.json({ data });
  }
);

/**
 * Get tipping guides by culture type
 * GET /tipping/by-culture/:culture
 */
tippingRoutes.get(
  '/by-culture/:culture',
  zValidator(
    'param',
    z.object({
      culture: TippingCultureSchema,
    })
  ),
  async (c) => {
    const { culture } = c.req.valid('param');
    const accessToken = c.get('accessToken');
    const data = await TippingService.getByTippingCulture(culture, accessToken);
    return c.json({ data });
  }
);

/**
 * Get scenario info for a specific country and scenario type
 * GET /tipping/scenario/:countryCode/:scenarioType
 */
tippingRoutes.get(
  '/scenario/:countryCode/:scenarioType',
  zValidator(
    'param',
    z.object({
      countryCode: z.string().length(2, 'Country code must be 2 characters'),
      scenarioType: ScenarioTypeSchema,
    })
  ),
  async (c) => {
    const { countryCode, scenarioType } = c.req.valid('param');
    const accessToken = c.get('accessToken');
    const data = await TippingService.getScenario(
      countryCode.toUpperCase(),
      scenarioType,
      accessToken
    );
    return c.json({ data });
  }
);

/**
 * Calculate tip amount
 * POST /tipping/calculate
 */
tippingRoutes.post(
  '/calculate',
  zValidator(
    'json',
    z.object({
      billAmount: z.number().positive('Bill amount must be positive'),
      countryCode: z.string().length(2, 'Country code must be 2 characters'),
      scenarioType: ScenarioTypeSchema,
      serviceQuality: z
        .enum(['poor', 'average', 'good', 'excellent'])
        .optional()
        .default('good'),
      splitCount: z.number().int().min(1).optional().default(1),
      customPercentage: z.number().min(0).max(100).optional(),
    })
  ),
  async (c) => {
    const body = c.req.valid('json');
    const accessToken = c.get('accessToken');
    const result = await TippingService.calculateTip(body, accessToken);
    return c.json({ data: result });
  }
);

/**
 * Seed initial tipping data (admin only)
 * POST /tipping/seed
 */
tippingRoutes.post('/seed', async (c) => {
  const accessToken = c.get('accessToken');
  const result = await TippingService.seedInitialData(accessToken);
  return c.json(result);
});
