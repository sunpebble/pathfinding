import type { SQL } from 'drizzle-orm';
import type { AppContext } from '../env.js';
import { zValidator } from '@hono/zod-validator';
import { poiAnswers, poiQuestions } from '@pathfinding/database';
import { asc, desc, eq, sql } from 'drizzle-orm';
/**
 * POI Q&A routes — questions and answers.
 * Mirrors the Convex /api/qa/* HTTP endpoints.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { authRequired } from '../middleware/auth.js';
import { ApiError } from '../middleware/error-handler.js';

const app = new Hono<AppContext>();

// ── GET /questions — List questions for a POI ──────────
app.get('/questions', async (c) => {
  const poiId = c.req.query('poiId');
  const page = Number.parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = Number.parseInt(c.req.query('pageSize') ?? '20', 10);
  const sortBy = c.req.query('sortBy') ?? 'newest';

  if (!poiId) {
    throw new ApiError(400, '缺少poiId参数');
  }

  const db = c.get('db');
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
const createQuestionSchema = z.object({
  poiId: z.number(),
  title: z.string().min(1),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

app.post('/questions', authRequired(), zValidator('json', createQuestionSchema), async (c) => {
  const { poiId, title, content, tags } = c.req.valid('json');

  const db = c.get('db');

  const [result] = await db.insert(poiQuestions).values({
    poiId,
    userId: Number(c.get('userId')),
    title,
    content: content ?? '',
    category: 'general',
    tags: tags ?? null,
    lastActivityAt: new Date(),
  }).returning({ id: poiQuestions.id });

  return c.json({ id: result!.id }, 201);
});

// ── GET /answers — List answers for a question ─────────
app.get('/answers', async (c) => {
  const questionId = c.req.query('questionId');
  const page = Number.parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = Number.parseInt(c.req.query('pageSize') ?? '20', 10);

  if (!questionId) {
    throw new ApiError(400, '缺少questionId参数');
  }

  const db = c.get('db');
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
const createAnswerSchema = z.object({
  questionId: z.number(),
  content: z.string().min(1),
});

app.post('/answers', authRequired(), zValidator('json', createAnswerSchema), async (c) => {
  const { questionId, content } = c.req.valid('json');

  const db = c.get('db');

  const [result] = await db.insert(poiAnswers).values({
    questionId,
    userId: Number(c.get('userId')),
    content,
  }).returning({ id: poiAnswers.id });

  // Update answer count on the question
  await db
    .update(poiQuestions)
    .set({
      answersCount: sql`${poiQuestions.answersCount} + 1`,
      lastActivityAt: new Date(),
    })
    .where(eq(poiQuestions.id, questionId));

  return c.json({ id: result!.id }, 201);
});

export default app;
