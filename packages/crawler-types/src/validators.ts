/**
 * Data Validators
 * Validation functions for travel guide data
 */

import type { CompletenessLevel, GuidePlatform } from './travel-guide.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Guide data for validation (camelCase).
 */
export interface GuideValidationInput {
  // Required fields
  sourcePlatform?: string;
  sourceExternalId?: string;
  content?: string;
  destinations?: string[];

  // Optional numeric fields
  likesCount?: number;
  savesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  qualityScore?: number;

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
 * Minimum content length for basic validation
 */
export const MIN_CONTENT_LENGTH = 200;

/**
 * Minimum content length for "complete" level
 */
export const MIN_CONTENT_LENGTH_COMPLETE = 500;

/**
 * Maximum title length before truncation
 */
export const MAX_TITLE_LENGTH = 100;

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
 * Check if content appears to be truncated
 */
export function isContentTruncated(content: string): boolean {
  return TRUNCATION_PATTERNS.some(pattern => pattern.test(content));
}

// ============================================================================
// Completeness Level Calculation
// ============================================================================

/**
 * Input for completeness level calculation
 */
export interface CompletenessInput {
  title?: string;
  content?: string;
  coverImageUrl?: string;
  imageUrls?: string[];
  authorName?: string;
  destinations?: string[];
  contentTruncated?: boolean;
  likesCount?: number;
  savesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  qualityScore?: number;
}

/**
 * Calculate the completeness level of a travel guide
 *
 * Levels:
 * - complete: All iOS required fields present, content >= 500 chars, no truncation
 * - usable: Has title + content >= 200 + at least one image
 * - incomplete: Missing critical fields or truncated content
 *
 * @example
 * const level = calculateCompletenessLevel({
 *   title: 'My Guide',
 *   content: 'Long content here...',
 *   coverImageUrl: 'https://example.com/img.jpg',
 *   authorName: 'Author',
 *   destinations: ['Beijing'],
 *   likesCount: 10,
 *   savesCount: 5,
 *   commentsCount: 3,
 *   viewsCount: 100,
 *   qualityScore: 0.8,
 * });
 * // Returns: 'complete'
 */
export function calculateCompletenessLevel(input: CompletenessInput): CompletenessLevel {
  const {
    title,
    content,
    coverImageUrl,
    imageUrls,
    authorName,
    destinations,
    contentTruncated,
    likesCount,
    savesCount,
    commentsCount,
    viewsCount,
    qualityScore,
  } = input;

  // Check if content is truncated
  const isTruncated = contentTruncated || (content ? isContentTruncated(content) : false);

  // Check for images
  const hasImages = !!(coverImageUrl || (imageUrls && imageUrls.length > 0));

  // Check title
  const hasTitle = !!(title && title.trim().length > 0);

  // Check author
  const hasAuthor = !!(authorName && authorName.trim().length > 0);

  // Check destinations
  const hasDestinations = !!(destinations && destinations.length > 0);

  // Check content length
  const contentLength = content?.length ?? 0;

  // Check numeric fields
  const hasAllCounts
    = likesCount !== undefined
      && likesCount !== null
      && savesCount !== undefined
      && savesCount !== null
      && commentsCount !== undefined
      && commentsCount !== null
      && viewsCount !== undefined
      && viewsCount !== null;

  const hasQualityScore = qualityScore !== undefined && qualityScore !== null;

  // Complete level: All iOS required fields, content >= 500, no truncation
  if (
    hasTitle
    && hasImages
    && hasAuthor
    && hasDestinations
    && hasAllCounts
    && hasQualityScore
    && contentLength >= MIN_CONTENT_LENGTH_COMPLETE
    && !isTruncated
  ) {
    return 'complete';
  }

  // Usable level: Has title + content >= 200 + at least one image
  if (hasTitle && contentLength >= MIN_CONTENT_LENGTH && hasImages) {
    return 'usable';
  }

  // Incomplete: Missing critical fields or truncated
  return 'incomplete';
}

// ============================================================================
// Title Validation
// ============================================================================

/**
 * Result of title validation
 */
export interface TitleValidationResult {
  title: string | undefined;
  titleTruncated: boolean;
  warning?: string;
}

/**
 * Validate and normalize title
 * - Missing title: returns undefined with warning
 * - Too long: truncates to MAX_TITLE_LENGTH with titleTruncated flag
 *
 * @example
 * const result = validateTitle('Very long title...');
 * // { title: 'Very long title...', titleTruncated: false }
 */
export function validateTitle(title: string | undefined | null): TitleValidationResult {
  if (!title || title.trim().length === 0) {
    return {
      title: undefined,
      titleTruncated: false,
      warning: 'Title is missing - completeness level will be degraded',
    };
  }

  const trimmed = title.trim();

  if (trimmed.length > MAX_TITLE_LENGTH) {
    return {
      title: trimmed.slice(0, MAX_TITLE_LENGTH),
      titleTruncated: true,
      warning: `Title truncated from ${trimmed.length} to ${MAX_TITLE_LENGTH} characters`,
    };
  }

  return {
    title: trimmed,
    titleTruncated: false,
  };
}

// ============================================================================
// Image Validation
// ============================================================================

/**
 * Result of image validation
 */
export interface ImageValidationResult {
  coverImageUrl: string | undefined;
  imageUrls: string[];
  hasImages: boolean;
  warning?: string;
}

/**
 * Validate and normalize image fields
 * - No images: returns warning, hasImages = false
 * - coverImageUrl missing but imageUrls has items: auto-fills from imageUrls[0]
 *
 * @example
 * const result = validateImages(undefined, ['https://example.com/1.jpg']);
 * // { coverImageUrl: 'https://example.com/1.jpg', imageUrls: [...], hasImages: true }
 */
export function validateImages(
  coverImageUrl: string | undefined | null,
  imageUrls: string[] | undefined | null,
): ImageValidationResult {
  const urls = imageUrls?.filter(url => url && url.trim().length > 0) ?? [];

  // No images at all
  if (!coverImageUrl && urls.length === 0) {
    return {
      coverImageUrl: undefined,
      imageUrls: [],
      hasImages: false,
      warning: 'No images provided - completeness level will be degraded',
    };
  }

  // Auto-fill coverImageUrl from imageUrls[0] if missing
  const effectiveCoverUrl = coverImageUrl?.trim() || urls[0] || undefined;

  return {
    coverImageUrl: effectiveCoverUrl,
    imageUrls: urls,
    hasImages: true,
  };
}

// ============================================================================
// Author Validation
// ============================================================================

/**
 * Result of author validation
 */
export interface AuthorValidationResult {
  authorName: string | undefined;
  warning?: string;
}

/**
 * Validate author field
 * - Missing author: returns warning
 *
 * @example
 * const result = validateAuthor('');
 * // { authorName: undefined, warning: 'Author is missing...' }
 */
export function validateAuthor(authorName: string | undefined | null): AuthorValidationResult {
  if (!authorName || authorName.trim().length === 0) {
    return {
      authorName: undefined,
      warning: 'Author is missing - completeness level will be degraded',
    };
  }

  return {
    authorName: authorName.trim(),
  };
}

// ============================================================================
// Enhanced Validation with Severity Levels
// ============================================================================

/**
 * Validation severity level
 * - error: Blocks data insertion, must be fixed
 * - warning: Allows insertion but degrades completeness level
 */
export type ValidationSeverity = 'error' | 'warning';

/**
 * Enhanced validation issue with severity
 */
export interface ValidationIssue {
  field: string;
  message: string;
  severity: ValidationSeverity;
  received?: unknown;
}

/**
 * Enhanced validation result with severity levels
 */
export interface EnhancedValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  completenessLevel: CompletenessLevel;
  normalizedData: {
    title?: string;
    titleTruncated?: boolean;
    coverImageUrl?: string;
    imageUrls?: string[];
    authorName?: string;
    contentTruncated?: boolean;
  };
}

