/**
 * Itinerary Versions Routes
 * API endpoints for version history management
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { ItineraryVersionService } from '../services/itineraryVersionService';

interface Variables {
  userId: string;
  accessToken: string;
}

export const itineraryVersionsRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /itineraries/:itineraryId/versions - List version history for an itinerary
 */
itineraryVersionsRoutes.get(
  '/:itineraryId/versions',
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const itineraryId = c.req.param('itineraryId');
    const query = c.req.valid('query');

    const { data, total } = await ItineraryVersionService.list(
      itineraryId,
      userId,
      query.page,
      query.pageSize,
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
 * GET /itineraries/:itineraryId/versions/count - Get version count
 */
itineraryVersionsRoutes.get('/:itineraryId/versions/count', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const itineraryId = c.req.param('itineraryId');

  const result = await ItineraryVersionService.getVersionCount(
    itineraryId,
    userId,
    accessToken
  );

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * POST /itineraries/:itineraryId/versions - Create a new version (snapshot current state)
 */
itineraryVersionsRoutes.post(
  '/:itineraryId/versions',
  zValidator(
    'json',
    z.object({
      versionNote: z.string().max(500).optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const itineraryId = c.req.param('itineraryId');
    const input = c.req.valid('json');

    const result = await ItineraryVersionService.create(
      itineraryId,
      userId,
      input,
      accessToken
    );

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
 * GET /versions/:versionId - Get a specific version with full snapshot
 */
itineraryVersionsRoutes.get('/versions/:versionId', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const versionId = c.req.param('versionId');

  const version = await ItineraryVersionService.getById(
    versionId,
    userId,
    accessToken
  );

  return c.json({
    success: true,
    data: version,
  });
});

/**
 * PATCH /versions/:versionId - Update version note
 */
itineraryVersionsRoutes.patch(
  '/versions/:versionId',
  zValidator(
    'json',
    z.object({
      versionNote: z.string().max(500),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const versionId = c.req.param('versionId');
    const input = c.req.valid('json');

    const result = await ItineraryVersionService.updateNote(
      versionId,
      userId,
      input,
      accessToken
    );

    return c.json({
      success: true,
      data: result,
    });
  }
);

/**
 * POST /versions/:versionId/restore - Restore itinerary to a specific version
 */
itineraryVersionsRoutes.post(
  '/versions/:versionId/restore',
  zValidator(
    'json',
    z.object({
      createBackup: z.boolean().optional().default(true),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const versionId = c.req.param('versionId');
    const input = c.req.valid('json');

    const result = await ItineraryVersionService.restore(
      versionId,
      userId,
      input,
      accessToken
    );

    return c.json({
      success: true,
      data: result,
    });
  }
);

/**
 * DELETE /versions/:versionId - Delete a specific version
 */
itineraryVersionsRoutes.delete('/versions/:versionId', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const versionId = c.req.param('versionId');

  await ItineraryVersionService.delete(versionId, userId, accessToken);

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * POST /itineraries/:itineraryId/versions/cleanup - Clean up old versions
 */
itineraryVersionsRoutes.post(
  '/:itineraryId/versions/cleanup',
  zValidator(
    'json',
    z.object({
      keepCount: z.number().int().min(1).max(100).optional().default(10),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const itineraryId = c.req.param('itineraryId');
    const input = c.req.valid('json');

    const result = await ItineraryVersionService.cleanup(
      itineraryId,
      userId,
      input,
      accessToken
    );

    return c.json({
      success: true,
      data: result,
    });
  }
);

/**
 * GET /versions/compare - Compare two versions
 */
itineraryVersionsRoutes.get(
  '/versions/compare',
  zValidator(
    'query',
    z.object({
      versionId1: z.string().min(1),
      versionId2: z.string().min(1),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const query = c.req.valid('query');

    const comparison = await ItineraryVersionService.compare(
      query.versionId1,
      query.versionId2,
      userId,
      accessToken
    );

    return c.json({
      success: true,
      data: comparison,
    });
  }
);
