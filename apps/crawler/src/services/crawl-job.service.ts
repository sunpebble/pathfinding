/**
 * Crawl Job Service
 * CRUD operations and business logic for crawl jobs
 */

import type {
  CrawlJob,
  CrawlJobListParams,
  CrawlJobStatus,
  CreateCrawlJobRequest,
  UpdateCrawlJobRequest,
} from '@pathfinding/crawler-types';

import { TABLES } from '../lib/convex.js';

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * Create a new crawl job
 */
export async function createCrawlJob(
  request: CreateCrawlJobRequest
): Promise<CrawlJob> {
  const { data, error } = await supabase
    .from(TABLES.CRAWL_JOBS)
    .insert({
      name: request.name,
      platform: request.platform,
      job_type: request.job_type || 'full',
      config: request.config || {},
      schedule_cron: request.schedule_cron,
      status: 'pending' as CrawlJobStatus,
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
    throw new Error(`Failed to create crawl job: ${error.message}`);
  }

  return data as CrawlJob;
}

/**
 * Get a crawl job by ID
 */
export async function getCrawlJob(id: string): Promise<CrawlJob | null> {
  const { data, error } = await supabase
    .from(TABLES.CRAWL_JOBS)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get crawl job: ${error.message}`);
  }

  return data as CrawlJob;
}

/**
 * List crawl jobs with filtering and pagination
 */
export async function listCrawlJobs(
  params: CrawlJobListParams = {}
): Promise<PaginatedResult<CrawlJob>> {
  const limit = params.limit || 20;
  const offset = params.offset || 0;

  let query = supabase
    .from(TABLES.CRAWL_JOBS)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.platform) {
    query = query.eq('platform', params.platform);
  }

  if (params.status) {
    query = query.eq('status', params.status);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list crawl jobs: ${error.message}`);
  }

  return {
    data: data as CrawlJob[],
    pagination: {
      total: count || 0,
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
  request: UpdateCrawlJobRequest
): Promise<CrawlJob> {
  const { data, error } = await supabase
    .from(TABLES.CRAWL_JOBS)
    .update({
      ...(request.name && { name: request.name }),
      ...(request.config && { config: request.config }),
      ...(request.schedule_cron !== undefined && {
        schedule_cron: request.schedule_cron,
      }),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update crawl job: ${error.message}`);
  }

  return data as CrawlJob;
}

/**
 * Update crawl job status
 */
export async function updateCrawlJobStatus(
  id: string,
  status: CrawlJobStatus,
  options: { errorMessage?: string; startedAt?: Date; completedAt?: Date } = {}
): Promise<CrawlJob> {
  const update: Record<string, unknown> = { status };

  if (options.errorMessage) {
    update.error_message = options.errorMessage;
  }

  if (options.startedAt) {
    update.started_at = options.startedAt.toISOString();
  }

  if (options.completedAt) {
    update.completed_at = options.completedAt.toISOString();
  }

  const { data, error } = await supabase
    .from(TABLES.CRAWL_JOBS)
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update crawl job status: ${error.message}`);
  }

  return data as CrawlJob;
}

/**
 * Delete a crawl job
 */
export async function deleteCrawlJob(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.CRAWL_JOBS)
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete crawl job: ${error.message}`);
  }
}

/**
 * Get pending jobs that are scheduled to run
 */
export async function getPendingScheduledJobs(): Promise<CrawlJob[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(TABLES.CRAWL_JOBS)
    .select('*')
    .eq('status', 'pending')
    .not('schedule_cron', 'is', null)
    .lte('next_run_at', now)
    .order('next_run_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get pending scheduled jobs: ${error.message}`);
  }

  return data as CrawlJob[];
}

/**
 * Get running jobs
 */
export async function getRunningJobs(): Promise<CrawlJob[]> {
  const { data, error } = await supabase
    .from(TABLES.CRAWL_JOBS)
    .select('*')
    .eq('status', 'running')
    .order('started_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get running jobs: ${error.message}`);
  }

  return data as CrawlJob[];
}

/**
 * Get job statistics summary
 */
export async function getJobStatsSummary(): Promise<{
  total: number;
  byStatus: Record<CrawlJobStatus, number>;
  byPlatform: Record<string, number>;
}> {
  const { data, error } = await supabase
    .from(TABLES.CRAWL_JOBS)
    .select('status, platform');

  if (error) {
    throw new Error(`Failed to get job stats: ${error.message}`);
  }

  const byStatus: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};

  for (const job of data || []) {
    byStatus[job.status] = (byStatus[job.status] || 0) + 1;
    byPlatform[job.platform] = (byPlatform[job.platform] || 0) + 1;
  }

  return {
    total: data?.length || 0,
    byStatus: byStatus as Record<CrawlJobStatus, number>,
    byPlatform,
  };
}
