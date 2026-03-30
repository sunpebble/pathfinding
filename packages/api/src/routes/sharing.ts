import type { AuthVariables } from '../middleware/auth.js';
import { randomBytes } from 'node:crypto';
import { zValidator } from '@hono/zod-validator';
import {
  getDb,
  shareEventLogs,
  shareEvents,
  shareLinks,
} from '@pathfinding/database';
import { and, eq, sql } from 'drizzle-orm';
/**
 * Sharing routes — share links, tracking, stats.
 * Mirrors the Convex /api/share/* HTTP endpoints.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';

import { authRequired } from '../middleware/auth.js';
import { ApiError } from '../middleware/error-handler.js';

const app = new Hono<{ Variables: AuthVariables }>();

function generateShareCode(): string {
  return randomBytes(6).toString('base64url');
}

// ── POST /link — Generate a share link ─────────────────
const createShareLinkSchema = z.object({
  resourceType: z.string().min(1),
  resourceId: z.number(),
  platform: z.string().optional(),
});

app.post('/link', authRequired(), zValidator('json', createShareLinkSchema), async (c) => {
  const { resourceType, resourceId, platform } = c.req.valid('json');

  const userId = Number(c.get('userId'));
  const db = getDb();
  const shareCode = generateShareCode();

  const result = await db.insert(shareLinks).values({
    shareCode,
    resourceType,
    resourceId,
    ownerId: userId,
  });

  // Also create a share event
  await db.insert(shareEvents).values({
    resourceType,
    resourceId,
    sharerId: userId,
    platform: platform ?? null,
    eventType: 'created',
  });

  return c.json(
    convertKeysToSnakeCase({
      id: Number(result[0].insertId),
      shareCode,
      resourceType,
      resourceId,
    }),
    201,
  );
});

// ── POST /track — Track a share event ──────────────────
const trackShareSchema = z.object({
  shareCode: z.string().min(1),
  eventType: z.string().min(1),
});

app.post('/track', zValidator('json', trackShareSchema), async (c) => {
  const { shareCode, eventType } = c.req.valid('json');

  const db = getDb();

  // Find share link by code
  const link = await db
    .select()
    .from(shareLinks)
    .where(eq(shareLinks.shareCode, shareCode))
    .limit(1);

  if (link[0]) {
    // Log the event
    await db.insert(shareEventLogs).values({
      shareLinkId: link[0].id,
      resourceType: link[0].resourceType,
      resourceId: link[0].resourceId,
      eventType,
    });

    // Increment view count
    if (eventType === 'view') {
      await db
        .update(shareLinks)
        .set({ viewCount: sql`${shareLinks.viewCount} + 1` })
        .where(eq(shareLinks.id, link[0].id));
    }
  }

  return c.json({ success: true });
});

// ── GET /stats — Get share statistics ──────────────────
app.get('/stats', async (c) => {
  const resourceId = c.req.query('resourceId');
  const resourceType = c.req.query('resourceType');

  if (!resourceId || !resourceType) {
    throw new ApiError(400, '缺少resourceId或resourceType参数');
  }

  const db = getDb();
  const rid = Number(resourceId);

  if (!Number.isFinite(rid) || rid <= 0) {
    throw new ApiError(400, '无效的resourceId参数');
  }

  const links = await db
    .select()
    .from(shareLinks)
    .where(
      and(
        eq(shareLinks.resourceType, resourceType),
        eq(shareLinks.resourceId, rid),
      ),
    );

  const totalViews = links.reduce(
    (sum, link) => sum + (link.viewCount ?? 0),
    0,
  );

  return c.json(
    convertKeysToSnakeCase({
      totalLinks: links.length,
      totalViews,
      links: links.map(l => ({
        shareCode: l.shareCode,
        viewCount: l.viewCount,
        createdAt: l.createdAt,
      })),
    }),
  );
});

export default app;
