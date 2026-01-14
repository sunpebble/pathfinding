/**
 * Activity Feed Routes
 * API endpoints for social activity feed and user follows
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { ActivityFeedService } from '../services/activityFeedService';

interface Variables {
  userId: string;
  accessToken: string;
}

// Activity type enum for validation
const activityTypeEnum = z.enum([
  'new_itinerary',
  'update_itinerary',
  'like_itinerary',
  'comment_itinerary',
  'copy_itinerary',
  'follow_user',
]);

// Public routes (no auth required)
export const publicFeedRoutes = new Hono();

/**
 * GET /feed/public - Get public activity feed
 * No authentication required
 */
publicFeedRoutes.get(
  '/public',
  zValidator(
    'query',
    z.object({
      cursor: z.coerce.number().optional(),
      limit: z.coerce.number().int().min(1).max(50).optional().default(20),
      activityType: activityTypeEnum.optional(),
    })
  ),
  async (c) => {
    const query = c.req.valid('query');

    const result = await ActivityFeedService.getPublicFeed({
      cursor: query.cursor,
      limit: query.limit,
      activityType: query.activityType,
    });

    return c.json({
      success: true,
      data: result.activities,
      meta: {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    });
  }
);

/**
 * GET /feed/trending - Get trending/recommended itineraries
 * No authentication required
 */
publicFeedRoutes.get(
  '/trending',
  zValidator(
    'query',
    z.object({
      limit: z.coerce.number().int().min(1).max(50).optional().default(20),
      timeWindowDays: z.coerce.number().int().min(1).max(30).optional().default(7),
    })
  ),
  async (c) => {
    const query = c.req.valid('query');

    const result = await ActivityFeedService.getTrendingFeed(
      query.limit,
      query.timeWindowDays
    );

    return c.json({
      success: true,
      data: result.activities,
    });
  }
);

/**
 * GET /feed/user/:userId - Get activities for a specific user
 * No authentication required (public profile)
 */
publicFeedRoutes.get(
  '/user/:userId',
  zValidator(
    'query',
    z.object({
      cursor: z.coerce.number().optional(),
      limit: z.coerce.number().int().min(1).max(50).optional().default(20),
      activityType: activityTypeEnum.optional(),
    })
  ),
  async (c) => {
    const userId = c.req.param('userId');
    const query = c.req.valid('query');

    const result = await ActivityFeedService.getUserActivities(userId, {
      cursor: query.cursor,
      limit: query.limit,
      activityType: query.activityType,
    });

    return c.json({
      success: true,
      data: result.activities,
      meta: {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    });
  }
);

// Protected routes (auth required)
export const feedRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /feed - Get personalized feed (from followed users)
 */
feedRoutes.get(
  '/',
  zValidator(
    'query',
    z.object({
      cursor: z.coerce.number().optional(),
      limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');

    const result = await ActivityFeedService.getFollowingFeed(userId, {
      cursor: query.cursor,
      limit: query.limit,
    });

    return c.json({
      success: true,
      data: result.activities,
      meta: {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    });
  }
);

/**
 * GET /feed/my-activities - Get current user's activities
 */
feedRoutes.get(
  '/my-activities',
  zValidator(
    'query',
    z.object({
      cursor: z.coerce.number().optional(),
      limit: z.coerce.number().int().min(1).max(50).optional().default(20),
      activityType: activityTypeEnum.optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');

    const result = await ActivityFeedService.getUserActivities(userId, {
      cursor: query.cursor,
      limit: query.limit,
      activityType: query.activityType,
    });

    return c.json({
      success: true,
      data: result.activities,
      meta: {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    });
  }
);

// ============================================
// Follow Routes
// ============================================

/**
 * POST /feed/follow/:userId - Follow a user
 */
feedRoutes.post('/follow/:targetUserId', async (c) => {
  const userId = c.get('userId');
  const targetUserId = c.req.param('targetUserId');

  if (userId === targetUserId) {
    return c.json({ error: 'Cannot follow yourself' }, 400);
  }

  const result = await ActivityFeedService.followUser(userId, targetUserId);

  if (result.alreadyFollowing) {
    return c.json({
      success: true,
      data: { alreadyFollowing: true },
      message: 'Already following this user',
    });
  }

  return c.json(
    {
      success: true,
      data: { followId: result.followId },
      message: 'Successfully followed user',
    },
    201
  );
});

/**
 * DELETE /feed/follow/:userId - Unfollow a user
 */
feedRoutes.delete('/follow/:targetUserId', async (c) => {
  const userId = c.get('userId');
  const targetUserId = c.req.param('targetUserId');

  const result = await ActivityFeedService.unfollowUser(userId, targetUserId);

  if (!result.wasFollowing) {
    return c.json({
      success: true,
      data: { wasFollowing: false },
      message: 'Was not following this user',
    });
  }

  return c.json({
    success: true,
    data: { wasFollowing: true },
    message: 'Successfully unfollowed user',
  });
});

/**
 * GET /feed/following/:userId - Check if following a user
 */
feedRoutes.get('/following/:targetUserId', async (c) => {
  const userId = c.get('userId');
  const targetUserId = c.req.param('targetUserId');

  const isFollowing = await ActivityFeedService.isFollowing(
    userId,
    targetUserId
  );

  return c.json({
    success: true,
    data: { isFollowing },
  });
});

/**
 * GET /feed/followers - Get current user's followers
 */
feedRoutes.get(
  '/followers',
  zValidator(
    'query',
    z.object({
      cursor: z.coerce.number().optional(),
      limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');

    const result = await ActivityFeedService.getFollowers(
      userId,
      query.cursor,
      query.limit
    );

    return c.json({
      success: true,
      data: result.followers,
      meta: {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    });
  }
);

/**
 * GET /feed/following - Get users current user is following
 */
feedRoutes.get(
  '/following',
  zValidator(
    'query',
    z.object({
      cursor: z.coerce.number().optional(),
      limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');

    const result = await ActivityFeedService.getFollowing(
      userId,
      query.cursor,
      query.limit
    );

    return c.json({
      success: true,
      data: result.following,
      meta: {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    });
  }
);

/**
 * GET /feed/user/:userId/followers - Get followers for a specific user
 */
publicFeedRoutes.get(
  '/user/:userId/followers',
  zValidator(
    'query',
    z.object({
      cursor: z.coerce.number().optional(),
      limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const userId = c.req.param('userId');
    const query = c.req.valid('query');

    const result = await ActivityFeedService.getFollowers(
      userId,
      query.cursor,
      query.limit
    );

    return c.json({
      success: true,
      data: result.followers,
      meta: {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    });
  }
);

/**
 * GET /feed/user/:userId/following - Get users a specific user is following
 */
publicFeedRoutes.get(
  '/user/:userId/following',
  zValidator(
    'query',
    z.object({
      cursor: z.coerce.number().optional(),
      limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const userId = c.req.param('userId');
    const query = c.req.valid('query');

    const result = await ActivityFeedService.getFollowing(
      userId,
      query.cursor,
      query.limit
    );

    return c.json({
      success: true,
      data: result.following,
      meta: {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    });
  }
);
