/**
 * Travel Notes Routes
 * API endpoints for travel notes (游记) management
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  AddImageSchema,
  AddPoiSchema,
  CommentListQuerySchema,
  CreateCommentSchema,
  CreateTravelNoteSchema,
  PublicTravelNoteListQuerySchema,
  TravelNoteListQuerySchema,
  TravelNoteSearchQuerySchema,
  UpdateCommentSchema,
  UpdateTravelNoteSchema,
} from '../models/travelNote';
import { TravelNotesService } from '../services/travelNotesService';

interface Variables {
  userId: string;
  accessToken: string;
}

// ============================================
// Public routes (no auth required)
// ============================================

export const publicTravelNotesRoutes = new Hono();

/**
 * GET /travel-notes/public - List public travel notes for community discovery
 */
publicTravelNotesRoutes.get(
  '/public',
  zValidator('query', PublicTravelNoteListQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const { data, total } = await TravelNotesService.listPublic(query);

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
 * GET /travel-notes/search - Search public travel notes
 */
publicTravelNotesRoutes.get(
  '/search',
  zValidator('query', TravelNoteSearchQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const { data, total } = await TravelNotesService.search(query);

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
 * GET /travel-notes/tags/popular - Get popular tags
 */
publicTravelNotesRoutes.get(
  '/tags/popular',
  zValidator('query', z.object({ limit: z.coerce.number().int().min(1).max(100).optional() })),
  async (c) => {
    const { limit } = c.req.valid('query');
    const tags = await TravelNotesService.getPopularTags(limit);

    return c.json({
      success: true,
      data: tags,
    });
  }
);

/**
 * GET /travel-notes/:id - Get a public travel note by ID
 */
publicTravelNotesRoutes.get('/:id', async (c) => {
  const noteId = c.req.param('id');
  const note = await TravelNotesService.getById(noteId);

  return c.json({
    success: true,
    data: note,
  });
});

/**
 * GET /travel-notes/:id/comments - List comments for a public travel note
 */
publicTravelNotesRoutes.get(
  '/:id/comments',
  zValidator('query', CommentListQuerySchema),
  async (c) => {
    const noteId = c.req.param('id');
    const query = c.req.valid('query');
    const { data, total } = await TravelNotesService.listComments(noteId, query);

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
 * GET /travel-notes/comments/:commentId/replies - List replies to a comment
 */
publicTravelNotesRoutes.get(
  '/comments/:commentId/replies',
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().int().positive().optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const commentId = c.req.param('commentId');
    const query = c.req.valid('query');
    const { data, total } = await TravelNotesService.listReplies(commentId, query);

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

// ============================================
// Protected routes (auth required)
// ============================================

export const travelNotesRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /travel-notes - List user's own travel notes
 */
travelNotesRoutes.get(
  '/',
  zValidator('query', TravelNoteListQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const query = c.req.valid('query');
    const { data, total } = await TravelNotesService.listByUser(userId, query);

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
 * POST /travel-notes - Create a new travel note
 */
travelNotesRoutes.post(
  '/',
  zValidator('json', CreateTravelNoteSchema),
  async (c) => {
    const userId = c.get('userId');
    const input = c.req.valid('json');
    const note = await TravelNotesService.create(userId, input);

    return c.json(
      {
        success: true,
        data: note,
      },
      201
    );
  }
);

/**
 * GET /travel-notes/:id - Get a travel note by ID (with auth for private notes)
 */
travelNotesRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const noteId = c.req.param('id');
  const note = await TravelNotesService.getById(noteId, userId);

  return c.json({
    success: true,
    data: note,
  });
});

/**
 * PATCH /travel-notes/:id - Update a travel note
 */
travelNotesRoutes.patch(
  '/:id',
  zValidator('json', UpdateTravelNoteSchema),
  async (c) => {
    const userId = c.get('userId');
    const noteId = c.req.param('id');
    const input = c.req.valid('json');
    const note = await TravelNotesService.update(noteId, userId, input);

    return c.json({
      success: true,
      data: note,
    });
  }
);

/**
 * DELETE /travel-notes/:id - Delete a travel note
 */
travelNotesRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const noteId = c.req.param('id');
  await TravelNotesService.delete(noteId, userId);

  return c.json({
    success: true,
    data: null,
  });
});

// ============================================
// Image Management
// ============================================

/**
 * POST /travel-notes/:id/images - Add an image to a travel note
 */
travelNotesRoutes.post(
  '/:id/images',
  zValidator('json', AddImageSchema),
  async (c) => {
    const userId = c.get('userId');
    const noteId = c.req.param('id');
    const input = c.req.valid('json');
    const result = await TravelNotesService.addImage(noteId, userId, input);

    return c.json(
      {
        success: true,
        data: result,
      },
      201
    );
  }
);

/**
 * DELETE /travel-notes/images/:imageId - Remove an image from a travel note
 */
travelNotesRoutes.delete('/images/:imageId', async (c) => {
  const userId = c.get('userId');
  const imageId = c.req.param('imageId');
  await TravelNotesService.removeImage(imageId, userId);

  return c.json({
    success: true,
    data: null,
  });
});

// ============================================
// POI Management
// ============================================

/**
 * POST /travel-notes/:id/pois - Add a POI to a travel note
 */
travelNotesRoutes.post(
  '/:id/pois',
  zValidator('json', AddPoiSchema),
  async (c) => {
    const userId = c.get('userId');
    const noteId = c.req.param('id');
    const { poiId, mentionIndex } = c.req.valid('json');
    const result = await TravelNotesService.addPoi(noteId, userId, poiId, mentionIndex);

    return c.json(
      {
        success: true,
        data: result,
      },
      201
    );
  }
);

/**
 * DELETE /travel-notes/:id/pois/:poiId - Remove a POI from a travel note
 */
travelNotesRoutes.delete('/:id/pois/:poiId', async (c) => {
  const userId = c.get('userId');
  const noteId = c.req.param('id');
  const poiId = c.req.param('poiId');
  await TravelNotesService.removePoi(noteId, userId, poiId);

  return c.json({
    success: true,
    data: null,
  });
});

// ============================================
// Likes
// ============================================

/**
 * POST /travel-notes/:id/like - Toggle like on a travel note
 */
travelNotesRoutes.post('/:id/like', async (c) => {
  const userId = c.get('userId');
  const noteId = c.req.param('id');
  const result = await TravelNotesService.toggleLike(noteId, userId);

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * GET /travel-notes/:id/like - Check if user has liked a note
 */
travelNotesRoutes.get('/:id/like', async (c) => {
  const userId = c.get('userId');
  const noteId = c.req.param('id');
  const result = await TravelNotesService.isLiked(noteId, userId);

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * POST /travel-notes/likes/batch - Batch check likes for multiple notes
 */
travelNotesRoutes.post(
  '/likes/batch',
  zValidator('json', z.object({ noteIds: z.array(z.string()) })),
  async (c) => {
    const userId = c.get('userId');
    const { noteIds } = c.req.valid('json');
    const result = await TravelNotesService.batchCheckLikes(userId, noteIds);

    return c.json({
      success: true,
      data: result,
    });
  }
);

// ============================================
// Comments
// ============================================

/**
 * POST /travel-notes/:id/comments - Create a comment on a travel note
 */
travelNotesRoutes.post(
  '/:id/comments',
  zValidator('json', CreateCommentSchema),
  async (c) => {
    const userId = c.get('userId');
    const noteId = c.req.param('id');
    const { content, parentId } = c.req.valid('json');
    const result = await TravelNotesService.createComment(noteId, userId, content, parentId);

    return c.json(
      {
        success: true,
        data: result,
      },
      201
    );
  }
);

/**
 * PATCH /travel-notes/comments/:commentId - Update a comment
 */
travelNotesRoutes.patch(
  '/comments/:commentId',
  zValidator('json', UpdateCommentSchema),
  async (c) => {
    const userId = c.get('userId');
    const commentId = c.req.param('commentId');
    const { content } = c.req.valid('json');
    const comment = await TravelNotesService.updateComment(commentId, userId, content);

    return c.json({
      success: true,
      data: comment,
    });
  }
);

/**
 * DELETE /travel-notes/comments/:commentId - Delete a comment
 */
travelNotesRoutes.delete('/comments/:commentId', async (c) => {
  const userId = c.get('userId');
  const commentId = c.req.param('commentId');
  await TravelNotesService.deleteComment(commentId, userId);

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * POST /travel-notes/comments/:commentId/like - Toggle like on a comment
 */
travelNotesRoutes.post('/comments/:commentId/like', async (c) => {
  const userId = c.get('userId');
  const commentId = c.req.param('commentId');
  const result = await TravelNotesService.toggleCommentLike(commentId, userId);

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * POST /travel-notes/comments/likes/batch - Batch check comment likes
 */
travelNotesRoutes.post(
  '/comments/likes/batch',
  zValidator('json', z.object({ commentIds: z.array(z.string()) })),
  async (c) => {
    const userId = c.get('userId');
    const { commentIds } = c.req.valid('json');
    const result = await TravelNotesService.batchCheckCommentLikes(userId, commentIds);

    return c.json({
      success: true,
      data: result,
    });
  }
);
