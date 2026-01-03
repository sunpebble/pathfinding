/**
 * Processors Index
 * Export all data processing modules
 */

export {
  getAllCategories,
  getCategoryInfo,
  isValidCategory,
  mapPlatformCategoryInternal,
} from './category-mapper.js';
export {
  calculateNameSimilarity,
  calculateSimilarity,
  deduplicatePOI,
  findPotentialDuplicates,
  mergePOIs,
  runBatchDeduplication,
} from './deduplication.js';
export {
  batchNormalize,
  getPendingRecords,
  normalizeRecord,
} from './normalizer.js';
export {
  getParser,
  getSupportedPlatforms,
  registerParser,
} from './parsers/index.js';
export {
  getPipelineStats,
  type PipelineOptions,
  type PipelineResult,
  processJobRecords,
  runNormalizationPipeline,
} from './pipeline.js';
export {
  calculateCompletenessScore,
  calculateFreshnessScore,
  calculateQualityScore,
} from './quality-scorer.js';
