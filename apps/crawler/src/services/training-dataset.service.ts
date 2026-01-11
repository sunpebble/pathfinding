/**
 * Training Dataset Service
 * Generates ML-ready datasets with filtering, sampling, and versioning
 */

import type {
  CreateTrainingDatasetRequest,
  NormalizedPOI,
  TrainingDataset,
} from '@pathfinding/crawler-types';
import type { ExportResult } from '../exporters/index.js';
import { getExporter, getSupportedFormats } from '../exporters/index.js';
import { TABLES } from '../lib/convex.js';

export interface DatasetGenerationParams {
  /**
   * Dataset name
   */
  name: string;

  /**
   * Dataset description
   */
  description?: string;

  /**
   * Output format
   */
  format: 'json' | 'jsonl' | 'csv';

  /**
   * Filter options
   */
  filters?: {
    categories?: string[];
    cities?: string[];
    minQuality?: number;
    minCompleteness?: number;
    startDate?: string;
    endDate?: string;
    includeReviews?: boolean;
  };

  /**
   * Sampling options
   */
  sampling?: {
    method: 'random' | 'stratified' | 'all';
    size?: number;
    stratifyBy?: 'category' | 'city';
    seed?: number;
  };

  /**
   * Split options for train/val/test
   */
  split?: {
    enabled: boolean;
    trainRatio: number;
    valRatio: number;
    testRatio: number;
  };

  /**
   * Fields to include
   */
  fields?: string[];
}

export interface GeneratedDataset {
  dataset: TrainingDataset;
  exports: {
    train?: ExportResult;
    val?: ExportResult;
    test?: ExportResult;
    full?: ExportResult;
  };
}

/**
 * Generate a training dataset
 */
export async function generateTrainingDataset(
  params: DatasetGenerationParams
): Promise<GeneratedDataset> {
  const _startTime = Date.now();

  // 1. Fetch POIs based on filters
  const pois = await fetchPOIsForDataset(params);

  if (pois.length === 0) {
    throw new Error('No POIs match the specified filters');
  }

  // 2. Apply sampling
  const sampledPOIs = applySampling(pois, params.sampling);

  // 3. Split data if requested
  const splits = splitData(sampledPOIs, params.split);

  // 4. Export to requested format
  const exporter = getExporter(params.format, {
    fields: params.fields,
    includeMetadata: true,
  });

  if (!exporter) {
    throw new Error(`Unsupported format: ${params.format}`);
  }

  const exports: GeneratedDataset['exports'] = {};

  if (params.split?.enabled) {
    if (splits.train.length > 0) {
      exports.train = await exporter.export(splits.train);
    }
    if (splits.val.length > 0) {
      exports.val = await exporter.export(splits.val);
    }
    if (splits.test.length > 0) {
      exports.test = await exporter.export(splits.test);
    }
  } else {
    exports.full = await exporter.export(sampledPOIs);
  }

  // 5. Calculate statistics
  const stats = calculateDatasetStats(sampledPOIs);

  // 6. Create dataset record
  const now = new Date().toISOString();
  const version = await getNextVersion(params.name);

  const datasetRecord: CreateTrainingDatasetRequest = {
    name: params.name,
    description: params.description || `Training dataset generated at ${now}`,
    version,
    format: params.format,
    filters: params.filters || {},
    record_count: sampledPOIs.length,
    file_size: Object.values(exports).reduce(
      (sum, e) => sum + (e?.sizeBytes || 0),
      0
    ),
    statistics: stats,
    split_info: params.split?.enabled
      ? {
          train_count: splits.train.length,
          val_count: splits.val.length,
          test_count: splits.test.length,
          train_ratio: params.split.trainRatio,
          val_ratio: params.split.valRatio,
          test_ratio: params.split.testRatio,
        }
      : undefined,
  };

  const { data: dataset, error } = await supabase
    .from(TABLES.TRAINING_DATASETS)
    .insert(datasetRecord)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create dataset record: ${error.message}`);
  }

  return {
    dataset: dataset as TrainingDataset,
    exports,
  };
}

/**
 * Fetch POIs based on filters
 */
async function fetchPOIsForDataset(
  params: DatasetGenerationParams
): Promise<NormalizedPOI[]> {
  const { filters } = params;

  let query = supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('*')
    .eq('is_duplicate', false);

  if (filters?.categories && filters.categories.length > 0) {
    query = query.in('category', filters.categories);
  }

  if (filters?.cities && filters.cities.length > 0) {
    query = query.in('city', filters.cities);
  }

  if (filters?.minQuality !== undefined) {
    query = query.gte('quality_score', filters.minQuality);
  }

  if (filters?.minCompleteness !== undefined) {
    query = query.gte('completeness_score', filters.minCompleteness);
  }

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  query = query.order('quality_score', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch POIs: ${error.message}`);
  }

  return data as NormalizedPOI[];
}

