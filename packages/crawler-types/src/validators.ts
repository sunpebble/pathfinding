/**
 * Data Validators
 * Validation functions for travel guide data
 */

import type { GuidePlatform } from './travel-guide.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  error: string;
  received?: unknown;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

/**
 * Validation warning (non-blocking issues)
 */
export interface ValidationWarning {
  field: string;
  warning: string;
  suggestion?: string;
}

/**
 * Guide data for validation (supports both snake_case and camelCase)
 */
export interface GuideValidationInput {
  // Required fields (camelCase)
  sourcePlatform?: string;
  sourceExternalId?: string;
  content?: string;
  destinations?: string[];

  // Required fields (snake_case - from crawler)
  source_platform?: string;
  source_external_id?: string;

  // Optional numeric fields (camelCase)
  likesCount?: number;
  savesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  qualityScore?: number;

  // Optional numeric fields (snake_case)
  likes_count?: number;
  saves_count?: number;
  comments_count?: number;
  views_count?: number;
  quality_score?: number;

  // Allow other fields
  [key: string]: unknown;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Valid platform values
 */
export const VALID_PLATFORMS: GuidePlatform[] = [
  'xiaohongshu',
  'weibo',
  'ctrip',
  'douyin',
  'tripadvisor',
  'tongcheng',
  'mafengwo',
  'qunar',
];

/**
 * Minimum content length requirement
 */
export const MIN_CONTENT_LENGTH = 200;

/**
 * Patterns indicating truncated content
 */
export const TRUNCATION_PATTERNS = [
  /\.{3}$/,
  /…$/,
  /\[查看更多\]$/,
  /\[展开全文\]$/,
  /\[阅读全文\]$/,
  /查看更多$/,
  /展开全文$/,
];

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Get value supporting both camelCase and snake_case keys
 */
function getValue<T>(
  input: GuideValidationInput,
  camelKey: string,
  snakeKey: string,
): T | undefined {
  return (input[camelKey] ?? input[snakeKey]) as T | undefined;
}

/**
 * Validate a single guide's data
 *
 * @example
 * const result = validateGuide({
 *   sourcePlatform: 'xiaohongshu',
 *   sourceExternalId: '123',
 *   content: 'This is a travel guide...',
 *   destinations: ['北京'],
 * });
 *
 * if (!result.valid) {
 *   console.error('Validation failed:', result.errors);
 * }
 */
export function validateGuide(input: GuideValidationInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // === Required Fields ===

  // sourcePlatform
  const sourcePlatform = getValue<string>(input, 'sourcePlatform', 'source_platform');
  if (!sourcePlatform) {
    errors.push({
      field: 'sourcePlatform',
      error: 'required',
      received: sourcePlatform,
    });
  }
  else if (!VALID_PLATFORMS.includes(sourcePlatform as GuidePlatform)) {
    errors.push({
      field: 'sourcePlatform',
      error: `must be one of: ${VALID_PLATFORMS.join(', ')}`,
      received: sourcePlatform,
    });
  }

  // sourceExternalId
  const sourceExternalId = getValue<string>(input, 'sourceExternalId', 'source_external_id');
  if (!sourceExternalId) {
    errors.push({
      field: 'sourceExternalId',
      error: 'required',
      received: sourceExternalId,
    });
  }

  // content
  const content = input.content;
  if (!content) {
    errors.push({
      field: 'content',
      error: 'required',
      received: content,
    });
  }
  else if (typeof content !== 'string') {
    errors.push({
      field: 'content',
      error: 'must be a string',
      received: typeof content,
    });
  }
  else {
    // Content length validation
    if (content.length < MIN_CONTENT_LENGTH) {
      errors.push({
        field: 'content',
        error: `minimum length is ${MIN_CONTENT_LENGTH} characters`,
        received: content.length,
      });
    }

    // Truncation detection (warning, not error)
    const isTruncated = TRUNCATION_PATTERNS.some(pattern => pattern.test(content));
    if (isTruncated) {
      warnings.push({
        field: 'content',
        warning: 'content appears to be truncated',
        suggestion: 'Consider fetching full content from source',
      });
    }
  }

  // destinations
  const destinations = input.destinations;
  if (!destinations) {
    errors.push({
      field: 'destinations',
      error: 'required',
      received: destinations,
    });
  }
  else if (!Array.isArray(destinations)) {
    errors.push({
      field: 'destinations',
      error: 'must be an array',
      received: typeof destinations,
    });
  }
  else if (destinations.length === 0) {
    errors.push({
      field: 'destinations',
      error: 'must have at least one item',
      received: destinations,
    });
  }

  // === Numeric Fields Validation ===

  // likesCount
  const likesCount = getValue<number>(input, 'likesCount', 'likes_count');
  if (likesCount !== undefined && likesCount !== null) {
    if (typeof likesCount !== 'number' || !Number.isFinite(likesCount)) {
      errors.push({
        field: 'likesCount',
        error: 'must be a number',
        received: likesCount,
      });
    }
    else if (likesCount < 0) {
      errors.push({
        field: 'likesCount',
        error: 'must be non-negative',
        received: likesCount,
      });
    }
  }

  // savesCount
  const savesCount = getValue<number>(input, 'savesCount', 'saves_count');
  if (savesCount !== undefined && savesCount !== null) {
    if (typeof savesCount !== 'number' || !Number.isFinite(savesCount)) {
      errors.push({
        field: 'savesCount',
        error: 'must be a number',
        received: savesCount,
      });
    }
    else if (savesCount < 0) {
      errors.push({
        field: 'savesCount',
        error: 'must be non-negative',
        received: savesCount,
      });
    }
  }

  // commentsCount
  const commentsCount = getValue<number>(input, 'commentsCount', 'comments_count');
  if (commentsCount !== undefined && commentsCount !== null) {
    if (typeof commentsCount !== 'number' || !Number.isFinite(commentsCount)) {
      errors.push({
        field: 'commentsCount',
        error: 'must be a number',
        received: commentsCount,
      });
    }
    else if (commentsCount < 0) {
      errors.push({
        field: 'commentsCount',
        error: 'must be non-negative',
        received: commentsCount,
      });
    }
  }

  // viewsCount
  const viewsCount = getValue<number>(input, 'viewsCount', 'views_count');
  if (viewsCount !== undefined && viewsCount !== null) {
    if (typeof viewsCount !== 'number' || !Number.isFinite(viewsCount)) {
      errors.push({
        field: 'viewsCount',
        error: 'must be a number',
        received: viewsCount,
      });
    }
    else if (viewsCount < 0) {
      errors.push({
        field: 'viewsCount',
        error: 'must be non-negative',
        received: viewsCount,
      });
    }
  }

  // qualityScore
  const qualityScore = getValue<number>(input, 'qualityScore', 'quality_score');
  if (qualityScore !== undefined && qualityScore !== null) {
    if (typeof qualityScore !== 'number' || !Number.isFinite(qualityScore)) {
      errors.push({
        field: 'qualityScore',
        error: 'must be a number',
        received: qualityScore,
      });
    }
    else if (qualityScore < 0 || qualityScore > 1) {
      errors.push({
        field: 'qualityScore',
        error: 'must be between 0 and 1',
        received: qualityScore,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate multiple guides at once
 *
 * @returns Validation results for all guides, with overall success flag
 */
export function validateGuides(inputs: GuideValidationInput[]): {
  valid: boolean;
  results: Array<{ index: number; result: ValidationResult }>;
  totalErrors: number;
} {
  const results = inputs.map((input, index) => ({
    index,
    result: validateGuide(input),
  }));

  const invalidResults = results.filter(r => !r.result.valid);

  return {
    valid: invalidResults.length === 0,
    results: invalidResults.length > 0 ? invalidResults : results,
    totalErrors: invalidResults.reduce((sum, r) => sum + r.result.errors.length, 0),
  };
}

/**
 * Check if content appears to be truncated
 */
export function isContentTruncated(content: string): boolean {
  return TRUNCATION_PATTERNS.some(pattern => pattern.test(content));
}

/**
 * Check if a platform value is valid
 */
export function isValidPlatform(platform: string): platform is GuidePlatform {
  return VALID_PLATFORMS.includes(platform as GuidePlatform);
}
