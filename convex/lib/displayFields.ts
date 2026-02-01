/**
 * iOS Display Fields - Constants, validation, and auto-fill functions
 *
 * Ensures all travel guides have the required fields for iOS App display.
 */

import type { Doc } from '../_generated/dataModel';

// ============================================
// Constants
// ============================================

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
 * Platform-specific default cover images
 */
export const PLATFORM_DEFAULT_IMAGES: Record<string, string> = {
  xiaohongshu: 'https://cdn.pathfinding.ai/defaults/cover-xiaohongshu.jpg',
  weibo: 'https://cdn.pathfinding.ai/defaults/cover-weibo.jpg',
  ctrip: 'https://cdn.pathfinding.ai/defaults/cover-ctrip.jpg',
  douyin: 'https://cdn.pathfinding.ai/defaults/cover-douyin.jpg',
  tripadvisor: 'https://cdn.pathfinding.ai/defaults/cover-tripadvisor.jpg',
  qunar: 'https://cdn.pathfinding.ai/defaults/cover-qunar.jpg',
  tongcheng: 'https://cdn.pathfinding.ai/defaults/cover-tongcheng.jpg',
  mafengwo: 'https://cdn.pathfinding.ai/defaults/cover-mafengwo.jpg',
  qyer: 'https://cdn.pathfinding.ai/defaults/cover-qyer.jpg',
  default: 'https://cdn.pathfinding.ai/defaults/cover-default.jpg',
};

// ============================================
// Types
// ============================================

export interface DisplayFieldValidationResult {
  isValid: boolean;
  missingFields: IosDisplayField[];
}

/**
 * Partial guide type for validation/fill operations
 */
export type PartialGuide = Partial<Doc<'travelGuides'>> & {
  sourcePlatform?: string;
  content?: string;
  imageUrls?: string[];
};

/**
 * Guide with guaranteed display fields
 */
export type GuideWithDisplayFields = Doc<'travelGuides'> & {
  title: string;
  coverImageUrl: string;
  authorName: string;
  destinations: string[];
  likesCount: number;
  savesCount: number;
  commentsCount: number;
  viewsCount: number;
  qualityScore: number;
};

// ============================================
// Validation
// ============================================

/**
 * Validates whether a guide has all required display fields populated
 */
export function validateDisplayFields(guide: PartialGuide): DisplayFieldValidationResult {
  const missingFields: IosDisplayField[] = [];

  // Check title
  if (!guide.title || guide.title.trim() === '') {
    missingFields.push('title');
  }

  // Check coverImageUrl - also check imageUrls as fallback source
  if (!guide.coverImageUrl && (!guide.imageUrls || guide.imageUrls.length === 0)) {
    missingFields.push('coverImageUrl');
  }

  // Check authorName
  if (!guide.authorName || guide.authorName.trim() === '') {
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

// ============================================
// Auto-Fill
// ============================================

/**
 * Generates a title from content (first 30 chars + "...")
 */
function generateTitleFromContent(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= 30) {
    return trimmed;
  }
  return `${trimmed.slice(0, 30)}...`;
}

/**
 * Gets the default cover image URL for a platform
 */
function getDefaultCoverImage(platform?: string): string {
  if (platform && PLATFORM_DEFAULT_IMAGES[platform]) {
    return PLATFORM_DEFAULT_IMAGES[platform];
  }
  return PLATFORM_DEFAULT_IMAGES.default;
}

/**
 * Fills missing display fields with reasonable defaults
 * Does NOT overwrite existing non-empty values
 */
export function fillMissingDisplayFields<T extends PartialGuide>(guide: T): T & {
  title: string;
  coverImageUrl: string;
  authorName: string;
  destinations: string[];
  likesCount: number;
  savesCount: number;
  commentsCount: number;
  viewsCount: number;
  qualityScore: number;
} {
  const result = { ...guide };

  // Fill title
  if (!result.title || result.title.trim() === '') {
    if (result.content && result.content.trim() !== '') {
      result.title = generateTitleFromContent(result.content);
    }
    else {
      result.title = '无标题攻略';
    }
  }

  // Fill coverImageUrl
  if (!result.coverImageUrl) {
    if (result.imageUrls && result.imageUrls.length > 0) {
      result.coverImageUrl = result.imageUrls[0];
    }
    else {
      result.coverImageUrl = getDefaultCoverImage(result.sourcePlatform);
    }
  }

  // Fill authorName
  if (!result.authorName || result.authorName.trim() === '') {
    result.authorName = '匿名用户';
  }

  // Fill destinations (ensure array exists)
  if (!result.destinations) {
    result.destinations = [];
  }

  // Fill count fields
  if (result.likesCount === undefined || result.likesCount === null) {
    result.likesCount = 0;
  }
  if (result.savesCount === undefined || result.savesCount === null) {
    result.savesCount = 0;
  }
  if (result.commentsCount === undefined || result.commentsCount === null) {
    result.commentsCount = 0;
  }
  if (result.viewsCount === undefined || result.viewsCount === null) {
    result.viewsCount = 0;
  }

  // Fill qualityScore
  if (result.qualityScore === undefined || result.qualityScore === null) {
    result.qualityScore = 0.5;
  }

  return result as T & {
    title: string;
    coverImageUrl: string;
    authorName: string;
    destinations: string[];
    likesCount: number;
    savesCount: number;
    commentsCount: number;
    viewsCount: number;
    qualityScore: number;
  };
}

// ============================================
// Query-Time Guarantee
// ============================================

/**
 * Ensures a guide has all display fields populated (for query results)
 * This is a read-only operation - it returns a new object with filled fields
 */
export function ensureDisplayFields(guide: Doc<'travelGuides'>): GuideWithDisplayFields {
  return fillMissingDisplayFields(guide) as GuideWithDisplayFields;
}

/**
 * Ensures multiple guides have all display fields populated
 */
export function ensureDisplayFieldsMany(guides: Doc<'travelGuides'>[]): GuideWithDisplayFields[] {
  return guides.map(ensureDisplayFields);
}
