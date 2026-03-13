/**
 * Crawl Job Types (Bronze Layer)
 * Types for crawl job configuration, scheduling, and execution tracking.
 */

/** Lifecycle status of a crawl job */
export type CrawlJobStatus
  = | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'cancelled';

/** Crawl strategy: full re-crawl vs. incremental delta */
export type CrawlJobType = 'full' | 'incremental';

/** Bounding box defined by northeast and southwest corners */
export interface GeographicBounds {
  /** Northeast corner as `[latitude, longitude]` */
  ne: [number, number];
  /** Southwest corner as `[latitude, longitude]` */
  sw: [number, number];
}

/** Geographic scope to limit crawl coverage */
export interface GeographicScope {
  /** Target city names */
  cities?: string[];
  /** Bounding box constraint */
  bounds?: GeographicBounds;
}

/** Rate-limiting configuration for polite crawling */
export interface RateLimitConfig {
  /** Maximum requests per second */
  requests_per_second: number;
  /** Maximum concurrent in-flight requests */
  max_concurrent: number;
}

/** Configuration parameters for a crawl job */
export interface CrawlJobConfig {
  /** Geographic scope to crawl */
  geographic_scope?: GeographicScope;
  /** POI categories to include */
  categories?: string[];
  /** Rate limiting settings */
  rate_limit?: RateLimitConfig;
  /** Platform-specific filter parameters */
  filters?: Record<string, unknown>;
}

/** Runtime statistics collected during job execution */
export interface CrawlJobStatistics {
  /** Total HTTP requests made */
  requests_total: number;
  /** Successful requests (2xx) */
  requests_success: number;
  /** Failed requests (non-2xx or network error) */
  requests_failed: number;
  /** Number of data records extracted */
  records_extracted: number;
  /** Total bytes downloaded */
  bytes_downloaded: number;
  /** Wall-clock duration in seconds */
  duration_seconds: number;
}

/** Full crawl job entity */
export interface CrawlJob {
  id: string;
  name: string;
  /** Source platform identifier (e.g. 'mafengwo', 'amap') */
  platform: string;
  job_type: CrawlJobType;
  config: CrawlJobConfig;
  /** Cron expression for scheduled runs (null = manual only) */
  schedule_cron?: string | null;
  /** Next scheduled execution time */
  next_run_at?: Date | null;
  status: CrawlJobStatus;
  started_at?: Date | null;
  completed_at?: Date | null;
  statistics: CrawlJobStatistics;
  /** Error message if status is 'failed' */
  error_message?: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Request payload for creating a new crawl job */
export interface CreateCrawlJobRequest {
  name: string;
  platform: string;
  job_type?: CrawlJobType;
  config?: CrawlJobConfig;
  schedule_cron?: string;
}

/** Request payload for updating an existing crawl job */
export interface UpdateCrawlJobRequest {
  name?: string;
  config?: CrawlJobConfig;
  /** Set to null to remove the schedule */
  schedule_cron?: string | null;
}

/** Query parameters for listing crawl jobs */
export interface CrawlJobListParams {
  platform?: string;
  status?: CrawlJobStatus;
  limit?: number;
  offset?: number;
}

/** Default zero-state statistics for a newly created job */
export const DEFAULT_CRAWL_JOB_STATISTICS: CrawlJobStatistics = {
  requests_total: 0,
  requests_success: 0,
  requests_failed: 0,
  records_extracted: 0,
  bytes_downloaded: 0,
  duration_seconds: 0,
};
