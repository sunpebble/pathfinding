/**
 * POI Data Normalizer
 * Transforms raw crawl records into normalized POI format
 *
 * NOTE: Stubbed implementation - POI normalization not used in travel guide mode.
 * TODO: Implement with Convex when POI data normalization is needed.
 */

import type { NormalizedPOI, RawCrawlRecord } from '@pathfinding/crawler-types';
import { createLogger } from '../lib/logger.js';

const log = createLogger('Normalizer');

export interface NormalizationResult {
  success: boolean;
  poi?: NormalizedPOI;
  error?: string;
}

export interface BatchNormalizationResult {
  processed: number;
  normalized: number;
  skipped: number;
  failed: number;
  results: NormalizationResult[];
}

/**
 * Normalize a single raw record into POI format
 */
export async function normalizeRecord(
  _record: RawCrawlRecord
): Promise<NormalizationResult> {
  log.info('Record normalization stubbed (not implemented with Convex)');
  return {
    success: false,
    error: 'POI normalization not implemented',
  };
}

/**
 * Batch normalize multiple raw records
 */
export async function batchNormalize(
  _records: RawCrawlRecord[]
): Promise<BatchNormalizationResult> {
  log.info('Batch normalization stubbed');
  return {
    processed: 0,
    normalized: 0,
    skipped: 0,
    failed: 0,
    results: [],
  };
}

/**
 * Get or create a normalized POI by external ID
 */
export async function getOrCreatePoi(
  _platform: string,
  _externalId: string
): Promise<NormalizedPOI | null> {
  log.info('POI get or create stubbed');
  return null;
}
