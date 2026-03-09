import type { AuthVariables } from '../middleware/auth.js';
import { getDb, itineraries, itineraryFavorites } from '@pathfinding/database';
import { and, desc, eq, sql } from 'drizzle-orm';
/**
 * Favorites routes — user's favorited itineraries.
 * Mirrors the Convex /api/favorited HTTP endpoints.
 */
import { Hono } from 'hono';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { ApiError } from '../middleware/error-handler.js';

const app = new Hono<{ Variables: AuthVariables }>();

// ── GET / — List user's favorited itineraries ──────────
app.get('/', async (c) => {
  const userId = c.req.query('userId');
  const collectionId = c.req.query('collectionId');
  const page = Number.parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = Number.parseInt(c.req.query('pageSize') ?? '20', 10);

  if (!userId) {
    throw new ApiError(400, '缺少userId参数');
  }

  const db = getDb();
  const uid = Number(userId);
  const offset = (page - 1) * pageSize;

  const conditions = [eq(itineraryFavorites.userId, uid)];
  if (collectionId) {
    conditions.push(eq(itineraryFavorites.collectionId, Number(collectionId)));
  }

  const where = and(...conditions);

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(itineraryFavorites)
      .leftJoin(itineraries, eq(itineraryFavorites.itineraryId, itineraries.id))
      .where(where)
      .orderBy(desc(itineraryFavorites.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(itineraryFavorites)
      .where(where),
  ]);

  const total = countResult[0]?.count ?? 0;

  return c.json(
    convertKeysToSnakeCase({
      data: items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    }),
  );
});

export default app;
