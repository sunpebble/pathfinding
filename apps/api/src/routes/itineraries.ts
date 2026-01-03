import { Hono } from 'hono';
import { zValidator } from 'npm:@hono/zod-validator';
import { z } from 'npm:zod';
import {
  CreateItinerarySchema,
  ItineraryListQuerySchema,
  UpdateItinerarySchema,
} from '../models/itinerary.ts';
import { ItineraryService } from '../services/itineraryService.ts';

interface Variables {
  userId: string;
  accessToken: string;
}

export const itinerariesRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /itineraries/public - List public itineraries for community discovery
 * Must be defined BEFORE /:id to avoid route conflicts
 */
itinerariesRoutes.get(
  '/public',
  zValidator(
    'query',
    z.object({
      cityId: z.string().uuid().optional(),
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
      sortBy: z
        .enum(['created_at', 'copy_count'])
        .optional()
        .default('created_at'),
    })
  ),
  async (c) => {
    const accessToken = c.get('accessToken');
    const query = c.req.valid('query');

    const { data, total } = await ItineraryService.listPublic(
      query,
      accessToken
    );

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
  }
);

/**
 * GET /itineraries - List user's itineraries with pagination
 */
itinerariesRoutes.get(
  '/',
  zValidator('query', ItineraryListQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const query = c.req.valid('query');

    const { data, total } = await ItineraryService.list(
      userId,
      query,
      accessToken
    );

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
  }
);

/**
 * POST /itineraries - Create a new itinerary
 */
itinerariesRoutes.post(
  '/',
  zValidator('json', CreateItinerarySchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const input = c.req.valid('json');

    const itinerary = await ItineraryService.create(userId, input, accessToken);

    return c.json(
      {
        success: true,
        data: itinerary,
      },
      201
    );
  }
);

/**
 * GET /itineraries/:id - Get itinerary by ID with days and items
 */
itinerariesRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const itineraryId = c.req.param('id');

  const itinerary = await ItineraryService.getById(
    itineraryId,
    userId,
    accessToken
  );

  return c.json({
    success: true,
    data: itinerary,
  });
});

/**
 * PATCH /itineraries/:id - Update an itinerary
 */
itinerariesRoutes.patch(
  '/:id',
  zValidator('json', UpdateItinerarySchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const itineraryId = c.req.param('id');
    const input = c.req.valid('json');

    const itinerary = await ItineraryService.update(
      itineraryId,
      userId,
      input,
      accessToken
    );

    return c.json({
      success: true,
      data: itinerary,
    });
  }
);

/**
 * DELETE /itineraries/:id - Delete an itinerary
 */
itinerariesRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const itineraryId = c.req.param('id');

  await ItineraryService.delete(itineraryId, userId, accessToken);

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * POST /itineraries/:id/copy - Copy an itinerary to user's collection
 */
itinerariesRoutes.post(
  '/:id/copy',
  zValidator(
    'json',
    z.object({
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const itineraryId = c.req.param('id');
    const { startDate } = c.req.valid('json');

    const newItinerary = await ItineraryService.copy(
      itineraryId,
      userId,
      startDate,
      accessToken
    );

    return c.json(
      {
        success: true,
        data: newItinerary,
      },
      201
    );
  }
);
