import { v } from "convex/values";

/**
 * Geographic scope for crawl jobs
 */
export const geographicScopeValidator = v.object({
  /** Type of geographic targeting */
  type: v.optional(
    v.union(
      v.literal("city"),
      v.literal("region"),
      v.literal("country"),
      v.literal("bbox"),
    ),
  ),
  /** City IDs to crawl */
  cityIds: v.optional(v.array(v.string())),
  /** City names for reference */
  cityNames: v.optional(v.array(v.string())),
  /** Country codes (ISO 3166-1 alpha-2) */
  countryCodes: v.optional(v.array(v.string())),
  /** Bounding box coordinates */
  bbox: v.optional(
    v.object({
      north: v.number(),
      south: v.number(),
      east: v.number(),
      west: v.number(),
    }),
  ),
  /** Center point for radius-based crawling */
  center: v.optional(
    v.object({
      latitude: v.number(),
      longitude: v.number(),
      radiusKm: v.number(),
    }),
  ),
});

/**
 * Category configuration for crawl jobs
 */
export const categoryConfigValidator = v.object({
  /** POI categories to crawl */
  categories: v.optional(
    v.array(
      v.union(
        v.literal("attraction"),
        v.literal("restaurant"),
        v.literal("hotel"),
        v.literal("shopping"),
        v.literal("other"),
      ),
    ),
  ),
  /** Subcategories for finer control */
  subcategories: v.optional(v.array(v.string())),
  /** Keywords to filter by */
  keywords: v.optional(v.array(v.string())),
  /** Exclude certain types */
  excludeTypes: v.optional(v.array(v.string())),
});

/**
 * Rate limiting and pagination config
 */
export const crawlBehaviorValidator = v.object({
  /** Delay between requests in ms */
  delayMs: v.optional(v.number()),
  /** Maximum pages to crawl */
  maxPages: v.optional(v.number()),
  /** Maximum results per page */
  pageSize: v.optional(v.number()),
  /** Maximum total results */
  maxResults: v.optional(v.number()),
  /** Timeout per request in ms */
  timeoutMs: v.optional(v.number()),
  /** Number of retries on failure */
  retryCount: v.optional(v.number()),
  /** Whether to follow pagination */
  followPagination: v.optional(v.boolean()),
});

/**
 * Crawl job configuration validator
 * Used for crawlJobs.config field
 *
 * @example
 * config: crawlJobConfigValidator
 */
export const crawlJobConfigValidator = v.union(
  v.object({
    /** Geographic scope of the crawl */
    geographicScope: v.optional(geographicScopeValidator),
    /** Categories to crawl */
    categoryConfig: v.optional(categoryConfigValidator),
    /** Crawl behavior settings */
    behavior: v.optional(crawlBehaviorValidator),
    /** API-specific options */
    apiOptions: v.optional(
      v.object({
        apiKey: v.optional(v.string()),
        apiVersion: v.optional(v.string()),
        endpoint: v.optional(v.string()),
      }),
    ),
    /** Date range for time-based filtering */
    dateRange: v.optional(
      v.object({
        startDate: v.optional(v.string()),
        endDate: v.optional(v.string()),
      }),
    ),
    /** Whether to include reviews */
    includeReviews: v.optional(v.boolean()),
    /** Whether to include photos */
    includePhotos: v.optional(v.boolean()),
    /** Whether to include business hours */
    includeBusinessHours: v.optional(v.boolean()),
    /** Custom filters specific to platform */
    customFilters: v.optional(v.record(v.string(), v.string())),
  }),
  // Legacy support: accept any object for backwards compatibility
  v.any(),
);

/**
 * Category distribution in statistics
 */
export const categoryDistributionValidator = v.object({
  attraction: v.optional(v.number()),
  restaurant: v.optional(v.number()),
  hotel: v.optional(v.number()),
  shopping: v.optional(v.number()),
  other: v.optional(v.number()),
});

/**
 * Error statistics
 */
export const errorStatsValidator = v.object({
  /** Total number of errors */
  totalErrors: v.optional(v.number()),
  /** Errors by type */
  byType: v.optional(v.record(v.string(), v.number())),
  /** Last error message */
  lastError: v.optional(v.string()),
  /** Last error timestamp */
  lastErrorAt: v.optional(v.number()),
});

/**
 * Crawl job statistics validator
 * Used for crawlJobs.statistics field
 *
 * @example
 * statistics: crawlJobStatisticsValidator
 */
export const crawlJobStatisticsValidator = v.union(
  v.object({
    /** Total records crawled */
    totalRecords: v.optional(v.number()),
    /** Successfully processed records */
    successfulRecords: v.optional(v.number()),
    /** Failed records */
    failedRecords: v.optional(v.number()),
    /** Skipped (duplicate) records */
    skippedRecords: v.optional(v.number()),
    /** New records created */
    newRecords: v.optional(v.number()),
    /** Updated existing records */
    updatedRecords: v.optional(v.number()),
    /** Distribution by category */
    categoryDistribution: v.optional(categoryDistributionValidator),
    /** Distribution by city */
    cityDistribution: v.optional(v.record(v.string(), v.number())),
    /** Pages crawled */
    pagesCrawled: v.optional(v.number()),
    /** API requests made */
    apiRequests: v.optional(v.number()),
    /** Total bytes downloaded */
    bytesDownloaded: v.optional(v.number()),
    /** Average processing time per record (ms) */
    avgProcessingTimeMs: v.optional(v.number()),
    /** Error statistics */
    errors: v.optional(errorStatsValidator),
    /** Duration in milliseconds */
    durationMs: v.optional(v.number()),
    /** Start timestamp */
    startedAt: v.optional(v.number()),
    /** End timestamp */
    completedAt: v.optional(v.number()),
  }),
  // Legacy support: accept any object for backwards compatibility
  v.any(),
);
