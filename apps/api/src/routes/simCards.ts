import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
  AddToFavoritesSchema,
  CreateReviewSchema,
  CreateSimCardSchema,
  EsimQuerySchema,
  FavoritesListQuerySchema,
  ReviewListQuerySchema,
  SimCardCompareQuerySchema,
  SimCardListQuerySchema,
  SimCardRecommendQuerySchema,
  SimCardRegionQuerySchema,
  SimCardSearchQuerySchema,
  UpdateFavoriteNotesSchema,
  UpdateReviewSchema,
  UpdateReviewStatusSchema,
  UpdateSimCardSchema,
  VoteOnReviewSchema,
} from '../models/simCard';
import { SimCardService } from '../services/simCardService';

interface Variables {
  userId: string;
  accessToken: string;
}

export const simCardRoutes = new Hono<{ Variables: Variables }>();

// ============================================
// SIM Card Products (Public)
// ============================================

/**
 * List SIM card products with filters
 * GET /sim-cards?destination=日本&cardType=esim&limit=20
 */
simCardRoutes.get(
  '/',
  zValidator('query', SimCardListQuerySchema),
  async (c) => {
    const filters = c.req.valid('query');

    const products = await SimCardService.list(filters);
    return c.json({ data: products });
  }
);

/**
 * Search SIM cards by name or provider
 * GET /sim-cards/search?query=CMLink&destination=日本
 */
simCardRoutes.get(
  '/search',
  zValidator('query', SimCardSearchQuerySchema),
  async (c) => {
    const params = c.req.valid('query');

    const products = await SimCardService.search(params);
    return c.json({ data: products });
  }
);

/**
 * Get recommended SIM cards for a destination
 * GET /sim-cards/recommend?destination=日本&tripDurationDays=7&preferEsim=true
 */
simCardRoutes.get(
  '/recommend',
  zValidator('query', SimCardRecommendQuerySchema),
  async (c) => {
    const params = c.req.valid('query');

    const products = await SimCardService.getRecommended(params);
    return c.json({ data: products });
  }
);

/**
 * Compare SIM card products
 * GET /sim-cards/compare?ids=id1,id2,id3
 */
simCardRoutes.get(
  '/compare',
  zValidator('query', SimCardCompareQuerySchema),
  async (c) => {
    const { ids } = c.req.valid('query');

    const products = await SimCardService.compare(ids);
    return c.json({ data: products });
  }
);

/**
 * Get popular SIM cards
 * GET /sim-cards/popular?destination=日本&limit=10
 */
simCardRoutes.get('/popular', async (c) => {
  const destination = c.req.query('destination');
  const limit = c.req.query('limit')
    ? parseInt(c.req.query('limit')!, 10)
    : undefined;

  const products = await SimCardService.getPopular({ destination, limit });
  return c.json({ data: products });
});

/**
 * Get SIM cards by region
 * GET /sim-cards/region?region=东南亚&limit=20
 */
simCardRoutes.get(
  '/region',
  zValidator('query', SimCardRegionQuerySchema),
  async (c) => {
    const params = c.req.valid('query');

    const products = await SimCardService.getByRegion(params);
    return c.json({ data: products });
  }
);

/**
 * Get eSIM products
 * GET /sim-cards/esim?destination=日本&limit=20
 */
simCardRoutes.get(
  '/esim',
  zValidator('query', EsimQuerySchema),
  async (c) => {
    const params = c.req.valid('query');

    const products = await SimCardService.getEsimProducts(params);
    return c.json({ data: products });
  }
);

/**
 * Get SIM card by ID
 * GET /sim-cards/:id
 */
simCardRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  const product = await SimCardService.getById(id);
  return c.json({ data: product });
});

// ============================================
// SIM Card Reviews (Public Read)
// ============================================

/**
 * List reviews for a SIM card
 * GET /sim-cards/:id/reviews?status=approved&limit=20
 */
simCardRoutes.get(
  '/:id/reviews',
  zValidator('query', ReviewListQuerySchema),
  async (c) => {
    const simCardId = c.req.param('id');
    const { status, limit, offset } = c.req.valid('query');

    const reviews = await SimCardService.listReviews({
      simCardId,
      status,
      limit,
      offset,
    });
    return c.json({ data: reviews });
  }
);

