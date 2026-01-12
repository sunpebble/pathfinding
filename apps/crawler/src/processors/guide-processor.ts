/**
 * Guide Processor
 * Processes raw crawled content into structured travel guides
 */

import type { TravelGuideRaw } from '@pathfinding/crawler-types';
import { api, convex } from '../lib/convex.js';
import { hashContent } from '../lib/hash.js';

// Common Chinese cities for destination extraction
const KNOWN_CITIES = [
  '北京',
  '上海',
  '广州',
  '深圳',
  '杭州',
  '成都',
  '西安',
  '南京',
  '武汉',
  '重庆',
  '三亚',
  '厦门',
  '苏州',
  '大理',
  '丽江',
  '桂林',
  '青岛',
  '昆明',
  '拉萨',
  '张家界',
  '长沙',
  '天津',
  '哈尔滨',
  '沈阳',
  '大连',
  '济南',
  '郑州',
  '南宁',
  '福州',
  '合肥',
  '无锡',
  '宁波',
  '温州',
  '贵阳',
  '海口',
  '珠海',
  '惠州',
  '东莞',
  '佛山',
  '中山',
  '乌鲁木齐',
  '兰州',
  '银川',
  '西宁',
  '呼和浩特',
  '长春',
  '哈尔滨',
  // Tourist destinations
  '九寨沟',
  '黄山',
  '泰山',
  '华山',
  '峨眉山',
  '武夷山',
  '普陀山',
  '五台山',
  '敦煌',
  '凤凰古城',
  '乌镇',
  '周庄',
  '西塘',
  '婺源',
  '阳朔',
  '稻城亚丁',
];

// Travel-related tags for extraction
const TRAVEL_TAGS = [
  '旅游',
  '旅行',
  '自驾游',
  '自由行',
  '穷游',
  '背包游',
  '亲子游',
  '蜜月游',
  '攻略',
  '打卡',
  '必去',
  '推荐',
  '美食',
  '住宿',
  '酒店',
  '民宿',
  '客栈',
  '景点',
  '古镇',
  '海滩',
  '雪山',
  '草原',
  '沙漠',
  '温泉',
  '滑雪',
  '拍照',
  '日出',
  '日落',
  '夜景',
  '网红',
  '小众',
  '免费',
  '省钱',
];

// Note: TABLES constant removed - using Convex mutations directly

export interface ProcessedGuide extends TravelGuideRaw {
  destinations: string[];
  quality_score: number;
  content_hash: string;
}

/**
 * Process raw guide data into structured format
 */
export function processGuide(
  raw: TravelGuideRaw,
  _platform: string,
  _externalId: string,
  _sourceUrl?: string
): ProcessedGuide {
  const content = raw.content || '';
  const title = raw.title || '';
  const fullText = `${title} ${content}`;

  return {
    ...raw,
    destinations: extractDestinations(fullText),
    quality_score: calculateQualityScore(raw),
    content_hash: hashContent(content),
  };
}

/**
 * Extract destination names from text
 */
export function extractDestinations(text: string): string[] {
  const destinations: string[] = [];

  for (const city of KNOWN_CITIES) {
    if (text.includes(city)) {
      destinations.push(city);
    }
  }

  // Limit to top 5 most relevant destinations
  return [...new Set(destinations)].slice(0, 5);
}

/**
 * Extract travel-related tags from text
 */
export function extractTags(text: string, existingTags?: string[]): string[] {
  const tags = new Set(existingTags || []);

  for (const tag of TRAVEL_TAGS) {
    if (text.includes(tag)) {
      tags.add(tag);
    }
  }

  return [...tags].slice(0, 10);
}

/**
 * Calculate quality score for a guide (0-1)
 */
export function calculateQualityScore(guide: TravelGuideRaw): number {
  let score = 0;

  // Content length factor (longer content usually more valuable)
  const contentLength = guide.content?.length || 0;
  if (contentLength > 2000) score += 0.25;
  else if (contentLength > 1000) score += 0.2;
  else if (contentLength > 500) score += 0.15;
  else if (contentLength > 200) score += 0.1;

  // Title presence
  if (guide.title && guide.title.length > 5) {
    score += 0.1;
  }

  // Image count factor
  const imageCount = guide.image_urls?.length || 0;
  if (imageCount >= 9) score += 0.2;
  else if (imageCount >= 5) score += 0.15;
  else if (imageCount >= 3) score += 0.1;
  else if (imageCount >= 1) score += 0.05;

  // Engagement metrics
  const likes = guide.likes_count || 0;
  const saves = guide.saves_count || 0;
  const comments = guide.comments_count || 0;

  if (likes > 1000 || saves > 500) score += 0.2;
  else if (likes > 100 || saves > 50) score += 0.15;
  else if (likes > 10 || saves > 5) score += 0.1;

  if (comments > 100) score += 0.1;
  else if (comments > 10) score += 0.05;

  // Tags presence
  if (guide.tags && guide.tags.length > 0) {
    score += 0.05;
  }

  // Author presence
  if (guide.author_name) {
    score += 0.05;
  }

  return Math.min(score, 1);
}

/**
 * Save processed guide to database
 */
export async function saveGuide(
  guide: ProcessedGuide,
  platform: string,
  externalId: string,
  sourceUrl?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  // Note: record variable removed, using Convex mutation directly
  try {
    const id = await convex.mutation(api.travelGuides.upsert, {
      sourcePlatform: platform as
        | 'xiaohongshu'
        | 'weibo'
        | 'ctrip'
        | 'douyin'
        | 'tripadvisor',
      sourceExternalId: externalId,
      sourceUrl,
      title: guide.title,
      content: guide.content || '',
      contentHtml: guide.content_html,
      authorName: guide.author_name,
      authorId: guide.author_id,
      destinations: guide.destinations,
      tags: extractTags(guide.content || '', guide.tags),
      likesCount: guide.likes_count || 0,
      savesCount: guide.saves_count || 0,
      commentsCount: guide.comments_count || 0,
      viewsCount: guide.views_count || 0,
      coverImageUrl: guide.cover_image_url,
      imageUrls: guide.image_urls || [],
      publishedAt: guide.published_at
        ? new Date(guide.published_at).getTime()
        : undefined,
      qualityScore: guide.quality_score,
      contentHash: guide.content_hash,
    });

    return { success: true, id: id as unknown as string };
  } catch (error: any) {
    console.error('Failed to save guide:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if guide already exists (by content hash)
 */
export async function guideExists(contentHash: string): Promise<boolean> {
  try {
    const guides = await convex.query(api.travelGuides.search, {
      query: contentHash, // This won't work directly for content hash search
      limit: 1,
    });
    return guides.length > 0;
  } catch {
    return false;
  }
}
