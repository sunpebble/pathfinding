/**
 * Crawler API client — client-side
 *
 * Deep module providing typed access to the Dashboard's Next.js
 * `/api/crawler/*` proxy routes. Hides URL construction, query-string
 * serialization, and response unwrapping behind simple async functions.
 *
 * Most types are defined locally as lightweight "API-response DTOs"
 * (string dates, flat structure). Travel guides extend the shared
 * `@pathfinding/types` DTO used by API consumers.
 *
 * @module
 */

import type { TravelGuideResponseDto } from '@pathfinding/types';

import { createApiClient } from './client';

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Shared transport for all crawler proxy routes — attaches the stored JWT,
 * sets JSON content-type, parses responses, and throws on non-2xx status.
 */
const client = createApiClient('/api/crawler');

/** Build a query string from a flat params object, omitting undefined/empty values. */
function buildQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      sp.append(key, String(value));
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

// ---------------------------------------------------------------------------
// Shared response types
// ---------------------------------------------------------------------------

/** Internal envelope used by endpoints that return a single item. */
interface ApiEnvelope<T> {
  data: T;
}

/** Paginated list response shape used across crawler endpoints. */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

/**
 * Check the health of the dashboard backend.
 *
 * Returns `{ status: 'error' }` on network failures rather than throwing,
 * making it safe for use in polling hooks.
 */
