/**
 * Draft Routes - Auto-save and draft management endpoints
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { DraftService } from '../services/draftService';

interface Variables {
  userId: string;
  accessToken: string;
}

// Validation schemas
const DraftItemSchema = z.object({
  poiId: z.string().optional(),
  orderIndex: z.number().int().min(0),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  transportMode: z
    .enum(['walking', 'driving', 'transit', 'cycling', 'taxi'])
    .optional(),
  notes: z.string().optional(),
  inlinePoi: z
    .object({
      name: z.string().min(1),
      category: z.enum([
        'attraction',
        'restaurant',
        'hotel',
        'shopping',
        'other',
      ]),
      address: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    })
    .optional(),
});

const DraftDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  items: z.array(DraftItemSchema),
});

const SaveDraftSchema = z.object({
  draftId: z.string().optional(),
  itineraryId: z.string().optional(),
  title: z.string().min(1).max(200),
  cityId: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  visibility: z.enum(['private', 'team', 'public']).optional(),
  coverImageUrl: z.string().url().optional(),
  days: z.array(DraftDaySchema).optional(),
  deviceId: z.string().optional(),
  expectedVersion: z.number().int().optional(),
});

const DraftListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

// Protected routes (auth required)
export const draftRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /drafts - List user's drafts with pagination
 */
draftRoutes.get('/', zValidator('query', DraftListQuerySchema), async (c) => {
  const userId = c.get('userId');
  const query = c.req.valid('query');

  const { data, total } = await DraftService.list(userId, query);

  return c.json({
    success: true,
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalCount: total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  });
});

/**
 * GET /drafts/count - Get draft count for badge display
 */
draftRoutes.get('/count', async (c) => {
  const userId = c.get('userId');

  const count = await DraftService.count(userId);

  return c.json({
    success: true,
    data: { count },
  });
});

/**
 * GET /drafts/itinerary/:itineraryId - Get draft for a specific itinerary
 */
draftRoutes.get('/itinerary/:itineraryId', async (c) => {
  const userId = c.get('userId');
  const itineraryId = c.req.param('itineraryId');

  const draft = await DraftService.getByItinerary(itineraryId, userId);

  return c.json({
    success: true,
    data: draft,
  });
});

/**
 * GET /drafts/:id - Get a specific draft by ID
 */
draftRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const draftId = c.req.param('id');

  const draft = await DraftService.getById(draftId, userId);

  return c.json({
    success: true,
    data: draft,
  });
});

/**
 * POST /drafts - Save or update a draft (auto-save endpoint)
 */
draftRoutes.post('/', zValidator('json', SaveDraftSchema), async (c) => {
  const userId = c.get('userId');
  const input = c.req.valid('json');

  const draft = await DraftService.save(userId, input);

  return c.json(
    {
      success: true,
      data: draft,
    },
    201
  );
});

/**
 * POST /drafts/:id/extend - Extend draft expiration
 */
draftRoutes.post(
  '/:id/extend',
  zValidator(
    'json',
    z.object({
      additionalDays: z.number().int().min(1).max(90).optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const draftId = c.req.param('id');
    const { additionalDays } = c.req.valid('json');

    const result = await DraftService.extendExpiration(
      draftId,
      userId,
      additionalDays
    );

    return c.json({
      success: true,
      data: result,
    });
  }
);

/**
 * DELETE /drafts/:id - Delete a draft
 */
draftRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const draftId = c.req.param('id');

  await DraftService.delete(draftId, userId);

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * DELETE /drafts/itinerary/:itineraryId - Delete draft for a specific itinerary
 * (Called after successfully saving an itinerary)
 */
draftRoutes.delete('/itinerary/:itineraryId', async (c) => {
  const userId = c.get('userId');
  const itineraryId = c.req.param('itineraryId');

  await DraftService.deleteByItinerary(itineraryId, userId);

  return c.json({
    success: true,
    data: null,
  });
});