/**
 * Validate guide with enhanced severity levels
 *
 * Error-level (blocks insertion):
 * - Missing sourcePlatform, sourceExternalId, content, destinations
 *
 * Warning-level (allows insertion, degrades completeness):
 * - Missing title, coverImageUrl, authorName
 * - Content truncated
 * - Content too short
 *
 * @example
 * const result = validateGuideEnhanced({
 *   sourcePlatform: 'xiaohongshu',
 *   sourceExternalId: '123',
 *   content: 'Short content',
 *   destinations: ['Beijing'],
 * });
 *
 * if (!result.valid) {
 *   // Handle errors - cannot insert
 * } else if (result.warnings.length > 0) {
 *   // Insert with warnings, completenessLevel will be degraded
 * }
 */
export function validateGuideEnhanced(input: GuideValidationInput): EnhancedValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // === ERROR-LEVEL: Required fields (blocks insertion) ===

  const sourcePlatform = input.sourcePlatform;
  if (!sourcePlatform) {
    errors.push({
      field: 'sourcePlatform',
      message: 'required',
      severity: 'error',
      received: sourcePlatform,
    });
  }
  else if (!VALID_PLATFORMS.includes(sourcePlatform as GuidePlatform)) {
    errors.push({
      field: 'sourcePlatform',
      message: `must be one of: ${VALID_PLATFORMS.join(', ')}`,
      severity: 'error',
      received: sourcePlatform,
    });
  }

  const sourceExternalId = input.sourceExternalId;
  if (!sourceExternalId) {
    errors.push({
      field: 'sourceExternalId',
      message: 'required',
      severity: 'error',
      received: sourceExternalId,
    });
  }

  const content = input.content;
  if (!content) {
    errors.push({
      field: 'content',
      message: 'required',
      severity: 'error',
      received: content,
    });
  }
  else if (typeof content !== 'string') {
    errors.push({
      field: 'content',
      message: 'must be a string',
      severity: 'error',
      received: typeof content,
    });
  }

  const destinations = input.destinations;
  if (!destinations) {
    errors.push({
      field: 'destinations',
      message: 'required',
      severity: 'error',
      received: destinations,
    });
  }
  else if (!Array.isArray(destinations)) {
    errors.push({
      field: 'destinations',
      message: 'must be an array',
      severity: 'error',
      received: typeof destinations,
    });
  }
  else if (destinations.length === 0) {
    errors.push({
      field: 'destinations',
      message: 'must have at least one item',
      severity: 'error',
      received: destinations,
    });
  }

  // === WARNING-LEVEL: Optional fields (allows insertion, degrades completeness) ===

  // Title validation
  const titleResult = validateTitle(input.title as string | undefined);
  if (titleResult.warning) {
    warnings.push({
      field: 'title',
      message: titleResult.warning,
      severity: 'warning',
      received: input.title,
    });
  }

  // Image validation
  const imageResult = validateImages(
    input.coverImageUrl as string | undefined,
    input.imageUrls as string[] | undefined,
  );
  if (imageResult.warning) {
    warnings.push({
      field: 'coverImageUrl',
      message: imageResult.warning,
      severity: 'warning',
      received: { coverImageUrl: input.coverImageUrl, imageUrls: input.imageUrls },
    });
  }

  // Author validation
  const authorResult = validateAuthor(input.authorName as string | undefined);
  if (authorResult.warning) {
    warnings.push({
      field: 'authorName',
      message: authorResult.warning,
      severity: 'warning',
      received: input.authorName,
    });
  }

  // Content truncation detection (warning)
  let contentTruncated = false;
  if (typeof content === 'string' && isContentTruncated(content)) {
    contentTruncated = true;
    warnings.push({
      field: 'content',
      message: 'Content appears to be truncated - will trigger refetch',
      severity: 'warning',
    });
  }

  // Content length warning (not error - still insertable)
  if (typeof content === 'string' && content.length < MIN_CONTENT_LENGTH) {
    warnings.push({
      field: 'content',
      message: `Content length ${content.length} is below minimum ${MIN_CONTENT_LENGTH} characters`,
      severity: 'warning',
      received: content.length,
    });
  }

  // Calculate completeness level
  const completenessLevel = calculateCompletenessLevel({
    title: titleResult.title,
    content: typeof content === 'string' ? content : undefined,
    coverImageUrl: imageResult.coverImageUrl,
    imageUrls: imageResult.imageUrls,
    authorName: authorResult.authorName,
    destinations: Array.isArray(destinations) ? destinations : undefined,
    contentTruncated,
    likesCount: input.likesCount,
    savesCount: input.savesCount,
    commentsCount: input.commentsCount,
    viewsCount: input.viewsCount,
    qualityScore: input.qualityScore,
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    completenessLevel,
    normalizedData: {
      title: titleResult.title,
      titleTruncated: titleResult.titleTruncated,
      coverImageUrl: imageResult.coverImageUrl,
      imageUrls: imageResult.imageUrls,
      authorName: authorResult.authorName,
      contentTruncated,
    },
  };
}
