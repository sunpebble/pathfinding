/**
 * Crawler Index
 * Platform-specific crawler implementations with pluggable browser backends
 *
 * Supports multiple browser automation backends:
 * - Steel Browser (cloud-based, best anti-detection)
 * - Stagehand (AI-powered browser automation)
 * - MCP Client (legacy Chrome DevTools MCP)
 *
 * Configure via environment variables:
 * - USE_STEEL_BROWSER=true for Steel Browser
 * - USE_STAGEHAND_ONLY=true for Stagehand-only mode
 */

import { createLogger } from '../logger.js';
import { crawlCtrip } from './ctrip.js';
import { crawlMafengwo } from './mafengwo.js';
import { crawlQunar } from './qunar.js';
import { crawlQyer } from './qyer.js';
import { crawlTongcheng } from './tongcheng.js';
import { crawlXiaohongshu } from './xiaohongshu.js';

const log = createLogger('crawler');

export { createBrowserClient } from './clients/index.js';
export type {
  BrowserClient,
  NetworkRequest,
  PageSnapshot,
  SessionOptions,
} from './clients/types.js';

/**
 * Comment extracted from a post/note
 */
export interface CrawlComment {
  /** Comment unique ID from platform */
  commentId: string;
  /** Comment text content */
  content: string;
  /** Commenter's display name */
  authorName?: string;
  /** Commenter's avatar URL */
  authorAvatar?: string;
  /** Commenter's user ID */
  authorId?: string;
  /** Like count on this comment */
  likesCount?: number;
  /** Reply count on this comment */
  replyCount?: number;
  /** Comment publish time in ISO format */
  publishedAt?: string;
  /** Parent comment ID for replies */
  parentCommentId?: string;
  /** Whether this is from the post author */
  isAuthorReply?: boolean;
}

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
  /** Comments on this post (when fetchComments option is enabled) */
  comments?: CrawlComment[];
  /** Author's user ID (for user profile crawling) */
  authorId?: string;
}

export interface CrawlOptions {
  maxPages?: number;
  rateLimit?: number;
  /** Fetch full content from detail pages (slower but more complete) */
  fetchDetailContent?: boolean;
  /** Fetch comments for each post */
  fetchComments?: boolean;
  /** Maximum comments to fetch per post */
  maxCommentsPerPost?: number;
  /** Search query (for search mode) */
  searchQuery?: string;
  /** User ID to crawl (for user profile mode) */
  userId?: string;
}

type CrawlerFunction = (
  city: string,
  options: CrawlOptions,
) => Promise<CrawlResult[]>;

const crawlers: Record<string, CrawlerFunction> = {
  ctrip: crawlCtrip,
  mafengwo: crawlMafengwo,
  tongcheng: crawlTongcheng,
  qunar: crawlQunar,
  qyer: crawlQyer,
  xiaohongshu: crawlXiaohongshu,
};

/**
 * Crawl a specific platform for travel guides
 */
export async function crawlPlatform(
  platform: string,
  city: string,
  options: CrawlOptions = {},
): Promise<CrawlResult[]> {
  const crawler = crawlers[platform];

  if (!crawler) {
    log.warn({ platform }, 'No crawler implemented for platform');
    return [];
  }

  return crawler(city, options);
}

// Re-export platform crawlers for direct access
export { crawlCtrip } from './ctrip.js';

export { crawlMafengwo } from './mafengwo.js';
export { crawlQunar } from './qunar.js';
export { crawlTongcheng } from './tongcheng.js';
// Re-export Xiaohongshu-specific utilities
export {
  calculateXhsQualityScore,
  crawlXiaohongshu,
  detectPlaceholderContent,
  isContentQualityAcceptable,
} from './xiaohongshu.js';
