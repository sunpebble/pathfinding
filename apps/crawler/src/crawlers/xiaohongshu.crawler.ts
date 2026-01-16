/**
 * Xiaohongshu (小红书) Crawler
 * Crawls travel notes from Xiaohongshu using DOM-based extraction
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
 * Xiaohongshu Crawler using DOM-based extraction
 * Note: Xiaohongshu has strong anti-bot measures. This crawler may need
 * proxy rotation and cookie management for production use.
 */
export class XiaohongshuCrawler extends BaseGuideCrawler {
  private baseUrl = 'https://www.xiaohongshu.com';

  get platform(): string {
    return 'xiaohongshu';
  }

  generateRequests(config: CrawlJobConfig): Request[] {
    const requests: Request[] = [];
    const destinations = config.geographic_scope?.cities || [];
    const keywords = (config.filters?.keywords as string[]) || [];

    // Travel-related suffixes
    const travelSuffixes = ['旅游攻略', '旅行', '自由行'];

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
          url: `${this.baseUrl}/search_result?keyword=${encodeURIComponent(query)}&source=web_search_result_notes`,
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
        const notes: Array<{
          id: string;
          title: string;
          author: string;
          likes: string;
          coverImage: string;
        }> = [];

        // Xiaohongshu note cards in search results
        // They typically have a structure with note-item or similar class
        const noteCards = document.querySelectorAll(
          '[class*="note-item"], [class*="noteItem"], section[class*="note"]'
        );

        noteCards.forEach((card) => {
          // Try various selectors for title
          const titleEl = card.querySelector(
            'a[href*="/explore/"] span, [class*="title"], h3, .note-title'
          );
          const title = titleEl?.textContent?.trim() || '';

          // Get note link for ID
          const linkEl = card.querySelector('a[href*="/explore/"]');
          const href = linkEl instanceof HTMLAnchorElement ? linkEl.href : '';
          const idMatch = href.match(/explore\/([a-zA-Z0-9]+)/);
          const id = idMatch ? idMatch[1] : '';

          // Author name
          const authorEl = card.querySelector(
            '[class*="author"], [class*="nickname"], .user-name, .name'
          );
          const author = authorEl?.textContent?.trim() || '';

          // Likes count
          const likesEl = card.querySelector(
            '[class*="like"], [class*="count"], .like-count, .like span'
          );
          const likes = likesEl?.textContent?.trim() || '0';

          // Cover image
          const imgEl = card.querySelector('img');
          const coverImage = imgEl?.src || '';

          if (title || id) {
            notes.push({ id, title, author, likes, coverImage });
          }
        });

        // Fallback: try to find data in __INITIAL_STATE__ if available
        if (notes.length === 0) {
          try {
            const scripts = Array.from(document.querySelectorAll('script'));
            for (const script of scripts) {
              if (script.textContent?.includes('window.__INITIAL_STATE__')) {
                const match = script.textContent.match(
                  /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*(?:window\.|<\/script>)/
                );
                if (match) {
                  const state = JSON.parse(
                    match[1].replace(/undefined/g, 'null')
                  );
                  const items = state?.search?.notes?.items || [];
                  for (const item of items) {
                    if (item.note_card) {
                      notes.push({
                        id: item.id || '',
                        title: item.note_card.title || '',
                        author: item.note_card.user?.nickname || '',
                        likes: item.note_card.interact_info?.liked_count || '0',
                        coverImage: item.note_card.cover?.url || '',
                      });
                    }
                  }
                }
              }
            }
          } catch {
            console.error('Failed to parse __INITIAL_STATE__');
          }
        }

        return notes;
      });

      for (const note of extractedData) {
        guides.push({
          title: note.title,
          content: note.title, // Summary not available in search results
          author_name: note.author,
          likes_count: this.parseCount(note.likes),
          cover_image_url: note.coverImage,
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
    return Math.round(num);
  }
}