/**
 * Apply sampling to POIs
 */
function applySampling(
  pois: NormalizedPOI[],
  sampling?: DatasetGenerationParams['sampling']
): NormalizedPOI[] {
  if (!sampling || sampling.method === 'all') {
    return pois;
  }

  const size = sampling.size || pois.length;
  const seed = sampling.seed || Date.now();

  // Simple seeded random number generator
  const random = createSeededRandom(seed);

  if (sampling.method === 'random') {
    // Shuffle and take first N
    const shuffled = [...pois].sort(() => random() - 0.5);
    return shuffled.slice(0, size);
  }

  if (sampling.method === 'stratified') {
    const stratifyBy = sampling.stratifyBy || 'category';

    // Group by stratification field
    const groups: Map<string, NormalizedPOI[]> = new Map();
    for (const poi of pois) {
      const key =
        ((poi as Record<string, unknown>)[stratifyBy] as string) || 'unknown';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(poi);
    }

    // Calculate samples per group
    const totalPois = pois.length;
    const result: NormalizedPOI[] = [];

    for (const [, groupPois] of groups) {
      const groupRatio = groupPois.length / totalPois;
      const groupSize = Math.round(size * groupRatio);

      // Shuffle and take
      const shuffled = [...groupPois].sort(() => random() - 0.5);
      result.push(...shuffled.slice(0, groupSize));
    }

    return result;
  }

  return pois;
}

/**
 * Split data into train/val/test sets
 */
function splitData(
  pois: NormalizedPOI[],
  split?: DatasetGenerationParams['split']
): { train: NormalizedPOI[]; val: NormalizedPOI[]; test: NormalizedPOI[] } {
  if (!split?.enabled) {
    return { train: [], val: [], test: [] };
  }

  const { trainRatio = 0.8, valRatio = 0.1, testRatio = 0.1 } = split;

  // Validate ratios
  const total = trainRatio + valRatio + testRatio;
  if (Math.abs(total - 1.0) > 0.001) {
    throw new Error(`Split ratios must sum to 1.0, got ${total}`);
  }

  // Shuffle POIs
  const shuffled = [...pois].sort(() => Math.random() - 0.5);

  const trainEnd = Math.floor(shuffled.length * trainRatio);
  const valEnd = trainEnd + Math.floor(shuffled.length * valRatio);

  return {
    train: shuffled.slice(0, trainEnd),
    val: shuffled.slice(trainEnd, valEnd),
    test: shuffled.slice(valEnd),
  };
}

/**
 * Calculate dataset statistics
 */
