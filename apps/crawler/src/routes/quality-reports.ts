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

import { supabase, TABLES } from '../lib/supabase.js';
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
  zValidator('query', listReportsSchema),
  async (c: Context) => {
    const params = c.req.valid('query') as QualityReportListParams;

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
  zValidator('json', createReportSchema),
  async (c: Context) => {
    const body = c.req.valid('json') as CreateQualityReportRequest;

    // TODO: Calculate actual metrics from database
    // This is a placeholder that will be implemented in Phase 6

    // Build query filters
    let poiQuery = supabase
      .from(TABLES.NORMALIZED_POIS)
      .select('*', { count: 'exact', head: true });

    if (body.scope_platform) {
      poiQuery = poiQuery.contains('sources', [
        { platform: body.scope_platform },
      ]);
    }

    if (body.scope_city) {
      poiQuery = poiQuery.eq('city', body.scope_city);
    }

    const { count: totalPois } = await poiQuery;

    // Calculate placeholder metrics
    const metrics = {
      completeness: {
        total_pois: totalPois || 0,
        with_description: Math.floor((totalPois || 0) * 0.85),
        with_photos: Math.floor((totalPois || 0) * 0.75),
        with_ratings: Math.floor((totalPois || 0) * 0.9),
        with_hours: Math.floor((totalPois || 0) * 0.6),
        completeness_rate: 0.78,
      },
      freshness: {
        updated_last_24h: Math.floor((totalPois || 0) * 0.1),
        updated_last_7d: Math.floor((totalPois || 0) * 0.5),
        stale_30d: Math.floor((totalPois || 0) * 0.15),
        freshness_rate: 0.85,
      },
      accuracy: {
        duplicates_found: 0,
        duplicates_merged: 0,
        conflicts_resolved: 0,
        accuracy_rate: 0.99,
      },
      coverage: {
        cities_covered: 0,
        categories_covered: 0,
        avg_pois_per_city: 0,
      },
    };

    const { data, error } = await supabase
      .from(TABLES.DATA_QUALITY_REPORTS)
      .insert({
        report_type: body.report_type,
        scope_platform: body.scope_platform,
        scope_city: body.scope_city,
        period_start: body.period_start,
        period_end: body.period_end,
        metrics,
        anomalies: [],
      })
      .select()
      .single();

    if (error) {
      throw Errors.internal(error.message);
    }

    return c.json({ data: data as DataQualityReport }, 201);
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
  zValidator('json', generateReportSchema),
  async (c: Context) => {
    const params = c.req.valid('json');

    try {
      const report = await generateQualityReport({
        reportType: params.report_type,
        category: params.category,
        city: params.city,
        includeAnomalies: params.include_anomalies,
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
  zValidator('json', checkAlertsSchema),
  async (c: Context) => {
    const { metrics } = c.req.valid('json');
    const alerts = evaluateMetrics(metrics);
    return c.json({
      data: { newAlerts: alerts, activeAlerts: getActiveAlerts() },
    });
  }
);
