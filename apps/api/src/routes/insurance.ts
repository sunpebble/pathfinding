import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
  AddInsuranceClaimSchema,
  ClaimGuideQuerySchema,
  CreateUserInsuranceSchema,
  InsuranceCompareQuerySchema,
  InsuranceProductQuerySchema,
  InsuranceRecommendationQuerySchema,
  UpdateUserInsuranceStatusSchema,
  UserInsuranceQuerySchema,
} from '../models/insurance';
import { InsuranceService } from '../services/insuranceService';

interface Variables {
  userId: string;
  accessToken: string;
}

export const insuranceRoutes = new Hono<{ Variables: Variables }>();

// ============================================
// Insurance Products
// ============================================

/**
 * List insurance products
 * GET /insurance/products?type=comprehensive&domesticOnly=true&limit=20
 */
insuranceRoutes.get(
  '/products',
  zValidator('query', InsuranceProductQuerySchema),
  async (c) => {
    const { type, domesticOnly, limit } = c.req.valid('query');

    const products = await InsuranceService.listProducts(
      type,
      domesticOnly,
      limit
    );
    return c.json({ data: products });
  }
);

/**
 * Get recommended insurance products for a destination
 * GET /insurance/recommend?destination=日本&tripDays=7&riskLevel=medium
 */
insuranceRoutes.get(
  '/recommend',
  zValidator('query', InsuranceRecommendationQuerySchema),
  async (c) => {
    const { destination, tripDays, riskLevel } = c.req.valid('query');

    const result = await InsuranceService.getRecommendedProducts(
      destination,
      tripDays,
      riskLevel
    );
    return c.json({ data: result });
  }
);

/**
 * Compare insurance products
 * GET /insurance/compare?productIds=id1,id2,id3
 */
insuranceRoutes.get(
  '/compare',
  zValidator('query', InsuranceCompareQuerySchema),
  async (c) => {
    const { productIds } = c.req.valid('query');

    const products = await InsuranceService.compareProducts(productIds);
    return c.json({ data: products });
  }
);

/**
 * Get insurance product by ID
 * GET /insurance/products/:id
 */
insuranceRoutes.get('/products/:id', async (c) => {
  const productId = c.req.param('id');

  const product = await InsuranceService.getProductById(productId);
  return c.json({ data: product });
});

// ============================================
// User Insurance
// ============================================

/**
 * List user's insurance policies
 * GET /insurance/my?status=active
 */
insuranceRoutes.get(
  '/my',
  zValidator('query', UserInsuranceQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const { status } = c.req.valid('query');

    const insurances = await InsuranceService.listUserInsurance(userId, status);
    return c.json({ data: insurances });
  }
);

/**
 * Get user insurance by ID
 * GET /insurance/my/:id
 */
insuranceRoutes.get('/my/:id', async (c) => {
  const insuranceId = c.req.param('id');

  const insurance = await InsuranceService.getUserInsuranceById(insuranceId);
  return c.json({ data: insurance });
});

/**
 * Get insurance for an itinerary
 * GET /insurance/itinerary/:itineraryId
 */
insuranceRoutes.get('/itinerary/:itineraryId', async (c) => {
  const itineraryId = c.req.param('itineraryId');

  const insurances =
    await InsuranceService.getInsuranceByItinerary(itineraryId);
  return c.json({ data: insurances });
});

/**
 * Create user insurance record
 * POST /insurance/my
 */
insuranceRoutes.post(
  '/my',
  zValidator('json', CreateUserInsuranceSchema),
  async (c) => {
    const userId = c.get('userId');
    const data = c.req.valid('json');

    const id = await InsuranceService.createUserInsurance({
      userId,
      ...data,
    });

    return c.json({ data: { id } }, 201);
  }
);

/**
 * Update user insurance status
 * PATCH /insurance/my/:id/status
 */
insuranceRoutes.patch(
  '/my/:id/status',
  zValidator('json', UpdateUserInsuranceStatusSchema),
  async (c) => {
    const insuranceId = c.req.param('id');
    const data = c.req.valid('json');

    const insurance = await InsuranceService.updateUserInsuranceStatus(
      insuranceId,
      data
    );
    return c.json({ data: insurance });
  }
);

/**
 * Add claim to user insurance
 * POST /insurance/my/:id/claim
 */
insuranceRoutes.post(
  '/my/:id/claim',
  zValidator('json', AddInsuranceClaimSchema),
  async (c) => {
    const insuranceId = c.req.param('id');
    const data = c.req.valid('json');

    const claim = await InsuranceService.addInsuranceClaim(insuranceId, data);
    return c.json({ data: claim }, 201);
  }
);

// ============================================
// Destination Risk Profiles
// ============================================

/**
 * Get destination risk profile
 * GET /insurance/risk?destination=日本 or GET /insurance/risk?destinationCode=JP
 */
insuranceRoutes.get('/risk', async (c) => {
  const destination = c.req.query('destination');
  const destinationCode = c.req.query('destinationCode');

  if (!destination && !destinationCode) {
    return c.json(
      { error: 'Either destination or destinationCode is required' },
      400
    );
  }

  const profile = await InsuranceService.getDestinationRiskProfile(
    destination,
    destinationCode
  );

  if (!profile) {
    return c.json({ error: 'Destination risk profile not found' }, 404);
  }

  return c.json({ data: profile });
});

/**
 * List destinations by risk level
 * GET /insurance/risk/level/:riskLevel
 */
insuranceRoutes.get('/risk/level/:riskLevel', async (c) => {
  const riskLevel = c.req.param('riskLevel') as
    | 'low'
    | 'medium'
    | 'high'
    | 'extreme';

  const profiles =
    await InsuranceService.listDestinationsByRiskLevel(riskLevel);
  return c.json({ data: profiles });
});

// ============================================
// Insurance Claim Guides
// ============================================

/**
 * List claim guides
 * GET /insurance/claim-guides?claimType=medical
 */
insuranceRoutes.get(
  '/claim-guides',
  zValidator('query', ClaimGuideQuerySchema),
  async (c) => {
    const { claimType } = c.req.valid('query');

    const guides = await InsuranceService.listClaimGuides(claimType);
    return c.json({ data: guides });
  }
);

/**
 * Get claim guide by ID
 * GET /insurance/claim-guides/:id
 */
insuranceRoutes.get('/claim-guides/:id', async (c) => {
  const guideId = c.req.param('id');

  const guide = await InsuranceService.getClaimGuideById(guideId);
  return c.json({ data: guide });
});