export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch('/api/health');
  if (!res.ok) {
    return { status: 'error' };
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Crawl Jobs
// ---------------------------------------------------------------------------

/** A crawl job record from the crawler backend. */
export interface CrawlJob {
  id: string;
  name: string;
  platform: string;
  job_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  config: {
    categories?: string[];
    geographic_scope?: {
      cities?: string[];
      bounding_box?: {
        min_lat: number;
        max_lat: number;
        min_lng: number;
        max_lng: number;
      };
    };
    rate_limit?: {
      requests_per_second: number;
      max_concurrent: number;
    };
  };
  statistics?: {
    records_extracted: number;
    requests_failed: number;
    requests_success: number;
    requests_total: number;
    bytes_downloaded: number;
    duration_seconds: number;
    records_failed?: number;
    pages_crawled?: number;
  };
  schedule_cron?: string;
  started_at?: string;
  completed_at?: string;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

/** Input for creating a new crawl job. */
export interface CreateCrawlJobInput {
  name: string;
  platform: string;
  job_type?: string;
  schedule_cron?: string;
  config?: CrawlJob['config'];
}

/** List crawl jobs with optional filters. */
export async function getCrawlJobs(params?: {
  status?: string;
  platform?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<CrawlJob>> {
  return client.get(`/crawl-jobs${buildQuery({
    status: params?.status,
    platform: params?.platform,
    limit: params?.limit,
    offset: params?.offset,
  })}`);
}

/**
 * Fetch a single crawl job by ID.
 *
 * @param id - Crawl job identifier.
 */
export async function getCrawlJob(id: string): Promise<CrawlJob> {
  const response = await client.get<ApiEnvelope<CrawlJob>>(`/crawl-jobs/${id}`);
  return response.data;
}

/**
 * Create a new crawl job.
 *
 * @param input - Job configuration.
 */
export async function createCrawlJob(
  input: CreateCrawlJobInput,
): Promise<CrawlJob> {
  const response = await client.post<ApiEnvelope<CrawlJob>>('/crawl-jobs', input);
  return response.data;
}

/**
 * Start a pending crawl job.
 *
 * @param id - Crawl job identifier.
 */
export async function startCrawlJob(id: string): Promise<CrawlJob> {
  const response = await client.post<ApiEnvelope<CrawlJob>>(`/crawl-jobs/${id}/start`);
  return response.data;
}

/**
 * Cancel a running crawl job.
 *
 * @param id - Crawl job identifier.
 */
export async function cancelCrawlJob(id: string): Promise<CrawlJob> {
  const response = await client.post<ApiEnvelope<CrawlJob>>(`/crawl-jobs/${id}/cancel`);
  return response.data;
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

/** Scheduler status including registered tasks and worker info. */
export interface SchedulerStatus {
  tasks: Array<{
    name: string;
    cronExpression: string;
    enabled: boolean;
    lastRun?: string;
  }>;
  workerStatus: {
    running: number;
    pending: number;
    activeJobs: string[];
    maxConcurrent: number;
    runningJobs: number;
  };
}

/** Fetch the current scheduler status and worker info. */
export async function getSchedulerStatus(): Promise<SchedulerStatus> {
  const response = await client.get<ApiEnvelope<SchedulerStatus>>(
    '/crawl-jobs/scheduler/status',
  );
  return response.data;
}

/**
 * Start a named scheduled task.
 *
 * @param name - Task name as registered in the scheduler.
 */
export async function startScheduledTask(
  name: string,
): Promise<{ message: string }> {
  return client.post(`/crawl-jobs/scheduler/tasks/${name}/start`);
}

/**
 * Stop a named scheduled task.
 *
 * @param name - Task name as registered in the scheduler.
 */
export async function stopScheduledTask(
  name: string,
): Promise<{ message: string }> {
  return client.post(`/crawl-jobs/scheduler/tasks/${name}/stop`);
}

// ---------------------------------------------------------------------------
// POIs
// ---------------------------------------------------------------------------

/**
 * A POI row as returned by the Hono `/api/pois` route — a snake_cased
 * `pois` table row (D13: the previous `NormalizedPOI` shape was fictional;
 * render only what the backend actually provides).
 */
export interface PoiRecord {
  id: number;
  external_id: string | null;
  name: string;
  name_en: string | null;
  category: string;
  city_id: number;
  address: string | null;
  latitude: number;
  longitude: number;
  rating: number | null;
  rating_count: number;
  price_level: number | null;
  business_hours: Record<string, { open: string; close: string } | null> | null;
  phone: string | null;
  image_urls: string[] | null;
  source: string;
  created_at: string;
  updated_at: string;
}

/** List POIs from the crawler backend with optional filters. */
export async function getPOIs(params?: {
  q?: string;
  category?: string;
  city?: string;
  min_quality?: number;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<PoiRecord>> {
  return client.get(`/pois${buildQuery({
    q: params?.q,
    category: params?.category,
    city: params?.city,
    min_quality: params?.min_quality,
    limit: params?.limit,
    offset: params?.offset,
  })}`);
}

// ---------------------------------------------------------------------------
// Training Datasets
// ---------------------------------------------------------------------------

/** A training dataset record. */
export interface TrainingDataset {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  config?: Record<string, unknown>;
  statistics?: {
    total_records: number;
    categories_distribution?: Record<string, number>;
  };
  file_path?: string;
  created_at: string;
  updated_at: string;
}

/** List training datasets with optional filters. */
export async function getTrainingDatasets(params?: {
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<TrainingDataset>> {
  return client.get(`/training-datasets${buildQuery({
    type: params?.type,
    status: params?.status,
    limit: params?.limit,
    offset: params?.offset,
  })}`);
}

// ---------------------------------------------------------------------------
// Travel Guides
// ---------------------------------------------------------------------------

/** A travel guide record from the crawler backend. */
export interface TravelGuide extends TravelGuideResponseDto {
  _id?: string;
  source_external_id?: string | null;
  author_id?: string | null;
  published_at?: string | null;
  crawled_at?: string | null;
}

/** List travel guides with optional filters and sorting. */
export async function getTravelGuides(params?: {
  platforms?: string;
  destinations?: string;
  search?: string;
  min_quality?: number;
  max_quality?: number;
  limit?: number;
  offset?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}): Promise<PaginatedResponse<TravelGuide>> {
  return client.get(`/guides${buildQuery({
    platforms: params?.platforms,
    destinations: params?.destinations,
    q: params?.search,
    min_quality: params?.min_quality,
    max_quality: params?.max_quality,
    limit: params?.limit,
    offset: params?.offset,
    sort: params?.sort,
    order: params?.order,
  })}`);
}

/**
 * Fetch a single travel guide by ID.
 *
 * @param id - Guide identifier.
 */
export async function getTravelGuide(
  id: string,
): Promise<{ data: TravelGuide }> {
  return client.get(`/guides/${id}`);
}

// ---------------------------------------------------------------------------
// Backfill Analysis
// ---------------------------------------------------------------------------

export interface FieldGap {
  guideId: number;
  title: string;
  platform: string;
  missingFields: string[];
  missingCount: number;
}

export interface DestinationGap {
  cityName: string;
  countryCode: string;
  guideCount: number;
}

export interface BackfillAnalysis {
  fieldGaps: FieldGap[];
  totalFieldGaps: number;
  fieldMissingDistribution: Record<string, number>;
  destinationGaps: DestinationGap[];
  totalDestinationGaps: number;
}

export async function getBackfillAnalysis(): Promise<BackfillAnalysis> {
  const response = await client.post<ApiEnvelope<BackfillAnalysis>>('/backfill-analysis');
  return response.data;
}

export interface CreateBackfillJobsInput {
  fieldGapGuideIds?: number[];
  destinationGapCities?: string[];
}

export async function createBackfillJobs(
  input: CreateBackfillJobsInput,
): Promise<{ jobsCreated: number }> {
  const response = await client.post<ApiEnvelope<{ jobsCreated: number }>>('/backfill-jobs', input);
  return response.data;
}

export interface BackfillExecutionResult {
  executed: number;
  totalProcessed: number;
  totalFailed: number;
}

export async function executeBackfillJobs(): Promise<BackfillExecutionResult> {
  const response = await client.post<ApiEnvelope<BackfillExecutionResult>>('/backfill-execute');
  return response.data;
}

export interface FullBackfillResult {
  analysis: {
    totalFieldGaps: number;
    totalDestinationGaps: number;
  };
  execution: BackfillExecutionResult;
}

export async function executeFullBackfill(): Promise<FullBackfillResult> {
  const response = await client.post<ApiEnvelope<FullBackfillResult>>('/backfill-all');
  return response.data;
}

// ---------------------------------------------------------------------------
// Guide Discovery & Import
// ---------------------------------------------------------------------------

export interface GuideDiscoveryResult {
  platform: string;
  city: string;
  totalFound: number;
  newGuides: Array<{ url: string; title?: string }>;
  existingCount: number;
}

export async function discoverGuides(platform: string, city: string): Promise<GuideDiscoveryResult> {
  const response = await client.post<ApiEnvelope<GuideDiscoveryResult>>('/discover-guides', { platform, city });
  return response.data;
}

export interface GuideImportResult {
  imported: number;
  failed: number;
  skipped: number;
  results: Array<{ url: string; success: boolean; message: string; guideId?: number }>;
}

export async function importGuides(platform: string, urls: string[]): Promise<GuideImportResult> {
  const response = await client.post<ApiEnvelope<GuideImportResult>>('/import-guides', { platform, urls });
  return response.data;
}
