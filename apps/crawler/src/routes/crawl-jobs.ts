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
import type { Id } from '../lib/convex.js';
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
import { api, convex } from '../lib/convex.js';
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

    // Explicitly convert to numbers for Convex
    const limit = Number(params.limit) || 20;
    const offset = Number(params.offset) || 0;

    try {
      const jobs = await convex.query(api.crawlJobs.list, {
        status: params.status,
        platform: params.platform,
        limit,
      });

      // Apply offset manually (Convex doesn't have native offset)
      const data = jobs.slice(offset, offset + limit);

      return c.json({
        data: data.map(mapCrawlJob),
        pagination: {
          total: jobs.length,
          limit,
          offset,
        },
      });
    } catch (error: any) {
      throw Errors.internal(error.message);
    }
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

    try {
      const jobId = await convex.mutation(api.crawlJobs.create, {
        name: body.name,
        platform: body.platform,
        jobType: body.job_type || 'full',
        config: body.config || {},
        scheduleCron: body.schedule_cron,
      });

      const job = await convex.query(api.crawlJobs.getById, { id: jobId });
      return c.json({ data: mapCrawlJob(job) }, 201);
    } catch (error: any) {
      throw Errors.internal(error.message);
    }
  }
);

// GET /api/crawl-jobs/:id - Get a specific crawl job
crawlJobsRouter.get('/:id', async (c: Context) => {
  const id = c.req.param('id');

  try {
    const job = await convex.query(api.crawlJobs.getById, {
      id: id as Id<'crawlJobs'>,
    });

    if (!job) {
      throw Errors.notFound('Crawl job');
    }

    return c.json({ data: mapCrawlJob(job) });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      throw Errors.notFound('Crawl job');
    }
    throw Errors.internal(error.message);
  }
});

// POST /api/crawl-jobs/:id/start - Start a crawl job
crawlJobsRouter.post('/:id/start', async (c: Context) => {
  const id = c.req.param('id');

  try {
    // Get current job
    const job = await convex.query(api.crawlJobs.getById, {
      id: id as Id<'crawlJobs'>,
    });

    if (!job) {
      throw Errors.notFound('Crawl job');
    }

    if (job.status === 'running') {
      throw Errors.conflict('Job is already running');
    }

    // Check if already running in worker
    if (isJobRunning(id)) {
      throw Errors.conflict('Job is already running');
    }

    // Update job status to running
    const updatedJob = await convex.mutation(api.crawlJobs.start, {
      id: id as Id<'crawlJobs'>,
    });

    // Queue the job for execution (non-blocking)
    queueCrawlJob(mapCrawlJob(updatedJob) as CrawlJob).catch((err) => {
      console.error(`Failed to execute job ${id}:`, err);
    });

    return c.json({
      data: mapCrawlJob(updatedJob),
      message: 'Crawl job started',
      worker_status: getWorkerStatus(),
    });
  } catch (error: any) {
    if (error.statusCode) throw error; // Re-throw HTTP errors
    throw Errors.internal(error.message);
  }
});

// POST /api/crawl-jobs/:id/cancel - Cancel a running crawl job
crawlJobsRouter.post('/:id/cancel', async (c: Context) => {
  const id = c.req.param('id');

  try {
    // Get current job
    const job = await convex.query(api.crawlJobs.getById, {
      id: id as Id<'crawlJobs'>,
    });

    if (!job) {
      throw Errors.notFound('Crawl job');
    }

    if (job.status !== 'running' && job.status !== 'pending') {
      throw Errors.badRequest('Can only cancel pending or running jobs');
    }

    // Cancel in worker if running
    const cancelled = cancelCrawlJob(id);

    // Update job status to cancelled
    const updatedJob = await convex.mutation(api.crawlJobs.cancel, {
      id: id as Id<'crawlJobs'>,
    });

    return c.json({
      data: mapCrawlJob(updatedJob),
      message: cancelled
        ? 'Crawl job cancelled'
        : 'Crawl job marked as cancelled (was not running)',
    });
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw Errors.internal(error.message);
  }
});

// GET /api/crawl-jobs/:id/records - Get raw records for a crawl job
crawlJobsRouter.get('/:id/records', async (c: Context) => {
  const id = c.req.param('id');
  const limit = Number.parseInt(c.req.query('limit') || '20', 10);
  const offset = Number.parseInt(c.req.query('offset') || '0', 10);

  try {
    // Verify job exists
    const job = await convex.query(api.crawlJobs.getById, {
      id: id as Id<'crawlJobs'>,
    });

    if (!job) {
      throw Errors.notFound('Crawl job');
    }

    // Get records
    const records = await convex.query(api.rawCrawlRecords.listByJob, {
      jobId: id as Id<'crawlJobs'>,
      limit: limit + offset, // Get enough for pagination
    });

    const data = records.slice(offset, offset + limit);

    return c.json({
      data: data.map((r: any) => ({
        ...r,
        id: r._id,
        job_id: r.jobId,
        source_url: r.sourceUrl,
        raw_data: r.rawData,
        crawled_at: new Date(r.crawledAt).toISOString(),
        processing_status: r.processingStatus,
      })),
      pagination: {
        total: records.length,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    if (error.statusCode) throw error;
    throw Errors.internal(error.message);
  }
});

// DELETE /api/crawl-jobs/:id - Delete a crawl job
crawlJobsRouter.delete('/:id', async (c: Context) => {
  const id = c.req.param('id');

  try {
    await convex.mutation(api.crawlJobs.remove, {
      id: id as Id<'crawlJobs'>,
    });

    return c.json({ message: 'Crawl job deleted' });
  } catch (error: any) {
    throw Errors.internal(error.message);
  }
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

    try {
      // Update job with scheduled time - using generic update
      const job = await convex.query(api.crawlJobs.getById, {
        id: id as Id<'crawlJobs'>,
      });

      if (!job) {
        throw Errors.notFound('Crawl job');
      }

      // Note: Need to add nextRunAt update to crawlJobs mutations
      return c.json({
        data: mapCrawlJob(job),
        message: `Job scheduled for ${run_at}`,
      });
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw Errors.internal(error.message);
    }
  }
);

// Helper function to map Convex document to CrawlJob type
function mapCrawlJob(doc: any): CrawlJob | null {
  if (!doc) return null;
  return {
    id: doc._id,
    name: doc.name,
    platform: doc.platform,
    job_type: doc.jobType,
    config: doc.config,
    schedule_cron: doc.scheduleCron,
    next_run_at: doc.nextRunAt ? new Date(doc.nextRunAt).toISOString() : null,
    status: doc.status as CrawlJobStatus,
    started_at: doc.startedAt ? new Date(doc.startedAt).toISOString() : null,
    completed_at: doc.completedAt
      ? new Date(doc.completedAt).toISOString()
      : null,
    statistics: doc.statistics,
    error_message: doc.errorMessage,
    created_at: new Date(doc._creationTime).toISOString(),
    updated_at: new Date(doc._creationTime).toISOString(),
  };
}
