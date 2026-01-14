/**
 * Charging Station Routes - API endpoints for EV charging stations
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthContext } from '../middleware/auth';
import { ChargingStationService } from '../services/chargingStationService';

// ============================================
// Validators
// ============================================

const stationTypeSchema = z.enum(['public', 'private', 'destination', 'highway']);

const stationStatusSchema = z.enum(['operational', 'maintenance', 'offline', 'coming_soon']);

const chargerTypeSchema = z.enum(['ac_slow', 'ac_fast', 'dc_fast', 'dc_superfast']);

const amenitySchema = z.enum([
  'restroom',
  'convenience_store',
  'restaurant',
  'wifi',
  'lounge',
  'car_wash',
  'covered',
  'lighting',
  'security',
]);

const paymentMethodSchema = z.enum(['app', 'wechat', 'alipay', 'card', 'membership']);

const listStationsQuerySchema = z.object({
  cityId: z.string().optional(),
  stationType: stationTypeSchema.optional(),
  status: stationStatusSchema.optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

const nearbyStationsQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(100).default(10),
  stationType: stationTypeSchema.optional(),
  status: stationStatusSchema.optional(),
  hasAvailablePorts: z.coerce.boolean().optional(),
  chargerType: chargerTypeSchema.optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const searchStationsQuerySchema = z.object({
  query: z.string().min(1),
  cityId: z.string().optional(),
  stationType: stationTypeSchema.optional(),
  status: stationStatusSchema.optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const operatorQuerySchema = z.object({
  operatorName: z.string().min(1),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const statsQuerySchema = z.object({
  cityId: z.string().optional(),
});

const updateAvailabilityBodySchema = z.object({
  availablePorts: z.number().min(0),
  chargerTypes: z
    .array(
      z.object({
        type: chargerTypeSchema,
        powerKw: z.number().min(0),
        count: z.number().min(0),
        available: z.number().min(0),
        connectorType: z.string().optional(),
      })
    )
    .optional(),
  status: stationStatusSchema.optional(),
});

const listReviewsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

const createReviewBodySchema = z.object({
  content: z.string().min(1).max(2000),
  rating: z.number().min(1).max(5),
  chargerType: z.string().max(50).optional(),
  chargingDuration: z.number().min(0).optional(),
  energyCharged: z.number().min(0).optional(),
  totalCost: z.number().min(0).optional(),
  vehicleModel: z.string().max(100).optional(),
  visitDate: z.string().max(20).optional(),
  pros: z.array(z.string().max(200)).optional(),
  cons: z.array(z.string().max(200)).optional(),
  imageUrls: z.array(z.string().url()).optional(),
});

const favoriteNotesBodySchema = z.object({
  notes: z.string().max(500).optional(),
});

// ============================================
// Public Routes (no auth required)
// ============================================

export const publicChargingStationRoutes = new Hono();

// List charging stations
publicChargingStationRoutes.get(
  '/',
  zValidator('query', listStationsQuerySchema),
  async (c) => {
    const { cityId, stationType, status, limit, offset } = c.req.valid('query');
    const result = await ChargingStationService.list(
      cityId,
      stationType,
      status,
      limit,
      offset
    );
    return c.json(result);
  }
);

// Get charging station by ID
publicChargingStationRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const station = await ChargingStationService.getById(id);
  return c.json({ data: station });
});

// Get nearby charging stations
publicChargingStationRoutes.get(
  '/nearby',
  zValidator('query', nearbyStationsQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const stations = await ChargingStationService.getNearby(query);
    return c.json({ data: stations });
  }
);

// Search charging stations
publicChargingStationRoutes.get(
  '/search',
  zValidator('query', searchStationsQuerySchema),
  async (c) => {
    const { query, cityId, stationType, status, limit } = c.req.valid('query');
    const stations = await ChargingStationService.search(
      query,
      cityId,
      stationType,
      status,
      limit
    );
    return c.json({ data: stations });
  }
);

// Get stations by operator
publicChargingStationRoutes.get(
  '/operator',
  zValidator('query', operatorQuerySchema),
  async (c) => {
    const { operatorName, limit } = c.req.valid('query');
    const stations = await ChargingStationService.getByOperator(operatorName, limit);
    return c.json({ data: stations });
  }
);

// Get station statistics
publicChargingStationRoutes.get(
  '/stats',
  zValidator('query', statsQuerySchema),
  async (c) => {
    const { cityId } = c.req.valid('query');
    const stats = await ChargingStationService.getStats(cityId);
    return c.json({ data: stats });
  }
);

// List reviews for a charging station
publicChargingStationRoutes.get(
  '/:stationId/reviews',
  zValidator('query', listReviewsQuerySchema),
  async (c) => {
    const stationId = c.req.param('stationId');
    const { limit, offset } = c.req.valid('query');
    const result = await ChargingStationService.getReviews(stationId, limit, offset);
    return c.json(result);
  }
);

// ============================================
// Protected Routes (auth required)
// ============================================

export const chargingStationRoutes = new Hono<{ Variables: AuthContext }>();

// Update station availability (for operators/admins)
chargingStationRoutes.patch(
  '/:id/availability',
  zValidator('json', updateAvailabilityBodySchema),
  async (c) => {
    const id = c.req.param('id');
    const { availablePorts, chargerTypes, status } = c.req.valid('json');
    const token = c.get('accessToken');

    const station = await ChargingStationService.updateAvailability(
      id,
      availablePorts,
      chargerTypes,
      status,
      token
    );
    return c.json({ data: station });
  }
);

// Add a review
chargingStationRoutes.post(
  '/:stationId/reviews',
  zValidator('json', createReviewBodySchema),
  async (c) => {
    const stationId = c.req.param('stationId');
    const body = c.req.valid('json');
    const userId = c.get('userId');
    const token = c.get('accessToken');

    const id = await ChargingStationService.addReview(
      {
        ...body,
        stationId,
        userId,
      },
      token
    );

    return c.json({ data: { id } }, 201);
  }
);

// Get user's favorite charging stations
chargingStationRoutes.get('/favorites', async (c) => {
  const userId = c.get('userId');
  const token = c.get('accessToken');
  const limit = c.req.query('limit')
    ? parseInt(c.req.query('limit')!, 10)
    : undefined;

  const stations = await ChargingStationService.getUserFavorites(userId, limit, token);
  return c.json({ data: stations });
});

// Add station to favorites
chargingStationRoutes.post(
  '/:stationId/favorite',
  zValidator('json', favoriteNotesBodySchema),
  async (c) => {
    const stationId = c.req.param('stationId');
    const { notes } = c.req.valid('json');
    const userId = c.get('userId');
    const token = c.get('accessToken');

    const id = await ChargingStationService.addToFavorites(
      userId,
      stationId,
      notes,
      token
    );

    return c.json({ data: { id } }, 201);
  }
);

// Remove station from favorites
chargingStationRoutes.delete('/:stationId/favorite', async (c) => {
  const stationId = c.req.param('stationId');
  const userId = c.get('userId');
  const token = c.get('accessToken');

  await ChargingStationService.removeFromFavorites(userId, stationId, token);
  return c.json({ success: true });
});

// Check if station is in favorites
chargingStationRoutes.get('/:stationId/favorite', async (c) => {
  const stationId = c.req.param('stationId');
  const userId = c.get('userId');
  const token = c.get('accessToken');

  const isFavorite = await ChargingStationService.isFavorite(userId, stationId, token);
  return c.json({ data: { isFavorite } });
});
