import type { AuthVariables } from '../middleware/auth.js';
import { getDb, pushTokens } from '@pathfinding/database';
import { and, eq } from 'drizzle-orm';
/**
 * Push token routes — register, deactivate, and list push tokens.
 */
import { Hono } from 'hono';
import { authRequired } from '../middleware/auth.js';
import { ApiError } from '../middleware/error-handler.js';

const app = new Hono<{ Variables: AuthVariables }>();

// ── POST / — Register a push token ────────────────────
app.post('/', authRequired(), async (c) => {
  const userId = Number(c.get('userId'));

  let body: { token?: string; platform?: string; deviceId?: string };
  try {
    body = await c.req.json<{ token: string; platform: string; deviceId?: string }>();
  }
  catch {
    throw new ApiError(400, '请求体格式无效，需要 JSON');
  }

  if (!body.token || !body.platform) {
    return c.json({ error: '缺少必填字段：token 和 platform' }, 400);
  }

  const validPlatforms = ['ios', 'android', 'web'];
  if (!validPlatforms.includes(body.platform)) {
    return c.json({ error: '平台类型无效，仅支持 ios、android、web' }, 400);
  }

  const db = getDb();

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
app.delete('/', authRequired(), async (c) => {
  const userId = Number(c.get('userId'));

  let body: { token?: string };
  try {
    body = await c.req.json<{ token: string }>();
  }
  catch {
    throw new ApiError(400, '请求体格式无效，需要 JSON');
  }

  if (!body.token) {
    return c.json({ error: '缺少必填字段：token' }, 400);
  }

  const db = getDb();

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
  const db = getDb();

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
