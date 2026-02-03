/**
 * Data Validators
 * Validation functions for travel guide data
 */

import type { CompletenessLevel, GuidePlatform } from './travel-guide.js';

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

// ============================================================================
// iOS Display Fields Validation
// ============================================================================

/**
 * Fields required for iOS App display
 */
export const IOS_REQUIRED_DISPLAY_FIELDS = [
  'title',
  'coverImageUrl',
  'authorName',
  'destinations',
  'likesCount',
  'savesCount',
  'commentsCount',
  'viewsCount',
  'qualityScore',
] as const;

export type IosDisplayField = (typeof IOS_REQUIRED_DISPLAY_FIELDS)[number];

/**
 * Result of iOS display field validation
 */
export interface DisplayFieldValidationResult {
  isValid: boolean;
  missingFields: IosDisplayField[];
}

/**
 * Input for display field validation
 */
export interface DisplayFieldInput {
  title?: string;
  coverImageUrl?: string;
  authorName?: string;
  destinations?: string[];
  imageUrls?: string[];
  likesCount?: number;
  savesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  qualityScore?: number;
  [key: string]: unknown;
}

/**
 * Validates whether a guide has all required iOS display fields populated
 *
 * @example
 * const result = validateDisplayFields({
 *   title: 'My Guide',
 *   coverImageUrl: 'https://example.com/img.jpg',
 *   authorName: 'Author',
 *   destinations: ['Beijing'],
 *   likesCount: 10,
 *   savesCount: 5,
 *   commentsCount: 3,
 *   viewsCount: 100,
 *   qualityScore: 0.8,
 * });
 *
 * if (!result.isValid) {
 *   console.log('Missing fields:', result.missingFields);
 * }
 */
export function validateDisplayFields(guide: DisplayFieldInput): DisplayFieldValidationResult {
  const missingFields: IosDisplayField[] = [];

  // Check title
  if (!guide.title || (typeof guide.title === 'string' && guide.title.trim() === '')) {
    missingFields.push('title');
  }

  // Check coverImageUrl - also check imageUrls as fallback source
  if (!guide.coverImageUrl && (!guide.imageUrls || guide.imageUrls.length === 0)) {
    missingFields.push('coverImageUrl');
  }

  // Check authorName
  if (!guide.authorName || (typeof guide.authorName === 'string' && guide.authorName.trim() === '')) {
    missingFields.push('authorName');
  }

  // Check destinations (allowed to be empty, but must exist)
  if (!guide.destinations) {
    missingFields.push('destinations');
  }

  // Check count fields
  if (guide.likesCount === undefined || guide.likesCount === null) {
    missingFields.push('likesCount');
  }
  if (guide.savesCount === undefined || guide.savesCount === null) {
    missingFields.push('savesCount');
  }
  if (guide.commentsCount === undefined || guide.commentsCount === null) {
    missingFields.push('commentsCount');
  }
  if (guide.viewsCount === undefined || guide.viewsCount === null) {
    missingFields.push('viewsCount');
  }

  // Check qualityScore
  if (guide.qualityScore === undefined || guide.qualityScore === null) {
    missingFields.push('qualityScore');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
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

  const sourcePlatform = getValue<string>(input, 'sourcePlatform', 'source_platform');
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

  const sourceExternalId = getValue<string>(input, 'sourceExternalId', 'source_external_id');
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
    likesCount: getValue<number>(input, 'likesCount', 'likes_count'),
    savesCount: getValue<number>(input, 'savesCount', 'saves_count'),
    commentsCount: getValue<number>(input, 'commentsCount', 'comments_count'),
    viewsCount: getValue<number>(input, 'viewsCount', 'views_count'),
    qualityScore: getValue<number>(input, 'qualityScore', 'quality_score'),
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
