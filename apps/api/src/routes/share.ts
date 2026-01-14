/**
 * Share Routes
 * API endpoints for share link management, event tracking, and statistics
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { ShareService } from '../services/shareService';

interface Variables {
  userId: string;
  accessToken: string;
}

// Validators
const platformSchema = z.enum([
  'wechat',
  'weibo',
  'xiaohongshu',
  'qq',
  'douyin',
  'copy_link',
  'system_share',
  'generic',
]);

const permissionSchema = z.enum(['public', 'unlisted', 'private', 'password']);

const eventTypeSchema = z.enum(['share', 'click', 'view', 'save']);

const resourceTypeSchema = z.enum(['itinerary', 'travelGuide', 'travelNote']);

// ============================================
// Public Routes (no auth required)
// ============================================
export const publicShareRoutes = new Hono();

/**
 * GET /share/:code - Get share link info by code
 */
publicShareRoutes.get('/:code', async (c) => {
  const shareCode = c.req.param('code');

  const shareLink = await ShareService.getByCode(shareCode);

  if (!shareLink) {
    return c.json({ success: false, error: 'Share link not found' }, 404);
  }

  return c.json({
    success: true,
    data: shareLink,
  });
});

/**
 * POST /share/:code/verify - Verify access to a share link
 */
publicShareRoutes.post(
  '/:code/verify',
  zValidator(
    'json',
    z.object({
      password: z.string().optional(),
    })
  ),
  async (c) => {
    const shareCode = c.req.param('code');
    const { password } = c.req.valid('json');

    const result = await ShareService.verifyAccess(shareCode, password);

    return c.json({
      success: true,
      data: result,
    });
  }
);

/**
 * POST /share/:code/track - Track a share event (view, click, save)
 */
publicShareRoutes.post(
  '/:code/track',
  zValidator(
    'json',
    z.object({
      eventType: eventTypeSchema,
      referrer: z.string().optional(),
      userAgent: z.string().optional(),
    })
  ),
  async (c) => {
    const shareCode = c.req.param('code');
    const { eventType, referrer, userAgent } = c.req.valid('json');

    // Hash IP for privacy
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip');
    const ipHash = ip ? hashString(ip) : undefined;

    await ShareService.trackEvent({
      shareCode,
      eventType,
      referrer,
      userAgent,
      ipHash,
    });

    return c.json({
      success: true,
    });
  }
);

/**
 * GET /share/top - Get top shared resources
 */
publicShareRoutes.get(
  '/top',
  zValidator(
    'query',
    z.object({
      resourceType: resourceTypeSchema.optional(),
      days: z.coerce.number().int().min(1).max(365).optional(),
      limit: z.coerce.number().int().min(1).max(50).optional(),
    })
  ),
  async (c) => {
    const { resourceType, days, limit } = c.req.valid('query');

    const result = await ShareService.getTopShared(resourceType, days, limit);

    return c.json({
      success: true,
      data: result,
    });
  }
);

// ============================================
// Protected Routes (auth required)
// ============================================
export const shareRoutes = new Hono<{ Variables: Variables }>();

/**
 * POST /share/links - Create a new share link
 */
