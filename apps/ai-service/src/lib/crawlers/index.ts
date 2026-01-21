/**
 * Crawler Index
 * Platform-specific crawler implementations
 */

import { crawlCtrip } from './ctrip.js';
import { crawlMafengwo } from './mafengwo.js';
import { crawlQunar } from './qunar.js';
import { crawlTongcheng } from './tongcheng.js';
import { crawlXiaohongshu } from './xiaohongshu.js';

export interface CrawlResult {
  sourceExternalId: string;
  sourceUrl?: string;
  title?: string;
  content: string;
  authorName?: string;
  coverImageUrl?: string;
  imageUrls?: string[];
  destinations?: string[];
  tags?: string[];
  likesCount?: number;
  savesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  qualityScore?: number;
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
