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
import { parsePagination, parsePositiveInt } from '../lib/params.js';
import { jsonData, jsonOk } from '../lib/response.js';
import { adminRequired } from '../middleware/auth.js';
import { ApiError } from '../middleware/error-handler.js';
import { executeAllPendingBackfillJobs } from '../services/backfill-executor.service.js';
import { computeIngestStats, generateBackfillJobs, runFullAnalysis } from '../services/backfill.service.js';
import { batchImportGuides, discoverNewGuides, MAFENGWO_CRAWLER_DISABLED_MESSAGE } from '../services/guide-import.service.js';

// ── Zod schemas ────────────────────────────────────────
const createJobSchema = z.object({
  name: z.string().min(1),
  platform: z.string().min(1),
  config: z.record(z.unknown()),
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
  statistics: z.record(z.unknown()).optional(),
});

const failJobSchema = z.object({
  id: z.number(),
  errorMessage: z.string().min(1),
  statistics: z.record(z.unknown()).optional(),
});

const backfillJobsSchema = z.object({
  fieldGapGuideIds: z.array(z.number()).optional(),
  destinationGapCities: z.array(z.string()).optional(),
});

const discoverGuidesSchema = z.object({
  platform: z.string().min(1),
  city: z.string().min(1),
});

const importGuidesSchema = z.object({
  platform: z.string().min(1),
  urls: z.array(z.string().url()).min(1),
});

const ingestStatsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});

const app = new Hono<{ Variables: AuthVariables }>();

// ── GET / — List crawl jobs ────────────────────────────
app.get('/', adminRequired(), async (c) => {
  const status = c.req.query('status');
  const platform = c.req.query('platform');
  const { limit } = parsePagination(c.req.query('limit'), undefined, 50);

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

  return jsonData(c, convertKeysToSnakeCase(jobs));
});

// ── POST / — Create a new crawl job ───────────────────
app.post('/', adminRequired(), zValidator('json', createJobSchema), async (c) => {
  const { platform, jobType, config } = c.req.valid('json');

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

  return jsonData(c, convertKeysToSnakeCase(job[0]), 201);
});

// ── GET /job — Get a crawl job by ID ───────────────────
app.get('/job', adminRequired(), async (c) => {
  const id = parsePositiveInt(c.req.query('id'));

  if (!id) {
    throw new ApiError(400, '缺少id参数');
  }

  const db = getDb();
  const job = await db
    .select()
    .from(crawlJobs)
    .where(eq(crawlJobs.id, id))
    .limit(1);

  if (!job[0]) {
    throw new ApiError(404, '任务不存在');
  }

  return jsonData(c, convertKeysToSnakeCase(job[0]));
});

// ── DELETE / — Delete a crawl job ──────────────────────
app.delete('/', adminRequired(), zValidator('json', deleteJobSchema), async (c) => {
  const { id } = c.req.valid('json');

  const db = getDb();
  await db.delete(crawlJobs).where(eq(crawlJobs.id, Number(id)));

  return jsonOk(c);
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

  return jsonData(c, convertKeysToSnakeCase(job[0]));
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

  return jsonData(c, convertKeysToSnakeCase(job[0]));
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

  return jsonData(c, convertKeysToSnakeCase(job[0]));
});

// ── POST /backfill-analysis — Run gap analysis ─────────
app.post('/backfill-analysis', adminRequired(), async (c) => {
  const analysis = await runFullAnalysis(100);
  return jsonData(c, analysis);
});

// ── POST /backfill-jobs — Create backfill crawl jobs ───
app.post('/backfill-jobs', adminRequired(), zValidator('json', backfillJobsSchema), async (c) => {
  const { fieldGapGuideIds, destinationGapCities } = c.req.valid('json');

  if ((!fieldGapGuideIds || fieldGapGuideIds.length === 0)
    && (!destinationGapCities || destinationGapCities.length === 0)) {
    throw new ApiError(400, '至少需要选择一个补齐目标');
  }

  const result = await generateBackfillJobs(fieldGapGuideIds, destinationGapCities);

  return jsonData(c, result, 201);
});

// ── POST /backfill-execute — Execute pending backfill jobs ───
app.post('/backfill-execute', adminRequired(), async (c) => {
  const result = await executeAllPendingBackfillJobs();
  return jsonData(c, result);
});

// ── POST /backfill-all — One-click full backfill (analyze + create + execute) ───
app.post('/backfill-all', adminRequired(), async (c) => {
  const analysis = await runFullAnalysis(100);
  const guideIds = analysis.fieldGaps.map(g => g.guideId);
  const cities = analysis.destinationGaps.map(g => g.cityName);

  if (guideIds.length > 0 || cities.length > 0) {
    await generateBackfillJobs(
      guideIds.length > 0 ? guideIds : undefined,
      cities.length > 0 ? cities : undefined,
    );
  }

  const execution = await executeAllPendingBackfillJobs();

  return jsonData(c, {
    analysis: {
      totalFieldGaps: analysis.totalFieldGaps,
      totalDestinationGaps: analysis.totalDestinationGaps,
    },
    execution,
  });
});

// ── GET /ingest-stats — Daily ingest counts + field fill rates (D16) ───
app.get('/ingest-stats', adminRequired(), zValidator('query', ingestStatsQuerySchema), async (c) => {
  const { days } = c.req.valid('query');

  const stats = await computeIngestStats(days);

  return jsonData(c, stats);
});

// ── POST /discover-guides — Discover new guides from a platform ───
app.post('/discover-guides', adminRequired(), zValidator('json', discoverGuidesSchema), async (c) => {
  const { platform, city } = c.req.valid('json');

  let result;
  try {
    result = await discoverNewGuides(platform, city);
  }
  catch (error) {
    if (error instanceof Error && error.message === MAFENGWO_CRAWLER_DISABLED_MESSAGE) {
      throw new ApiError(503, error.message);
    }
    throw error;
  }

  return jsonData(c, result);
});

// ── POST /import-guides — Batch import discovered guides ───
app.post('/import-guides', adminRequired(), zValidator('json', importGuidesSchema), async (c) => {
  const { platform, urls } = c.req.valid('json');

  const result = await batchImportGuides(platform, urls);

  return jsonData(c, result);
});

export default app;
