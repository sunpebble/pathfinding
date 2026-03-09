/**
 * Crawler API client — client-side
 *
 * Deep module providing typed access to the Dashboard's Next.js
 * `/api/crawler/*` proxy routes. Hides URL construction, query-string
 * serialization, and response unwrapping behind simple async functions.
 *
 * All types are defined locally as lightweight "API-response DTOs"
 * (string dates, flat structure) — intentionally separate from
 * the canonical `@pathfinding/crawler-types` package which uses
 * Date objects and richer nested structures.
 */

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const API_BASE = '/api/crawler';

function parseErrorMessage(error: unknown, status: number): string {
  if (error && typeof error === 'object') {
    const message = 'message' in error ? error.message : undefined;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }

    const fallback = 'error' in error ? error.error : undefined;
    if (typeof fallback === 'string' && fallback.length > 0) {
      return fallback;
    }
  }

  return `HTTP error ${status}`;
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await parseJsonResponse<unknown>(res).catch(() => undefined);
    throw new Error(parseErrorMessage(error, res.status));
  }

  return parseJsonResponse<T>(res);
}

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

interface ApiEnvelope<T> {
  data: T;
}

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

export interface CreateCrawlJobInput {
  name: string;
  platform: string;
  job_type?: string;
  schedule_cron?: string;
  config?: CrawlJob['config'];
}

export async function getCrawlJobs(params?: {
  status?: string;
  platform?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<CrawlJob>> {
  return fetchApi(`/crawl-jobs${buildQuery({
    status: params?.status,
    platform: params?.platform,
    limit: params?.limit,
    offset: params?.offset,
  })}`);
}

export async function getCrawlJob(id: string): Promise<CrawlJob> {
  const response = await fetchApi<ApiEnvelope<CrawlJob>>(`/crawl-jobs/${id}`);
  return response.data;
}

export async function createCrawlJob(
  input: CreateCrawlJobInput,
): Promise<CrawlJob> {
  const response = await fetchApi<ApiEnvelope<CrawlJob>>('/crawl-jobs', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function startCrawlJob(id: string): Promise<CrawlJob> {
  const response = await fetchApi<ApiEnvelope<CrawlJob>>(`/crawl-jobs/${id}/start`, { method: 'POST' });
  return response.data;
}

export async function cancelCrawlJob(id: string): Promise<CrawlJob> {
  const response = await fetchApi<ApiEnvelope<CrawlJob>>(`/crawl-jobs/${id}/cancel`, { method: 'POST' });
  return response.data;
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

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

export async function getSchedulerStatus(): Promise<SchedulerStatus> {
  const response = await fetchApi<ApiEnvelope<SchedulerStatus>>(
    '/crawl-jobs/scheduler/status',
  );
  return response.data;
}

export async function startScheduledTask(
  name: string,
): Promise<{ message: string }> {
  return fetchApi(`/crawl-jobs/scheduler/tasks/${name}/start`, {
    method: 'POST',
  });
}

export async function stopScheduledTask(
  name: string,
): Promise<{ message: string }> {
  return fetchApi(`/crawl-jobs/scheduler/tasks/${name}/stop`, {
    method: 'POST',
  });
}

// ---------------------------------------------------------------------------
// POIs
// ---------------------------------------------------------------------------

export interface NormalizedPOI {
  id: string;
  canonical_id?: string;
  name: string;
  name_en?: string;
  name_aliases?: string[];
  description?: string;
  category: string;
  subcategory?: string;
  tags?: string[];
  location_lat: number;
  location_lng: number;
  address?: string;
  city?: string;
  district?: string;
  country?: string;
  postal_code?: string;
  rating_overall?: number;
  rating_count: number;
  operating_hours?: Record<string, { open: string; close: string }>;
  price_range?: string;
  price_avg?: number;
  phone?: string;
  website?: string;
  photos_count: number;
  photo_urls?: string[];
  quality_score: number;
  completeness_score: number;
  freshness_score: number;
  sources: Array<{
    platform: string;
    external_id: string;
    url: string;
    confidence: number;
    last_crawled: string;
  }>;
  is_duplicate: boolean;
  created_at: string;
  updated_at: string;
}

export async function getPOIs(params?: {
  query?: string;
  category?: string;
  city?: string;
  min_quality?: number;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<NormalizedPOI>> {
  return fetchApi(`/pois${buildQuery({
    query: params?.query,
    category: params?.category,
    city: params?.city,
    min_quality: params?.min_quality,
    limit: params?.limit,
    offset: params?.offset,
  })}`);
}

export async function getPOI(id: string): Promise<NormalizedPOI> {
  return fetchApi(`/pois/${id}`);
}

export async function normalizePOIs(): Promise<{
  success: boolean;
  stats: { normalized: number; skipped: number; failed: number };
}> {
  return fetchApi('/pois/normalize', { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Training Datasets
// ---------------------------------------------------------------------------

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

export async function getTrainingDatasets(params?: {
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<TrainingDataset>> {
  return fetchApi(`/training-datasets${buildQuery({
    type: params?.type,
    status: params?.status,
    limit: params?.limit,
    offset: params?.offset,
  })}`);
}

export async function getTrainingDataset(id: string): Promise<TrainingDataset> {
  return fetchApi(`/training-datasets/${id}`);
}

// ---------------------------------------------------------------------------
// Travel Guides
// ---------------------------------------------------------------------------

export interface TravelGuide {
  id: string;
  source_platform: 'xiaohongshu' | 'weibo' | 'ctrip';
  source_external_id: string;
  source_url?: string;
  title?: string;
  content: string;
  content_html?: string;
  author_name?: string;
  author_id?: string;
  destinations: string[];
  tags: string[];
  likes_count: number;
  saves_count: number;
  comments_count: number;
  views_count: number;
  cover_image_url?: string;
  image_urls: string[];
  published_at?: string;
  crawled_at: string;
  quality_score: number;
  created_at: string;
  updated_at: string;
}

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
  return fetchApi(`/guides${buildQuery({
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

export async function getTravelGuide(
  id: string,
): Promise<{ data: TravelGuide }> {
  return fetchApi(`/guides/${id}`);
}

export async function getGuideRecommendations(params?: {
  destinations?: string;
  tags?: string;
  platforms?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<TravelGuide>> {
  return fetchApi(`/guides/recommendations${buildQuery({
    destinations: params?.destinations,
    tags: params?.tags,
    platforms: params?.platforms,
    limit: params?.limit,
    offset: params?.offset,
  })}`);
}

export async function getTrendingGuides(params?: {
  days?: number;
  platforms?: string;
  limit?: number;
}): Promise<{ data: TravelGuide[]; period_days: number }> {
  return fetchApi(`/guides/trending${buildQuery({
    days: params?.days,
    platforms: params?.platforms,
    limit: params?.limit,
  })}`);
}

export async function searchGuides(params: {
  q: string;
  platforms?: string;
  destinations?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<TravelGuide>> {
  return fetchApi(`/guides/search${buildQuery({
    q: params.q,
    platforms: params.platforms,
    destinations: params.destinations,
    limit: params.limit,
    offset: params.offset,
  })}`);
}
