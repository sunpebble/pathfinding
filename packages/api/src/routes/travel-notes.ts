import type { AppContext } from '../env.js';
import { zValidator } from '@hono/zod-validator';
import { travelNotes } from '@pathfinding/database';
import { and, desc, eq, sql } from 'drizzle-orm';
/**
 * Travel Notes routes — list, create.
 * Mirrors the Convex /api/travel-notes HTTP endpoints.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { authOptional, authRequired } from '../middleware/auth.js';

const app = new Hono<AppContext>();

// ── GET / — List travel notes ──────────────────────────
app.get('/', authOptional(), async (c) => {
  const userId = c.get('userId');
  const page = Number.parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = Number.parseInt(c.req.query('pageSize') ?? '20', 10);
  const visibility = c.req.query('visibility') ?? 'public';
  const offset = (page - 1) * pageSize;

  const db = c.get('db');

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
const createNoteSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  visibility: z.enum(['public', 'followers', 'private']).optional(),
  destination: z.string().optional(),
});

app.post('/', authRequired(), zValidator('json', createNoteSchema), async (c) => {
  const { title, content, visibility } = c.req.valid('json');

  const db = c.get('db');

  const result = await db.insert(travelNotes).values({
    authorId: Number(c.get('userId')),
    title,
    content,
    visibility: visibility ?? 'public',
  });

  return c.json({ id: Number(result[0].insertId) }, 201);
});

export default app;
