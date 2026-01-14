/**
 * Itinerary Likes Routes
 * API endpoints for like/unlike operations
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { ItineraryLikesService } from '../services/itineraryLikesService';

interface Variables {
  userId: string;
  accessToken: string;
}

export const itineraryLikesRoutes = new Hono<{ Variables: Variables }>();

/**
 * POST /itineraries/:id/like - Toggle like status
 */
itineraryLikesRoutes.post('/:id/like', async (c) => {
  const userId = c.get('userId');
  const itineraryId = c.req.param('id');

  const result = await ItineraryLikesService.toggle(userId, itineraryId);

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * GET /itineraries/:id/like - Check if liked
 */
itineraryLikesRoutes.get('/:id/like', async (c) => {
  const userId = c.get('userId');
  const itineraryId = c.req.param('id');

  const result = await ItineraryLikesService.isLiked(userId, itineraryId);

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * GET /itineraries/:id/likes/count - Get like count
 */
itineraryLikesRoutes.get('/:id/likes/count', async (c) => {
  const itineraryId = c.req.param('id');

  const result = await ItineraryLikesService.getCount(itineraryId);

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * GET /me/likes - Get user's liked itineraries
 */
export const myLikesRoutes = new Hono<{ Variables: Variables }>();

myLikesRoutes.get(
  '/likes',
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { page, pageSize } = c.req.valid('query');

    const { data, total } = await ItineraryLikesService.listByUser(
      userId,
      page,
      pageSize
    );

    return c.json({
      success: true,
      data,
      meta: {
        page,
        pageSize,
        totalCount: total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  }
);

/**
 * POST /itineraries/likes/batch-check - Batch check like status
 */
myLikesRoutes.post(
  '/likes/batch-check',
  zValidator(
    'json',
    z.object({
      itineraryIds: z.array(z.string()).min(1).max(100),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { itineraryIds } = c.req.valid('json');

    const result = await ItineraryLikesService.batchCheckLikes(
      userId,
      itineraryIds
    );

    return c.json({
      success: true,
      data: result,
    });
  }
);
