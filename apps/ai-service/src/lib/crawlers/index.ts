/**
 * Crawler Index
 * Platform-specific crawler implementations using Chrome DevTools MCP
 *
 * All crawlers use Chrome DevTools MCP for browser automation instead of Playwright.
 * This provides better anti-detection and supports text, image, and video content.
 */

import { crawlCtrip } from './ctrip.js';
import { crawlMafengwo } from './mafengwo.js';
import { crawlQunar } from './qunar.js';
import { crawlTongcheng } from './tongcheng.js';
import { crawlXiaohongshu } from './xiaohongshu.js';

/**
 * Content block representing text, image, or video content
 * Used to preserve the original content structure with rich media
 */
export interface ContentBlock {
  /** Type of content block */
  type: 'text' | 'image' | 'video';
  /** Text content (for type='text') */
  content?: string;
  /** Media URL (for type='image' or 'video') */
  url?: string;
  /** Thumbnail URL (for type='video') */
  thumbnailUrl?: string;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Duration in seconds (for type='video') */
  duration?: number;
  /** Alt text or caption */
  alt?: string;
}

export interface CrawlResult {
  sourceExternalId: string;
  sourceUrl?: string;
  title?: string;
  /** Plain text content (summary/fallback) */
  content: string;
  /** Rich content blocks with text, images, and videos */
  contentBlocks?: ContentBlock[];
  authorName?: string;
  authorAvatar?: string;
  coverImageUrl?: string;
  imageUrls?: string[];
  /** Video URLs extracted from the content */
  videoUrls?: string[];
  destinations?: string[];
  tags?: string[];
  likesCount?: number;
  savesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  /** Published date in ISO format (YYYY-MM-DD) */
  publishedAt?: string;
  qualityScore?: number;
  /** Content type: 'normal' for text+images, 'video' for video posts */
  contentType?: 'normal' | 'video';
  /**
   * Timestamp when video URLs were captured.
   * Video CDN URLs expire in ~30 seconds. This helps consumers know URL freshness.
   */
  videoUrlCapturedAt?: number;
}

export interface CrawlOptions {
  maxPages?: number;
  rateLimit?: number;
}

type CrawlerFunction = (
  city: string,
  options: CrawlOptions
) => Promise<CrawlResult[]>;

const crawlers: Record<string, CrawlerFunction> = {
  ctrip: crawlCtrip,
  mafengwo: crawlMafengwo,
  tongcheng: crawlTongcheng,
  qunar: crawlQunar,
  xiaohongshu: crawlXiaohongshu,
};

/**
 * Crawl a specific platform for travel guides
 */
export async function crawlPlatform(
  platform: string,
  city: string,
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const crawler = crawlers[platform];

  if (!crawler) {
    console.warn(`[Crawler] No crawler implemented for platform: ${platform}`);
    return [];
  }

  return crawler(city, options);
}
