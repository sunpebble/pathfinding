import type { AuthVariables } from '../middleware/auth.js';
import { zValidator } from '@hono/zod-validator';
import {
  getDb,
  notifications,
  notificationSettings,
} from '@pathfinding/database';
import { and, desc, eq, sql } from 'drizzle-orm';
/**
 * Notifications routes — list, mark read, settings, unread count.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { authRequired } from '../middleware/auth.js';

const app = new Hono<{ Variables: AuthVariables }>();

// ── GET / — List user's notifications ──────────────────
app.get('/', authRequired(), async (c) => {
  const userId = Number(c.get('userId'));
  const page = Number.parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = Number.parseInt(c.req.query('pageSize') ?? '20', 10);
  const unreadOnly = c.req.query('unreadOnly') === 'true';
  const offset = (page - 1) * pageSize;

  const db = getDb();

  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }

  const results = await db
    .select()
    .from(notifications)
    .where(conditions.length === 1 ? conditions[0]! : and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(pageSize)
    .offset(offset);

  return c.json({
    data: convertKeysToSnakeCase(results),
    meta: { page, page_size: pageSize },
  });
});

// ── GET /unread-count — Get unread count ───────────────
app.get('/unread-count', authRequired(), async (c) => {
  const userId = Number(c.get('userId'));

  const db = getDb();

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false),
      ),
    );

  return c.json({ count: result[0]?.count ?? 0 });
});

// ── POST /read — Mark notification as read ─────────────
const markReadSchema = z.object({
  notificationId: z.number(),
});

app.post('/read', authRequired(), zValidator('json', markReadSchema), async (c) => {
  const { notificationId } = c.req.valid('json');
  const userId = Number(c.get('userId'));
  const db = getDb();

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
      ),
    );

  return c.json({ success: true });
});

// ── POST /read-all — Mark all notifications as read ────
const markAllReadSchema = z.object({});

app.post('/read-all', authRequired(), zValidator('json', markAllReadSchema), async (c) => {
  const userId = Number(c.get('userId'));
  const db = getDb();

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false),
      ),
    );

  return c.json({ success: true });
});

// ── GET /settings — Get notification settings ──────────
app.get('/settings', authRequired(), async (c) => {
  const userId = Number(c.get('userId'));

  const db = getDb();

  const result = await db
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.userId, userId))
    .limit(1);

  if (result.length === 0) {
    // Return defaults
    return c.json({
      data: {
        push_enabled: true,
        email_enabled: false,
        quiet_hours_start: null,
        quiet_hours_end: null,
        categories: null,
      },
    });
  }

  return c.json({ data: convertKeysToSnakeCase(result[0]) });
});

// ── PUT /settings — Update notification settings ───────
const updateSettingsSchema = z.object({
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  categories: z.any().optional(),
});

app.put('/settings', authRequired(), zValidator('json', updateSettingsSchema), async (c) => {
  const body = c.req.valid('json');
  const userId = Number(c.get('userId'));
  const db = getDb();

  const existing = await db
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(notificationSettings).values({
      userId,
      pushEnabled: body.pushEnabled ?? true,
      emailEnabled: body.emailEnabled ?? false,
      quietHoursStart: body.quietHoursStart ?? null,
      quietHoursEnd: body.quietHoursEnd ?? null,
      categories: body.categories ?? null,
    });
  }
  else {
    const updates: Record<string, unknown> = {};
    if (body.pushEnabled !== undefined)
      updates.pushEnabled = body.pushEnabled;
    if (body.emailEnabled !== undefined)
      updates.emailEnabled = body.emailEnabled;
    if (body.quietHoursStart !== undefined)
      updates.quietHoursStart = body.quietHoursStart;
    if (body.quietHoursEnd !== undefined)
      updates.quietHoursEnd = body.quietHoursEnd;
    if (body.categories !== undefined)
      updates.categories = body.categories;

    if (Object.keys(updates).length > 0) {
      await db
        .update(notificationSettings)
        .set(updates)
        .where(eq(notificationSettings.userId, userId));
    }
  }

  return c.json({ success: true });
});

export default app;
