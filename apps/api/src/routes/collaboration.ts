/**
 * Collaboration API Routes
 * Real-time collaboration for itinerary editing
 */

import type { Id } from '../lib/convex';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { api, convex } from '../lib/convex';

interface Variables {
  userId: string;
  accessToken: string;
}

export const collaborationRoutes = new Hono<{ Variables: Variables }>();

// ============================================
// Presence Management
// ============================================

/**
 * POST /itineraries/:id/collaboration/join - Join a collaborative session
 */
collaborationRoutes.post(
  '/:id/collaboration/join',
  zValidator(
    'json',
    z.object({
      displayName: z.string().optional(),
      avatarUrl: z.string().url().optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const itineraryId = c.req.param('id');
    const { displayName, avatarUrl } = c.req.valid('json');

    const presenceId = await convex.mutation(api.collaboratorPresence.joinSession, {
      itineraryId: itineraryId as Id<'itineraries'>,
      userId,
      displayName,
      avatarUrl,
    });

    return c.json({
      success: true,
      data: { presenceId },
    });
  }
);

/**
 * POST /itineraries/:id/collaboration/leave - Leave a collaborative session
 */
collaborationRoutes.post('/:id/collaboration/leave', async (c) => {
  const userId = c.get('userId');
  const itineraryId = c.req.param('id');

  await convex.mutation(api.collaboratorPresence.leaveSession, {
    itineraryId: itineraryId as Id<'itineraries'>,
    userId,
  });

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * POST /itineraries/:id/collaboration/heartbeat - Send heartbeat to keep session alive
 */
collaborationRoutes.post('/:id/collaboration/heartbeat', async (c) => {
  const userId = c.get('userId');
  const itineraryId = c.req.param('id');

  await convex.mutation(api.collaboratorPresence.heartbeat, {
    itineraryId: itineraryId as Id<'itineraries'>,
    userId,
  });

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * GET /itineraries/:id/collaboration/presence - Get all online collaborators
 */
collaborationRoutes.get('/:id/collaboration/presence', async (c) => {
  const itineraryId = c.req.param('id');

  const collaborators = await convex.query(
    api.collaboratorPresence.getCollaboratorsWithPresence,
    {
      itineraryId: itineraryId as Id<'itineraries'>,
    }
  );

  return c.json({
    success: true,
    data: collaborators,
  });
});

/**
 * GET /itineraries/:id/collaboration/online - Get only online collaborators
 */
collaborationRoutes.get('/:id/collaboration/online', async (c) => {
  const itineraryId = c.req.param('id');

  const online = await convex.query(api.collaboratorPresence.getOnlineCollaborators, {
    itineraryId: itineraryId as Id<'itineraries'>,
  });

  return c.json({
    success: true,
    data: online,
  });
});

// ============================================
// Cursor and Selection Updates
// ============================================

/**
 * POST /itineraries/:id/collaboration/cursor - Update cursor position
 */
collaborationRoutes.post(
  '/:id/collaboration/cursor',
  zValidator(
    'json',
    z.object({
      currentDayId: z.string().optional(),
      currentItemId: z.string().optional(),
      cursorPosition: z
        .object({
          field: z.string(),
          offset: z.number().optional(),
        })
        .optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const itineraryId = c.req.param('id');
    const { currentDayId, currentItemId, cursorPosition } = c.req.valid('json');

    await convex.mutation(api.collaboratorPresence.updateCursor, {
      itineraryId: itineraryId as Id<'itineraries'>,
      userId,
      currentDayId: currentDayId as Id<'itineraryDays'> | undefined,
      currentItemId: currentItemId as Id<'itineraryItems'> | undefined,
      cursorPosition,
    });

    return c.json({
      success: true,
      data: null,
    });
  }
);

/**
 * POST /itineraries/:id/collaboration/selection - Update selection state
 */
collaborationRoutes.post(
  '/:id/collaboration/selection',
  zValidator(
    'json',
    z.object({
      selectedElements: z
        .array(
          z.object({
            type: z.enum(['day', 'item', 'poi']),
            id: z.string(),
          })
        )
        .optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const itineraryId = c.req.param('id');
    const { selectedElements } = c.req.valid('json');

    await convex.mutation(api.collaboratorPresence.updateSelection, {
      itineraryId: itineraryId as Id<'itineraries'>,
      userId,
      selectedElements,
    });

    return c.json({
      success: true,
      data: null,
    });
  }
);

// ============================================
// Edit Operations
// ============================================

/**
 * POST /itineraries/:id/collaboration/operation - Record an edit operation
 */
collaborationRoutes.post(
  '/:id/collaboration/operation',
  zValidator(
    'json',
    z.object({
      operationType: z.enum(['create', 'update', 'delete', 'reorder']),
      targetType: z.enum(['itinerary', 'day', 'item']),
      targetId: z.string(),
      changes: z.any(),
      baseVersion: z.number().optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const itineraryId = c.req.param('id');
    const { operationType, targetType, targetId, changes, baseVersion } =
      c.req.valid('json');

    const result = await convex.mutation(api.editOperations.recordOperation, {
      itineraryId: itineraryId as Id<'itineraries'>,
      userId,
      operationType,
      targetType,
      targetId,
      changes,
      baseVersion,
    });

    return c.json({
      success: true,
      data: result,
    });
  }
);

/**
 * GET /itineraries/:id/collaboration/operations - Get recent operations
 */
collaborationRoutes.get(
  '/:id/collaboration/operations',
  zValidator(
    'query',
    z.object({
      limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    })
  ),
  async (c) => {
    const itineraryId = c.req.param('id');
    const { limit } = c.req.valid('query');

    const operations = await convex.query(api.editOperations.getRecentOperations, {
      itineraryId: itineraryId as Id<'itineraries'>,
      limit,
    });

    return c.json({
      success: true,
      data: operations,
    });
  }
);

/**
 * GET /itineraries/:id/collaboration/conflicts - Get conflicted operations
 */
collaborationRoutes.get('/:id/collaboration/conflicts', async (c) => {
  const itineraryId = c.req.param('id');

  const conflicts = await convex.query(api.editOperations.getConflictedOperations, {
    itineraryId: itineraryId as Id<'itineraries'>,
  });

  return c.json({
    success: true,
    data: conflicts,
  });
});

/**
 * POST /itineraries/:id/collaboration/resolve - Resolve a conflict
 */
collaborationRoutes.post(
  '/:id/collaboration/resolve',
  zValidator(
    'json',
    z.object({
      operationId: z.string(),
      resolution: z.enum(['accept_mine', 'accept_theirs', 'merge']),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { operationId, resolution } = c.req.valid('json');

    const result = await convex.mutation(api.editOperations.resolveConflict, {
      operationId: operationId as Id<'editOperations'>,
      userId,
      resolution,
    });

    return c.json({
      success: true,
      data: result,
    });
  }
);
