/**
 * Douyin (抖音) Crawler
 * Crawls travel videos from Douyin using DOM-based extraction
 */

import type {
  CrawlJobConfig,
  TravelGuideRaw,
} from '@pathfinding/crawler-types';
import type { Page } from 'playwright';

import type { GuideExtractionResult } from './base-guide.crawler.js';
import { Request } from 'crawlee';
import { BaseGuideCrawler, sleep } from './base-guide.crawler.js';

/**
 * Douyin Crawler using DOM-based extraction
 * Note: Douyin has strong anti-bot measures. This crawler may need
 * proxy rotation and cookie management for production use.
 */
export class DouyinCrawler extends BaseGuideCrawler {
  private baseUrl = 'https://www.douyin.com';

  get platform(): string {
    return 'douyin';
  }

  generateRequests(config: CrawlJobConfig): Request[] {
    const requests: Request[] = [];
    const destinations = config.geographic_scope?.cities || [];
    const keywords = (config.filters?.keywords as string[]) || [];

    // Travel-related suffixes for Douyin
    const travelSuffixes = ['旅游攻略', '旅行vlog', '自由行', '旅拍'];

    // Generate search queries
    const searchQueries: string[] = [];

    for (const dest of destinations) {
      for (const suffix of travelSuffixes) {
        searchQueries.push(`${dest}${suffix}`);
      }
    }

    searchQueries.push(...keywords);

    // Limit queries
    const maxQueries = Math.min(searchQueries.length, 10);

    for (let i = 0; i < maxQueries; i++) {
      const query = searchQueries[i];
      requests.push(
        new Request({
          url: `${this.baseUrl}/search/${encodeURIComponent(query)}?type=video`,
          userData: {
            query,
            page: 1,
          },
        })
      );
    }

    return requests;
  }

  async extractFromPage(
    page: Page,
    url: string
  ): Promise<GuideExtractionResult> {
    const guides: TravelGuideRaw[] = [];

    // Wait for dynamic content to load
    await sleep(3000);

    try {
      // Scroll to trigger lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await sleep(2000);

      const extractedData = await page.evaluate(() => {
        const videos: Array<{
          id: string;
          title: string;
          author: string;
          likes: string;
          comments: string;
          coverImage: string;
        }> = [];

        // Douyin video cards in search results
        // They typically have a structure with video-card or similar class
        const videoCards = document.querySelectorAll(
          '[class*="video-card"], [class*="videoCard"], [class*="search-result-card"], li[class*="card"]'
        );

        videoCards.forEach((card) => {
          // Try various selectors for title/description
          const titleEl = card.querySelector(
            '[class*="title"], [class*="desc"], p, span[class*="text"]'
          );
          const title = titleEl?.textContent?.trim() || '';

          // Get video link for ID
          const linkEl = card.querySelector('a[href*="/video/"]');
          const href = linkEl instanceof HTMLAnchorElement ? linkEl.href : '';
          const idMatch = href.match(/video\/(\d+)/);
          const id = idMatch ? idMatch[1] : '';

          // Author name
          const authorEl = card.querySelector(
            '[class*="author"], [class*="nickname"], [class*="name"], [class*="user"]'
          );
          const author = authorEl?.textContent?.trim() || '';

          // Likes count
          const likesEl = card.querySelector(
            '[class*="like"], [class*="digg"], [class*="count"]'
          );
          const likes = likesEl?.textContent?.trim() || '0';

          // Comments count
          const commentsEl = card.querySelector(
            '[class*="comment"], [class*="reply"]'
          );
          const comments = commentsEl?.textContent?.trim() || '0';

          // Cover image
          const imgEl = card.querySelector('img');
          const coverImage = imgEl?.src || '';

          if (title || id) {
            videos.push({ id, title, author, likes, comments, coverImage });
          }
        });

        // Fallback: try to find data in __INITIAL_STATE__ if available
        if (videos.length === 0) {
          try {
            const scripts = Array.from(document.querySelectorAll('script'));
            for (const script of scripts) {
              if (
                script.textContent?.includes('window.__INITIAL_STATE__') ||
                script.textContent?.includes('RENDER_DATA')
              ) {
                // Try RENDER_DATA pattern first (common in Douyin)
                const renderMatch = script.textContent.match(
                  /RENDER_DATA\s*=\s*decodeURIComponent\s*\(\s*['"](.+?)['"]\s*\)/
                );
                if (renderMatch) {
                  try {
                    const decoded = decodeURIComponent(renderMatch[1]);
                    const data = JSON.parse(decoded);
                    const items =
                      data?.app?.searchResult?.videoList ||
                      data?.searchResult?.videoList ||
                      [];
                    for (const item of items) {
                      videos.push({
                        id: item.aweme_id || item.id || '',
                        title: item.desc || item.title || '',
                        author: item.author?.nickname || item.nickname || '',
                        likes: item.statistics?.digg_count?.toString() || '0',
                        comments:
                          item.statistics?.comment_count?.toString() || '0',
                        coverImage:
                          item.video?.cover?.url_list?.[0] ||
                          item.cover_url ||
                          '',
                      });
                    }
                  } catch {
                    // Ignore parse errors
                  }
                }

                // Try __INITIAL_STATE__ pattern
                const stateMatch = script.textContent.match(
                  /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*(?:window\.|<\/script>)/
                );
                if (stateMatch && videos.length === 0) {
                  const state = JSON.parse(
                    stateMatch[1].replace(/undefined/g, 'null')
                  );
                  const items =
                    state?.search?.videoList ||
                    state?.searchResult?.aweme_list ||
                    [];
                  for (const item of items) {
                    videos.push({
                      id: item.aweme_id || item.id || '',
                      title: item.desc || item.title || '',
                      author: item.author?.nickname || '',
                      likes: item.statistics?.digg_count?.toString() || '0',
                      comments:
                        item.statistics?.comment_count?.toString() || '0',
                      coverImage:
                        item.video?.cover?.url_list?.[0] ||
                        item.cover_url ||
                        '',
                    });
                  }
                }
              }
            }
          } catch {
            // Ignore parse errors
          }
        }

        return videos;
      });

      for (const video of extractedData) {
        guides.push({
          title: video.title,
          content: video.title, // Full description not available in search results
          author_name: video.author,
          likes_count: this.parseCount(video.likes),
          comments_count: this.parseCount(video.comments),
          cover_image_url: video.coverImage,
        });
      }

      console.warn(`Extracted ${guides.length} guides from ${url}`);

      return { guides };
    } catch (error) {
      console.error(`Failed to extract from ${url}:`, error);
      return { guides: [] };
    }
  }

  private parseCount(countStr: string): number {
    if (!countStr) return 0;
    const num = Number.parseFloat(countStr);
    if (Number.isNaN(num)) return 0;
    if (countStr.includes('万')) return Math.round(num * 10000);
    if (countStr.includes('亿')) return Math.round(num * 100000000);
    if (countStr.includes('w')) return Math.round(num * 10000);
    return Math.round(num);
  }
}