/**
 * Get top reviews for a SIM card
 * GET /sim-cards/:id/reviews/top?limit=5
 */
simCardRoutes.get('/:id/reviews/top', async (c) => {
  const simCardId = c.req.param('id');
  const limit = c.req.query('limit')
    ? parseInt(c.req.query('limit')!, 10)
    : undefined;

  const reviews = await SimCardService.getTopReviews({ simCardId, limit });
  return c.json({ data: reviews });
});

/**
 * Get review by ID
 * GET /sim-cards/reviews/:reviewId
 */
simCardRoutes.get('/reviews/:reviewId', async (c) => {
  const reviewId = c.req.param('reviewId');

  const review = await SimCardService.getReviewById(reviewId);
  return c.json({ data: review });
});

// ============================================
// SIM Card Reviews (Protected - Requires Auth)
// ============================================

/**
 * Create a review for a SIM card
 * POST /sim-cards/:id/reviews
 */
simCardRoutes.post(
  '/:id/reviews',
  zValidator('json', CreateReviewSchema),
  async (c) => {
    const simCardId = c.req.param('id');
    const userId = c.get('userId');
    const data = c.req.valid('json');

    const id = await SimCardService.createReview({
      simCardId,
      userId,
      ...data,
    });

    return c.json({ data: { id } }, 201);
  }
);

/**
 * Update a review
 * PATCH /sim-cards/reviews/:reviewId
 */
simCardRoutes.patch(
  '/reviews/:reviewId',
  zValidator('json', UpdateReviewSchema),
  async (c) => {
    const reviewId = c.req.param('reviewId');
    const data = c.req.valid('json');

    const review = await SimCardService.updateReview(reviewId, data);
    return c.json({ data: review });
  }
);

/**
 * Delete a review
 * DELETE /sim-cards/reviews/:reviewId
 */
simCardRoutes.delete('/reviews/:reviewId', async (c) => {
  const reviewId = c.req.param('reviewId');

  await SimCardService.removeReview(reviewId);
  return c.json({ success: true });
});

/**
 * Vote on a review (helpful/not_helpful)
 * POST /sim-cards/reviews/:reviewId/vote
 */
simCardRoutes.post(
  '/reviews/:reviewId/vote',
  zValidator('json', VoteOnReviewSchema),
  async (c) => {
    const reviewId = c.req.param('reviewId');
    const userId = c.get('userId');
    const { voteType } = c.req.valid('json');

    const review = await SimCardService.voteOnReview({
      reviewId,
      userId,
      voteType,
    });
    return c.json({ data: review });
  }
);

/**
 * Get user's vote for a review
 * GET /sim-cards/reviews/:reviewId/vote
 */
simCardRoutes.get('/reviews/:reviewId/vote', async (c) => {
  const reviewId = c.req.param('reviewId');
  const userId = c.get('userId');

  const vote = await SimCardService.getUserVote({ reviewId, userId });
  return c.json({ data: vote });
});

/**
 * Report a review
 * POST /sim-cards/reviews/:reviewId/report
 */
simCardRoutes.post('/reviews/:reviewId/report', async (c) => {
  const reviewId = c.req.param('reviewId');

  const review = await SimCardService.reportReview(reviewId);
  return c.json({ data: review });
});

/**
 * Get user's reviews
 * GET /sim-cards/my/reviews?limit=20
 */
simCardRoutes.get('/my/reviews', async (c) => {
  const userId = c.get('userId');
  const limit = c.req.query('limit')
    ? parseInt(c.req.query('limit')!, 10)
    : undefined;

  const reviews = await SimCardService.listUserReviews({ userId, limit });
  return c.json({ data: reviews });
});

/**
 * Get user's review for a specific SIM card
 * GET /sim-cards/:id/my-review
 */
simCardRoutes.get('/:id/my-review', async (c) => {
  const simCardId = c.req.param('id');
  const userId = c.get('userId');

  const review = await SimCardService.getUserReview({ userId, simCardId });
  return c.json({ data: review });
});

// ============================================
// Favorite SIM Cards (Protected)
// ============================================

/**
 * List user's favorite SIM cards
 * GET /sim-cards/favorites?limit=50
 */
