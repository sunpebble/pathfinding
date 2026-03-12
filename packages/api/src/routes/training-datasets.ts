import type { AuthVariables } from '../middleware/auth.js';
import { zValidator } from '@hono/zod-validator';
import { getDb, trainingDatasets } from '@pathfinding/database';
import { and, desc, eq, like, sql } from 'drizzle-orm';
/**
 * Training Datasets routes — dashboard training dataset management.
 * Mirrors the Convex /api/training-datasets/* HTTP endpoints.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { parsePagination, parsePositiveInt } from '../lib/params.js';
import { jsonData, jsonOk } from '../lib/response.js';
import { adminRequired } from '../middleware/auth.js';
import { ApiError } from '../middleware/error-handler.js';

// ── Zod schemas ────────────────────────────────────────
const createDatasetSchema = z.object({
  name: z.string().min(1),
  version: z.number(),
  generationParams: z.record(z.unknown()).optional(),
  outputFormats: z.record(z.unknown()).optional(),
  status: z.string().optional(),
  statistics: z.record(z.unknown()).optional(),
});

const deleteDatasetSchema = z.object({
  id: z.number(),
});

const updateDatasetSchema = z.object({
  id: z.number(),
  status: z.string().optional(),
  statistics: z.record(z.unknown()).optional(),
  storagePaths: z.record(z.unknown()).optional(),
  generatedAt: z.string().optional(),
});

const app = new Hono<{ Variables: AuthVariables }>();

// ── GET / — List training datasets ─────────────────────
app.get('/', adminRequired(), async (c) => {
  const name = c.req.query('name');
  const status = c.req.query('status');
  const { limit, offset } = parsePagination(
    c.req.query('limit'),
    c.req.query('offset'),
  );

  const db = getDb();

  const conditions = [];
  if (name) {
    conditions.push(like(trainingDatasets.name, `%${name}%`));
  }
  if (status) {
    conditions.push(eq(trainingDatasets.status, status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(trainingDatasets)
      .where(where)
      .orderBy(desc(trainingDatasets.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(trainingDatasets)
      .where(where),
  ]);

  const total = countResult[0]?.count ?? 0;

  return c.json(
    convertKeysToSnakeCase({
      data: items,
      total,
      limit,
      offset,
    }),
  );
});

// ── POST / — Create a training dataset ─────────────────
app.post('/', adminRequired(), zValidator('json', createDatasetSchema), async (c) => {
  const { name, version, generationParams, outputFormats: _outputFormats, status, statistics: _statistics }
    = c.req.valid('json');

  const db = getDb();

  const result = await db.insert(trainingDatasets).values({
    name,
    version,
    description: null,
    status: status ?? 'draft',
    config: generationParams ?? null,
  });

  const datasetId = Number(result[0].insertId);
  const dataset = await db
    .select()
    .from(trainingDatasets)
    .where(eq(trainingDatasets.id, datasetId))
    .limit(1);

  return jsonData(c, convertKeysToSnakeCase(dataset[0]), 201);
});

// ── GET /dataset — Get a training dataset by ID ────────
app.get('/dataset', adminRequired(), async (c) => {
  const id = parsePositiveInt(c.req.query('id'));

  if (!id) {
    throw new ApiError(400, '缺少id参数');
  }

  const db = getDb();
  const dataset = await db
    .select()
    .from(trainingDatasets)
    .where(eq(trainingDatasets.id, id))
    .limit(1);

  if (!dataset[0]) {
    throw new ApiError(404, '数据集不存在');
  }

  return jsonData(c, convertKeysToSnakeCase(dataset[0]));
});

// ── DELETE / — Delete a training dataset ───────────────
app.delete('/', adminRequired(), zValidator('json', deleteDatasetSchema), async (c) => {
  const { id } = c.req.valid('json');

  const db = getDb();
  await db.delete(trainingDatasets).where(eq(trainingDatasets.id, Number(id)));

  return jsonOk(c);
});

// ── PATCH / — Update a training dataset ────────────────
app.patch('/', adminRequired(), zValidator('json', updateDatasetSchema), async (c) => {
  const { id, status, statistics: _statistics, storagePaths: _storagePaths, generatedAt: _generatedAt } = c.req.valid('json');

  const db = getDb();
  const datasetId = Number(id);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (status !== undefined)
    updates.status = status;

  await db
    .update(trainingDatasets)
    .set(updates)
    .where(eq(trainingDatasets.id, datasetId));

  const dataset = await db
    .select()
    .from(trainingDatasets)
    .where(eq(trainingDatasets.id, datasetId))
    .limit(1);

  return jsonData(c, convertKeysToSnakeCase(dataset[0]));
});

export default app;
