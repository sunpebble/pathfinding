import { v } from 'convex/values';

/**
 * Completeness level validator for travel guides
 *
 * Levels:
 * - complete: All iOS required fields present, content >= 500 chars, no truncation
 * - usable: Has title + content >= 200 + at least one image
 * - incomplete: Missing critical fields or truncated content
 */
export const completenessLevelValidator = v.union(
  v.literal('complete'),
  v.literal('usable'),
  v.literal('incomplete'),
);

/**
 * Optional completeness level validator (for backwards compatibility)
 */
export const optionalCompletenessLevelValidator = v.optional(completenessLevelValidator);
