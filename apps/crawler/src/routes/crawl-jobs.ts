/**
 * Crawl Jobs API Routes
 * Endpoints for managing crawl job configuration and execution
 */

import type {
  CrawlJob,
  CrawlJobListParams,
  CrawlJobStatus,
  CreateCrawlJobRequest,
} from '@pathfinding/crawler-types';
import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import {
  getSupportedPlatforms,
  isPlatformSupported,
} from '../crawlers/registry.js';
import { getSchedulerStatus, startTask, stopTask } from '../jobs/scheduler.js';
import {
  cancelCrawlJob,
  getWorkerStatus,
  isJobRunning,
  queueCrawlJob,
} from '../jobs/worker.js';
import { supabase, TABLES } from '../lib/supabase.js';
import { Errors } from '../middleware/error-handler.js';

export const crawlJobsRouter = new Hono();

// Validation schemas
const createCrawlJobSchema = z.object({
  name: z.string().min(1).max(255),
  platform: z.string().min(1).max(50),
  job_type: z.enum(['full', 'incremental']).optional().default('full'),
  config: z
    .object({
      geographic_scope: z
        .object({
          cities: z.array(z.string()).optional(),
          bounds: z
            .object({
              ne: z.tuple([z.number(), z.number()]),
              sw: z.tuple([z.number(), z.number()]),
            })
            .optional(),
        })
        .optional(),
      categories: z.array(z.string()).optional(),
      rate_limit: z
        .object({
          requests_per_second: z.number().positive(),
          max_concurrent: z.number().positive(),
        })
        .optional(),
      filters: z.record(z.unknown()).optional(),
    })
    .optional()
    .default({}),
  schedule_cron: z.string().optional(),
});

const listCrawlJobsSchema = z.object({
  platform: z.string().optional(),
  status: z
    .enum(['pending', 'running', 'completed', 'failed', 'cancelled'])
    .optional(),
  limit: z.coerce.number().positive().max(100).optional().default(20),
  offset: z.coerce.number().nonnegative().optional().default(0),
});

// GET /api/crawl-jobs - List all crawl jobs
crawlJobsRouter.get(
  '/',
  zValidator('query', listCrawlJobsSchema as any),
  async (c: Context) => {
    const params = c.req.query() as unknown as CrawlJobListParams;

    let query = supabase
      .from(TABLES.CRAWL_JOBS)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(
        params.offset || 0,
        (params.offset || 0) + (params.limit || 20) - 1
      );

    if (params.platform) {
      query = query.eq('platform', params.platform);
    }

    if (params.status) {
      query = query.eq('status', params.status);
    }

    const { data, error, count } = await query;

    if (error) {
      throw Errors.internal(error.message);
    }

    return c.json({
      data: data as CrawlJob[],
      pagination: {
        total: count || 0,
        limit: params.limit || 20,
        offset: params.offset || 0,
      },
    });
  }
);

// POST /api/crawl-jobs - Create a new crawl job
crawlJobsRouter.post(
  '/',
  zValidator('json', createCrawlJobSchema as any),
  async (c: Context) => {
    const body = (await c.req.json()) as CreateCrawlJobRequest;

    // Validate platform
    if (!isPlatformSupported(body.platform)) {
      throw Errors.badRequest(
        `Unsupported platform: ${body.platform}. Supported: ${getSupportedPlatforms().join(', ')}`
      );
    }

    const { data, error } = await supabase
      .from(TABLES.CRAWL_JOBS)
      .insert({
        name: body.name,
        platform: body.platform,
        job_type: body.job_type || 'full',
        config: body.config || {},
        schedule_cron: body.schedule_cron,
        status: 'pending',
        statistics: {
          requests_total: 0,
          requests_success: 0,
          requests_failed: 0,
          records_extracted: 0,
          bytes_downloaded: 0,
          duration_seconds: 0,
        },
      })
      .select()
      .single();

    if (error) {
      throw Errors.internal(error.message);
    }

    return c.json({ data: data as CrawlJob }, 201);
  }
);

// GET /api/crawl-jobs/:id - Get a specific crawl job
crawlJobsRouter.get('/:id', async (c: Context) => {
  const id = c.req.param('id');

  const { data, error } = await supabase
    .from(TABLES.CRAWL_JOBS)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw Errors.notFound('Crawl job');
    }
    throw Errors.internal(error.message);
  }

  return c.json({ data: data as CrawlJob });
});

