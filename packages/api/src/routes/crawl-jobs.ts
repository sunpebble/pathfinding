import type { AuthVariables } from '../middleware/auth.js';
import { crawlJobs, createDb } from '@pathfinding/database';
import { and, desc, eq } from 'drizzle-orm';
/**
 * Crawl Jobs routes — dashboard crawl job management.
 * Mirrors the Convex /api/crawl-jobs/* HTTP endpoints.
 */
import { Hono } from 'hono';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { ApiError } from '../middleware/error-handler.js';

const app = new Hono<{ Variables: AuthVariables }>();

function getDb() {
  return createDb();
}

// ── GET / — List crawl jobs ────────────────────────────
app.get('/', async (c) => {
  const status = c.req.query('status');
  const platform = c.req.query('platform');
  const limit = Number.parseInt(c.req.query('limit') ?? '50', 10);

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
app.post('/', async (c) => {
  const body = await c.req.json();
  const { name, platform, jobType, config, scheduleCron: _scheduleCron } = body;

  if (!name || !platform || !config) {
    throw new ApiError(400, '缺少必要参数');
  }

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
app.get('/job', async (c) => {
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
app.delete('/', async (c) => {
  const body = await c.req.json();
  const { id } = body;

  if (!id) {
    throw new ApiError(400, '缺少id参数');
  }

  const db = getDb();
  await db.delete(crawlJobs).where(eq(crawlJobs.id, Number(id)));

  return c.json({ success: true });
});

// ── POST /start — Start a crawl job ───────────────────
app.post('/start', async (c) => {
  const body = await c.req.json();
  const { id } = body;

  if (!id) {
    throw new ApiError(400, '缺少id参数');
  }

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
app.post('/complete', async (c) => {
  const body = await c.req.json();
  const { id, statistics } = body;

  if (!id) {
    throw new ApiError(400, '缺少id参数');
  }

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
app.post('/fail', async (c) => {
  const body = await c.req.json();
  const { id, errorMessage, statistics } = body;

  if (!id || !errorMessage) {
    throw new ApiError(400, '缺少必要参数');
  }

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
