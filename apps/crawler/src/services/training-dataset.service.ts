/**
 * Training Dataset Service
 * Manages training data for AI model improvement
 *
 * NOTE: Stubbed implementation - training dataset management not yet implemented with Convex.
 * TODO: Implement when AI model training workflow is needed.
 */

import type { Buffer } from 'node:buffer';
import { createLogger } from '../lib/logger.js';

const log = createLogger('TrainingDataset');

export interface TrainingDataset {
  id: string;
  name: string;
  description?: string;
  recordCount: number;
  createdAt: string;
}

export interface TrainingRecord {
  id: string;
  datasetId: string;
  input: unknown;
  output: unknown;
  createdAt: string;
}

export interface DatasetGenerationParams {
  name: string;
  description?: string;
  format: 'json' | 'jsonl' | 'csv';
  filters?: {
    categories?: string[];
    cities?: string[];
    minQuality?: number;
    startDate?: string;
    endDate?: string;
  };
  sampling?: {
    method: 'random' | 'stratified';
    stratifyBy?: string;
  };
  split?: {
    enabled: boolean;
    trainRatio?: number;
    valRatio?: number;
    testRatio?: number;
  };
}

export interface DatasetExport {
  content: string | Buffer;
  mimeType: string;
  sizeBytes: number;
}

export interface GeneratedDataset {
  dataset: {
    statistics: {
      total_records: number;
      train_size: number;
      val_size: number;
      test_size: number;
      categories_distribution: Record<string, number>;
      cities_distribution: Record<string, number>;
    };
  };
  exports: {
    full?: DatasetExport;
    train?: DatasetExport;
    val?: DatasetExport;
    test?: DatasetExport;
  };
}

/**
 * Generate a training dataset
 */
export async function generateTrainingDataset(
  params: DatasetGenerationParams
): Promise<GeneratedDataset> {
  log.info(`Generating training dataset: ${params.name} (stubbed)`);

  return {
    dataset: {
      statistics: {
        total_records: 0,
        train_size: 0,
        val_size: 0,
        test_size: 0,
        categories_distribution: {},
        cities_distribution: {},
      },
    },
    exports: {
      full: {
        content: '[]',
        mimeType: 'application/json',
        sizeBytes: 2,
      },
    },
  };
}
