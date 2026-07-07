import type { AppContext } from '../env.js';
import { zValidator } from '@hono/zod-validator';
import {
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
import { parsePagination, parsePositiveInt } from '../lib/params.js';
import { jsonData, jsonList, jsonOk } from '../lib/response.js';
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
    followersCount: profile?.followersCount ?? 0,
    followingCount: profile?.followingCount ?? 0,
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

// ── GET /:id/followers — Get user's followers ──────────
app.get('/:id/followers', async (c) => {
  const id = parsePositiveInt(c.req.param('id'));
  if (!id)
    return c.json({ error: 'Invalid ID' }, 400);
  const { limit, offset } = parsePagination(
    c.req.query('pageSize') ?? c.req.query('limit'),
    c.req.query('offset'),
  );

  const db = c.get('db');

  const [results, countResult] = await Promise.all([
    db
      .select()
      .from(userFollows)
      .where(eq(userFollows.followingId, id))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(userFollows)
      .where(eq(userFollows.followingId, id)),
  ]);

  return jsonList(c, convertKeysToSnakeCase(results) as typeof results, { limit, offset }, countResult[0]?.count ?? 0);
});

// ── GET /:id/following — Get users that user follows ───
app.get('/:id/following', async (c) => {
  const id = parsePositiveInt(c.req.param('id'));
  if (!id)
    return c.json({ error: 'Invalid ID' }, 400);
  const { limit, offset } = parsePagination(
    c.req.query('pageSize') ?? c.req.query('limit'),
    c.req.query('offset'),
  );

  const db = c.get('db');

  const [results, countResult] = await Promise.all([
    db
      .select()
      .from(userFollows)
      .where(eq(userFollows.followerId, id))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(userFollows)
      .where(eq(userFollows.followerId, id)),
  ]);

  return jsonList(c, convertKeysToSnakeCase(results) as typeof results, { limit, offset }, countResult[0]?.count ?? 0);
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
    const { followingId } = c.req.valid('json');
    const followerId = Number(c.get('userId'));
    const db = c.get('db');

    // Prevent self-follow
    if (followerId === followingId) {
      return c.json({ error: '不能关注自己' }, 400);
    }

    // Check if already following
    const existing = await db
      .select()
      .from(userFollows)
      .where(
        and(
          eq(userFollows.followerId, followerId),
          eq(userFollows.followingId, followingId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return c.json({ error: '已关注该用户' }, 409);
    }

    await db.transaction(async (tx) => {
      await tx.insert(userFollows).values({
        followerId,
        followingId,
      });

      // Update follower/following counts
      await tx
        .update(profiles)
        .set({ followingCount: sql`${profiles.followingCount} + 1` })
        .where(eq(profiles.userId, followerId));

      await tx
        .update(profiles)
        .set({ followersCount: sql`${profiles.followersCount} + 1` })
        .where(eq(profiles.userId, followingId));
    });

    return c.json({ success: true }, 201);
  },
);

// ── DELETE /:id/follow — Unfollow a user ───────────────
app.delete(
  '/:id/follow',
  authRequired(),
  zValidator('json', followSchema),
  async (c) => {
    const { followingId } = c.req.valid('json');
    const followerId = Number(c.get('userId'));
    const db = c.get('db');

    await db.transaction(async (tx) => {
      await tx
        .delete(userFollows)
        .where(
          and(
            eq(userFollows.followerId, followerId),
            eq(userFollows.followingId, followingId),
          ),
        );

      // Update counts
      await tx
        .update(profiles)
        .set({ followingCount: sql`GREATEST(${profiles.followingCount} - 1, 0)` })
        .where(eq(profiles.userId, followerId));

      await tx
        .update(profiles)
        .set({ followersCount: sql`GREATEST(${profiles.followersCount} - 1, 0)` })
        .where(eq(profiles.userId, followingId));
    });

    return jsonOk(c);
  },
);

// ── GET /:id/follow/status — Check follow status ───────
app.get('/:id/follow/status', async (c) => {
  const id = parsePositiveInt(c.req.param('id'));
  if (!id)
    return c.json({ error: 'Invalid ID' }, 400);
  const followingId = parsePositiveInt(c.req.query('followingId'));

  if (!followingId) {
    return c.json({ error: '缺少followingId参数' }, 400);
  }

  const db = c.get('db');

  const result = await db
    .select()
    .from(userFollows)
    .where(
      and(
        eq(userFollows.followerId, id),
        eq(userFollows.followingId, followingId),
      ),
    )
    .limit(1);

  return c.json({ is_following: result.length > 0 });
});

export default app;
