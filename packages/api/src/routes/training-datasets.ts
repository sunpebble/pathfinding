import type { AuthVariables } from '../middleware/auth.js';
import { getDb, trainingDatasets } from '@pathfinding/database';
import { and, desc, eq, like, sql } from 'drizzle-orm';
/**
 * Training Datasets routes — dashboard training dataset management.
 * Mirrors the Convex /api/training-datasets/* HTTP endpoints.
 */
import { Hono } from 'hono';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { ApiError } from '../middleware/error-handler.js';

const app = new Hono<{ Variables: AuthVariables }>();

// ── GET / — List training datasets ─────────────────────
app.get('/', async (c) => {
  const name = c.req.query('name');
  const status = c.req.query('status');
  const limit = Number.parseInt(c.req.query('limit') ?? '20', 10);
  const offset = Number.parseInt(c.req.query('offset') ?? '0', 10);

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
app.post('/', async (c) => {
  const body = await c.req.json();
  const { name, version, generationParams, outputFormats: _outputFormats, status, statistics: _statistics }
    = body;

  if (!name || !version) {
    throw new ApiError(400, '缺少必要参数');
  }

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

  return c.json({ data: convertKeysToSnakeCase(dataset[0]) }, 201);
});

// ── GET /dataset — Get a training dataset by ID ────────
app.get('/dataset', async (c) => {
  const id = c.req.query('id');

  if (!id) {
    throw new ApiError(400, '缺少id参数');
  }

  const db = getDb();
  const dataset = await db
    .select()
    .from(trainingDatasets)
    .where(eq(trainingDatasets.id, Number(id)))
    .limit(1);

  if (!dataset[0]) {
    throw new ApiError(404, '数据集不存在');
  }

  return c.json({ data: convertKeysToSnakeCase(dataset[0]) });
});

// ── DELETE / — Delete a training dataset ───────────────
app.delete('/', async (c) => {
  const body = await c.req.json();
  const { id } = body;

  if (!id) {
    throw new ApiError(400, '缺少id参数');
  }

  const db = getDb();
  await db.delete(trainingDatasets).where(eq(trainingDatasets.id, Number(id)));

  return c.json({ success: true });
});

// ── PATCH / — Update a training dataset ────────────────
app.patch('/', async (c) => {
  const body = await c.req.json();
  const { id, status, statistics: _statistics, storagePaths: _storagePaths, generatedAt: _generatedAt } = body;

  if (!id) {
    throw new ApiError(400, '缺少id参数');
  }

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

  return c.json({ data: convertKeysToSnakeCase(dataset[0]) });
});

export default app;
