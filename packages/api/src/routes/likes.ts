import type { AuthVariables } from '../middleware/auth.js';
import { getDb, itineraries, itineraryLikes } from '@pathfinding/database';
import { desc, eq, sql } from 'drizzle-orm';
/**
 * Likes routes — user's liked itineraries.
 * Mirrors the Convex /api/liked HTTP endpoints.
 */
import { Hono } from 'hono';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { authRequired } from '../middleware/auth.js';

const app = new Hono<{ Variables: AuthVariables }>();

// ── GET / — List user's liked itineraries ──────────────
app.get('/', authRequired(), async (c) => {
  const page = Number.parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = Number.parseInt(c.req.query('pageSize') ?? '20', 10);

  const db = getDb();
  const uid = Number(c.get('userId'));
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
