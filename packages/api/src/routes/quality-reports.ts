import type { AppContext } from '../env.js';
import { zValidator } from '@hono/zod-validator';
import { dataQualityReports } from '@pathfinding/database';
import { and, desc, eq, sql } from 'drizzle-orm';
/**
 * Data Quality Reports routes — dashboard quality report management.
 * Mirrors the Convex /api/quality-reports/* HTTP endpoints.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { parsePagination, parsePositiveInt } from '../lib/params.js';
import { jsonData, jsonOk } from '../lib/response.js';
import { adminRequired } from '../middleware/auth.js';
import { ApiError } from '../middleware/error-handler.js';

// ── Zod schemas ────────────────────────────────────────
const createReportSchema = z.object({
  reportType: z.string().min(1),
  metrics: z.record(z.string(), z.unknown()),
  datasetId: z.number().optional(),
  issues: z.array(z.record(z.string(), z.unknown())).optional(),
});

const deleteReportSchema = z.object({
  id: z.number(),
});

const app = new Hono<AppContext>();

// ── GET / — List quality reports ───────────────────────
app.get('/', adminRequired(), async (c) => {
  const datasetId = c.req.query('datasetId');
  const reportType = c.req.query('reportType');
  const { limit, offset } = parsePagination(
    c.req.query('limit'),
    c.req.query('offset'),
  );

  const db = c.get('db');

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
app.post('/', adminRequired(), zValidator('json', createReportSchema), async (c) => {
  const { datasetId, reportType, metrics, issues } = c.req.valid('json');

  const db = c.get('db');

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

  return jsonData(c, convertKeysToSnakeCase(report[0]), 201);
});

// ── GET /report — Get a quality report by ID ───────────
app.get('/report', adminRequired(), async (c) => {
  const id = parsePositiveInt(c.req.query('id'));

  if (!id) {
    throw new ApiError(400, '缺少id参数');
  }

  const db = c.get('db');
  const report = await db
    .select()
    .from(dataQualityReports)
    .where(eq(dataQualityReports.id, id))
    .limit(1);

  if (!report[0]) {
    throw new ApiError(404, '报告不存在');
  }

  return jsonData(c, convertKeysToSnakeCase(report[0]));
});

// ── DELETE / — Delete a quality report ─────────────────
app.delete('/', adminRequired(), zValidator('json', deleteReportSchema), async (c) => {
  const { id } = c.req.valid('json');

  const db = c.get('db');
  await db
    .delete(dataQualityReports)
    .where(eq(dataQualityReports.id, Number(id)));

  return jsonOk(c);
});

// ── GET /summary — Get quality reports summary ─────────
app.get('/summary', adminRequired(), async (c) => {
  const db = c.get('db');

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

  return jsonData(c, convertKeysToSnakeCase({
    totalReports: totalResult[0]?.count ?? 0,
    byType: byTypeResult,
  }));
});

export default app;
