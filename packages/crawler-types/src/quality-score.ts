/**
 * Quality Score Module
 * 统一的数据质量评分逻辑，供所有爬虫和数据处理管线使用
 */

// ============================================================================
// Types
// ============================================================================

export interface QualityScoreInput {
  title?: string;
  content?: string;
  authorName?: string;
  images?: string[];
  coverImage?: string;
  views?: number;
  likes?: number;
  saves?: number;
  comments?: number;
  rating?: number;
  destinations?: string[];
  tags?: string[];
}

export interface QualityScoreResult {
  /** 总分 0-1 */
  score: number;
  /** 各维度得分明细 */
  breakdown: QualityBreakdown;
  /** 建议改进项 */
  suggestions: string[];
}

export interface QualityBreakdown {
  /** 标题得分 (0-0.15) */
  title: number;
  /** 内容得分 (0-0.35) */
  content: number;
  /** 作者得分 (0-0.05) */
  author: number;
  /** 图片得分 (0-0.15) */
  images: number;
  /** 互动数据得分 (0-0.15) */
  engagement: number;
  /** 元数据得分 (0-0.15) */
  metadata: number;
}

// ============================================================================
// Constants
// ============================================================================

/** 各维度权重 */
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
 * 计算数据质量分数（统一版）
 *
 * 评分维度及权重：
 * - 标题 (15%): 存在、长度、可读性
 * - 内容 (35%): 长度、丰富度
 * - 作者 (5%): 是否有作者信息
 * - 图片 (15%): 数量、封面图
 * - 互动 (15%): 浏览量/点赞/收藏/评论
 * - 元数据 (15%): 目的地/标签
 *
 * @example
 * const result = calculateQualityScoreUnified({
 *   title: '北京三日游攻略',
 *   content: '详细内容...',
 *   images: ['url1', 'url2'],
 *   views: 1000,
 *   likes: 50,
 * });
 * // result.score === 0.72
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

  // === 标题评分 ===
  if (input.title && input.title.trim().length > 0) {
    const titleLen = input.title.trim().length;
    if (titleLen >= 10) {
      breakdown.title = WEIGHTS.title; // 完整标题
    }
    else if (titleLen >= 5) {
      breakdown.title = WEIGHTS.title * 0.7; // 短标题
    }
    else {
      breakdown.title = WEIGHTS.title * 0.3; // 很短的标题
      suggestions.push('标题过短，建议至少10个字');
    }
  }
  else {
    suggestions.push('缺少标题');
  }

  // === 内容评分 ===
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

  // === 作者评分 ===
  if (input.authorName && input.authorName.trim().length > 0) {
    breakdown.author = WEIGHTS.author;
  }
  else {
    suggestions.push('缺少作者信息');
  }

  // === 图片评分 ===
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

  // === 互动数据评分 ===
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

  // 高互动额外加分
  if ((input.likes ?? 0) >= 100 || (input.views ?? 0) >= 10000) {
    breakdown.engagement = Math.min(WEIGHTS.engagement, breakdown.engagement * 1.2);
  }

  // === 元数据评分 ===
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

  // === 总分 ===
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
