import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { optionalAuthMiddleware } from '../middleware/auth';
import { CommentService, NotificationService } from '../services/commentService';

interface Variables {
  userId?: string;
  accessToken?: string;
}

// Schema definitions
const CreateCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment content is required')
    .max(2000, 'Comment content exceeds maximum length'),
  parentId: z.string().optional(),
});

const UpdateCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment content is required')
    .max(2000, 'Comment content exceeds maximum length'),
});

const ReportCommentSchema = z.object({
  reason: z.enum([
    'spam',
    'harassment',
    'inappropriate',
    'misinformation',
    'other',
  ]),
  description: z.string().max(500).optional(),
});

const CommentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

// Public comment routes (read-only, no auth required)
export const publicCommentRoutes = new Hono<{ Variables: Variables }>();

// Apply optional auth to public routes (for like status)
publicCommentRoutes.use('*', optionalAuthMiddleware);

/**
 * GET /itineraries/:itineraryId/comments - List comments for an itinerary
 */
publicCommentRoutes.get(
  '/:itineraryId/comments',
  zValidator('query', CommentListQuerySchema),
  async (c) => {
    const itineraryId = c.req.param('itineraryId');
    const query = c.req.valid('query');
    const userId = c.get('userId');

    const { data, total } = await CommentService.listByItinerary(
      itineraryId,
      query,
      userId
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
 * GET /comments/:commentId - Get a single comment
 */
publicCommentRoutes.get('/comments/:commentId', async (c) => {
  const commentId = c.req.param('commentId');

  const comment = await CommentService.getById(commentId);

  return c.json({
    success: true,
    data: comment,
  });
});

/**
 * GET /comments/:commentId/replies - Get replies for a comment
 */
publicCommentRoutes.get('/comments/:commentId/replies', async (c) => {
  const commentId = c.req.param('commentId');
  const userId = c.get('userId');

  const replies = await CommentService.getReplies(commentId, userId);

  return c.json({
    success: true,
    data: replies,
  });
});

/**
 * GET /itineraries/:itineraryId/comments/count - Get comment count
 */
publicCommentRoutes.get('/:itineraryId/comments/count', async (c) => {
  const itineraryId = c.req.param('itineraryId');

  const count = await CommentService.getCommentCount(itineraryId);

  return c.json({
    success: true,
    data: { count },
  });
});

// Protected comment routes (auth required)
export const commentRoutes = new Hono<{ Variables: Variables }>();

/**
 * POST /itineraries/:itineraryId/comments - Create a new comment
 */
commentRoutes.post(
  '/:itineraryId/comments',
  zValidator('json', CreateCommentSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const itineraryId = c.req.param('itineraryId');
    const input = c.req.valid('json');

    const comment = await CommentService.create(itineraryId, userId, input);

    return c.json(
      {
        success: true,
        data: comment,
      },
      201
    );
  }
);

/**
 * PATCH /comments/:commentId - Update a comment
 */
commentRoutes.patch(
  '/comments/:commentId',
  zValidator('json', UpdateCommentSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const commentId = c.req.param('commentId');
    const input = c.req.valid('json');

    const comment = await CommentService.update(commentId, userId, input);

    return c.json({
      success: true,
      data: comment,
    });
  }
);

/**
 * DELETE /comments/:commentId - Delete a comment
 */
commentRoutes.delete('/comments/:commentId', async (c) => {
  const userId = c.get('userId')!;
  const commentId = c.req.param('commentId');

  await CommentService.delete(commentId, userId);

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * POST /comments/:commentId/like - Toggle like on a comment
 */
commentRoutes.post('/comments/:commentId/like', async (c) => {
  const userId = c.get('userId')!;
  const commentId = c.req.param('commentId');

  const result = await CommentService.toggleLike(commentId, userId);

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * POST /comments/:commentId/report - Report a comment
 */
commentRoutes.post(
  '/comments/:commentId/report',
  zValidator('json', ReportCommentSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const commentId = c.req.param('commentId');
    const input = c.req.valid('json');

    const result = await CommentService.report(commentId, userId, input);

    return c.json({
      success: true,
      data: result,
    });
  }
);

// Notification routes (auth required)
export const notificationRoutes = new Hono<{ Variables: Variables }>();

const NotificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  unreadOnly: z.coerce.boolean().optional().default(false),
});

/**
 * GET /notifications - List notifications for current user
 */
notificationRoutes.get(
  '/',
  zValidator('query', NotificationListQuerySchema),
  async (c) => {
    const userId = c.get('userId')!;
    const query = c.req.valid('query');

    const { data, total } = await NotificationService.list(userId, query);

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
 * GET /notifications/unread-count - Get unread notification count
 */
notificationRoutes.get('/unread-count', async (c) => {
  const userId = c.get('userId')!;

  const count = await NotificationService.getUnreadCount(userId);

  return c.json({
    success: true,
    data: { count },
  });
});

/**
 * POST /notifications/:notificationId/read - Mark notification as read
 */
notificationRoutes.post('/:notificationId/read', async (c) => {
  const userId = c.get('userId')!;
  const notificationId = c.req.param('notificationId');

  await NotificationService.markRead(notificationId, userId);

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * POST /notifications/read-all - Mark all notifications as read
 */
notificationRoutes.post('/read-all', async (c) => {
  const userId = c.get('userId')!;

  const result = await NotificationService.markAllRead(userId);

  return c.json({
    success: true,
    data: result,
  });
});
