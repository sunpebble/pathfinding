/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
/**
 * Crawl Job Service
 * CRUD operations and business logic for crawl jobs using Convex
 */

import type {
  CrawlJob,
  CrawlJobListParams,
  CrawlJobStatus,
  CreateCrawlJobRequest,
  UpdateCrawlJobRequest,
} from '@pathfinding/crawler-types';

import type { Doc, Id } from '../lib/convex.js';
import { api, convex } from '../lib/convex.js';

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// Map Convex doc to CrawlJob interface
function mapToCrawlJob(doc: Doc<'crawlJobs'>): CrawlJob {
  return {
    id: doc._id,
    name: doc.name,
    platform: doc.platform,
    job_type: doc.jobType ?? 'full',
    config: doc.config ?? {},
    schedule_cron: doc.scheduleCron,
    status: doc.status as CrawlJobStatus,
    statistics: doc.statistics ?? {
      requests_total: 0,
      requests_success: 0,
      requests_failed: 0,
      records_extracted: 0,
      bytes_downloaded: 0,
      duration_seconds: 0,
    },
    started_at: doc.startedAt
      ? new Date(doc.startedAt).toISOString()
      : undefined,
    completed_at: doc.completedAt
      ? new Date(doc.completedAt).toISOString()
      : undefined,
    error_message: doc.errorMessage,
    created_at: new Date(doc._creationTime).toISOString(),
    updated_at: new Date(doc._creationTime).toISOString(),
  };
}

/**
 * Create a new crawl job
 */
export async function createCrawlJob(
  request: CreateCrawlJobRequest
): Promise<CrawlJob> {
  const id = await convex.mutation(api.crawlJobs.create, {
    name: request.name,
    platform: request.platform,
    jobType: request.job_type ?? 'full',
    config: request.config ?? {},
    scheduleCron: request.schedule_cron,
  });

  const job = await convex.query(api.crawlJobs.getById, { id });
  if (!job) {
    throw new Error('Failed to create crawl job');
  }
  return mapToCrawlJob(job);
}

/**
 * Get a crawl job by ID
 */
export async function getCrawlJob(id: string): Promise<CrawlJob | null> {
  try {
    const job = await convex.query(api.crawlJobs.getById, {
      id: id as Id<'crawlJobs'>,
    });
    return job ? mapToCrawlJob(job) : null;
  } catch {
    return null;
  }
}

/**
 * List crawl jobs with filtering and pagination
 */
export async function listCrawlJobs(
  params: CrawlJobListParams = {}
): Promise<PaginatedResult<CrawlJob>> {
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  const jobs = await convex.query(api.crawlJobs.list, {
    status: params.status,
    platform: params.platform,
  });

  const total = jobs.length;
  const paginatedJobs = jobs.slice(offset, offset + limit);

  return {
    data: paginatedJobs.map(mapToCrawlJob),
    pagination: {
      total,
      limit,
      offset,
    },
  };
}

/**
 * Update a crawl job
 */
export async function updateCrawlJob(
  id: string,
  _request: UpdateCrawlJobRequest
): Promise<CrawlJob> {
  // For now, we only support status updates via dedicated mutations
  // Config/name updates would need a new Convex mutation
  const job = await convex.query(api.crawlJobs.getById, {
    id: id as Id<'crawlJobs'>,
  });

  if (!job) {
    throw new Error('Crawl job not found');
  }

  return mapToCrawlJob(job);
}

/**
 * Update crawl job status
 */
export async function updateCrawlJobStatus(
  id: string,
  status: CrawlJobStatus,
  options: { errorMessage?: string; startedAt?: Date; completedAt?: Date } = {}
): Promise<CrawlJob> {
  const job = await convex.mutation(api.crawlJobs.updateStatus, {
    id: id as Id<'crawlJobs'>,
    status,
    startedAt: options.startedAt?.getTime(),
    completedAt: options.completedAt?.getTime(),
    errorMessage: options.errorMessage,
  });

  if (!job) {
    throw new Error('Failed to update crawl job status');
  }

  return mapToCrawlJob(job);
}

/**
 * Update job next run time
 */
export async function updateJobNextRunAt(
  id: string,
  nextRunAt: Date
): Promise<CrawlJob> {
  const job = await convex.mutation(api.crawlJobs.updateNextRunAt, {
    id: id as Id<'crawlJobs'>,
    nextRunAt: nextRunAt.getTime(),
  });

  if (!job) {
    throw new Error('Failed to update job next run time');
  }

  return mapToCrawlJob(job);
}

/**
 * Delete a crawl job
 */
export async function deleteCrawlJob(id: string): Promise<void> {
  await convex.mutation(api.crawlJobs.remove, {
    id: id as Id<'crawlJobs'>,
  });
}

/**
 * Get pending jobs that are scheduled to run
 */
export async function getPendingScheduledJobs(): Promise<CrawlJob[]> {
  const jobs = await convex.query(api.crawlJobs.list, {
    status: 'pending',
  });

  // Filter for scheduled jobs (have scheduleCron and are due)
  return jobs.filter((job) => job.scheduleCron).map(mapToCrawlJob);
}

/**
 * Get running jobs
 */
export async function getRunningJobs(): Promise<CrawlJob[]> {
  const jobs = await convex.query(api.crawlJobs.list, {
    status: 'running',
  });

  return jobs.map(mapToCrawlJob);
}

/**
 * Get jobs that are due to run (nextRunAt <= now)
 */
export async function getDueJobs(limit?: number): Promise<CrawlJob[]> {
  const jobs = await convex.query(api.crawlJobs.getDueJobs, {
    limit,
  });

  return jobs.map(mapToCrawlJob);
}

/**
 * Get job statistics summary
 */
export async function getJobStatsSummary(): Promise<{
  total: number;
  byStatus: Record<CrawlJobStatus, number>;
  byPlatform: Record<string, number>;
}> {
  const jobs = await convex.query(api.crawlJobs.list, {});

  const byStatus: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};

  for (const job of jobs) {
    byStatus[job.status] = (byStatus[job.status] || 0) + 1;
    byPlatform[job.platform] = (byPlatform[job.platform] || 0) + 1;
  }

  return {
    total: jobs.length,
    byStatus: byStatus as Record<CrawlJobStatus, number>,
    byPlatform,
  };
}
