import { v } from "convex/values";

/**
 * Geographic scope for training dataset generation
 */
export const trainingGeographicScopeValidator = v.object({
  /** Type of geographic scope */
  type: v.optional(
    v.union(
      v.literal("global"),
      v.literal("country"),
      v.literal("region"),
      v.literal("city"),
    ),
  ),
  /** Country codes to include */
  countryCodes: v.optional(v.array(v.string())),
  /** City IDs to include */
  cityIds: v.optional(v.array(v.string())),
  /** City names for reference */
  cityNames: v.optional(v.array(v.string())),
  /** Region names */
  regions: v.optional(v.array(v.string())),
});

/**
 * Time range for data filtering
 */
export const timeRangeValidator = v.object({
  /** Start timestamp */
  startDate: v.optional(v.number()),
  /** End timestamp */
  endDate: v.optional(v.number()),
  /** ISO date string format */
  startDateStr: v.optional(v.string()),
  endDateStr: v.optional(v.string()),
});

/**
 * Training dataset generation parameters validator
 * Used for trainingDatasets.generationParams field
 *
 * @example
 * generationParams: trainingGenerationParamsValidator
 */
export const trainingGenerationParamsValidator = v.union(
  v.object({
    /** Geographic scope */
    geographicScope: v.optional(trainingGeographicScopeValidator),
    /** Time range for data */
    timeRange: v.optional(timeRangeValidator),
    /** Categories to include */
    categories: v.optional(v.array(v.string())),
    /** Minimum rating threshold */
    minRating: v.optional(v.number()),
    /** Minimum review count */
    minReviewCount: v.optional(v.number()),
    /** Sample size (number of records) */
    sampleSize: v.optional(v.number()),
    /** Sampling strategy */
    samplingStrategy: v.optional(
      v.union(
        v.literal("random"),
        v.literal("stratified"),
        v.literal("weighted"),
      ),
    ),
    /** Random seed for reproducibility */
    randomSeed: v.optional(v.number()),
    /** Whether to include raw data */
    includeRawData: v.optional(v.boolean()),
    /** Whether to include reviews */
    includeReviews: v.optional(v.boolean()),
    /** Whether to include images */
    includeImages: v.optional(v.boolean()),
    /** Data augmentation settings */
    augmentation: v.optional(
      v.object({
        enabled: v.optional(v.boolean()),
        techniques: v.optional(v.array(v.string())),
      }),
    ),
    /** Custom filters */
    customFilters: v.optional(v.record(v.string(), v.string())),
  }),
  // Legacy support: accept any object for backwards compatibility
  v.any(),
);

/**
 * Category distribution statistics
 */
export const categoryStatsValidator = v.object({
  attraction: v.optional(v.number()),
  restaurant: v.optional(v.number()),
  hotel: v.optional(v.number()),
  shopping: v.optional(v.number()),
  other: v.optional(v.number()),
});

/**
 * Training dataset statistics validator
 * Used for trainingDatasets.statistics field
 *
 * @example
 * statistics: trainingStatisticsValidator
 */
export const trainingStatisticsValidator = v.union(
  v.object({
    /** Total number of records */
    totalRecords: v.optional(v.number()),
    /** Records per category */
    categoryDistribution: v.optional(categoryStatsValidator),
    /** Records per city */
    cityDistribution: v.optional(v.record(v.string(), v.number())),
    /** Records per country */
    countryDistribution: v.optional(v.record(v.string(), v.number())),
    /** Date range of data */
    dateRange: v.optional(
      v.object({
        earliest: v.optional(v.number()),
        latest: v.optional(v.number()),
      }),
    ),
    /** Rating statistics */
    ratingStats: v.optional(
      v.object({
        min: v.optional(v.number()),
        max: v.optional(v.number()),
        mean: v.optional(v.number()),
        median: v.optional(v.number()),
        stdDev: v.optional(v.number()),
      }),
    ),
    /** Data quality metrics */
    qualityMetrics: v.optional(
      v.object({
        completenessScore: v.optional(v.number()),
        validationPassRate: v.optional(v.number()),
        missingFieldsCount: v.optional(v.number()),
      }),
    ),
    /** File sizes per format */
    fileSizes: v.optional(
      v.object({
        json: v.optional(v.number()),
        csv: v.optional(v.number()),
        parquet: v.optional(v.number()),
      }),
    ),
    /** Generation duration in ms */
    generationDurationMs: v.optional(v.number()),
  }),
  // Legacy support: accept any object for backwards compatibility
  v.any(),
);

/**
 * Storage paths for generated datasets
 * Used for trainingDatasets.storagePaths field
 *
 * @example
 * storagePaths: trainingStoragePathsValidator
 */
export const trainingStoragePathsValidator = v.union(
  v.object({
    /** Path to JSON file */
    json: v.optional(v.string()),
    /** Path to CSV file */
    csv: v.optional(v.string()),
    /** Path to Parquet file */
    parquet: v.optional(v.string()),
    /** Base directory */
    baseDir: v.optional(v.string()),
    /** Cloud storage bucket */
    bucket: v.optional(v.string()),
    /** Cloud storage prefix/path */
    prefix: v.optional(v.string()),
    /** URLs for public access */
    urls: v.optional(
      v.object({
        json: v.optional(v.string()),
        csv: v.optional(v.string()),
        parquet: v.optional(v.string()),
      }),
    ),
    /** S3-compatible storage config */
    s3: v.optional(
      v.object({
        bucket: v.optional(v.string()),
        region: v.optional(v.string()),
        key: v.optional(v.string()),
      }),
    ),
  }),
  // Legacy support: accept any object for backwards compatibility
  v.any(),
);
