/**
 * Training Dataset Service
 * Manages training data for AI model improvement
 *
 * NOTE: Stubbed implementation - training dataset management not yet implemented with Convex.
 * TODO: Implement when AI model training workflow is needed.
 */

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

/**
 * Create a new training dataset
 */
export async function createTrainingDataset(_options: {
  name: string;
  description?: string;
}): Promise<TrainingDataset> {
  log.info('Training dataset creation stubbed');
  return {
    id: `dataset_${Date.now()}`,
    name: _options.name,
    description: _options.description,
    recordCount: 0,
    createdAt: new Date().toISOString(),
  };
}

/**
 * List training datasets
 */
export async function listTrainingDatasets(_options?: {
  page?: number;
  limit?: number;
}): Promise<{ datasets: TrainingDataset[]; total: number }> {
  log.info('Training dataset listing stubbed');
  return { datasets: [], total: 0 };
}

/**
 * Get training dataset by ID
 */
export async function getTrainingDataset(
  _id: string
): Promise<TrainingDataset | null> {
  log.info('Training dataset get by ID stubbed');
  return null;
}

/**
 * Add record to training dataset
 */
export async function addTrainingRecord(_options: {
  datasetId: string;
  input: unknown;
  output: unknown;
}): Promise<TrainingRecord> {
  log.info('Training record creation stubbed');
  return {
    id: `record_${Date.now()}`,
    datasetId: _options.datasetId,
    input: _options.input,
    output: _options.output,
    createdAt: new Date().toISOString(),
  };
}

/**
 * List training records
 */
export async function listTrainingRecords(_options: {
  datasetId: string;
  page?: number;
  limit?: number;
}): Promise<{ records: TrainingRecord[]; total: number }> {
  log.info('Training records listing stubbed');
  return { records: [], total: 0 };
}

/**
 * Delete training dataset
 */
export async function deleteTrainingDataset(_id: string): Promise<void> {
  log.info('Training dataset deletion stubbed');
}

/**
 * Export training dataset
 */
export async function exportTrainingDataset(_id: string): Promise<{
  format: string;
  data: unknown[];
}> {
  log.info('Training dataset export stubbed');
  return { format: 'jsonl', data: [] };
}
