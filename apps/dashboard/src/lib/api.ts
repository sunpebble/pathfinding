/**
 * Crawler API client
 * Provides functions to interact with the crawler backend API
 */

const API_BASE = '/api/crawler';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP error ${res.status}`);
  }

  return res.json();
}

// Health check
export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch('/api/health');
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
    records_failed: number;
    pages_crawled: number;
  };
  schedule_cron?: string;
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
  if (params?.status) searchParams.append('status', params.status);
  if (params?.platform) searchParams.append('platform', params.platform);
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.offset) searchParams.append('offset', params.offset.toString());

  const query = searchParams.toString();
  return fetchApi(`/crawl-jobs${query ? `?${query}` : ''}`);
}

export async function getCrawlJob(id: string): Promise<CrawlJob> {
  return fetchApi(`/crawl-jobs/${id}`);
}

export interface CreateCrawlJobInput {
  name: string;
  platform: string;
  job_type?: string;
  schedule_cron?: string;
  config?: CrawlJob['config'];
}

export async function createCrawlJob(
  input: CreateCrawlJobInput
): Promise<CrawlJob> {
  return fetchApi('/crawl-jobs', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function startCrawlJob(id: string): Promise<CrawlJob> {
  return fetchApi(`/crawl-jobs/${id}/start`, { method: 'POST' });
}

export async function cancelCrawlJob(id: string): Promise<CrawlJob> {
  return fetchApi(`/crawl-jobs/${id}/cancel`, { method: 'POST' });
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
  if (params?.query) searchParams.append('query', params.query);
  if (params?.category) searchParams.append('category', params.category);
  if (params?.city) searchParams.append('city', params.city);
  if (params?.min_quality)
    searchParams.append('min_quality', params.min_quality.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.offset) searchParams.append('offset', params.offset.toString());

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
  if (params?.type) searchParams.append('type', params.type);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.offset) searchParams.append('offset', params.offset.toString());

  const query = searchParams.toString();
  return fetchApi(`/training-datasets${query ? `?${query}` : ''}`);
}

export async function getTrainingDataset(id: string): Promise<TrainingDataset> {
  return fetchApi(`/training-datasets/${id}`);
}
