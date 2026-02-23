/**
 * 马蜂窝数据转换模块
 * 将爬取的原始数据转换为 TravelGuide 格式
 */

import { cleanContent } from '@pathfinding/crawler-types';

/**
 * 数据完整度级别
 */
export type CompletenessLevel = 'complete' | 'usable' | 'incomplete';

/**
 * 爬取的原始游记数据
 */
export interface MafengwoRawGuide {
  title: string;
  content: string;
  author?: string;
  views?: string;
  likes?: string;
  coverImage?: string;
  images: string[];
  publishedAt?: string;
}

/**
 * 转换后的游记数据（用于 Convex upsert）
 */
export interface MafengwoGuideForConvex {
  sourcePlatform: 'mafengwo';
  sourceExternalId: string;
  sourceUrl: string;
  title?: string;
  content: string;
  authorName?: string;
  destinations: string[];
  tags: string[];
  likesCount: number;
  savesCount: number;
  commentsCount: number;
  viewsCount: number;
  coverImageUrl?: string;
  imageUrls: string[];
  qualityScore: number;
  completenessLevel: CompletenessLevel;
  crawledAt: number;
}

/**
 * 从 URL 提取 sourceExternalId
 * 例如: https://m.mafengwo.cn/i/24648165.html -> 24648165
 */
export function extractSourceExternalId(url: string): string {
  const match = url.match(/\/i\/(\d+)\.html/);
  if (match) {
    return match[1];
  }
  // 备用: 尝试其他格式
  const altMatch = url.match(/\/(\d{7,})/);
  if (altMatch) {
    return altMatch[1];
  }
  throw new Error(`Cannot extract external ID from URL: ${url}`);
}

/**
 * 将中文数字格式转换为数字
 * 例如: "1.2万" -> 12000, "3.5k" -> 3500
 */
export function parseChineseNumber(str: string | undefined): number {
  if (!str)
    return 0;

  const cleaned = str.trim();

  // 匹配数字和单位
  const match = cleaned.match(/^([\d.]+)\s*([万k])?/i);
  if (!match)
    return 0;

  const num = Number.parseFloat(match[1]);
  const unit = match[2]?.toLowerCase();

  if (unit === '万') {
    return Math.round(num * 10000);
  }
  if (unit === 'k') {
    return Math.round(num * 1000);
  }

  return Math.round(num);
}

/**
 * 计算数据质量分数 (0-1)
 */
export function calculateQualityScore(data: MafengwoRawGuide): number {
  let score = 0;

  // 标题存在且有意义 (20%)
  if (data.title && data.title.length >= 5) {
    score += 0.2;
  }

  // 内容长度 (40%)
  const contentLength = data.content?.length || 0;
  if (contentLength >= 500) {
    score += 0.4;
  }
  else if (contentLength >= 200) {
    score += 0.3;
  }
  else if (contentLength >= 100) {
    score += 0.2;
  }

  // 作者信息 (10%)
  if (data.author) {
    score += 0.1;
  }

  // 图片 (20%)
  const imageCount = data.images?.length || 0;
  if (imageCount >= 5) {
    score += 0.2;
  }
  else if (imageCount >= 1) {
    score += 0.1;
  }

  // 互动数据 (10%)
  if (data.views || data.likes) {
    score += 0.1;
  }

  return Math.min(1, Math.round(score * 100) / 100);
}

/**
 * 判断数据完整度级别
 */
export function determineCompletenessLevel(
  data: MafengwoRawGuide,
  qualityScore: number,
): CompletenessLevel {
  const contentLength = data.content?.length || 0;
  const hasTitle = Boolean(data.title && data.title.length >= 3);
  const hasImages = (data.images?.length || 0) >= 1;
  const hasAuthor = Boolean(data.author);

  // complete: 所有 iOS 必需字段, content >= 500
  if (
    hasTitle
    && contentLength >= 500
    && hasImages
    && hasAuthor
    && qualityScore >= 0.8
  ) {
    return 'complete';
  }

  // usable: 有标题 + 内容 + 至少一张图
  if (hasTitle && contentLength >= 100 && hasImages) {
    return 'usable';
  }

  // incomplete: 缺少关键字段
  return 'incomplete';
}

/**
 * 将爬取数据转换为 Convex 存储格式
 * 在转换过程中自动执行内容清洗
 */
export function convertToConvexFormat(
  url: string,
  rawData: MafengwoRawGuide,
): MafengwoGuideForConvex {
  const sourceExternalId = extractSourceExternalId(url);

  // 清洗内容：去除广告、推广、个人信息、平台噪音
  const cleanResult = cleanContent(rawData.content || '', {
    categories: [
      'ad',
      'promotion',
      'personal',
      'platform',
      'copyright',
      'boilerplate',
      'whitespace',
    ],
    preserveParagraphs: true,
  });
  const cleanedContent = cleanResult.content;

  // 使用清洗后的内容计算质量分数
  const cleanedRawData = { ...rawData, content: cleanedContent };
  const qualityScore = calculateQualityScore(cleanedRawData);
  const completenessLevel = determineCompletenessLevel(
    cleanedRawData,
    qualityScore,
  );

  return {
    sourcePlatform: 'mafengwo',
    sourceExternalId,
    sourceUrl: url,
    title: rawData.title || undefined,
    content: cleanedContent,
    authorName: rawData.author || undefined,
    destinations: [], // 需要后续 AI 提取
    tags: [], // 需要后续 AI 提取
    likesCount: parseChineseNumber(rawData.likes),
    savesCount: 0, // 马蜂窝没有收藏数
    commentsCount: 0, // 需要额外爬取
    viewsCount: parseChineseNumber(rawData.views),
    coverImageUrl: rawData.coverImage || rawData.images?.[0],
    imageUrls: rawData.images || [],
    qualityScore,
    completenessLevel,
    crawledAt: Date.now(),
  };
}
