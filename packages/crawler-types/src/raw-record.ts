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
