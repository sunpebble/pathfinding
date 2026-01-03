/**
 * Crawler Registry
 * Central registry for all available crawlers
 */

import type { CrawlJob } from '@pathfinding/crawler-types';
import { AmapCrawler } from './amap.crawler.js';
import { BaseCrawler } from './base.crawler.js';
import { OSMCrawler } from './osm.crawler.js';

export type CrawlerConstructor = new (job: CrawlJob) => BaseCrawler;

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
export function getCrawler(job: CrawlJob): BaseCrawler {
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

// Register built-in crawlers
registerCrawler('osm', OSMCrawler);
registerCrawler('openstreetmap', OSMCrawler);
registerCrawler('amap', AmapCrawler);
registerCrawler('gaode', AmapCrawler);

export { AmapCrawler, BaseCrawler, OSMCrawler };
