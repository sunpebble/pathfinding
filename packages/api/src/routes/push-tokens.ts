import type { AppContext } from '../env.js';
import { zValidator } from '@hono/zod-validator';
import { pushTokens } from '@pathfinding/database';
import { and, eq } from 'drizzle-orm';
/**
 * Push token routes — register, deactivate, and list push tokens.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { authRequired } from '../middleware/auth.js';

const app = new Hono<AppContext>();

const registerPushTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']),
  deviceId: z.string().optional(),
});

const deletePushTokenSchema = z.object({
  token: z.string().min(1),
});

// ── POST / — Register a push token ────────────────────
app.post('/', authRequired(), zValidator('json', registerPushTokenSchema), async (c) => {
  const userId = Number(c.get('userId'));
  const body = c.req.valid('json');

  const db = c.get('db');

  // Upsert: check if token already exists for this user
  const existing = await db
    .select()
    .from(pushTokens)
    .where(
      and(
        eq(pushTokens.userId, userId),
        eq(pushTokens.token, body.token),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(pushTokens)
      .set({
        platform: body.platform,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(pushTokens.id, existing[0]!.id));

    return c.json({ success: true, message: '推送令牌已更新' });
  }

  await db.insert(pushTokens).values({
    userId,
    token: body.token,
    platform: body.platform,
    isActive: true,
  });

  return c.json({ success: true, message: '推送令牌已注册' });
});

// ── DELETE / — Deactivate a push token ─────────────────
app.delete('/', authRequired(), zValidator('json', deletePushTokenSchema), async (c) => {
  const userId = Number(c.get('userId'));
  const body = c.req.valid('json');

  const db = c.get('db');

  await db
    .update(pushTokens)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(pushTokens.userId, userId),
        eq(pushTokens.token, body.token),
      ),
    );

  return c.json({ success: true, message: '推送令牌已停用' });
});

// ── GET / — List user's active push tokens ─────────────
app.get('/', authRequired(), async (c) => {
  const userId = Number(c.get('userId'));
  const db = c.get('db');

  const tokens = await db
    .select()
    .from(pushTokens)
    .where(
      and(
        eq(pushTokens.userId, userId),
        eq(pushTokens.isActive, true),
      ),
    );

  return c.json({ data: tokens });
});

export default app;
