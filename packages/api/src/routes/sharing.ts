import type { AuthVariables } from '../middleware/auth.js';
import { createDb, shareEventLogs, shareEvents, shareLinks } from '@pathfinding/database';
import { and, eq, sql } from 'drizzle-orm';
/**
 * Sharing routes — share links, tracking, stats.
 * Mirrors the Convex /api/share/* HTTP endpoints.
 */
import { Hono } from 'hono';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { ApiError } from '../middleware/error-handler.js';

const app = new Hono<{ Variables: AuthVariables }>();

function getDb() {
  return createDb();
}

/** Generate a random share code */
function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ── POST /link — Generate a share link ─────────────────
app.post('/link', async (c) => {
  const body = await c.req.json();
  const { resourceType, resourceId, userId, platform } = body;

  if (!resourceType || !resourceId) {
    throw new ApiError(400, '缺少必要参数');
  }

  const db = getDb();
  const shareCode = generateShareCode();

  const result = await db.insert(shareLinks).values({
    shareCode,
    resourceType,
    resourceId: Number(resourceId),
    ownerId: userId ? Number(userId) : 0,
  });

  // Also create a share event
  if (userId) {
    await db.insert(shareEvents).values({
      resourceType,
      resourceId: Number(resourceId),
      sharerId: Number(userId),
      platform: platform ?? null,
      eventType: 'created',
    });
  }

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
app.post('/track', async (c) => {
  const body = await c.req.json();
  const { shareCode, eventType } = body;

  if (!shareCode || !eventType) {
    throw new ApiError(400, '缺少必要参数');
  }

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

  const links = await db
    .select()
    .from(shareLinks)
    .where(
      and(
        eq(shareLinks.resourceType, resourceType),
        eq(shareLinks.resourceId, rid),
      ),
    );

  const totalViews = links.reduce((sum, link) => sum + (link.viewCount ?? 0), 0);

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
