/**
 * Raw Crawl Record Types (Bronze Layer)
 * Types for storing original crawled data
 */

export type ParseStatus = 'pending' | 'success' | 'failed' | 'skipped';
export type ContentType = 'html' | 'json' | 'xml';

export interface RawCrawlRecord {
  id: string;
  job_id: string;
  source_platform: string;
  source_url: string;
  source_external_id?: string | null;
  raw_content: string;
  content_type: ContentType;
  content_hash: string;
  content_size_bytes: number;
  http_status?: number | null;
  http_headers?: Record<string, string> | null;
  crawler_version: string;
  crawled_at: Date;
  parse_status: ParseStatus;
  parse_error?: string | null;
  parsed_at?: Date | null;
  normalized_poi_id?: string | null;
  created_at: Date;
}

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

export interface RawCrawlRecordListParams {
  job_id?: string;
  source_platform?: string;
  parse_status?: ParseStatus;
  limit?: number;
  offset?: number;
}

export interface ParseResult {
  success: boolean;
  normalized_poi_id?: string;
  error?: string;
}

export const CRAWLER_VERSION = '1.0.0';
