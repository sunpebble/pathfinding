/**
 * Training Dataset Types (Gold Layer)
 * Types for ML training data generation, versioning, and export.
 */

/** Lifecycle status of a dataset generation job */
export type TrainingDatasetStatus
  = | 'pending'
    | 'generating'
    | 'completed'
    | 'failed';

/** Supported file format for training data export */
export type OutputFormat = 'json' | 'csv' | 'parquet';

/** Sampling strategy for train/val/test splitting */
export type SamplingMethod = 'random' | 'stratified';

/** Date range filter for dataset generation */
export interface TimeRange {
  /** Inclusive start date */
  start: Date | string;
  /** Exclusive end date */
  end: Date | string;
}

/** Configuration for train/val/test data split */
export interface SamplingConfig {
  /** Splitting strategy */
  method: SamplingMethod;
  /** Fraction allocated to training (e.g. 0.8) */
  train_ratio: number;
  /** Fraction allocated to validation (e.g. 0.1) */
  val_ratio: number;
  /** Fraction allocated to testing (e.g. 0.1) */
  test_ratio: number;
}

/** Parameters controlling which data enters a training dataset */
export interface TrainingDatasetParams {
  /** Only include data within this time range */
  time_range?: TimeRange;
  /** City names to include */
  geographic_scope?: string[];
  /** POI categories to include */
  categories?: string[];
  /** Minimum quality score (0–1) threshold */
  min_quality_score?: number;
  /** Minimum number of reviews required */
  min_reviews?: number;
  /** Train/val/test split configuration */
  sampling?: SamplingConfig;
}

/** Aggregate statistics for a generated dataset */
export interface TrainingDatasetStats {
  /** Total records in the dataset */
  total_records: number;
  /** Records in the training split */
  train_size: number;
  /** Records in the validation split */
  val_size: number;
  /** Records in the test split */
  test_size: number;
  /** Number of records per category */
  categories_distribution: Record<string, number>;
  /** Number of records per city */
  cities_distribution: Record<string, number>;
}

/** Full training dataset entity */
export interface TrainingDataset {
  id: string;
  /** Human-readable dataset name */
  name: string;
  /** Semantic version string (e.g. '1.2.0') */
  version: string;
  description?: string | null;
  /** Parameters used to generate this dataset */
  generation_params: TrainingDatasetParams;
  /** Computed statistics after generation */
  statistics: TrainingDatasetStats;
  /** File format of the exported dataset */
  output_format: OutputFormat;
  /** Storage path of the exported file */
  output_path?: string | null;
  /** File size of the exported dataset in bytes */
  output_size_bytes?: number | null;
  /** Point-in-time snapshot: only data before this date was included */
  source_data_cutoff: Date;
  /** Explicit list of POI IDs included (null = determined by params) */
  poi_ids?: string[] | null;
  status: TrainingDatasetStatus;
  /** Error message if status is 'failed' */
  error_message?: string | null;
  started_at?: Date | null;
  completed_at?: Date | null;
  created_at: Date;
}

/** Request payload for creating a new training dataset */
export interface CreateTrainingDatasetRequest {
  name: string;
  version: string;
  description?: string;
  generation_params: TrainingDatasetParams;
  output_format?: OutputFormat;
}

/** Query parameters for listing training datasets */
export interface TrainingDatasetListParams {
  name?: string;
  status?: TrainingDatasetStatus;
  output_format?: OutputFormat;
  limit?: number;
  offset?: number;
}

/** Default 80/10/10 stratified sampling configuration */
export const DEFAULT_SAMPLING_CONFIG: SamplingConfig = {
  method: 'stratified',
  train_ratio: 0.8,
  val_ratio: 0.1,
  test_ratio: 0.1,
};

/** Default zero-state statistics for a newly created dataset */
export const DEFAULT_TRAINING_DATASET_STATS: TrainingDatasetStats = {
  total_records: 0,
  train_size: 0,
  val_size: 0,
  test_size: 0,
  categories_distribution: {},
  cities_distribution: {},
};

/**
 * A single training data record exported for ML consumption.
 * Each record represents one POI with its features and assigned split.
 */
export interface TrainingRecord {
  /** POI identifier */
  id: string;
  /** POI name */
  name: string;
  /** Primary category */
  category: string;
  /** Subcategory */
  subcategory?: string;
  /** Latitude (WGS 84) */
  latitude: number;
  /** Longitude (WGS 84) */
  longitude: number;
  /** City name */
  city?: string;
  /** Overall rating */
  rating?: number;
  /** Total number of ratings */
  rating_count: number;
  /** Human-readable price range */
  price_range?: string;
  /** Quality score (0–1) */
  quality_score: number;
  /** Extracted feature vector for ML model input */
  features: Record<string, unknown>;
  /** Dataset split assignment */
  split: 'train' | 'val' | 'test';
}
