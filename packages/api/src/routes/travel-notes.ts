import type { AuthVariables } from '../middleware/auth.js';
import { createDb, travelNotes } from '@pathfinding/database';
import { and, desc, eq, sql } from 'drizzle-orm';
/**
 * Travel Notes routes — list, create.
 * Mirrors the Convex /api/travel-notes HTTP endpoints.
 */
import { Hono } from 'hono';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { ApiError } from '../middleware/error-handler.js';

const app = new Hono<{ Variables: AuthVariables }>();

function getDb() {
  return createDb();
}

// ── GET / — List travel notes ──────────────────────────
app.get('/', async (c) => {
  const userId = c.req.query('userId');
  const page = Number.parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = Number.parseInt(c.req.query('pageSize') ?? '20', 10);
  const visibility = c.req.query('visibility') ?? 'public';
  const offset = (page - 1) * pageSize;

  const db = getDb();

  const conditions = [];
  if (userId) {
    conditions.push(eq(travelNotes.authorId, Number(userId)));
    conditions.push(
      eq(travelNotes.visibility, visibility as 'public' | 'followers' | 'private'),
    );
  }
  else {
    conditions.push(eq(travelNotes.visibility, 'public'));
  }

  const where = and(...conditions);

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(travelNotes)
      .where(where)
      .orderBy(desc(travelNotes.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(travelNotes)
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

// ── POST / — Create a travel note ──────────────────────
app.post('/', async (c) => {
  const body = await c.req.json();
  const { userId, title, content, visibility, destination: _destination } = body;

  if (!userId || !title || !content) {
    throw new ApiError(400, '缺少必要参数');
  }

  const db = getDb();

  const result = await db.insert(travelNotes).values({
    authorId: Number(userId),
    title,
    content,
    visibility: visibility ?? 'public',
  });

  return c.json({ id: Number(result[0].insertId) }, 201);
});

export default app;
