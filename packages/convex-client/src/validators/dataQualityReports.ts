import { v } from "convex/values";

/**
 * Completeness metrics for data quality
 */
export const completenessMetricsValidator = v.object({
  /** Overall completeness score (0-1) */
  overallScore: v.optional(v.number()),
  /** Completeness by field */
  fieldCompleteness: v.optional(v.record(v.string(), v.number())),
  /** Number of records with all required fields */
  completeRecords: v.optional(v.number()),
  /** Number of records missing required fields */
  incompleteRecords: v.optional(v.number()),
  /** Required fields that are often missing */
  frequentlyMissingFields: v.optional(v.array(v.string())),
});

/**
 * Accuracy metrics for data quality
 */
export const accuracyMetricsValidator = v.object({
  /** Overall accuracy score (0-1) */
  overallScore: v.optional(v.number()),
  /** Geocoding accuracy */
  geocodingAccuracy: v.optional(v.number()),
  /** Category classification accuracy */
  categoryAccuracy: v.optional(v.number()),
  /** Name matching accuracy */
  nameMatchAccuracy: v.optional(v.number()),
  /** Number of validated records */
  validatedRecords: v.optional(v.number()),
  /** Number of records with errors */
  errorRecords: v.optional(v.number()),
});

/**
 * Consistency metrics for data quality
 */
export const consistencyMetricsValidator = v.object({
  /** Overall consistency score (0-1) */
  overallScore: v.optional(v.number()),
  /** Duplicate records found */
  duplicatesFound: v.optional(v.number()),
  /** Records with conflicting data */
  conflictingRecords: v.optional(v.number()),
  /** Format consistency score */
  formatConsistency: v.optional(v.number()),
  /** Cross-reference validation score */
  crossReferenceScore: v.optional(v.number()),
});

/**
 * Data quality metrics validator
 * Used for dataQualityReports.metrics field
 *
 * @example
 * metrics: dataQualityMetricsValidator
 */
export const dataQualityMetricsValidator = v.union(
  v.object({
    /** Completeness metrics */
    completeness: v.optional(completenessMetricsValidator),
    /** Accuracy metrics */
    accuracy: v.optional(accuracyMetricsValidator),
    /** Consistency metrics */
    consistency: v.optional(consistencyMetricsValidator),
    /** Timeliness metrics */
    timeliness: v.optional(
      v.object({
        /** Average age of data in days */
        averageAgeDays: v.optional(v.number()),
        /** Freshness score (0-1) */
        freshnessScore: v.optional(v.number()),
        /** Last updated timestamp */
        lastUpdated: v.optional(v.number()),
        /** Stale records count */
        staleRecords: v.optional(v.number()),
      }),
    ),
    /** Overall quality score (0-1) */
    overallScore: v.optional(v.number()),
    /** Total records analyzed */
    totalRecordsAnalyzed: v.optional(v.number()),
    /** Records passing quality threshold */
    passingRecords: v.optional(v.number()),
    /** Records failing quality threshold */
    failingRecords: v.optional(v.number()),
    /** Quality threshold used */
    threshold: v.optional(v.number()),
  }),
  // Legacy support: accept any object for backwards compatibility
  v.any(),
);

/**
 * Issue severity levels
 */
export const issueSeverityValidator = v.union(
  v.literal("critical"),
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
  v.literal("info"),
);

/**
 * Issue type categories
 */
export const issueTypeValidator = v.union(
  v.literal("missing_field"),
  v.literal("invalid_format"),
  v.literal("out_of_range"),
  v.literal("duplicate"),
  v.literal("inconsistent"),
  v.literal("outdated"),
  v.literal("geocoding_error"),
  v.literal("encoding_error"),
  v.literal("other"),
);

/**
 * Single data quality issue
 */
export const dataQualityIssueValidator = v.object({
  /** Issue type */
  type: v.optional(issueTypeValidator),
  /** Issue severity */
  severity: v.optional(issueSeverityValidator),
  /** Affected field name */
  field: v.optional(v.string()),
  /** Number of affected records */
  affectedRecords: v.optional(v.number()),
  /** Sample of affected record IDs */
  sampleRecordIds: v.optional(v.array(v.string())),
  /** Description of the issue */
  description: v.optional(v.string()),
  /** Suggested fix */
  suggestedFix: v.optional(v.string()),
  /** Auto-fixable flag */
  autoFixable: v.optional(v.boolean()),
  /** First detected timestamp */
  firstDetected: v.optional(v.number()),
  /** Category of affected records */
  category: v.optional(v.string()),
});

/**
 * Data quality issues array validator
 * Used for dataQualityReports.issues field
 *
 * @example
 * issues: dataQualityIssuesValidator
 */
export const dataQualityIssuesValidator = v.union(
  v.array(
    v.union(
      dataQualityIssueValidator,
      // Support legacy unstructured issues
      v.any(),
    ),
  ),
  // Legacy support: accept any for backwards compatibility
  v.any(),
);

/**
 * Strict version without legacy fallback - use for new data only
 */
export const dataQualityIssuesStrictValidator = v.array(
  dataQualityIssueValidator,
);
