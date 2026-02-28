import type { AuthVariables } from '../middleware/auth.js';
import { createDb, dataQualityReports } from '@pathfinding/database';
import { and, desc, eq, sql } from 'drizzle-orm';
/**
 * Data Quality Reports routes — dashboard quality report management.
 * Mirrors the Convex /api/quality-reports/* HTTP endpoints.
 */
import { Hono } from 'hono';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { ApiError } from '../middleware/error-handler.js';

const app = new Hono<{ Variables: AuthVariables }>();

function getDb() {
  return createDb();
}

// ── GET / — List quality reports ───────────────────────
app.get('/', async (c) => {
  const datasetId = c.req.query('datasetId');
  const reportType = c.req.query('reportType');
  const limit = Number.parseInt(c.req.query('limit') ?? '20', 10);
  const offset = Number.parseInt(c.req.query('offset') ?? '0', 10);

  const db = getDb();

  const conditions = [];
  if (datasetId) {
    conditions.push(eq(dataQualityReports.datasetId, Number(datasetId)));
  }
  if (reportType) {
    conditions.push(eq(dataQualityReports.reportType, reportType));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(dataQualityReports)
      .where(where)
      .orderBy(desc(dataQualityReports.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(dataQualityReports)
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

// ── POST / — Create a quality report ───────────────────
app.post('/', async (c) => {
  const body = await c.req.json();
  const { datasetId, reportType, metrics, issues } = body;

  if (!reportType || !metrics) {
    throw new ApiError(400, '缺少必要参数');
  }

  const db = getDb();

  const result = await db.insert(dataQualityReports).values({
    datasetId: datasetId ? Number(datasetId) : 0,
    reportType,
    metrics,
    issues: issues ?? null,
    generatedAt: new Date(),
  });

  const reportId = Number(result[0].insertId);
  const report = await db
    .select()
    .from(dataQualityReports)
    .where(eq(dataQualityReports.id, reportId))
    .limit(1);

  return c.json({ data: convertKeysToSnakeCase(report[0]) }, 201);
});

// ── GET /report — Get a quality report by ID ───────────
app.get('/report', async (c) => {
  const id = c.req.query('id');

  if (!id) {
    throw new ApiError(400, '缺少id参数');
  }

  const db = getDb();
  const report = await db
    .select()
    .from(dataQualityReports)
    .where(eq(dataQualityReports.id, Number(id)))
    .limit(1);

  if (!report[0]) {
    throw new ApiError(404, '报告不存在');
  }

  return c.json({ data: convertKeysToSnakeCase(report[0]) });
});

// ── DELETE / — Delete a quality report ─────────────────
app.delete('/', async (c) => {
  const body = await c.req.json();
  const { id } = body;

  if (!id) {
    throw new ApiError(400, '缺少id参数');
  }

  const db = getDb();
  await db
    .delete(dataQualityReports)
    .where(eq(dataQualityReports.id, Number(id)));

  return c.json({ success: true });
});

// ── GET /summary — Get quality reports summary ─────────
app.get('/summary', async (c) => {
  const db = getDb();

  const [totalResult, byTypeResult] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(dataQualityReports),
    db
      .select({
        reportType: dataQualityReports.reportType,
        count: sql<number>`count(*)`,
      })
      .from(dataQualityReports)
      .groupBy(dataQualityReports.reportType),
  ]);

  return c.json({
    data: convertKeysToSnakeCase({
      totalReports: totalResult[0]?.count ?? 0,
      byType: byTypeResult,
    }),
  });
});

export default app;
