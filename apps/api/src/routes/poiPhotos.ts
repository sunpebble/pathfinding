import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { PoiPhotoService } from '../services/poiPhotoService';

interface Variables {
  userId: string;
  accessToken: string;
}

// Validation schemas
const PhotoStatusSchema = z.enum(['pending', 'approved', 'rejected', 'hidden']);

const UploadPhotoSchema = z.object({
  poiId: z.string(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  caption: z.string().max(500).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  takenAt: z.number().int().positive().optional(),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
});

const UpdateCaptionSchema = z.object({
  caption: z.string().max(500),
});

const SetFeaturedSchema = z.object({
  isFeatured: z.boolean(),
});

const RejectPhotoSchema = z.object({
  moderatorNotes: z.string().max(1000).optional(),
});

const BulkApproveSchema = z.object({
  photoIds: z.array(z.string()).min(1).max(100),
});

// ============================================
// Public Routes (nested under /pois/:poiId/photos)
// ============================================
export const poiPhotosRoutes = new Hono<{ Variables: Variables }>();

/**
 * List photos for a POI
 * GET /pois/:poiId/photos?limit=20&cursor=xxx
 */
poiPhotosRoutes.get(
  '/:poiId/photos',
  zValidator(
    'query',
    z.object({
      status: PhotoStatusSchema.optional(),
      limit: z.coerce.number().int().min(1).max(50).optional().default(20),
      cursor: z.string().optional(),
    })
  ),
  async (c) => {
    const poiId = c.req.param('poiId');
    const { status, limit, cursor } = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const result = await PoiPhotoService.listByPoi(
      poiId,
      { status, limit, cursor },
      accessToken
    );
    return c.json(result);
  }
);

/**
 * Get featured photos for a POI
 * GET /pois/:poiId/photos/featured?limit=5
 */
poiPhotosRoutes.get(
  '/:poiId/photos/featured',
  zValidator(
    'query',
    z.object({
      limit: z.coerce.number().int().min(1).max(20).optional().default(5),
    })
  ),
  async (c) => {
    const poiId = c.req.param('poiId');
    const { limit } = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const data = await PoiPhotoService.getFeaturedByPoi(poiId, limit, accessToken);
    return c.json({ data });
  }
);

/**
 * Get photo stats for a POI
 * GET /pois/:poiId/photos/stats
 */
poiPhotosRoutes.get('/:poiId/photos/stats', async (c) => {
  const poiId = c.req.param('poiId');
  const accessToken = c.get('accessToken');

  const data = await PoiPhotoService.getPoiPhotoStats(poiId, accessToken);
  return c.json({ data });
});

/**
 * Upload a photo for a POI
 * POST /pois/:poiId/photos
 */
poiPhotosRoutes.post(
  '/:poiId/photos',
  zValidator('json', UploadPhotoSchema),
  async (c) => {
    const poiId = c.req.param('poiId');
    const body = c.req.valid('json');
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');

    // TODO: Get user name and avatar from auth context
    const photoId = await PoiPhotoService.upload(
      {
        ...body,
        poiId,
        userId,
      },
      accessToken
    );

    return c.json({ data: { id: photoId } }, 201);
  }
);

// ============================================
// Photo-specific Routes (nested under /photos)
// ============================================
export const photoRoutes = new Hono<{ Variables: Variables }>();

/**
 * Get photo timeline (all approved photos)
 * GET /photos/timeline?limit=20&cursor=xxx
 */
photoRoutes.get(
  '/timeline',
  zValidator(
    'query',
    z.object({
      limit: z.coerce.number().int().min(1).max(50).optional().default(20),
      cursor: z.string().optional(),
    })
  ),
  async (c) => {
    const { limit, cursor } = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const result = await PoiPhotoService.getTimeline({ limit, cursor }, accessToken);
    return c.json(result);
  }
);

/**
 * Get user's uploaded photos
 * GET /photos/my?limit=20
 */
photoRoutes.get(
  '/my',
  zValidator(
    'query',
    z.object({
      limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const { limit } = c.req.valid('query');
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');

    const data = await PoiPhotoService.listByUser(userId, limit, accessToken);
    return c.json({ data });
  }
);

/**
 * Get user's liked photos
 * GET /photos/liked?limit=20
 */
photoRoutes.get(
  '/liked',
  zValidator(
    'query',
    z.object({
      limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    })
  ),
  async (c) => {
    const { limit } = c.req.valid('query');
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');

    const data = await PoiPhotoService.getUserLikedPhotos(userId, limit, accessToken);
    return c.json({ data });
  }
);

/**
 * Get a single photo by ID
 * GET /photos/:photoId
 */
photoRoutes.get('/:photoId', async (c) => {
  const photoId = c.req.param('photoId');
  const accessToken = c.get('accessToken');

  const data = await PoiPhotoService.getById(photoId, accessToken);

  // Increment view count asynchronously
  PoiPhotoService.incrementViews(photoId, accessToken).catch(() => {
    // Ignore view count errors
  });

  return c.json({ data });
});

/**
 * Update photo caption
 * PATCH /photos/:photoId
 */
photoRoutes.patch(
  '/:photoId',
  zValidator('json', UpdateCaptionSchema),
  async (c) => {
    const photoId = c.req.param('photoId');
    const { caption } = c.req.valid('json');
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');

    const data = await PoiPhotoService.updateCaption(
      photoId,
      userId,
      caption,
      accessToken
    );
    return c.json({ data });
  }
);

/**
 * Delete a photo
 * DELETE /photos/:photoId
 */
photoRoutes.delete('/:photoId', async (c) => {
  const photoId = c.req.param('photoId');
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');

  await PoiPhotoService.remove(photoId, userId, accessToken);
  return c.json({ success: true });
});

/**
 * Like a photo
 * POST /photos/:photoId/like
 */
photoRoutes.post('/:photoId/like', async (c) => {
  const photoId = c.req.param('photoId');
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');

  await PoiPhotoService.like(photoId, userId, accessToken);
  return c.json({ success: true });
});

/**
 * Unlike a photo
 * DELETE /photos/:photoId/like
 */
photoRoutes.delete('/:photoId/like', async (c) => {
  const photoId = c.req.param('photoId');
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');

  await PoiPhotoService.unlike(photoId, userId, accessToken);
  return c.json({ success: true });
});

/**
 * Check if user has liked a photo
 * GET /photos/:photoId/like
 */
photoRoutes.get('/:photoId/like', async (c) => {
  const photoId = c.req.param('photoId');
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');

  const hasLiked = await PoiPhotoService.hasUserLiked(photoId, userId, accessToken);
  return c.json({ data: { hasLiked } });
});

// ============================================
// Admin Routes (for moderation)
// ============================================
export const photoAdminRoutes = new Hono<{ Variables: Variables }>();

/**
 * Get pending photos for moderation
 * GET /admin/photos/pending?limit=50
 */
photoAdminRoutes.get(
  '/pending',
  zValidator(
    'query',
    z.object({
      limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    })
  ),
  async (c) => {
    const { limit } = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const data = await PoiPhotoService.getPendingPhotos(limit, accessToken);
    return c.json({ data });
  }
);

/**
 * Approve a photo
 * POST /admin/photos/:photoId/approve
 */
photoAdminRoutes.post('/:photoId/approve', async (c) => {
  const photoId = c.req.param('photoId');
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');

  const data = await PoiPhotoService.approve(photoId, userId, accessToken);
  return c.json({ data });
});

/**
 * Reject a photo
 * POST /admin/photos/:photoId/reject
 */
photoAdminRoutes.post(
  '/:photoId/reject',
  zValidator('json', RejectPhotoSchema),
  async (c) => {
    const photoId = c.req.param('photoId');
    const { moderatorNotes } = c.req.valid('json');
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');

    const data = await PoiPhotoService.reject(
      photoId,
      userId,
      moderatorNotes,
      accessToken
    );
    return c.json({ data });
  }
);

/**
 * Set featured status
 * POST /admin/photos/:photoId/featured
 */
photoAdminRoutes.post(
  '/:photoId/featured',
  zValidator('json', SetFeaturedSchema),
  async (c) => {
    const photoId = c.req.param('photoId');
    const { isFeatured } = c.req.valid('json');
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');

    const data = await PoiPhotoService.setFeatured(
      photoId,
      isFeatured,
      userId,
      accessToken
    );
    return c.json({ data });
  }
);

/**
 * Bulk approve photos
 * POST /admin/photos/bulk-approve
 */
photoAdminRoutes.post(
  '/bulk-approve',
  zValidator('json', BulkApproveSchema),
  async (c) => {
    const { photoIds } = c.req.valid('json');
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');

    const result = await PoiPhotoService.bulkApprove(photoIds, userId, accessToken);
    return c.json({ data: result });
  }
);
