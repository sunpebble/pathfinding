/**
 * Crawl Job Types (Bronze Layer)
 * Types for crawl job configuration and execution
 */

export type CrawlJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";
export type CrawlJobType = "full" | "incremental";

export interface GeographicBounds {
  ne: [number, number]; // [latitude, longitude]
  sw: [number, number]; // [latitude, longitude]
}

export interface GeographicScope {
  cities?: string[];
  bounds?: GeographicBounds;
}

export interface RateLimitConfig {
  requests_per_second: number;
  max_concurrent: number;
}

export interface CrawlJobConfig {
  geographic_scope?: GeographicScope;
  categories?: string[];
  rate_limit?: RateLimitConfig;
  filters?: Record<string, unknown>;
}

export interface CrawlJobStatistics {
  requests_total: number;
  requests_success: number;
  requests_failed: number;
  records_extracted: number;
  bytes_downloaded: number;
  duration_seconds: number;
}

export interface CrawlJob {
  id: string;
  name: string;
  platform: string;
  job_type: CrawlJobType;
  config: CrawlJobConfig;
  schedule_cron?: string | null;
  next_run_at?: Date | null;
  status: CrawlJobStatus;
  started_at?: Date | null;
  completed_at?: Date | null;
  statistics: CrawlJobStatistics;
  error_message?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCrawlJobRequest {
  name: string;
  platform: string;
  job_type?: CrawlJobType;
  config?: CrawlJobConfig;
  schedule_cron?: string;
}

export interface UpdateCrawlJobRequest {
  name?: string;
  config?: CrawlJobConfig;
  schedule_cron?: string | null;
}

export interface CrawlJobListParams {
  platform?: string;
  status?: CrawlJobStatus;
  limit?: number;
  offset?: number;
}

export const DEFAULT_CRAWL_JOB_STATISTICS: CrawlJobStatistics = {
  requests_total: 0,
  requests_success: 0,
  requests_failed: 0,
  records_extracted: 0,
  bytes_downloaded: 0,
  duration_seconds: 0,
};
