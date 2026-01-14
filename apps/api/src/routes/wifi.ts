/**
 * WiFi Routes - API endpoints for WiFi spots, credentials, and reviews
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthContext } from '../middleware/auth';
import {
  WifiSpotService,
  WifiCredentialService,
  WifiReviewService,
} from '../services/wifiService';

// ============================================
// Validators
// ============================================

const wifiSpotTypeSchema = z.enum([
  'hotel',
  'restaurant',
  'cafe',
  'airport',
  'train_station',
  'shopping_mall',
  'library',
  'coworking',
  'public',
  'other',
]);

const securityTypeSchema = z.enum([
  'open',
  'wep',
  'wpa',
  'wpa2',
  'wpa3',
  'unknown',
]);

const listSpotsQuerySchema = z.object({
  cityId: z.string().optional(),
  type: wifiSpotTypeSchema.optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const nearbySpotsQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(50).default(5),
  type: wifiSpotTypeSchema.optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const searchSpotsQuerySchema = z.object({
  query: z.string().min(1),
  cityId: z.string().optional(),
  type: wifiSpotTypeSchema.optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const createSpotBodySchema = z.object({
  name: z.string().min(1).max(200),
  nameEn: z.string().max(200).optional(),
  type: wifiSpotTypeSchema,
  cityId: z.string(),
  address: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  ssid: z.string().max(100).optional(),
  requiresPassword: z.boolean(),
  isFree: z.boolean(),
  speedMbps: z.number().min(0).optional(),
  openingHours: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  imageUrls: z.array(z.string().url()).optional(),
  poiId: z.string().optional(),
});

const updateSpotBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  nameEn: z.string().max(200).optional(),
  type: wifiSpotTypeSchema.optional(),
  address: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  ssid: z.string().max(100).optional(),
  requiresPassword: z.boolean().optional(),
  isFree: z.boolean().optional(),
  speedMbps: z.number().min(0).optional(),
  openingHours: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  imageUrls: z.array(z.string().url()).optional(),
});

const createCredentialBodySchema = z.object({
  wifiSpotId: z.string().optional(),
  name: z.string().min(1).max(200),
  ssid: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
  securityType: securityTypeSchema.optional(),
  locationName: z.string().max(200).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  notes: z.string().max(1000).optional(),
  isShared: z.boolean().optional(),
});

const updateCredentialBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  ssid: z.string().min(1).max(100).optional(),
  password: z.string().min(1).max(200).optional(),
  securityType: securityTypeSchema.optional(),
  locationName: z.string().max(200).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  notes: z.string().max(1000).optional(),
  isShared: z.boolean().optional(),
});

const createReviewBodySchema = z.object({
  wifiSpotId: z.string(),
  speedRating: z.number().min(1).max(5),
  stabilityRating: z.number().min(1).max(5),
  easeOfAccessRating: z.number().min(1).max(5),
  overallRating: z.number().min(1).max(5),
  comment: z.string().max(2000).optional(),
  speedTestResult: z.number().min(0).optional(),
  connectionTime: z.string().max(50).optional(),
  deviceType: z.string().max(50).optional(),
  visitDate: z.string().max(20).optional(),
});

const updateReviewBodySchema = z.object({
  speedRating: z.number().min(1).max(5).optional(),
  stabilityRating: z.number().min(1).max(5).optional(),
  easeOfAccessRating: z.number().min(1).max(5).optional(),
  overallRating: z.number().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
  speedTestResult: z.number().min(0).optional(),
});

const listReviewsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

// ============================================
// Public Routes (no auth required)
// ============================================

export const publicWifiRoutes = new Hono();

// List WiFi spots
publicWifiRoutes.get(
  '/spots',
  zValidator('query', listSpotsQuerySchema),
  async (c) => {
    const { cityId, type, limit } = c.req.valid('query');
    const spots = await WifiSpotService.list(cityId, type, limit);
    return c.json({ data: spots });
  }
);

// Get WiFi spot by ID
publicWifiRoutes.get('/spots/:id', async (c) => {
  const id = c.req.param('id');
  const spot = await WifiSpotService.getById(id);
  return c.json({ data: spot });
});

// Get nearby WiFi spots
publicWifiRoutes.get(
  '/spots/nearby',
  zValidator('query', nearbySpotsQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const spots = await WifiSpotService.getNearby(query);
    return c.json({ data: spots });
  }
);

// Search WiFi spots
publicWifiRoutes.get(
  '/spots/search',
  zValidator('query', searchSpotsQuerySchema),
  async (c) => {
    const { query, cityId, type, limit } = c.req.valid('query');
    const spots = await WifiSpotService.search(query, cityId, type, limit);
    return c.json({ data: spots });
  }
);

// List reviews for a WiFi spot
publicWifiRoutes.get(
  '/spots/:spotId/reviews',
  zValidator('query', listReviewsQuerySchema),
  async (c) => {
    const spotId = c.req.param('spotId');
    const { limit, offset } = c.req.valid('query');
    const reviews = await WifiReviewService.listBySpot(spotId, limit, offset);
    return c.json({ data: reviews });
  }
);

// Get shared credentials for a WiFi spot (community passwords)
publicWifiRoutes.get('/spots/:spotId/shared-credentials', async (c) => {
  const spotId = c.req.param('spotId');
  const credentials = await WifiCredentialService.getSharedBySpot(spotId);
  // Mask passwords partially for security
  const masked = credentials.map((cred) => ({
    ...cred,
    password: cred.password.slice(0, 2) + '****' + cred.password.slice(-2),
  }));
  return c.json({ data: masked });
});

// ============================================
// Protected Routes (auth required)
// ============================================

export const wifiRoutes = new Hono<{ Variables: AuthContext }>();

// --- WiFi Spots ---

// Create a new WiFi spot
wifiRoutes.post(
  '/spots',
  zValidator('json', createSpotBodySchema),
  async (c) => {
    const body = c.req.valid('json');
    const userId = c.get('userId');
    const token = c.get('accessToken');

    const id = await WifiSpotService.create(
      { ...body, submittedBy: userId },
      token
    );

    return c.json({ data: { id } }, 201);
  }
);

// Update a WiFi spot
wifiRoutes.patch(
  '/spots/:id',
  zValidator('json', updateSpotBodySchema),
  async (c) => {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const token = c.get('accessToken');

    const spot = await WifiSpotService.update(id, body, token);
    return c.json({ data: spot });
  }
);

// Delete a WiFi spot
wifiRoutes.delete('/spots/:id', async (c) => {
  const id = c.req.param('id');
  const token = c.get('accessToken');

  await WifiSpotService.remove(id, token);
  return c.json({ success: true });
});

// Verify a WiFi spot (admin action)
wifiRoutes.post('/spots/:id/verify', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');
  const token = c.get('accessToken');

  const spot = await WifiSpotService.verify(id, userId, token);
  return c.json({ data: spot });
});

// --- WiFi Credentials ---

// List user's saved WiFi credentials
wifiRoutes.get('/credentials', async (c) => {
  const userId = c.get('userId');
  const token = c.get('accessToken');
  const limit = c.req.query('limit')
    ? parseInt(c.req.query('limit')!, 10)
    : undefined;

  const credentials = await WifiCredentialService.listByUser(
    userId,
    limit,
    token
  );
  return c.json({ data: credentials });
});

// Get credential by ID
wifiRoutes.get('/credentials/:id', async (c) => {
  const id = c.req.param('id');
  const token = c.get('accessToken');

  const credential = await WifiCredentialService.getById(id, token);
  return c.json({ data: credential });
});

// Get credential for a specific spot
wifiRoutes.get('/spots/:spotId/credential', async (c) => {
  const spotId = c.req.param('spotId');
  const userId = c.get('userId');
  const token = c.get('accessToken');

  const credential = await WifiCredentialService.getBySpot(
    userId,
    spotId,
    token
  );
  return c.json({ data: credential });
});

// Search user's credentials
wifiRoutes.get('/credentials/search', async (c) => {
  const userId = c.get('userId');
  const token = c.get('accessToken');
  const query = c.req.query('query') || '';
  const limit = c.req.query('limit')
    ? parseInt(c.req.query('limit')!, 10)
    : undefined;

  const credentials = await WifiCredentialService.search(
    userId,
    query,
    limit,
    token
  );
  return c.json({ data: credentials });
});

// Create a new WiFi credential
wifiRoutes.post(
  '/credentials',
  zValidator('json', createCredentialBodySchema),
  async (c) => {
    const body = c.req.valid('json');
    const userId = c.get('userId');
    const token = c.get('accessToken');

    const id = await WifiCredentialService.create({ ...body, userId }, token);
    return c.json({ data: { id } }, 201);
  }
);

// Update a WiFi credential
wifiRoutes.patch(
  '/credentials/:id',
  zValidator('json', updateCredentialBodySchema),
  async (c) => {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const token = c.get('accessToken');

    const credential = await WifiCredentialService.update(id, body, token);
    return c.json({ data: credential });
  }
);

// Mark credential as recently used
wifiRoutes.post('/credentials/:id/mark-used', async (c) => {
  const id = c.req.param('id');
  const token = c.get('accessToken');

  const credential = await WifiCredentialService.markUsed(id, token);
  return c.json({ data: credential });
});

// Delete a WiFi credential
wifiRoutes.delete('/credentials/:id', async (c) => {
  const id = c.req.param('id');
  const token = c.get('accessToken');

  await WifiCredentialService.remove(id, token);
  return c.json({ success: true });
});

// --- WiFi Reviews ---

// List user's reviews
wifiRoutes.get('/reviews', async (c) => {
  const userId = c.get('userId');
  const token = c.get('accessToken');
  const limit = c.req.query('limit')
    ? parseInt(c.req.query('limit')!, 10)
    : undefined;

  const reviews = await WifiReviewService.listByUser(userId, limit, token);
  return c.json({ data: reviews });
});

// Get review by ID
wifiRoutes.get('/reviews/:id', async (c) => {
  const id = c.req.param('id');
  const token = c.get('accessToken');

  const review = await WifiReviewService.getById(id, token);
  return c.json({ data: review });
});

// Get user's review for a specific spot
wifiRoutes.get('/spots/:spotId/my-review', async (c) => {
  const spotId = c.req.param('spotId');
  const userId = c.get('userId');
  const token = c.get('accessToken');

  const review = await WifiReviewService.getUserReview(userId, spotId, token);
  return c.json({ data: review });
});

// Create or update a review
wifiRoutes.post(
  '/reviews',
  zValidator('json', createReviewBodySchema),
  async (c) => {
    const body = c.req.valid('json');
    const userId = c.get('userId');
    const token = c.get('accessToken');

    const id = await WifiReviewService.create({ ...body, userId }, token);
    return c.json({ data: { id } }, 201);
  }
);

// Update a review
wifiRoutes.patch(
  '/reviews/:id',
  zValidator('json', updateReviewBodySchema),
  async (c) => {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const token = c.get('accessToken');

    const review = await WifiReviewService.update(id, body, token);
    return c.json({ data: review });
  }
);

// Mark a review as helpful (toggle)
wifiRoutes.post('/reviews/:id/helpful', async (c) => {
  const id = c.req.param('id');
  const userId = c.get('userId');
  const token = c.get('accessToken');

  const review = await WifiReviewService.markHelpful(id, userId, token);
  return c.json({ data: review });
});

// Delete a review
wifiRoutes.delete('/reviews/:id', async (c) => {
  const id = c.req.param('id');
  const token = c.get('accessToken');

  await WifiReviewService.remove(id, token);
  return c.json({ success: true });
});
