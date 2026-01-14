import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  HiddenGemsListQuerySchema,
  HiddenGemsSearchQuerySchema,
  HiddenGemRatingsQuerySchema,
  MarkAsHiddenGemSchema,
  PopularityLevelSchema,
  RateHiddenGemSchema,
  SubmitHiddenGemSchema,
  UpdatePoiStatusSchema,
  UserSubmittedPoisListQuerySchema,
  VoteOnPoiSchema,
  PoiCategorySchema,
} from '../models/hiddenGem';
import { HiddenGemsService } from '../services/hiddenGemsService';

interface Variables {
  userId: string;
  accessToken: string;
}

export const hiddenGemsRoutes = new Hono<{ Variables: Variables }>();

// ============================================
// Hidden Gems POI Endpoints
// ============================================

/**
 * List hidden gem POIs with filters
 * GET /hidden-gems?cityId=xxx&category=attraction&popularityLevel=hidden
 */
hiddenGemsRoutes.get(
  '/',
  zValidator('query', HiddenGemsListQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const data = await HiddenGemsService.listHiddenGems(query, accessToken);
    return c.json({ data });
  }
);

/**
 * Search hidden gems by keyword
 * GET /hidden-gems/search?query=咖啡馆&cityId=xxx
 */
hiddenGemsRoutes.get(
  '/search',
  zValidator('query', HiddenGemsSearchQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const data = await HiddenGemsService.searchHiddenGems(query, accessToken);
    return c.json({ data });
  }
);

/**
 * Get hidden gems by popularity level
 * GET /hidden-gems/by-popularity/:level?cityId=xxx
 */
hiddenGemsRoutes.get(
  '/by-popularity/:level',
  zValidator(
    'param',
    z.object({
      level: PopularityLevelSchema,
    })
  ),
  zValidator(
    'query',
    z.object({
      cityId: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    })
  ),
  async (c) => {
    const { level } = c.req.valid('param');
    const { cityId, limit } = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const data = await HiddenGemsService.getByPopularityLevel(
      level,
      cityId,
      limit,
      accessToken
    );
    return c.json({ data });
  }
);

/**
 * Get local recommended POIs for a city
 * GET /hidden-gems/local-recommendations/:cityId?category=restaurant
 */
hiddenGemsRoutes.get(
  '/local-recommendations/:cityId',
  zValidator(
    'query',
    z.object({
      category: PoiCategorySchema.optional(),
      limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const cityId = c.req.param('cityId');
    const { category, limit } = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const data = await HiddenGemsService.getLocalRecommendations(
      cityId,
      category,
      limit,
      accessToken
    );
    return c.json({ data });
  }
);

/**
 * Mark a POI as hidden gem
 * POST /hidden-gems/:poiId/mark
 */
hiddenGemsRoutes.post(
  '/:poiId/mark',
  zValidator('json', MarkAsHiddenGemSchema),
  async (c) => {
    const poiId = c.req.param('poiId');
    const body = c.req.valid('json');
    const accessToken = c.get('accessToken');

    const data = await HiddenGemsService.markAsHiddenGem(
      poiId,
      body,
      accessToken
    );
    return c.json({ data });
  }
);

// ============================================
// User Submitted POIs Endpoints
// ============================================

/**
 * Submit a new hidden gem
 * POST /hidden-gems/submit
 */
hiddenGemsRoutes.post(
  '/submit',
  zValidator('json', SubmitHiddenGemSchema),
  async (c) => {
    const body = c.req.valid('json');
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');

    const id = await HiddenGemsService.submitHiddenGem(
      userId,
      body,
      accessToken
    );
    return c.json({ data: { id } }, 201);
  }
);

/**
 * List user submitted POIs
 * GET /hidden-gems/submissions?status=approved&cityId=xxx
 */
hiddenGemsRoutes.get(
  '/submissions',
  zValidator('query', UserSubmittedPoisListQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const data = await HiddenGemsService.listUserSubmittedPois(
      query,
      accessToken
    );
    return c.json({ data });
  }
);

/**
 * Get my submitted POIs
 * GET /hidden-gems/my-submissions
 */
hiddenGemsRoutes.get('/my-submissions', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');

  const data = await HiddenGemsService.listUserSubmittedPois(
    { userId },
    accessToken
  );
  return c.json({ data });
});

/**
 * Get a user submitted POI by ID
 * GET /hidden-gems/submissions/:id
 */
hiddenGemsRoutes.get('/submissions/:id', async (c) => {
  const id = c.req.param('id');
  const accessToken = c.get('accessToken');

  const data = await HiddenGemsService.getUserSubmittedPoiById(id, accessToken);
  return c.json({ data });
});

/**
 * Vote on a user submitted POI
 * POST /hidden-gems/submissions/:id/vote
 */
hiddenGemsRoutes.post(
  '/submissions/:id/vote',
  zValidator('json', VoteOnPoiSchema),
  async (c) => {
    const id = c.req.param('id');
    const { voteType } = c.req.valid('json');
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');

    const result = await HiddenGemsService.voteOnUserSubmittedPoi(
      id,
      userId,
      voteType,
      accessToken
    );
    return c.json({ data: result });
  }
);

/**
 * Update user submitted POI status (moderation)
 * PATCH /hidden-gems/submissions/:id/status
 */
hiddenGemsRoutes.patch(
  '/submissions/:id/status',
  zValidator('json', UpdatePoiStatusSchema),
  async (c) => {
    const id = c.req.param('id');
    const { status, moderatorNotes } = c.req.valid('json');
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');

    const data = await HiddenGemsService.updateUserSubmittedPoiStatus(
      id,
      status,
      userId,
      moderatorNotes,
      accessToken
    );
    return c.json({ data });
  }
);

// ============================================
// Hidden Gem Ratings Endpoints
// ============================================

/**
 * Rate a hidden gem POI
 * POST /hidden-gems/:poiId/rate
 */
hiddenGemsRoutes.post(
  '/:poiId/rate',
  zValidator('json', RateHiddenGemSchema),
  async (c) => {
    const poiId = c.req.param('poiId');
    const body = c.req.valid('json');
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');

    const ratingId = await HiddenGemsService.rateHiddenGem(
      poiId,
      userId,
      body,
      accessToken
    );
    return c.json({ data: { id: ratingId } });
  }
);

/**
 * Get ratings for a hidden gem POI
 * GET /hidden-gems/:poiId/ratings
 */
hiddenGemsRoutes.get(
  '/:poiId/ratings',
  zValidator('query', HiddenGemRatingsQuerySchema),
  async (c) => {
    const poiId = c.req.param('poiId');
    const { limit } = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const data = await HiddenGemsService.getHiddenGemRatings(
      poiId,
      limit,
      accessToken
    );
    return c.json({ data });
  }
);

/**
 * Get user's rating for a POI
 * GET /hidden-gems/:poiId/my-rating
 */
hiddenGemsRoutes.get('/:poiId/my-rating', async (c) => {
  const poiId = c.req.param('poiId');
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');

  const data = await HiddenGemsService.getUserRating(
    poiId,
    userId,
    accessToken
  );
  return c.json({ data });
});

/**
 * Delete a rating
 * DELETE /hidden-gems/ratings/:ratingId
 */
hiddenGemsRoutes.delete('/ratings/:ratingId', async (c) => {
  const ratingId = c.req.param('ratingId');
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');

  await HiddenGemsService.deleteRating(ratingId, userId, accessToken);
  return c.json({ success: true });
});
