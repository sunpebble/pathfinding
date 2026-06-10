/**
 * Raw Crawl Record Types (Bronze Layer)
 * Types for storing original crawled data before parsing and normalization.
 */

/**
 * Parse pipeline status for a raw record.
 * `rejected` marks records that parsed fine but failed error-level
 * validation (D5) — kept for audit/replay, never imported.
 */
export type ParseStatus = 'pending' | 'success' | 'failed' | 'skipped' | 'rejected';

/** MIME-like content type of the raw response body */
export type ContentType = 'html' | 'json' | 'xml';

/**
 * A single raw crawl record stored in the Bronze layer.
 * Preserves the original HTTP response for auditing and re-processing.
 */
export interface RawCrawlRecord {
  /** Internal unique identifier */
  id: string;
  /** Parent crawl job that produced this record */
  job_id: string;
  /** Source platform identifier */
  source_platform: string;
  /** Original URL that was crawled */
  source_url: string;
  /** Platform-specific external ID (e.g. POI ID) */
  source_external_id?: string | null;
  /** Raw response body */
  raw_content: string;
  /** Content format of the response */
  content_type: ContentType;
  /** SHA-256 hash of raw_content for deduplication */
  content_hash: string;
  /** Size of raw_content in bytes */
  content_size_bytes: number;
  /** HTTP response status code */
  http_status?: number | null;
  /** Selected HTTP response headers */
  http_headers?: Record<string, string> | null;
  /** Crawler software version that produced this record */
  crawler_version: string;
  /** When the HTTP request was made */
  crawled_at: Date;
  /** Current parsing status */
  parse_status: ParseStatus;
  /** Error message if parse_status is 'failed' */
  parse_error?: string | null;
  /** When parsing was last attempted */
  parsed_at?: Date | null;
  /** ID of the resulting NormalizedPOI (if parsed successfully) */
  normalized_poi_id?: string | null;
  /** Database creation timestamp */
  created_at: Date;
}

/** Request payload for creating a new raw crawl record */
export interface CreateRawCrawlRecordRequest {
  job_id: string;
  source_platform: string;
  source_url: string;
  source_external_id?: string;
  raw_content: string;
  content_type: ContentType;
  content_hash: string;
  content_size_bytes: number;
  http_status?: number;
  http_headers?: Record<string, string>;
  crawler_version: string;
}

/** Query parameters for listing raw crawl records */
export interface RawCrawlRecordListParams {
  job_id?: string;
  source_platform?: string;
  parse_status?: ParseStatus;
  limit?: number;
  offset?: number;
}

/** Outcome of parsing a raw record into a normalized POI */
export interface ParseResult {
  /** Whether parsing succeeded */
  success: boolean;
  /** ID of the created / matched NormalizedPOI */
  normalized_poi_id?: string;
  /** Error description on failure */
  error?: string;
}

/** Current crawler software version */
export const CRAWLER_VERSION = '1.0.0';