shareRoutes.post(
  '/links',
  zValidator(
    'json',
    z.object({
      resourceType: resourceTypeSchema,
      resourceId: z.string().min(1),
      platform: platformSchema,
      permission: permissionSchema.optional(),
      password: z.string().min(4).max(32).optional(),
      expiresAt: z.number().optional(),
      expiresInDays: z.number().int().min(1).max(365).optional(),
      maxViews: z.number().int().min(1).optional(),
      allowDownload: z.boolean().optional(),
      allowCopy: z.boolean().optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    // Calculate expiration timestamp if expiresInDays is provided
    let expiresAt = body.expiresAt;
    if (body.expiresInDays && !expiresAt) {
      expiresAt = Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000;
    }

    const result = await ShareService.createShareLink({
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      ownerId: userId,
      platform: body.platform,
      permission: body.permission,
      password: body.password,
      expiresAt,
      maxViews: body.maxViews,
      allowDownload: body.allowDownload,
      allowCopy: body.allowCopy,
    });

    return c.json({
      success: true,
      data: result,
    });
  }
);

/**
 * POST /share/events - Create a simple share event (without managed link)
 */
shareRoutes.post(
  '/events',
  zValidator(
    'json',
    z.object({
      resourceType: resourceTypeSchema.optional(),
      resourceId: z.string().min(1),
      platform: platformSchema,
      shareUrl: z.string().url().optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { resourceType, resourceId, platform, shareUrl } = c.req.valid('json');

    const result = await ShareService.createShareEvent(
      resourceId,
      platform,
      userId,
      resourceType,
      shareUrl
    );

    return c.json({
      success: true,
      data: { id: result },
    });
  }
);

/**
 * GET /share/links - Get share links for a resource
 */
shareRoutes.get(
  '/links',
  zValidator(
    'query',
    z.object({
      resourceType: resourceTypeSchema,
      resourceId: z.string().min(1),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { resourceType, resourceId } = c.req.valid('query');

    const result = await ShareService.getShareLinks(
      resourceType,
      resourceId,
      userId
    );

    return c.json({
      success: true,
      data: result,
    });
  }
);

/**
 * GET /share/stats - Get share statistics for a resource
 */
shareRoutes.get(
  '/stats',
  zValidator(
    'query',
    z.object({
      resourceType: resourceTypeSchema,
      resourceId: z.string().min(1),
    })
  ),
  async (c) => {
    const { resourceType, resourceId } = c.req.valid('query');

    const result = await ShareService.getStats(resourceType, resourceId);

    return c.json({
      success: true,
      data: result,
    });
  }
);

/**
 * GET /share/history - Get user's share history
 */
shareRoutes.get(
  '/history',
  zValidator(
    'query',
    z.object({
      limit: z.coerce.number().int().min(1).max(50).optional(),
      cursor: z.string().optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const { limit, cursor } = c.req.valid('query');

    const result = await ShareService.getShareHistory(userId, limit, cursor);

    return c.json({
      success: true,
      data: result.items,
      meta: {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    });
  }
);

/**
 * PATCH /share/links/:id - Update share link settings
 */
shareRoutes.patch(
  '/links/:id',
  zValidator(
    'json',
    z.object({
      permission: permissionSchema.optional(),
      password: z.string().min(4).max(32).optional().nullable(),
      expiresAt: z.number().optional().nullable(),
      expiresInDays: z.number().int().min(1).max(365).optional(),
      maxViews: z.number().int().min(1).optional().nullable(),
      allowDownload: z.boolean().optional(),
      allowCopy: z.boolean().optional(),
      isActive: z.boolean().optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const shareLinkId = c.req.param('id');
    const body = c.req.valid('json');

    // Calculate expiration timestamp if expiresInDays is provided
    let expiresAt = body.expiresAt;
    if (body.expiresInDays && expiresAt === undefined) {
      expiresAt = Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000;
    }

    await ShareService.updateShareLink({
      shareLinkId,
      ownerId: userId,
      permission: body.permission,
      password: body.password === null ? undefined : body.password,
      expiresAt: expiresAt === null ? undefined : expiresAt,
      maxViews: body.maxViews === null ? undefined : body.maxViews,
      allowDownload: body.allowDownload,
      allowCopy: body.allowCopy,
      isActive: body.isActive,
    });

    return c.json({
      success: true,
    });
  }
);

/**
 * POST /share/links/:id/revoke - Revoke (deactivate) a share link
 */
shareRoutes.post('/links/:id/revoke', async (c) => {
  const userId = c.get('userId');
  const shareLinkId = c.req.param('id');

  await ShareService.revokeShareLink(shareLinkId, userId);

  return c.json({
    success: true,
  });
});

/**
 * DELETE /share/links/:id - Delete a share link permanently
 */
shareRoutes.delete('/links/:id', async (c) => {
  const userId = c.get('userId');
  const shareLinkId = c.req.param('id');

  await ShareService.deleteShareLink(shareLinkId, userId);

  return c.json({
    success: true,
  });
});

// ============================================
// Itinerary-specific share routes
// ============================================
export const itineraryShareRoutes = new Hono<{ Variables: Variables }>();

/**
 * POST /itineraries/:id/share - Quick share an itinerary
 */
itineraryShareRoutes.post(
  '/:id/share',
  zValidator(
    'json',
    z.object({
      platform: platformSchema,
      permission: permissionSchema.optional(),
      password: z.string().min(4).max(32).optional(),
      expiresInDays: z.number().int().min(1).max(365).optional(),
      maxViews: z.number().int().min(1).optional(),
      allowDownload: z.boolean().optional(),
      allowCopy: z.boolean().optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const itineraryId = c.req.param('id');
    const body = c.req.valid('json');

    // Calculate expiration timestamp
    const expiresAt = body.expiresInDays
      ? Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000
      : undefined;

    const result = await ShareService.createShareLink({
      resourceType: 'itinerary',
      resourceId: itineraryId,
      ownerId: userId,
      platform: body.platform,
      permission: body.permission,
      password: body.password,
      expiresAt,
      maxViews: body.maxViews,
      allowDownload: body.allowDownload,
      allowCopy: body.allowCopy,
    });

    return c.json({
      success: true,
      data: result,
    });
  }
);

/**
 * GET /itineraries/:id/share/stats - Get share stats for an itinerary
 */
itineraryShareRoutes.get('/:id/share/stats', async (c) => {
  const itineraryId = c.req.param('id');

  const result = await ShareService.getStats('itinerary', itineraryId);

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * GET /itineraries/:id/share/links - Get share links for an itinerary
 */
itineraryShareRoutes.get('/:id/share/links', async (c) => {
  const userId = c.get('userId');
  const itineraryId = c.req.param('id');

  const result = await ShareService.getShareLinks('itinerary', itineraryId, userId);

  return c.json({
    success: true,
    data: result,
  });
});

// ============================================
// Helper functions
// ============================================

/**
 * Simple hash function for IP anonymization
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}
