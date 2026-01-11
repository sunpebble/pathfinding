/**
 * Quality Reports API Routes
 * Endpoints for generating and viewing data quality reports
 */

import type {
  CreateQualityReportRequest,
  DataQualityReport,
  QualityReportListParams,
} from '@pathfinding/crawler-types';
import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { TABLES } from '../lib/convex.js';
import { Errors } from '../middleware/error-handler.js';
import {
  evaluateMetrics,
  getActiveAlerts,
  getMetrics,
} from '../monitoring/index.js';
import { generateQualityReport } from '../services/quality-report.service.js';

export const qualityReportsRouter = new Hono();

// Validation schemas
const createReportSchema = z.object({
  report_type: z.enum(['daily', 'weekly', 'monthly', 'on_demand']),
  scope_platform: z.string().optional(),
  scope_city: z.string().optional(),
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
});

const listReportsSchema = z.object({
  report_type: z.enum(['daily', 'weekly', 'monthly', 'on_demand']).optional(),
  scope_platform: z.string().optional(),
  scope_city: z.string().optional(),
  limit: z.coerce.number().positive().max(100).optional().default(20),
  offset: z.coerce.number().nonnegative().optional().default(0),
});

// GET /api/quality-reports - List all quality reports
qualityReportsRouter.get(
  '/',
  zValidator('query', listReportsSchema as any),
  async (c: Context) => {
    const params = c.req.query() as unknown as QualityReportListParams;

    let query = supabase
      .from(TABLES.DATA_QUALITY_REPORTS)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(
        params.offset || 0,
        (params.offset || 0) + (params.limit || 20) - 1
      );

    if (params.report_type) {
      query = query.eq('report_type', params.report_type);
    }

    if (params.scope_platform) {
      query = query.eq('scope_platform', params.scope_platform);
    }

    if (params.scope_city) {
      query = query.eq('scope_city', params.scope_city);
    }

    const { data, error, count } = await query;

    if (error) {
      throw Errors.internal(error.message);
    }

    return c.json({
      data: data as DataQualityReport[],
      pagination: {
        total: count || 0,
        limit: params.limit || 20,
        offset: params.offset || 0,
      },
    });
  }
);

// POST /api/quality-reports - Generate a new quality report
qualityReportsRouter.post(
  '/',
  zValidator('json', createReportSchema as any),
  async (c: Context) => {
    const body = (await c.req.json()) as CreateQualityReportRequest;

    // Use the quality report service to generate real metrics
    try {
      const report = await generateQualityReport({
        reportType: body.report_type,
        city: body.scope_city,
        includeAnomalies: true,
      });

      return c.json({ data: report as DataQualityReport }, 201);
    } catch (error) {
      throw Errors.internal(
        error instanceof Error ? error.message : 'Failed to generate report'
      );
    }
  }
);

// GET /api/quality-reports/:id - Get a specific quality report
qualityReportsRouter.get('/:id', async (c: Context) => {
  const id = c.req.param('id');

  const { data, error } = await supabase
    .from(TABLES.DATA_QUALITY_REPORTS)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw Errors.notFound('Quality report');
    }
    throw Errors.internal(error.message);
  }

  return c.json({ data: data as DataQualityReport });
});

// GET /api/quality-reports/latest - Get the most recent quality report
qualityReportsRouter.get('/latest/:type', async (c: Context) => {
  const type = c.req.param('type') as
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'on_demand';

  const { data, error } = await supabase
    .from(TABLES.DATA_QUALITY_REPORTS)
    .select('*')
    .eq('report_type', type)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw Errors.notFound(`No ${type} quality report found`);
    }
    throw Errors.internal(error.message);
  }

  return c.json({ data: data as DataQualityReport });
});

// DELETE /api/quality-reports/:id - Delete a quality report
qualityReportsRouter.delete('/:id', async (c: Context) => {
  const id = c.req.param('id');

  const { error } = await supabase
    .from(TABLES.DATA_QUALITY_REPORTS)
    .delete()
    .eq('id', id);

  if (error) {
    throw Errors.internal(error.message);
  }

  return c.json({ message: 'Quality report deleted' });
});

// POST /api/quality-reports/generate - Generate quality report with full metrics
const generateReportSchema = z.object({
  report_type: z.string().optional().default('on_demand'),
  category: z.string().optional(),
  city: z.string().optional(),
  include_anomalies: z.boolean().optional().default(true),
});

qualityReportsRouter.post(
  '/generate',
  zValidator('json', generateReportSchema as any),
  async (c: Context) => {
    const params = (await c.req.json()) as {
      report_type?: string;
      category?: string;
      city?: string;
      include_anomalies?: boolean;
    };

    try {
      const report = await generateQualityReport({
        reportType: params.report_type ?? 'on_demand',
        category: params.category,
        city: params.city,
        includeAnomalies: params.include_anomalies ?? true,
      });

      return c.json({ data: report }, 201);
    } catch (error) {
      throw Errors.internal(
        error instanceof Error ? error.message : 'Failed to generate report'
      );
    }
  }
);

// GET /api/quality-reports/alerts - Get active alerts
qualityReportsRouter.get('/alerts/active', async (c: Context) => {
  const alerts = getActiveAlerts();
  return c.json({ data: alerts });
});

// GET /api/quality-reports/metrics - Get current metrics
qualityReportsRouter.get('/metrics/current', async (c: Context) => {
  const metrics = getMetrics();
  return c.json({ data: metrics });
});

// POST /api/quality-reports/alerts/check - Evaluate metrics and check for alerts
const checkAlertsSchema = z.object({
  metrics: z.record(z.number()),
});

qualityReportsRouter.post(
  '/alerts/check',
  zValidator('json', checkAlertsSchema as any),
  async (c: Context) => {
    const body = (await c.req.json()) as { metrics: Record<string, number> };
    const alerts = evaluateMetrics(body.metrics);
    return c.json({
      data: { newAlerts: alerts, activeAlerts: getActiveAlerts() },
    });
  }
);