// POST /api/crawl-jobs/:id/start - Start a crawl job
crawlJobsRouter.post('/:id/start', async (c: Context) => {
  const id = c.req.param('id');

  // Get current job
  const { data: job, error: fetchError } = await supabase
    .from(TABLES.CRAWL_JOBS)
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      throw Errors.notFound('Crawl job');
    }
    throw Errors.internal(fetchError.message);
  }

  if (job.status === 'running') {
    throw Errors.conflict('Job is already running');
  }

  // Check if already running in worker
  if (isJobRunning(id)) {
    throw Errors.conflict('Job is already running');
  }

  // Update job status to running
  const { data, error } = await supabase
    .from(TABLES.CRAWL_JOBS)
    .update({
      status: 'running' as CrawlJobStatus,
      started_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw Errors.internal(error.message);
  }

  // Queue the job for execution (non-blocking)
  queueCrawlJob(data as CrawlJob).catch((err) => {
    console.error(`Failed to execute job ${id}:`, err);
  });

  return c.json({
    data: data as CrawlJob,
    message: 'Crawl job started',
    worker_status: getWorkerStatus(),
  });
});

// POST /api/crawl-jobs/:id/cancel - Cancel a running crawl job
crawlJobsRouter.post('/:id/cancel', async (c: Context) => {
  const id = c.req.param('id');

  // Get current job
  const { data: job, error: fetchError } = await supabase
    .from(TABLES.CRAWL_JOBS)
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      throw Errors.notFound('Crawl job');
    }
    throw Errors.internal(fetchError.message);
  }

  if (job.status !== 'running' && job.status !== 'pending') {
    throw Errors.badRequest('Can only cancel pending or running jobs');
  }

  // Cancel in worker if running
  const cancelled = cancelCrawlJob(id);

  // Update job status to cancelled
  const { data, error } = await supabase
    .from(TABLES.CRAWL_JOBS)
    .update({
      status: 'cancelled' as CrawlJobStatus,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw Errors.internal(error.message);
  }

  return c.json({
    data: data as CrawlJob,
    message: cancelled
      ? 'Crawl job cancelled'
      : 'Crawl job marked as cancelled (was not running)',
  });
});

// GET /api/crawl-jobs/:id/records - Get raw records for a crawl job
crawlJobsRouter.get('/:id/records', async (c: Context) => {
  const id = c.req.param('id');
  const limit = Number.parseInt(c.req.query('limit') || '20', 10);
  const offset = Number.parseInt(c.req.query('offset') || '0', 10);

  // Verify job exists
  const { error: jobError } = await supabase
    .from(TABLES.CRAWL_JOBS)
    .select('id')
    .eq('id', id)
    .single();

  if (jobError) {
    if (jobError.code === 'PGRST116') {
      throw Errors.notFound('Crawl job');
    }
    throw Errors.internal(jobError.message);
  }

  // Get records
  const { data, error, count } = await supabase
    .from(TABLES.RAW_CRAWL_RECORDS)
    .select('*', { count: 'exact' })
    .eq('job_id', id)
    .order('crawled_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw Errors.internal(error.message);
  }

  return c.json({
    data,
    pagination: {
      total: count || 0,
      limit,
      offset,
    },
  });
});

// DELETE /api/crawl-jobs/:id - Delete a crawl job
crawlJobsRouter.delete('/:id', async (c: Context) => {
  const id = c.req.param('id');

  const { error } = await supabase
    .from(TABLES.CRAWL_JOBS)
    .delete()
    .eq('id', id);

  if (error) {
    throw Errors.internal(error.message);
  }

  return c.json({ message: 'Crawl job deleted' });
});

// GET /api/crawl-jobs/scheduler/status - Get scheduler status
crawlJobsRouter.get('/scheduler/status', async (c: Context) => {
  const status = getSchedulerStatus();
  return c.json({ data: status });
});

// POST /api/crawl-jobs/scheduler/tasks/:name/start - Start a scheduled task
crawlJobsRouter.post('/scheduler/tasks/:name/start', async (c: Context) => {
  const name = c.req.param('name');
  const success = startTask(name);

  if (!success) {
    throw Errors.notFound('Scheduled task');
  }

  return c.json({ message: `Task ${name} started` });
});

// POST /api/crawl-jobs/scheduler/tasks/:name/stop - Stop a scheduled task
crawlJobsRouter.post('/scheduler/tasks/:name/stop', async (c: Context) => {
  const name = c.req.param('name');
  const success = stopTask(name);

  if (!success) {
    throw Errors.notFound('Scheduled task');
  }

  return c.json({ message: `Task ${name} stopped` });
});

// POST /api/crawl-jobs/:id/schedule - Schedule a job to run at a specific time
const scheduleJobSchema = z.object({
  run_at: z.string().datetime(),
});

crawlJobsRouter.post(
  '/:id/schedule',
  zValidator('json', scheduleJobSchema as any),
  async (c: Context) => {
    const id = c.req.param('id');
    const body = (await c.req.json()) as { run_at: string };
    const { run_at } = body;

    // Update job scheduled time
    const { data, error } = await supabase
      .from(TABLES.CRAWL_JOBS)
      .update({ scheduled_at: run_at, status: 'pending' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw Errors.notFound('Crawl job');
      }
      throw Errors.internal(error.message);
    }

    return c.json({
      data: data as CrawlJob,
      message: `Job scheduled for ${run_at}`,
    });
  }
);
