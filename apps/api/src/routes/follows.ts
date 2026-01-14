/**
 * User Follows Routes
 * API endpoints for follow/unfollow operations, followers/following lists,
 * mutual follow detection, and follow recommendations
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { api, convex } from '../lib/convex';

interface Variables {
  userId: string;
  accessToken: string;
}

// Public routes (no auth required)
export const publicFollowRoutes = new Hono();

/**
 * GET /follows/user/:userId/followers - Get followers for a specific user
 */
publicFollowRoutes.get(
  '/user/:userId/followers',
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const userId = c.req.param('userId');
    const query = c.req.valid('query');

    const result = await convex.query(api.userFollows.getFollowers, {
      userId,
      page: query.page,
      pageSize: query.pageSize,
    });

    return c.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    });
  }
);

/**
 * GET /follows/user/:userId/following - Get users a specific user is following
 */
publicFollowRoutes.get(
  '/user/:userId/following',
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const userId = c.req.param('userId');
    const query = c.req.valid('query');

    const result = await convex.query(api.userFollows.getFollowing, {
      userId,
      page: query.page,
      pageSize: query.pageSize,
    });

    return c.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    });
  }
);

/**
 * GET /follows/user/:userId/stats - Get follow statistics for a user
 */
publicFollowRoutes.get('/user/:userId/stats', async (c) => {
  const userId = c.req.param('userId');

  const result = await convex.query(api.userFollows.getFollowStats, {
    userId,
  });

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * GET /follows/check/:userIdA/:userIdB - Check mutual follow status between two users
 */
publicFollowRoutes.get('/check/:userIdA/:userIdB', async (c) => {
  const userIdA = c.req.param('userIdA');
  const userIdB = c.req.param('userIdB');

  const result = await convex.query(api.userFollows.getMutualFollowStatus, {
    userIdA,
    userIdB,
  });

  return c.json({
    success: true,
    data: result,
  });
});

// Protected routes (auth required)
export const followRoutes = new Hono<{ Variables: Variables }>();

/**
 * POST /follows/:targetUserId - Follow a user
 */
followRoutes.post('/:targetUserId', async (c) => {
  const userId = c.get('userId');
  const targetUserId = c.req.param('targetUserId');

  if (userId === targetUserId) {
    return c.json({ success: false, error: '不能关注自己' }, 400);
  }

  try {
    const result = await convex.mutation(api.userFollows.follow, {
      followerId: userId,
      followingId: targetUserId,
    });

    return c.json(
      {
        success: true,
        data: { followId: result },
        message: '关注成功',
      },
      201
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Already following')) {
      return c.json({
        success: true,
        data: { alreadyFollowing: true },
        message: '已经关注了该用户',
      });
    }
    throw error;
  }
});

/**
 * DELETE /follows/:targetUserId - Unfollow a user
 */
followRoutes.delete('/:targetUserId', async (c) => {
  const userId = c.get('userId');
  const targetUserId = c.req.param('targetUserId');

  try {
    await convex.mutation(api.userFollows.unfollow, {
      followerId: userId,
      followingId: targetUserId,
    });

    return c.json({
      success: true,
      message: '取消关注成功',
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not following')) {
      return c.json({
        success: true,
        data: { wasFollowing: false },
        message: '未关注该用户',
      });
    }
    throw error;
  }
});

/**
 * GET /follows/status/:targetUserId - Check if current user is following a user
 */
followRoutes.get('/status/:targetUserId', async (c) => {
  const userId = c.get('userId');
  const targetUserId = c.req.param('targetUserId');

  const isFollowing = await convex.query(api.userFollows.isFollowing, {
    followerId: userId,
    followingId: targetUserId,
  });

  const isFollowedBy = await convex.query(api.userFollows.isFollowing, {
    followerId: targetUserId,
    followingId: userId,
  });

  return c.json({
    success: true,
    data: {
      isFollowing,
      isFollowedBy,
      isMutual: isFollowing && isFollowedBy,
    },
  });
});

/**
 * POST /follows/batch-status - Batch check follow status for multiple users
 */
followRoutes.post(
  '/batch-status',
  zValidator(
    'json',
    z.object({
      targetUserIds: z.array(z.string()).min(1).max(50),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { targetUserIds } = c.req.valid('json');

    const result = await convex.query(api.userFollows.batchCheckFollowStatus, {
      userId,
      targetUserIds,
    });

    return c.json({
      success: true,
      data: result,
    });
  }
);

/**
 * GET /follows/followers - Get current user's followers
 */
followRoutes.get(
  '/followers',
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');

    const result = await convex.query(api.userFollows.getFollowers, {
      userId,
      page: query.page,
      pageSize: query.pageSize,
      currentUserId: userId,
    });

    return c.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    });
  }
);

/**
 * GET /follows/following - Get users current user is following
 */
followRoutes.get(
  '/following',
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');

    const result = await convex.query(api.userFollows.getFollowing, {
      userId,
      page: query.page,
      pageSize: query.pageSize,
      currentUserId: userId,
    });

    return c.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    });
  }
);

/**
 * GET /follows/mutual - Get mutual followers (users who follow each other)
 */
followRoutes.get(
  '/mutual',
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');

    const result = await convex.query(api.userFollows.getMutualFollowers, {
      userId,
      page: query.page,
      pageSize: query.pageSize,
    });

    return c.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    });
  }
);

/**
 * GET /follows/recommendations - Get follow recommendations
 */
followRoutes.get(
  '/recommendations',
  zValidator(
    'query',
    z.object({
      limit: z.coerce.number().int().min(1).max(50).optional().default(10),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');

    const result = await convex.query(api.userFollows.getFollowRecommendations, {
      userId,
      limit: query.limit,
    });

    return c.json({
      success: true,
      data: result.data,
    });
  }
);

/**
 * GET /follows/feed - Get itineraries from followed users
 */
followRoutes.get(
  '/feed',
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');

    const result = await convex.query(api.userFollows.getFollowingFeed, {
      userId,
      page: query.page,
      pageSize: query.pageSize,
    });

    return c.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    });
  }
);