simCardRoutes.get(
  '/favorites',
  zValidator('query', FavoritesListQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const { limit, offset } = c.req.valid('query');

    const favorites = await SimCardService.listFavorites({
      userId,
      limit,
      offset,
    });
    return c.json({ data: favorites });
  }
);

/**
 * Check if a SIM card is favorited
 * GET /sim-cards/:id/favorite
 */
simCardRoutes.get('/:id/favorite', async (c) => {
  const simCardId = c.req.param('id');
  const userId = c.get('userId');

  const isFavorited = await SimCardService.isFavorited({ userId, simCardId });
  return c.json({ data: { isFavorited } });
});

/**
 * Add a SIM card to favorites
 * POST /sim-cards/:id/favorite
 */
simCardRoutes.post(
  '/:id/favorite',
  zValidator('json', AddToFavoritesSchema),
  async (c) => {
    const simCardId = c.req.param('id');
    const userId = c.get('userId');
    const { notes } = c.req.valid('json');

    const id = await SimCardService.addToFavorites({
      userId,
      simCardId,
      notes,
    });
    return c.json({ data: { id } }, 201);
  }
);

/**
 * Update favorite notes
 * PATCH /sim-cards/favorites/:favoriteId
 */
simCardRoutes.patch(
  '/favorites/:favoriteId',
  zValidator('json', UpdateFavoriteNotesSchema),
  async (c) => {
    const favoriteId = c.req.param('favoriteId');
    const { notes } = c.req.valid('json');

    const favorite = await SimCardService.updateFavoriteNotes(favoriteId, notes);
    return c.json({ data: favorite });
  }
);

/**
 * Remove a SIM card from favorites
 * DELETE /sim-cards/:id/favorite
 */
simCardRoutes.delete('/:id/favorite', async (c) => {
  const simCardId = c.req.param('id');
  const userId = c.get('userId');

  await SimCardService.removeFromFavorites({ userId, simCardId });
  return c.json({ success: true });
});

/**
 * Toggle favorite status
 * POST /sim-cards/:id/favorite/toggle
 */
simCardRoutes.post('/:id/favorite/toggle', async (c) => {
  const simCardId = c.req.param('id');
  const userId = c.get('userId');

  const result = await SimCardService.toggleFavorite({ userId, simCardId });
  return c.json({ data: result });
});

/**
 * Get favorite count for a SIM card
 * GET /sim-cards/:id/favorite/count
 */
simCardRoutes.get('/:id/favorite/count', async (c) => {
  const simCardId = c.req.param('id');

  const count = await SimCardService.getFavoriteCount(simCardId);
  return c.json({ data: { count } });
});

// ============================================
// Admin Routes
// ============================================

/**
 * Create a new SIM card product (admin)
 * POST /sim-cards/admin
 */
simCardRoutes.post(
  '/admin',
  zValidator('json', CreateSimCardSchema),
  async (c) => {
    const data = c.req.valid('json');

    const id = await SimCardService.create(data);
    return c.json({ data: { id } }, 201);
  }
);

/**
 * Update a SIM card product (admin)
 * PATCH /sim-cards/admin/:id
 */
simCardRoutes.patch(
  '/admin/:id',
  zValidator('json', UpdateSimCardSchema),
  async (c) => {
    const id = c.req.param('id');
    const data = c.req.valid('json');

    const product = await SimCardService.update(id, data);
    return c.json({ data: product });
  }
);

/**
 * Delete a SIM card product (admin)
 * DELETE /sim-cards/admin/:id
 */
simCardRoutes.delete('/admin/:id', async (c) => {
  const id = c.req.param('id');

  await SimCardService.remove(id);
  return c.json({ success: true });
});

/**
 * Update review status (admin moderation)
 * PATCH /sim-cards/admin/reviews/:reviewId/status
 */
simCardRoutes.patch(
  '/admin/reviews/:reviewId/status',
  zValidator('json', UpdateReviewStatusSchema),
  async (c) => {
    const reviewId = c.req.param('reviewId');
    const { status } = c.req.valid('json');

    const review = await SimCardService.updateReviewStatus(reviewId, status);
    return c.json({ data: review });
  }
);
