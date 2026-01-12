/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
/**
 * Quality Reports API Routes
 * Endpoints for managing data quality analysis reports
 * Migrated to Convex
 */

import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { api, convex } from '../lib/convex.js';
import { Errors } from '../middleware/error-handler.js';

export const qualityReportsRouter = new Hono();

// Validation schemas
const listReportsSchema = z.object({
  dataset_id: z.string().optional(),
  report_type: z.string().optional(),
  limit: z.coerce.number().positive().max(100).optional().default(20),
  offset: z.coerce.number().nonnegative().optional().default(0),
});

const createReportSchema = z.object({
  dataset_id: z.string().optional(),
  report_type: z.string().min(1),
  metrics: z.record(z.any()),
  issues: z.array(z.any()).optional(),
});

// Helper to map Convex report to API response format
function mapReport(report: any) {
  if (!report) return null;
  return {
    id: report._id,
    dataset_id: report.datasetId,
    report_type: report.reportType,
    metrics: report.metrics,
    issues: report.issues,
    created_at: report._creationTime
      ? new Date(report._creationTime).toISOString()
      : null,
    generated_at: report.generatedAt
      ? new Date(report.generatedAt).toISOString()
      : null,
  };
}

// GET /api/quality-reports - List all quality reports
qualityReportsRouter.get(
  '/',
  zValidator('query', listReportsSchema as any),
  async (c: Context) => {
    const query = c.req.query();
    const limit = Number.parseInt(query.limit || '20');
    const offset = Number.parseInt(query.offset || '0');

    try {
      const result = await convex.query(api.dataQualityReports.list, {
        datasetId: query.dataset_id as any,
        reportType: query.report_type,
        limit,
        offset,
      });

      return c.json({
        data: result.data.map(mapReport),
        pagination: result.pagination,
      });
    } catch (error: any) {
      throw Errors.internal(error.message);
    }
  }
);

// POST /api/quality-reports - Create a new quality report
qualityReportsRouter.post(
  '/',
  zValidator('json', createReportSchema as any),
  async (c: Context) => {
    const body = await c.req.json();

    try {
      const report = await convex.mutation(api.dataQualityReports.create, {
        datasetId: body.dataset_id as any,
        reportType: body.report_type,
        metrics: body.metrics,
        issues: body.issues,
      });

      return c.json({ data: mapReport(report) }, 201);
    } catch (error: any) {
      throw Errors.internal(error.message);
    }
  }
);

// GET /api/quality-reports/:id - Get a specific quality report
qualityReportsRouter.get('/:id', async (c: Context) => {
  const id = c.req.param('id');

  try {
    const report = await convex.query(api.dataQualityReports.getById, {
      id: id as any,
    });

    if (!report) {
      throw Errors.notFound('Quality report');
    }

    return c.json({ data: mapReport(report) });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      throw Errors.notFound('Quality report');
    }
    throw Errors.internal(error.message);
  }
});

// DELETE /api/quality-reports/:id - Delete a quality report
qualityReportsRouter.delete('/:id', async (c: Context) => {
  const id = c.req.param('id');

  try {
    const report = await convex.query(api.dataQualityReports.getById, {
      id: id as any,
    });

    if (!report) {
      throw Errors.notFound('Quality report');
    }

    await convex.mutation(api.dataQualityReports.remove, { id: id as any });

    return c.json({ message: 'Quality report deleted' });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      throw Errors.notFound('Quality report');
    }
    throw Errors.internal(error.message);
  }
});

// GET /api/quality-reports/summary - Get summary statistics
qualityReportsRouter.get('/summary', async (c: Context) => {
  try {
    const summary = await convex.query(api.dataQualityReports.getSummary, {});
    return c.json({ data: summary });
  } catch (error: any) {
    throw Errors.internal(error.message);
  }
});
