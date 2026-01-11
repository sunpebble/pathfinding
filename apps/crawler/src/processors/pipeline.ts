/**
 * Normalization Pipeline
 * Orchestrates the complete data normalization workflow
 *
 * NOTE: Stubbed implementation - POI normalization pipeline not used in travel guide mode.
 * TODO: Implement with Convex when POI data normalization is needed.
 */

import type { DataQualityReport } from '@pathfinding/crawler-types';
import { createLogger } from '../lib/logger.js';

const log = createLogger('Pipeline');

export interface PipelineResult {
  success: boolean;
  stats: {
    recordsProcessed: number;
    recordsNormalized: number;
    recordsSkipped: number;
    recordsFailed: number;
    duplicatesFound: number;
    duplicatesMerged: number;
    processingTime: number;
  };
  errors: string[];
}

export interface PipelineOptions {
  batchSize?: number;
  runDeduplication?: boolean;
  platform?: string;
  city?: string;
  category?: string;
  crawlJobId?: string;
}

/**
 * Run the full normalization pipeline
 * Currently stubbed - not used in travel guide mode
 */
export async function runNormalizationPipeline(
  _options: PipelineOptions = {}
): Promise<PipelineResult> {
  log.info('Normalization pipeline stubbed (not implemented with Convex)');

  return {
    success: true,
    stats: {
      recordsProcessed: 0,
      recordsNormalized: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
      duplicatesFound: 0,
      duplicatesMerged: 0,
      processingTime: 0,
    },
    errors: [],
  };
}

/**
 * Process a single crawl job's records
 */
export async function processJobRecords(
  _jobId: string
): Promise<PipelineResult> {
  log.info('Job records processing stubbed');
  return runNormalizationPipeline({ crawlJobId: _jobId });
}

/**
 * Get pipeline statistics
 */
export async function getPipelineStats(): Promise<{
  pendingRecords: number;
  normalizedPois: number;
  duplicates: number;
  lastReport: DataQualityReport | null;
}> {
  log.info('Pipeline stats stubbed');
  return {
    pendingRecords: 0,
    normalizedPois: 0,
    duplicates: 0,
    lastReport: null,
  };
}