function calculateDatasetStats(pois: NormalizedPOI[]): Record<string, unknown> {
  if (pois.length === 0) {
    return {};
  }

  // Category distribution
  const categoryDist: Record<string, number> = {};
  for (const poi of pois) {
    categoryDist[poi.category] = (categoryDist[poi.category] || 0) + 1;
  }

  // City distribution
  const cityDist: Record<string, number> = {};
  for (const poi of pois) {
    if (poi.city) {
      cityDist[poi.city] = (cityDist[poi.city] || 0) + 1;
    }
  }

  // Quality score stats
  const qualityScores = pois.map((p) => p.quality_score || 0);
  const avgQuality =
    qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
  const minQuality = Math.min(...qualityScores);
  const maxQuality = Math.max(...qualityScores);

  // Completeness score stats
  const completenessScores = pois.map((p) => p.completeness_score || 0);
  const avgCompleteness =
    completenessScores.reduce((a, b) => a + b, 0) / completenessScores.length;

  // Field coverage
  const fieldCoverage: Record<string, number> = {};
  const fieldsToCheck = [
    'description',
    'name_en',
    'address',
    'phone',
    'website',
    'rating_overall',
    'operating_hours',
    'photo_urls',
  ];

  for (const field of fieldsToCheck) {
    const count = pois.filter((p) => {
      const value = (p as Record<string, unknown>)[field];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object')
        return value !== null && Object.keys(value).length > 0;
      return value !== null && value !== undefined;
    }).length;
    fieldCoverage[field] = Math.round((count / pois.length) * 100);
  }

  return {
    total_records: pois.length,
    category_distribution: categoryDist,
    city_distribution: cityDist,
    quality_score: {
      avg: Math.round(avgQuality * 100) / 100,
      min: Math.round(minQuality * 100) / 100,
      max: Math.round(maxQuality * 100) / 100,
    },
    completeness_score: {
      avg: Math.round(avgCompleteness * 100) / 100,
    },
    field_coverage_percent: fieldCoverage,
  };
}

/**
 * Get next version number for a dataset name
 */
async function getNextVersion(name: string): Promise<string> {
  const { data } = await supabase
    .from(TABLES.TRAINING_DATASETS)
    .select('version')
    .eq('name', name)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data?.version) {
    return '1.0.0';
  }

  // Parse version and increment patch
  const [major, minor, patch] = data.version.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Create a seeded random number generator
 */
function createSeededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

/**
 * List training datasets
 */
export async function listTrainingDatasets(options: {
  page?: number;
  limit?: number;
  name?: string;
}): Promise<{ datasets: TrainingDataset[]; total: number }> {
  const { page = 1, limit = 20, name } = options;
  const offset = (page - 1) * limit;

  let query = supabase
    .from(TABLES.TRAINING_DATASETS)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (name) {
    query = query.eq('name', name);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list datasets: ${error.message}`);
  }

  return {
    datasets: data as TrainingDataset[],
    total: count || 0,
  };
}

/**
 * Get a training dataset by ID
 */
export async function getTrainingDatasetById(
  id: string
): Promise<TrainingDataset | null> {
  const { data, error } = await supabase
    .from(TABLES.TRAINING_DATASETS)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get dataset: ${error.message}`);
  }

  return data as TrainingDataset;
}

/**
 * Delete a training dataset
 */
export async function deleteTrainingDataset(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.TRAINING_DATASETS)
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete dataset: ${error.message}`);
  }
}

/**
 * Regenerate a training dataset with same parameters
 */
export async function regenerateTrainingDataset(
  id: string
): Promise<GeneratedDataset> {
  const existing = await getTrainingDatasetById(id);
  if (!existing) {
    throw new Error('Dataset not found');
  }

  // Regenerate with same parameters
  return generateTrainingDataset({
    name: existing.name,
    description: existing.description,
    format: existing.format as 'json' | 'jsonl' | 'csv',
    filters: existing.filters as DatasetGenerationParams['filters'],
    split: existing.split_info
      ? {
          enabled: true,
          trainRatio: (existing.split_info as any).train_ratio || 0.8,
          valRatio: (existing.split_info as any).val_ratio || 0.1,
          testRatio: (existing.split_info as any).test_ratio || 0.1,
        }
      : undefined,
  });
}

export { getSupportedFormats };
