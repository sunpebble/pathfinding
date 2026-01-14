/**
 * Itinerary Favorites Routes
 * API endpoints for favorite/unfavorite operations and collection management
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { ItineraryFavoritesService } from '../services/itineraryFavoritesService';
import { FavoriteCollectionsService } from '../services/favoriteCollectionsService';

interface Variables {
  userId: string;
  accessToken: string;
}

// =============================================================================
// Itinerary Favorites Routes (Protected)
// =============================================================================

export const itineraryFavoritesRoutes = new Hono<{ Variables: Variables }>();

/**
 * POST /itineraries/:id/favorite - Add itinerary to favorites
 */
itineraryFavoritesRoutes.post(
  '/:id/favorite',
  zValidator(
    'json',
    z
      .object({
        collectionId: z.string().optional(),
        notes: z.string().max(500).optional(),
      })
      .optional()
  ),
  async (c) => {
    const userId = c.get('userId');
    const itineraryId = c.req.param('id');
    const body = c.req.valid('json') || {};

    const result = await ItineraryFavoritesService.add(
      userId,
      itineraryId,
      body.collectionId,
      body.notes
    );

    return c.json({
      success: true,
      data: { favoriteId: result },
    });
  }
);

/**
 * DELETE /itineraries/:id/favorite - Remove itinerary from favorites
 */
itineraryFavoritesRoutes.delete('/:id/favorite', async (c) => {
  const userId = c.get('userId');
  const itineraryId = c.req.param('id');

  const result = await ItineraryFavoritesService.remove(userId, itineraryId);

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * POST /itineraries/:id/favorite/toggle - Toggle favorite status
 */
itineraryFavoritesRoutes.post('/:id/favorite/toggle', async (c) => {
  const userId = c.get('userId');
  const itineraryId = c.req.param('id');

  const result = await ItineraryFavoritesService.toggle(userId, itineraryId);

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * GET /itineraries/:id/favorite - Check if favorited
 */
itineraryFavoritesRoutes.get('/:id/favorite', async (c) => {
  const userId = c.get('userId');
  const itineraryId = c.req.param('id');

  const result = await ItineraryFavoritesService.isFavorited(
    userId,
    itineraryId
  );

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * GET /itineraries/:id/favorites/count - Get favorite count (public)
 */
export const publicFavoriteCountRoutes = new Hono();

publicFavoriteCountRoutes.get('/:id/favorites/count', async (c) => {
  const itineraryId = c.req.param('id');

  const result = await ItineraryFavoritesService.getCount(itineraryId);

  return c.json({
    success: true,
    data: result,
  });
});

// =============================================================================
// My Favorites Routes (Protected)
// =============================================================================

export const myFavoritesRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /me/favorites - Get user's favorited itineraries
 */
myFavoritesRoutes.get(
  '/favorites',
  zValidator(
    'query',
    z.object({
      collectionId: z.string().optional(),
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { collectionId, page, pageSize } = c.req.valid('query');

    const { data, total } = await ItineraryFavoritesService.listByUser(
      userId,
      collectionId,
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
 * POST /me/favorites/batch-check - Batch check favorite status
 */
myFavoritesRoutes.post(
  '/favorites/batch-check',
  zValidator(
    'json',
    z.object({
      itineraryIds: z.array(z.string()).min(1).max(100),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { itineraryIds } = c.req.valid('json');

    const result = await ItineraryFavoritesService.batchCheckFavorites(
      userId,
      itineraryIds
    );

    return c.json({
      success: true,
      data: result,
    });
  }
);

/**
 * PUT /me/favorites/:favoriteId/move - Move favorite to different collection
 */
myFavoritesRoutes.put(
  '/favorites/:favoriteId/move',
  zValidator(
    'json',
    z.object({
      collectionId: z.string(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const favoriteId = c.req.param('favoriteId');
    const { collectionId } = c.req.valid('json');

    const result = await ItineraryFavoritesService.moveToCollection(
      userId,
      favoriteId,
      collectionId
    );

    return c.json({
      success: true,
      data: result,
    });
  }
);

/**
 * PATCH /me/favorites/:favoriteId/notes - Update favorite notes
 */
myFavoritesRoutes.patch(
  '/favorites/:favoriteId/notes',
  zValidator(
    'json',
    z.object({
      notes: z.string().max(500).optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const favoriteId = c.req.param('favoriteId');
    const { notes } = c.req.valid('json');

    const result = await ItineraryFavoritesService.updateNotes(
      userId,
      favoriteId,
      notes
    );

    return c.json({
      success: true,
      data: result,
    });
  }
);

// =============================================================================
// Favorite Collections Routes (Protected)
// =============================================================================

export const favoriteCollectionsRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /collections - List user's collections
 */
favoriteCollectionsRoutes.get('/', async (c) => {
  const userId = c.get('userId');

  const collections = await FavoriteCollectionsService.listByUser(userId);

  return c.json({
    success: true,
    data: collections,
  });
});

/**
 * POST /collections - Create a new collection
 */
favoriteCollectionsRoutes.post(
  '/',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1).max(50),
      description: z.string().max(200).optional(),
      coverImageUrl: z.string().url().optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const data = c.req.valid('json');

    const collectionId = await FavoriteCollectionsService.create(userId, data);

    return c.json({
      success: true,
      data: { collectionId },
    });
  }
);

/**
 * GET /collections/default - Get or create default collection
 */
favoriteCollectionsRoutes.get('/default', async (c) => {
  const userId = c.get('userId');

  const collection =
    await FavoriteCollectionsService.getOrCreateDefault(userId);

  return c.json({
    success: true,
    data: collection,
  });
});

/**
 * GET /collections/:id - Get collection with items
 */
favoriteCollectionsRoutes.get(
  '/:id',
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const collectionId = c.req.param('id');
    const { page, pageSize } = c.req.valid('query');

    const collection = await FavoriteCollectionsService.getById(
      collectionId,
      page,
      pageSize
    );

    return c.json({
      success: true,
      data: collection,
    });
  }
);

/**
 * PUT /collections/:id - Update collection
 */
favoriteCollectionsRoutes.put(
  '/:id',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1).max(50).optional(),
      description: z.string().max(200).optional(),
      coverImageUrl: z.string().url().optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const collectionId = c.req.param('id');
    const data = c.req.valid('json');

    const collection = await FavoriteCollectionsService.update(
      collectionId,
      userId,
      data
    );

    return c.json({
      success: true,
      data: collection,
    });
  }
);

/**
 * DELETE /collections/:id - Delete collection
 */
favoriteCollectionsRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const collectionId = c.req.param('id');

  await FavoriteCollectionsService.remove(collectionId, userId);

  return c.json({
    success: true,
    message: 'Collection deleted successfully',
  });
});

/**
 * PUT /collections/reorder - Reorder collections
 */
favoriteCollectionsRoutes.put(
  '/reorder',
  zValidator(
    'json',
    z.object({
      orderedIds: z.array(z.string()).min(1),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { orderedIds } = c.req.valid('json');

    await FavoriteCollectionsService.reorder(userId, orderedIds);

    return c.json({
      success: true,
      message: 'Collections reordered successfully',
    });
  }
);
