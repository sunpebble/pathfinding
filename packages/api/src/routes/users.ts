import type { AppContext } from '../env.js';
import { zValidator } from '@hono/zod-validator';
import {
  profiles,
  users,
} from '@pathfinding/database';
import { eq } from 'drizzle-orm';
/**
 * Users routes — profile, preferences.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { parsePositiveInt } from '../lib/params.js';
import { jsonData, jsonOk } from '../lib/response.js';
import { authRequired } from '../middleware/auth.js';

const app = new Hono<AppContext>();

// ── GET /:id — Get user profile ────────────────────────
app.get('/:id', async (c) => {
  const id = parsePositiveInt(c.req.param('id'));
  if (!id)
    return c.json({ error: 'Invalid ID' }, 400);
  const db = c.get('db');

  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (userRows.length === 0) {
    return c.json({ error: '用户不存在' }, 404);
  }

  // Also fetch profile
  const profileRows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, id))
    .limit(1);

  const user = userRows[0]!;
  const profile = profileRows[0];

  return jsonData(c, convertKeysToSnakeCase({
    id: user.id,
    name: user.name,
    image: user.image,
    displayName: profile?.displayName ?? user.name,
    avatarUrl: profile?.avatarUrl ?? user.image,
    bio: profile?.bio,
    createdAt: user.createdAt,
  }));
});

// ── PATCH /:id — Update user profile ───────────────────
const updateProfileSchema = z.object({
  displayName: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().optional(),
  phone: z.string().optional(),
});

app.patch(
  '/:id',
  authRequired(),
  zValidator('json', updateProfileSchema),
  async (c) => {
    const id = parsePositiveInt(c.req.param('id'));
    if (!id)
      return c.json({ error: 'Invalid ID' }, 400);

    // Verify the authenticated user can only update their own profile
    const authenticatedUserId = c.get('userId');
    if (authenticatedUserId !== c.req.param('id')) {
      return c.json({ error: '只能修改自己的个人资料' }, 403);
    }

    const body = c.req.valid('json');
    const db = c.get('db');

    // Upsert profile within a transaction to prevent race conditions
    await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(profiles)
        .where(eq(profiles.userId, id))
        .limit(1);

      if (existing.length === 0) {
        const user = await tx
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, id))
          .limit(1);

        await tx.insert(profiles).values({
          userId: id,
          email: user[0]?.email ?? '',
          displayName: body.displayName ?? null,
          bio: body.bio ?? null,
          avatarUrl: body.avatarUrl ?? null,
          phone: body.phone ?? null,
        });
      }
      else {
        const updates: Record<string, unknown> = {};
        if (body.displayName !== undefined)
          updates.displayName = body.displayName;
        if (body.bio !== undefined)
          updates.bio = body.bio;
        if (body.avatarUrl !== undefined)
          updates.avatarUrl = body.avatarUrl;
        if (body.phone !== undefined)
          updates.phone = body.phone;

        if (Object.keys(updates).length > 0) {
          await tx
            .update(profiles)
            .set(updates)
            .where(eq(profiles.userId, id));
        }
      }
    });

    return jsonOk(c);
  },
);

export default app;
