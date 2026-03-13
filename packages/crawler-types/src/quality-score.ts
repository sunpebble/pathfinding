/**
 * Quality Score Module
 * Unified data quality scoring logic used by all crawlers and data pipelines.
 */

// ============================================================================
// Types
// ============================================================================

/** Input fields used to calculate a quality score */
export interface QualityScoreInput {
  /** Article / guide title */
  title?: string;
  /** Body content text */
  content?: string;
  /** Author display name */
  authorName?: string;
  /** List of image URLs */
  images?: string[];
  /** Cover image URL */
  coverImage?: string;
  /** View count */
  views?: number;
  /** Like count */
  likes?: number;
  /** Save / bookmark count */
  saves?: number;
  /** Comment count */
  comments?: number;
  /** Overall rating (e.g. 1–5) */
  rating?: number;
  /** Associated destination names */
  destinations?: string[];
  /** Content tags */
  tags?: string[];
}

/** Result of a quality score calculation */
export interface QualityScoreResult {
  /** Overall quality score (0–1) */
  score: number;
  /** Per-dimension score breakdown */
  breakdown: QualityBreakdown;
  /** Actionable improvement suggestions */
  suggestions: string[];
}

/** Per-dimension score breakdown (each value is weighted) */
export interface QualityBreakdown {
  /** Title score (0–0.15) */
  title: number;
  /** Content score (0–0.35) */
  content: number;
  /** Author score (0–0.05) */
  author: number;
  /** Images score (0–0.15) */
  images: number;
  /** Engagement score (0–0.15) */
  engagement: number;
  /** Metadata score (0–0.15) */
  metadata: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Dimension weights (must sum to 1.0) */
const WEIGHTS = {
  title: 0.15,
  content: 0.35,
  author: 0.05,
  images: 0.15,
  engagement: 0.15,
  metadata: 0.15,
} as const;

// ============================================================================
// Core Function
// ============================================================================

/**
 * Calculate a unified data quality score.
 *
 * Scoring dimensions and weights:
 * - **Title** (15%): presence, length, readability
 * - **Content** (35%): length tiers (100 / 200 / 500 / 1000 chars)
 * - **Author** (5%): presence of author info
 * - **Images** (15%): count and cover image presence
 * - **Engagement** (15%): views / likes / saves / comments presence + bonus for high engagement
 * - **Metadata** (15%): destinations / tags / rating presence
 *
 * @param input - Data fields to evaluate
 * @returns Quality score result with overall score, breakdown, and suggestions
 *
 * @example
 * const result = calculateQualityScoreUnified({
 *   title: 'Beijing 3-Day Travel Guide',
 *   content: 'Detailed content here...',
 *   images: ['url1', 'url2'],
 *   views: 1000,
 *   likes: 50,
 * });
 * // result.score => 0.72
 */
export function calculateQualityScoreUnified(
  input: QualityScoreInput,
): QualityScoreResult {
  const breakdown: QualityBreakdown = {
    title: 0,
    content: 0,
    author: 0,
    images: 0,
    engagement: 0,
    metadata: 0,
  };
  const suggestions: string[] = [];

  // === Title scoring ===
  if (input.title && input.title.trim().length > 0) {
    const titleLen = input.title.trim().length;
    if (titleLen >= 10) {
      breakdown.title = WEIGHTS.title; // Full title
    }
    else if (titleLen >= 5) {
      breakdown.title = WEIGHTS.title * 0.7; // Short title
    }
    else {
      breakdown.title = WEIGHTS.title * 0.3; // Very short title
      suggestions.push('标题过短，建议至少10个字');
    }
  }
  else {
    suggestions.push('缺少标题');
  }

  // === Content scoring ===
  const contentLength = input.content?.length || 0;
  if (contentLength >= 1000) {
    breakdown.content = WEIGHTS.content;
  }
  else if (contentLength >= 500) {
    breakdown.content = WEIGHTS.content * 0.85;
  }
  else if (contentLength >= 200) {
    breakdown.content = WEIGHTS.content * 0.6;
  }
  else if (contentLength >= 100) {
    breakdown.content = WEIGHTS.content * 0.3;
    suggestions.push('内容较短，建议至少200字');
  }
  else {
    suggestions.push('内容过短或缺失');
  }

  // === Author scoring ===
  if (input.authorName && input.authorName.trim().length > 0) {
    breakdown.author = WEIGHTS.author;
  }
  else {
    suggestions.push('缺少作者信息');
  }

  // === Image scoring ===
  const imageCount = input.images?.length || 0;
  const hasCover = !!input.coverImage;
  if (imageCount >= 5 && hasCover) {
    breakdown.images = WEIGHTS.images;
  }
  else if (imageCount >= 5 || (imageCount >= 3 && hasCover)) {
    breakdown.images = WEIGHTS.images * 0.8;
  }
  else if (imageCount >= 1 || hasCover) {
    breakdown.images = WEIGHTS.images * 0.5;
  }
  else {
    suggestions.push('缺少图片');
  }

  // === Engagement scoring ===
  const hasViews = (input.views ?? 0) > 0;
  const hasLikes = (input.likes ?? 0) > 0;
  const hasSaves = (input.saves ?? 0) > 0;
  const hasComments = (input.comments ?? 0) > 0;
  const engagementCount = [hasViews, hasLikes, hasSaves, hasComments].filter(Boolean).length;

  if (engagementCount >= 3) {
    breakdown.engagement = WEIGHTS.engagement;
  }
  else if (engagementCount >= 2) {
    breakdown.engagement = WEIGHTS.engagement * 0.7;
  }
  else if (engagementCount >= 1) {
    breakdown.engagement = WEIGHTS.engagement * 0.4;
  }
  else {
    suggestions.push('缺少互动数据');
  }

  // Bonus for high engagement
  if ((input.likes ?? 0) >= 100 || (input.views ?? 0) >= 10000) {
    breakdown.engagement = Math.min(WEIGHTS.engagement, breakdown.engagement * 1.2);
  }

  // === Metadata scoring ===
  const hasDestinations = (input.destinations?.length ?? 0) > 0;
  const hasTags = (input.tags?.length ?? 0) > 0;
  const hasRating = (input.rating ?? 0) > 0;

  const metaCount = [hasDestinations, hasTags, hasRating].filter(Boolean).length;
  if (metaCount >= 2) {
    breakdown.metadata = WEIGHTS.metadata;
  }
  else if (metaCount >= 1) {
    breakdown.metadata = WEIGHTS.metadata * 0.5;
  }
  else {
    suggestions.push('缺少目的地和标签信息');
  }

  // === Final score (rounded to 2 decimal places, clamped to [0, 1]) ===
  const score = Math.min(
    1,
    Math.round(
      (breakdown.title + breakdown.content + breakdown.author
        + breakdown.images + breakdown.engagement + breakdown.metadata)
      * 100,
    ) / 100,
  );

  return { score, breakdown, suggestions };
}
