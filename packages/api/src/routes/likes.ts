import type { AuthVariables } from '../middleware/auth.js';
import { createDb, itineraries, itineraryLikes } from '@pathfinding/database';
import { desc, eq, sql } from 'drizzle-orm';
/**
 * Likes routes — user's liked itineraries.
 * Mirrors the Convex /api/liked HTTP endpoints.
 */
import { Hono } from 'hono';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { ApiError } from '../middleware/error-handler.js';

const app = new Hono<{ Variables: AuthVariables }>();

function getDb() {
  return createDb();
}

// ── GET / — List user's liked itineraries ──────────────
app.get('/', async (c) => {
  const userId = c.req.query('userId');
  const page = Number.parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = Number.parseInt(c.req.query('pageSize') ?? '20', 10);

  if (!userId) {
    throw new ApiError(400, '缺少userId参数');
  }

  const db = getDb();
  const uid = Number(userId);
  const offset = (page - 1) * pageSize;

  const where = eq(itineraryLikes.userId, uid);

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(itineraryLikes)
      .leftJoin(itineraries, eq(itineraryLikes.itineraryId, itineraries.id))
      .where(where)
      .orderBy(desc(itineraryLikes.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(itineraryLikes)
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
