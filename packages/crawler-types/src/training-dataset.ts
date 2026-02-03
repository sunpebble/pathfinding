/**
 * Training Dataset Types (Gold Layer)
 * Types for ML training data generation and versioning
 */

export type TrainingDatasetStatus
  = | 'pending'
    | 'generating'
    | 'completed'
    | 'failed';
export type OutputFormat = 'json' | 'csv' | 'parquet';
export type SamplingMethod = 'random' | 'stratified';

export interface TimeRange {
  start: Date | string;
  end: Date | string;
}

export interface SamplingConfig {
  method: SamplingMethod;
  train_ratio: number;
  val_ratio: number;
  test_ratio: number;
}

export interface TrainingDatasetParams {
  time_range?: TimeRange;
  geographic_scope?: string[];
  categories?: string[];
  min_quality_score?: number;
  min_reviews?: number;
  sampling?: SamplingConfig;
}

export interface TrainingDatasetStats {
  total_records: number;
  train_size: number;
  val_size: number;
  test_size: number;
  categories_distribution: Record<string, number>;
  cities_distribution: Record<string, number>;
}

export interface TrainingDataset {
  id: string;
  name: string;
  version: string;
  description?: string | null;
  generation_params: TrainingDatasetParams;
  statistics: TrainingDatasetStats;
  output_format: OutputFormat;
  output_path?: string | null;
  output_size_bytes?: number | null;
  source_data_cutoff: Date;
  poi_ids?: string[] | null;
  status: TrainingDatasetStatus;
  error_message?: string | null;
  started_at?: Date | null;
  completed_at?: Date | null;
  created_at: Date;
}

export interface CreateTrainingDatasetRequest {
  name: string;
  version: string;
  description?: string;
  generation_params: TrainingDatasetParams;
  output_format?: OutputFormat;
}

export interface TrainingDatasetListParams {
  name?: string;
  status?: TrainingDatasetStatus;
  output_format?: OutputFormat;
  limit?: number;
  offset?: number;
}

export const DEFAULT_SAMPLING_CONFIG: SamplingConfig = {
  method: 'stratified',
  train_ratio: 0.8,
  val_ratio: 0.1,
  test_ratio: 0.1,
};

export const DEFAULT_TRAINING_DATASET_STATS: TrainingDatasetStats = {
  total_records: 0,
  train_size: 0,
  val_size: 0,
  test_size: 0,
  categories_distribution: {},
  cities_distribution: {},
};

/**
 * Training data record format for export
 */
export interface TrainingRecord {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  latitude: number;
  longitude: number;
  city?: string;
  rating?: number;
  rating_count: number;
  price_range?: string;
  quality_score: number;
  features: Record<string, unknown>;
  split: 'train' | 'val' | 'test';
}
