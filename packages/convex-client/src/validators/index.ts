export {
  businessHoursStrictValidator,
  timePeriodValidator as businessHoursTimePeriodValidator,
  businessHoursValidator,
  dayHoursValidator,
} from "./businessHours.js";

export {
  completenessLevelValidator,
  optionalCompletenessLevelValidator,
} from "./completenessLevel.js";

export {
  categoryConfigValidator,
  categoryDistributionValidator,
  crawlBehaviorValidator,
  crawlJobConfigValidator,
  crawlJobStatisticsValidator,
  errorStatsValidator,
  geographicScopeValidator,
} from "./crawlJobs.js";

export {
  accuracyMetricsValidator,
  completenessMetricsValidator,
  consistencyMetricsValidator,
  dataQualityIssuesStrictValidator,
  dataQualityIssuesValidator,
  dataQualityIssueValidator,
  dataQualityMetricsValidator,
  issueSeverityValidator,
  issueTypeValidator,
} from "./dataQualityReports.js";

export {
  createChangesValidator,
  deleteChangesValidator,
  editOperationChangesStrictValidator,
  editOperationChangesValidator,
  reorderChangesValidator,
  timePeriodValidator,
  updateChangesValidator,
} from "./editOperations.js";

export {
  deepLinkTargetValidator,
  flightNotificationDataValidator,
  genericNotificationDataValidator,
  itineraryNotificationDataValidator,
  notificationDataValidator,
  scheduledNotificationDataValidator,
  socialNotificationDataValidator,
  weatherNotificationDataValidator,
} from "./notifications.js";

export {
  rawBusinessHoursValidator,
  rawCrawlDataValidator,
  rawLocationValidator,
  rawPhotoValidator,
  rawRatingValidator,
} from "./rawCrawlRecords.js";

export {
  categoryStatsValidator,
  timeRangeValidator,
  trainingGenerationParamsValidator,
  trainingGeographicScopeValidator,
  trainingStatisticsValidator,
  trainingStoragePathsValidator,
} from "./trainingDatasets.js";

export {
  yearlyStatsEntryValidator,
  yearlyStatsStrictValidator,
  yearlyStatsValidator,
} from "./travelStats.js";

/**
 * # Typed Validators Library
 *
 * This library provides type-safe Convex validators to replace `v.any()` usages.
 *
 * ## Important: Schema Compatibility
 *
 * These validators CANNOT be used directly in `defineTable()` schema definitions
 * due to Convex's type system constraints. The `v.union(typed, v.any())` pattern
 * creates complex union types incompatible with `GenericValidator`.
 *
 * ## Recommended Usage
 *
 * ### 1. Mutation/Query Arguments
 * ```typescript
 * import { editOperationChangesValidator } from './validators';
 *
 * export const createEditOperation = mutation({
 *   args: {
 *     itineraryId: v.id('itineraries'),
 *     changes: editOperationChangesValidator,
 *   },
 *   handler: async (ctx, args) => { ... },
 * });
 * ```
 *
 * ### 2. Runtime Validation
 * ```typescript
 * import { crawlJobConfigValidator } from './validators';
 *
 * function validateConfig(config: unknown) {
 *   return crawlJobConfigValidator.parse(config);
 * }
 * ```
 *
 * ### 3. TypeScript Type Inference
 * ```typescript
 * import { Infer } from 'convex/values';
 * import { notificationDataValidator } from './validators';
 *
 * type NotificationData = Infer<typeof notificationDataValidator>;
 * ```
 *
 * ## Validator Mapping to Schema Fields
 *
 * | Schema Table          | Field              | Validator                          |
 * |-----------------------|--------------------|------------------------------------|
 * | editOperations        | changes            | editOperationChangesValidator      |
 * | crawlJobs             | config             | crawlJobConfigValidator            |
 * | crawlJobs             | statistics         | crawlJobStatisticsValidator        |
 * | rawCrawlRecords       | rawData            | rawCrawlDataValidator              |
 * | normalizedPois        | businessHours      | businessHoursValidator             |
 * | pois                  | businessHours      | businessHoursValidator             |
 * | trainingDatasets      | generationParams   | trainingGenerationParamsValidator  |
 * | trainingDatasets      | statistics         | trainingStatisticsValidator        |
 * | trainingDatasets      | storagePaths       | trainingStoragePathsValidator      |
 * | dataQualityReports    | metrics            | dataQualityMetricsValidator        |
 * | dataQualityReports    | issues             | dataQualityIssuesValidator         |
 * | notifications         | data               | notificationDataValidator          |
 * | scheduledNotifications| data               | scheduledNotificationDataValidator |
 * | travelStats           | yearlyStats        | yearlyStatsValidator               |
 *
 * ## Strict vs Backwards-Compatible Validators
 *
 * - `*Validator` - Includes `v.any()` fallback for legacy data compatibility
 * - `*StrictValidator` - No fallback, use for new data validation only
 */
