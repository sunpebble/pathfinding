/**
 * POI Deduplication Service
 * Detects and handles duplicate POI records
 *
 * NOTE: Stubbed implementation - POI deduplication not used in travel guide mode.
 * TODO: Implement with Convex when POI deduplication is needed.
 */

import { createLogger } from '../lib/logger.js';

const log = createLogger('Deduplication');

export interface DeduplicationResult {
  totalChecked: number;
  duplicatesFound: number;
  duplicatesMerged: number;
  errors: string[];
}

export interface DuplicateCandidate {
  id: string;
  name: string;
  similarity: number;
  reason: string;
}

/**
 * Run batch deduplication on POI data
 */
export async function runBatchDeduplication(_options?: {
  batchSize?: number;
  threshold?: number;
}): Promise<DeduplicationResult> {
  log.info('Batch deduplication stubbed (not implemented with Convex)');
  return {
    totalChecked: 0,
    duplicatesFound: 0,
    duplicatesMerged: 0,
    errors: [],
  };
}

/**
 * Find potential duplicates for a POI
 */
export async function findDuplicates(
  _poiId: string
): Promise<DuplicateCandidate[]> {
  log.info('Duplicate finding stubbed');
  return [];
}

/**
 * Merge duplicate POIs
 */
export async function mergeDuplicates(
  _primaryId: string,
  _duplicateIds: string[]
): Promise<{ success: boolean; mergedCount: number }> {
  log.info('Duplicate merging stubbed');
  return { success: true, mergedCount: 0 };
}
