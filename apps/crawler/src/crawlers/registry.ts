/**
 * Crawler Registry
 * Central registry for all available crawlers
 */

import type { CrawlJob, CrawlJobStatistics } from '@pathfinding/crawler-types';
import { AmapCrawler } from './amap.crawler.js';
import { BaseGuideCrawler } from './base-guide.crawler.js';
import { BaseCrawler } from './base.crawler.js';
import { CtripCrawler } from './ctrip.crawler.js';
import { DouyinCrawler } from './douyin.crawler.js';
import { OSMCrawler } from './osm.crawler.js';
import { WeiboCrawler } from './weibo.crawler.js';
import { XiaohongshuCrawler } from './xiaohongshu.crawler.js';

// Common interface for all crawlers
interface Runnable {
  run: () => Promise<CrawlJobStatistics>;
  cancel: () => void;
}

export type CrawlerConstructor = new (job: CrawlJob) => Runnable;

/**
 * Registry of available crawlers by platform
 */
const crawlerRegistry: Map<string, CrawlerConstructor> = new Map();

/**
 * Register a crawler for a platform
 */
export function registerCrawler(
  platform: string,
  constructor: CrawlerConstructor
): void {
  crawlerRegistry.set(platform.toLowerCase(), constructor);
}

/**
 * Get a crawler instance for a platform
 */
export function getCrawler(job: CrawlJob): Runnable {
  const platform = job.platform.toLowerCase();
  const Constructor = crawlerRegistry.get(platform);

  if (!Constructor) {
    throw new Error(`No crawler registered for platform: ${platform}`);
  }

  return new Constructor(job);
}

/**
 * Get list of supported platforms
 */
export function getSupportedPlatforms(): string[] {
  return Array.from(crawlerRegistry.keys());
}

/**
 * Check if a platform is supported
 */
export function isPlatformSupported(platform: string): boolean {
  return crawlerRegistry.has(platform.toLowerCase());
}

// Register built-in POI crawlers
registerCrawler('osm', OSMCrawler);
registerCrawler('openstreetmap', OSMCrawler);
registerCrawler('amap', AmapCrawler);
registerCrawler('gaode', AmapCrawler);

// Register travel guide crawlers
registerCrawler('xiaohongshu', XiaohongshuCrawler);
registerCrawler('xhs', XiaohongshuCrawler);
registerCrawler('weibo', WeiboCrawler);
registerCrawler('ctrip', CtripCrawler);
registerCrawler('xiecheng', CtripCrawler);
registerCrawler('douyin', DouyinCrawler);

export {
  AmapCrawler,
  BaseCrawler,
  BaseGuideCrawler,
  CtripCrawler,
  DouyinCrawler,
  OSMCrawler,
  WeiboCrawler,
  XiaohongshuCrawler,
};
