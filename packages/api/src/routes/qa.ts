import type { SQL } from 'drizzle-orm';
import type { AuthVariables } from '../middleware/auth.js';
import { getDb, poiAnswers, poiQuestions } from '@pathfinding/database';
import { asc, desc, eq, sql } from 'drizzle-orm';
/**
 * POI Q&A routes — questions and answers.
 * Mirrors the Convex /api/qa/* HTTP endpoints.
 */
import { Hono } from 'hono';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { ApiError } from '../middleware/error-handler.js';

const app = new Hono<{ Variables: AuthVariables }>();

// ── GET /questions — List questions for a POI ──────────
app.get('/questions', async (c) => {
  const poiId = c.req.query('poiId');
  const page = Number.parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = Number.parseInt(c.req.query('pageSize') ?? '20', 10);
  const sortBy = c.req.query('sortBy') ?? 'newest';

  if (!poiId) {
    throw new ApiError(400, '缺少poiId参数');
  }

  const db = getDb();
  const pid = Number(poiId);
  const offset = (page - 1) * pageSize;

  let orderClause: SQL;
  switch (sortBy) {
    case 'oldest':
      orderClause = asc(poiQuestions.createdAt);
      break;
    case 'most_active':
      orderClause = desc(poiQuestions.lastActivityAt);
      break;
    default:
      orderClause = desc(poiQuestions.createdAt);
  }

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(poiQuestions)
      .where(eq(poiQuestions.poiId, pid))
      .orderBy(orderClause)
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(poiQuestions)
      .where(eq(poiQuestions.poiId, pid)),
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

// ── POST /questions — Create a question ────────────────
app.post('/questions', async (c) => {
  const body = await c.req.json();
  const { poiId, userId, title, content, tags } = body;

  if (!poiId || !userId || !title) {
    throw new ApiError(400, '缺少必要参数');
  }

  const db = getDb();

  const result = await db.insert(poiQuestions).values({
    poiId: Number(poiId),
    userId: Number(userId),
    title,
    content: content ?? '',
    category: 'general',
    tags: tags ?? null,
    lastActivityAt: new Date(),
  });

  return c.json({ id: Number(result[0].insertId) }, 201);
});

// ── GET /answers — List answers for a question ─────────
app.get('/answers', async (c) => {
  const questionId = c.req.query('questionId');
  const page = Number.parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = Number.parseInt(c.req.query('pageSize') ?? '20', 10);

  if (!questionId) {
    throw new ApiError(400, '缺少questionId参数');
  }

  const db = getDb();
  const qid = Number(questionId);
  const offset = (page - 1) * pageSize;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(poiAnswers)
      .where(eq(poiAnswers.questionId, qid))
      .orderBy(desc(poiAnswers.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(poiAnswers)
      .where(eq(poiAnswers.questionId, qid)),
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

// ── POST /answers — Create an answer ───────────────────
app.post('/answers', async (c) => {
  const body = await c.req.json();
  const { questionId, userId, content } = body;

  if (!questionId || !userId || !content) {
    throw new ApiError(400, '缺少必要参数');
  }

  const db = getDb();

  const result = await db.insert(poiAnswers).values({
    questionId: Number(questionId),
    userId: Number(userId),
    content,
  });

  // Update answer count on the question
  await db
    .update(poiQuestions)
    .set({
      answersCount: sql`${poiQuestions.answersCount} + 1`,
      lastActivityAt: new Date(),
    })
    .where(eq(poiQuestions.id, Number(questionId)));

  return c.json({ id: Number(result[0].insertId) }, 201);
});

export default app;
