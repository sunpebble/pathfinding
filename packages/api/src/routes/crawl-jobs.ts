import type { AuthVariables } from '../middleware/auth.js';
import { zValidator } from '@hono/zod-validator';
import { crawlJobs, getDb } from '@pathfinding/database';
import { and, desc, eq } from 'drizzle-orm';
/**
 * Crawl Jobs routes — dashboard crawl job management.
 * Mirrors the Convex /api/crawl-jobs/* HTTP endpoints.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { adminRequired } from '../middleware/auth.js';
import { ApiError } from '../middleware/error-handler.js';

// ── Zod schemas ────────────────────────────────────────
const createJobSchema = z.object({
  name: z.string().min(1),
  platform: z.string().min(1),
  config: z.any(),
  jobType: z.string().optional(),
  scheduleCron: z.string().optional(),
});

const deleteJobSchema = z.object({
  id: z.number(),
});

const startJobSchema = z.object({
  id: z.number(),
});

const completeJobSchema = z.object({
  id: z.number(),
  statistics: z.any().optional(),
});

const failJobSchema = z.object({
  id: z.number(),
  errorMessage: z.string().min(1),
  statistics: z.any().optional(),
});

const app = new Hono<{ Variables: AuthVariables }>();

// ── GET / — List crawl jobs ────────────────────────────
app.get('/', adminRequired(), async (c) => {
  const status = c.req.query('status');
  const platform = c.req.query('platform');
  const parsedLimit = Number.parseInt(c.req.query('limit') ?? '50', 10);
  const limit
    = Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 200)
      : 50;

  const db = getDb();

  const conditions = [];
  if (status) {
    conditions.push(eq(crawlJobs.status, status));
  }
  if (platform) {
    conditions.push(eq(crawlJobs.platform, platform));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const jobs = await db
    .select()
    .from(crawlJobs)
    .where(where)
    .orderBy(desc(crawlJobs.createdAt))
    .limit(limit);

  return c.json({ data: convertKeysToSnakeCase(jobs) });
});

// ── POST / — Create a new crawl job ───────────────────
app.post('/', adminRequired(), zValidator('json', createJobSchema), async (c) => {
  const { name: _name, platform, jobType, config, scheduleCron: _scheduleCron } = c.req.valid('json');

  const db = getDb();

  const result = await db.insert(crawlJobs).values({
    platform,
    jobType: jobType ?? null,
    config,
  });

  const jobId = Number(result[0].insertId);

  const job = await db
    .select()
    .from(crawlJobs)
    .where(eq(crawlJobs.id, jobId))
    .limit(1);

  return c.json({ data: convertKeysToSnakeCase(job[0]) }, 201);
});

// ── GET /job — Get a crawl job by ID ───────────────────
app.get('/job', adminRequired(), async (c) => {
  const id = c.req.query('id');

  if (!id) {
    throw new ApiError(400, '缺少id参数');
  }

  const db = getDb();
  const job = await db
    .select()
    .from(crawlJobs)
    .where(eq(crawlJobs.id, Number(id)))
    .limit(1);

  if (!job[0]) {
    throw new ApiError(404, '任务不存在');
  }

  return c.json({ data: convertKeysToSnakeCase(job[0]) });
});

// ── DELETE / — Delete a crawl job ──────────────────────
app.delete('/', adminRequired(), zValidator('json', deleteJobSchema), async (c) => {
  const { id } = c.req.valid('json');

  const db = getDb();
  await db.delete(crawlJobs).where(eq(crawlJobs.id, Number(id)));

  return c.json({ success: true });
});

// ── POST /start — Start a crawl job ───────────────────
app.post('/start', adminRequired(), zValidator('json', startJobSchema), async (c) => {
  const { id } = c.req.valid('json');

  const db = getDb();
  const jobId = Number(id);

  await db
    .update(crawlJobs)
    .set({ status: 'running', startedAt: new Date(), updatedAt: new Date() })
    .where(eq(crawlJobs.id, jobId));

  const job = await db
    .select()
    .from(crawlJobs)
    .where(eq(crawlJobs.id, jobId))
    .limit(1);

  return c.json({ data: convertKeysToSnakeCase(job[0]) });
});

// ── POST /complete — Complete a crawl job ──────────────
app.post('/complete', adminRequired(), zValidator('json', completeJobSchema), async (c) => {
  const { id, statistics } = c.req.valid('json');

  const db = getDb();
  const jobId = Number(id);

  await db
    .update(crawlJobs)
    .set({
      status: 'completed',
      completedAt: new Date(),
      progress: statistics ?? null,
      updatedAt: new Date(),
    })
    .where(eq(crawlJobs.id, jobId));

  const job = await db
    .select()
    .from(crawlJobs)
    .where(eq(crawlJobs.id, jobId))
    .limit(1);

  return c.json({ data: convertKeysToSnakeCase(job[0]) });
});

// ── POST /fail — Mark a crawl job as failed ────────────
app.post('/fail', adminRequired(), zValidator('json', failJobSchema), async (c) => {
  const { id, errorMessage, statistics } = c.req.valid('json');

  const db = getDb();
  const jobId = Number(id);

  await db
    .update(crawlJobs)
    .set({
      status: 'failed',
      error: errorMessage,
      completedAt: new Date(),
      progress: statistics ?? null,
      updatedAt: new Date(),
    })
    .where(eq(crawlJobs.id, jobId));

  const job = await db
    .select()
    .from(crawlJobs)
    .where(eq(crawlJobs.id, jobId))
    .limit(1);

  return c.json({ data: convertKeysToSnakeCase(job[0]) });
});

export default app;
