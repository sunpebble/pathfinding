import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  CreateItinerarySchema,
  ItineraryListQuerySchema,
  UpdateItinerarySchema,
} from '../models/itinerary';
import { ItineraryService } from '../services/itineraryService';

interface Variables {
  userId: string;
  accessToken: string;
}

// Public routes (no auth required)
export const publicItinerariesRoutes = new Hono();

/**
 * GET /itineraries/public - List public itineraries for community discovery
 * No authentication required
 */
publicItinerariesRoutes.get(
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
    const query = c.req.valid('query');

    const { data, total } = await ItineraryService.listPublic(query);

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

// Protected routes (auth required)
export const itinerariesRoutes = new Hono<{ Variables: Variables }>();

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

    // Sanitize input - convert null to undefined for service compatibility
    const sanitizedInput: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== null) {
        sanitizedInput[key] = value;
      }
    }

    const itinerary = await ItineraryService.update(
      itineraryId,
      userId,
      sanitizedInput as Parameters<typeof ItineraryService.update>[2],
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
