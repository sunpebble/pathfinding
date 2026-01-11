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
export { runBatchDeduplication } from './deduplication.js';
export { batchNormalize, normalizeRecord } from './normalizer.js';
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
  arePoisDuplicates,
  deduplicatePOIs,
  type ExtractedDay,
  type ExtractedPOI,
  normalizePoiName,
  normalizePoiType,
  toStorageFormat,
  validateCoordinates,
  type ValidatedPOI,
  validateExtractedDays,
  validatePOI,
  type ValidationResult,
} from './poi-validator.js';
export {
  calculateCompletenessScore,
  calculateFreshnessScore,
  calculateQualityScore,
} from './quality-scorer.js';
