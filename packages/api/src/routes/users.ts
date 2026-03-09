import type { AuthVariables } from '../middleware/auth.js';
import { zValidator } from '@hono/zod-validator';
import {
  getDb,
  profiles,
  userFollows,
  users,
} from '@pathfinding/database';
import { and, eq, sql } from 'drizzle-orm';
/**
 * Users routes — profile, preferences, follows.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { authRequired } from '../middleware/auth.js';

const app = new Hono<{ Variables: AuthVariables }>();

// ── GET /:id — Get user profile ────────────────────────
app.get('/:id', async (c) => {
  const { id } = c.req.param();
  const db = getDb();

  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, Number(id)))
    .limit(1);

  if (userRows.length === 0) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Also fetch profile
  const profileRows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, Number(id)))
    .limit(1);

  const user = userRows[0]!;
  const profile = profileRows[0];

  return c.json({
    data: convertKeysToSnakeCase({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      displayName: profile?.displayName ?? user.name,
      avatarUrl: profile?.avatarUrl ?? user.image,
      bio: profile?.bio,
      followersCount: profile?.followersCount ?? 0,
      followingCount: profile?.followingCount ?? 0,
      createdAt: user.createdAt,
    }),
  });
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
    const { id } = c.req.param();
    const body = c.req.valid('json');
    const db = getDb();

    // Upsert profile
    const existing = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, Number(id)))
      .limit(1);

    if (existing.length === 0) {
      // Create profile
      const user = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, Number(id)))
        .limit(1);

      await db.insert(profiles).values({
        userId: Number(id),
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
        await db
          .update(profiles)
          .set(updates)
          .where(eq(profiles.userId, Number(id)));
      }
    }

    return c.json({ success: true });
  },
);

// ── GET /:id/followers — Get user's followers ──────────
app.get('/:id/followers', async (c) => {
  const { id } = c.req.param();
  const page = Number.parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = Number.parseInt(c.req.query('pageSize') ?? '20', 10);
  const offset = (page - 1) * pageSize;

  const db = getDb();

  const results = await db
    .select()
    .from(userFollows)
    .where(eq(userFollows.followingId, Number(id)))
    .limit(pageSize)
    .offset(offset);

  return c.json({
    data: convertKeysToSnakeCase(results),
    meta: { page, page_size: pageSize },
  });
});

// ── GET /:id/following — Get users that user follows ───
app.get('/:id/following', async (c) => {
  const { id } = c.req.param();
  const page = Number.parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = Number.parseInt(c.req.query('pageSize') ?? '20', 10);
  const offset = (page - 1) * pageSize;

  const db = getDb();

  const results = await db
    .select()
    .from(userFollows)
    .where(eq(userFollows.followerId, Number(id)))
    .limit(pageSize)
    .offset(offset);

  return c.json({
    data: convertKeysToSnakeCase(results),
    meta: { page, page_size: pageSize },
  });
});

// ── POST /:id/follow — Follow a user ──────────────────
const followSchema = z.object({
  followingId: z.number(),
});

app.post(
  '/:id/follow',
  authRequired(),
  zValidator('json', followSchema),
  async (c) => {
    const { id } = c.req.param();
    const { followingId } = c.req.valid('json');
    const db = getDb();

    // Check if already following
    const existing = await db
      .select()
      .from(userFollows)
      .where(
        and(
          eq(userFollows.followerId, Number(id)),
          eq(userFollows.followingId, followingId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return c.json({ error: 'Already following' }, 409);
    }

    await db.insert(userFollows).values({
      followerId: Number(id),
      followingId,
    });

    // Update follower/following counts
    await db
      .update(profiles)
      .set({ followingCount: sql`${profiles.followingCount} + 1` })
      .where(eq(profiles.userId, Number(id)));

    await db
      .update(profiles)
      .set({ followersCount: sql`${profiles.followersCount} + 1` })
      .where(eq(profiles.userId, followingId));

    return c.json({ success: true }, 201);
  },
);

// ── DELETE /:id/follow — Unfollow a user ───────────────
app.delete(
  '/:id/follow',
  authRequired(),
  zValidator('json', followSchema),
  async (c) => {
    const { id } = c.req.param();
    const { followingId } = c.req.valid('json');
    const db = getDb();

    await db
      .delete(userFollows)
      .where(
        and(
          eq(userFollows.followerId, Number(id)),
          eq(userFollows.followingId, followingId),
        ),
      );

    // Update counts
    await db
      .update(profiles)
      .set({ followingCount: sql`GREATEST(${profiles.followingCount} - 1, 0)` })
      .where(eq(profiles.userId, Number(id)));

    await db
      .update(profiles)
      .set({ followersCount: sql`GREATEST(${profiles.followersCount} - 1, 0)` })
      .where(eq(profiles.userId, followingId));

    return c.json({ success: true });
  },
);

// ── GET /:id/follow/status — Check follow status ───────
app.get('/:id/follow/status', async (c) => {
  const { id } = c.req.param();
  const followingId = c.req.query('followingId');

  if (!followingId) {
    return c.json({ error: 'Missing followingId parameter' }, 400);
  }

  const db = getDb();

  const result = await db
    .select()
    .from(userFollows)
    .where(
      and(
        eq(userFollows.followerId, Number(id)),
        eq(userFollows.followingId, Number(followingId)),
      ),
    )
    .limit(1);

  return c.json({ is_following: result.length > 0 });
});

export default app;
