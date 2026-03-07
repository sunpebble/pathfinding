/**
 * Crawler API client
 * Provides functions to interact with the crawler backend API
 */

const API_BASE = '/api/crawler';
const DEFAULT_BACKEND_API_URL = 'http://localhost:3001';

interface ApiEnvelope<T> {
  data: T;
}

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

export function getBackendApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND_API_URL;
}

export async function fetchBackendApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${getBackendApiBaseUrl()}${endpoint}`, {
    method: options?.method ?? 'GET',
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

function toStringOrUndefined(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function toNumberOrDefault(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return undefined;
}

export function normalizeTravelGuide(
  guide: Record<string, unknown>,
): Record<string, unknown> {
  return {
    id: toStringOrUndefined(guide.id) ?? toStringOrUndefined(guide._id) ?? '',
    _id: toStringOrUndefined(guide._id) ?? toStringOrUndefined(guide.id) ?? '',
    source_platform:
      toStringOrUndefined(guide.source_platform)
      ?? toStringOrUndefined(guide.sourcePlatform)
      ?? '',
    source_external_id:
      toStringOrUndefined(guide.source_external_id)
      ?? toStringOrUndefined(guide.sourceExternalId),
    source_url:
      toStringOrUndefined(guide.source_url)
      ?? toStringOrUndefined(guide.sourceUrl),
    title: toStringOrUndefined(guide.title) ?? 'Untitled guide',
    content: toStringOrUndefined(guide.content) ?? '',
    content_html:
      toStringOrUndefined(guide.content_html)
      ?? toStringOrUndefined(guide.contentHtml),
    content_markdown:
      toStringOrUndefined(guide.content_markdown)
      ?? toStringOrUndefined(guide.contentMarkdown),
    author_name:
      toStringOrUndefined(guide.author_name)
      ?? toStringOrUndefined(guide.authorName)
      ?? 'Anonymous user',
    author_id:
      toStringOrUndefined(guide.author_id)
      ?? toStringOrUndefined(guide.authorId),
    destinations: toStringArray(guide.destinations),
    tags: toStringArray(guide.tags),
    likes_count: toNumberOrDefault(guide.likes_count ?? guide.like_count),
    saves_count: toNumberOrDefault(guide.saves_count),
    comments_count: toNumberOrDefault(guide.comments_count ?? guide.comment_count),
    views_count: toNumberOrDefault(guide.views_count ?? guide.view_count),
    cover_image_url:
      toStringOrUndefined(guide.cover_image_url)
      ?? toStringOrUndefined(guide.coverImageUrl),
    image_urls: toStringArray(guide.image_urls ?? guide.imageUrls),
    published_at:
      toStringOrUndefined(guide.published_at)
      ?? toStringOrUndefined(guide.publishedAt),
    crawled_at:
      toStringOrUndefined(guide.crawled_at)
      ?? toStringOrUndefined(guide.crawledAt),
    quality_score: toNumberOrDefault(guide.quality_score),
    completeness_level:
      toStringOrUndefined(guide.completeness_level)
      ?? toStringOrUndefined(guide.completenessLevel),
    content_truncated: Boolean(guide.content_truncated ?? guide.contentTruncated),
    created_at:
      toStringOrUndefined(guide.created_at)
      ?? toStringOrUndefined(guide.createdAt),
    updated_at:
      toStringOrUndefined(guide.updated_at)
      ?? toStringOrUndefined(guide.updatedAt)
      ?? toStringOrUndefined(guide.created_at)
      ?? toStringOrUndefined(guide.createdAt),
    ai_summary:
      toStringOrUndefined(guide.ai_summary)
      ?? toStringOrUndefined(guide.aiSummary),
    ai_tips: Array.isArray(guide.ai_tips) ? guide.ai_tips : guide.aiTips,
    ai_best_time:
      toStringOrUndefined(guide.ai_best_time)
      ?? toStringOrUndefined(guide.aiBestTime),
    ai_duration:
      toStringOrUndefined(guide.ai_duration)
      ?? toStringOrUndefined(guide.aiDuration),
    ai_budget:
      toStringOrUndefined(guide.ai_budget)
      ?? toStringOrUndefined(guide.aiBudget),
    ai_days: Array.isArray(guide.ai_days) ? guide.ai_days : guide.aiDays,
    ai_processed_at:
      toStringOrUndefined(guide.ai_processed_at)
      ?? toStringOrUndefined(guide.aiProcessedAt),
    ai_version:
      toStringOrUndefined(guide.ai_version)
      ?? toStringOrUndefined(guide.aiVersion),
    ai_model:
      toStringOrUndefined(guide.ai_model)
      ?? toStringOrUndefined(guide.aiModel),
    geocoding_metrics: toRecord(guide.geocoding_metrics ?? guide.geocodingMetrics),
  };
}

export function normalizeCrawlJob(job: Record<string, unknown>): CrawlJob {
  const platform = toStringOrUndefined(job.platform) ?? 'unknown';
  const jobType
    = toStringOrUndefined(job.job_type)
      ?? toStringOrUndefined(job.jobType)
      ?? 'full';

  return {
    id: toStringOrUndefined(job.id) ?? '',
    name:
      toStringOrUndefined(job.name)
      ?? `${platform} ${jobType}`,
    platform,
    job_type: jobType,
    status: (toStringOrUndefined(job.status) ?? 'pending') as CrawlJob['status'],
    config: (toRecord(job.config) ?? {}) as CrawlJob['config'],
    statistics: (toRecord(job.statistics ?? job.progress) as CrawlJob['statistics']) ?? undefined,
    schedule_cron:
      toStringOrUndefined(job.schedule_cron)
      ?? toStringOrUndefined(job.scheduleCron),
    started_at:
      toStringOrUndefined(job.started_at)
      ?? toStringOrUndefined(job.startedAt),
    completed_at:
      toStringOrUndefined(job.completed_at)
      ?? toStringOrUndefined(job.completedAt),
    last_run_at:
      toStringOrUndefined(job.last_run_at)
      ?? toStringOrUndefined(job.lastRunAt),
    next_run_at:
      toStringOrUndefined(job.next_run_at)
      ?? toStringOrUndefined(job.nextRunAt),
    created_at:
      toStringOrUndefined(job.created_at)
      ?? toStringOrUndefined(job.createdAt)
      ?? new Date(0).toISOString(),
    updated_at:
      toStringOrUndefined(job.updated_at)
      ?? toStringOrUndefined(job.updatedAt)
      ?? toStringOrUndefined(job.created_at)
      ?? toStringOrUndefined(job.createdAt)
      ?? new Date(0).toISOString(),
  };
}

/**
 * Generic fetch wrapper with error handling
 */
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

// Health check
export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch('/api/health');
  if (!res.ok) {
    return { status: 'error' };
  }
  return res.json();
}

// Crawl Jobs API
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
    // Aliases for Dashboard compatibility
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

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export async function getCrawlJobs(params?: {
  status?: string;
  platform?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<CrawlJob>> {
  const searchParams = new URLSearchParams();
  if (params?.status)
    searchParams.append('status', params.status);
  if (params?.platform)
    searchParams.append('platform', params.platform);
  if (params?.limit)
    searchParams.append('limit', params.limit.toString());
  if (params?.offset)
    searchParams.append('offset', params.offset.toString());

  const query = searchParams.toString();
  return fetchApi(`/crawl-jobs${query ? `?${query}` : ''}`);
}

export async function getCrawlJob(id: string): Promise<CrawlJob> {
  const response = await fetchApi<{ data: CrawlJob }>(`/crawl-jobs/${id}`);
  return response.data;
}

export interface CreateCrawlJobInput {
  name: string;
  platform: string;
  job_type?: string;
  schedule_cron?: string;
  config?: CrawlJob['config'];
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

// Scheduler Status API
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
  const response = await fetchApi<{ data: SchedulerStatus }>(
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

// POIs API
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
  const searchParams = new URLSearchParams();
  if (params?.query)
    searchParams.append('query', params.query);
  if (params?.category)
    searchParams.append('category', params.category);
  if (params?.city)
    searchParams.append('city', params.city);
  if (params?.min_quality)
    searchParams.append('min_quality', params.min_quality.toString());
  if (params?.limit)
    searchParams.append('limit', params.limit.toString());
  if (params?.offset)
    searchParams.append('offset', params.offset.toString());

  const query = searchParams.toString();
  return fetchApi(`/pois${query ? `?${query}` : ''}`);
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

// Training Datasets API
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
  const searchParams = new URLSearchParams();
  if (params?.type)
    searchParams.append('type', params.type);
  if (params?.status)
    searchParams.append('status', params.status);
  if (params?.limit)
    searchParams.append('limit', params.limit.toString());
  if (params?.offset)
    searchParams.append('offset', params.offset.toString());

  const query = searchParams.toString();
  return fetchApi(`/training-datasets${query ? `?${query}` : ''}`);
}

export async function getTrainingDataset(id: string): Promise<TrainingDataset> {
  return fetchApi(`/training-datasets/${id}`);
}

// Travel Guides API
export interface TravelGuide {
  id: string;
  source_platform: 'xiaohongshu' | 'weibo' | 'ctrip';
  source_external_id: string;
  source_url?: string;
  title?: string;
  content: string;
  content_html?: string; // Rich text HTML content for rendering
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
  const searchParams = new URLSearchParams();
  if (params?.platforms)
    searchParams.append('platforms', params.platforms);
  if (params?.destinations)
    searchParams.append('destinations', params.destinations);
  if (params?.search)
    searchParams.append('q', params.search);
  if (params?.min_quality !== undefined)
    searchParams.append('min_quality', params.min_quality.toString());
  if (params?.max_quality !== undefined)
    searchParams.append('max_quality', params.max_quality.toString());
  if (params?.limit !== undefined)
    searchParams.append('limit', params.limit.toString());
  if (params?.offset !== undefined)
    searchParams.append('offset', params.offset.toString());
  if (params?.sort)
    searchParams.append('sort', params.sort);
  if (params?.order)
    searchParams.append('order', params.order);

  const query = searchParams.toString();
  return fetchApi(`/guides${query ? `?${query}` : ''}`);
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
  const searchParams = new URLSearchParams();
  if (params?.destinations)
    searchParams.append('destinations', params.destinations);
  if (params?.tags)
    searchParams.append('tags', params.tags);
  if (params?.platforms)
    searchParams.append('platforms', params.platforms);
  if (params?.limit)
    searchParams.append('limit', params.limit.toString());
  if (params?.offset)
    searchParams.append('offset', params.offset.toString());

  const query = searchParams.toString();
  return fetchApi(`/guides/recommendations${query ? `?${query}` : ''}`);
}

export async function getTrendingGuides(params?: {
  days?: number;
  platforms?: string;
  limit?: number;
}): Promise<{ data: TravelGuide[]; period_days: number }> {
  const searchParams = new URLSearchParams();
  if (params?.days)
    searchParams.append('days', params.days.toString());
  if (params?.platforms)
    searchParams.append('platforms', params.platforms);
  if (params?.limit)
    searchParams.append('limit', params.limit.toString());

  const query = searchParams.toString();
  return fetchApi(`/guides/trending${query ? `?${query}` : ''}`);
}

export async function searchGuides(params: {
  q: string;
  platforms?: string;
  destinations?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<TravelGuide>> {
  const searchParams = new URLSearchParams();
  searchParams.append('q', params.q);
  if (params.platforms)
    searchParams.append('platforms', params.platforms);
  if (params.destinations)
    searchParams.append('destinations', params.destinations);
  if (params.limit)
    searchParams.append('limit', params.limit.toString());
  if (params.offset)
    searchParams.append('offset', params.offset.toString());

  return fetchApi(`/guides/search?${searchParams.toString()}`);
}
