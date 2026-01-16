/**
 * Weibo (微博) Crawler
 * Crawls travel posts from Weibo using DOM-based extraction
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
 * Weibo Crawler using DOM-based extraction
 */
export class WeiboCrawler extends BaseGuideCrawler {
  private baseUrl = 'https://weibo.com';
  private searchUrl = 'https://s.weibo.com/weibo';

  get platform(): string {
    return 'weibo';
  }

  generateRequests(config: CrawlJobConfig): Request[] {
    const requests: Request[] = [];
    const destinations = config.geographic_scope?.cities || [];
    const keywords = (config.filters?.keywords as string[]) || [];

    const travelTerms = ['旅行', '旅游攻略', '打卡'];
    const searchQueries: string[] = [];

    for (const dest of destinations) {
      for (const term of travelTerms) {
        searchQueries.push(`${dest}${term}`);
      }
    }

    searchQueries.push(...keywords);

    const maxQueries = Math.min(searchQueries.length, 10);

    for (let i = 0; i < maxQueries; i++) {
      const query = searchQueries[i];
      requests.push(
        new Request({
          url: `${this.searchUrl}?q=${encodeURIComponent(query)}&typeall=1&suball=1&Refer=g`,
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

    // Wait for page to load
    await sleep(3000);

    try {
      // Scroll to load more content
      await page.evaluate(() => {
        window.scrollTo(0, 1000);
      });
      await sleep(2000);

      const extractedData = await page.evaluate(() => {
        const posts: Array<{
          mid: string;
          content: string;
          author: string;
          likes: string;
          reposts: string;
          comments: string;
          images: string[];
          publishTime: string;
        }> = [];

        // Weibo search results are in card elements
        const weiboCards = document.querySelectorAll(
          '.card-wrap, .m-con-l .card'
        );

        weiboCards.forEach((card) => {
          // Get weibo mid from data attribute or action links
          const actionData = card.querySelector('[action-data]');
          let mid = '';
          if (actionData) {
            const data = actionData.getAttribute('action-data') || '';
            const midMatch = data.match(/mid=(\d+)/);
            mid = midMatch ? midMatch[1] : '';
          }

          // Content text
          const contentEl = card.querySelector(
            '.txt[node-type="feed_list_content"], .wb-text, p.txt'
          );
          const content = contentEl?.textContent?.trim() || '';

          // Author name
          const authorEl = card.querySelector(
            '.name, .from a:first-child, a[class*="name"]'
          );
          const author = authorEl?.textContent?.trim() || '';

          // Stats
          const likeEl = card.querySelector(
            '[action-type="fl_like"] em, .like em, [class*="like"] span'
          );
          const repostEl = card.querySelector(
            '[action-type="fl_forward"] em, .forward em, [class*="forward"] span'
          );
          const commentEl = card.querySelector(
            '[action-type="fl_comment"] em, .comment em, [class*="comment"] span'
          );

          const likes = likeEl?.textContent?.trim() || '0';
          const reposts = repostEl?.textContent?.trim() || '0';
          const comments = commentEl?.textContent?.trim() || '0';

          // Images
          const images: string[] = [];
          const imgEls = card.querySelectorAll('.media img, .pic img, li img');
          imgEls.forEach((img) => {
            if (img instanceof HTMLImageElement && img.src) {
              images.push(img.src);
            }
          });

          // Publish time
          const timeEl = card.querySelector(
            '.from a:last-child, .time, [class*="time"]'
          );
          const publishTime = timeEl?.textContent?.trim() || '';

          if (content) {
            posts.push({
              mid,
              content,
              author,
              likes,
              reposts,
              comments,
              images,
              publishTime,
            });
          }
        });

        // Find next page
        const nextPageEl = document.querySelector(
          '.next'
        ) as HTMLAnchorElement | null;
        const nextPageUrl = nextPageEl?.href || null;

        return { posts, nextPageUrl };
      });

      for (const post of extractedData.posts) {
        guides.push({
          content: post.content,
          author_name: post.author,
          likes_count: this.parseCount(post.likes),
          views_count: this.parseCount(post.reposts), // Using reposts as engagement metric
          comments_count: this.parseCount(post.comments),
          image_urls: post.images,
          cover_image_url: post.images[0],
          published_at: this.parseWeiboDate(post.publishTime),
        });
      }

      console.warn(`Extracted ${guides.length} guides from ${url}`);

      return {
        guides,
        nextPageUrl: extractedData.nextPageUrl || undefined,
      };
    } catch (error) {
      console.error(`Failed to extract from ${url}:`, error);
      return { guides: [] };
    }
  }

  private parseCount(countStr: string): number {
    if (
      !countStr ||
      countStr === '转发' ||
      countStr === '评论' ||
      countStr === '赞'
    ) {
      return 0;
    }
    const num = Number.parseFloat(countStr);
    if (Number.isNaN(num)) return 0;
    if (countStr.includes('万')) return Math.round(num * 10000);
    if (countStr.includes('亿')) return Math.round(num * 100000000);
    return Math.round(num);
  }

  private parseWeiboDate(dateStr: string): string {
    try {
      const now = new Date();

      if (dateStr.includes('刚刚')) {
        return now.toISOString();
      }
      if (dateStr.includes('分钟前')) {
        const minutes = Number.parseInt(dateStr) || 0;
        return new Date(now.getTime() - minutes * 60000).toISOString();
      }
      if (dateStr.includes('小时前')) {
        const hours = Number.parseInt(dateStr) || 0;
        return new Date(now.getTime() - hours * 3600000).toISOString();
      }
      if (dateStr.includes('今天')) {
        const time = dateStr.replace('今天', '').trim();
        return new Date(
          `${now.toISOString().split('T')[0]}T${time}:00`
        ).toISOString();
      }

      const parsed = new Date(dateStr);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    } catch {
      // Ignore
    }
    return new Date().toISOString();
  }
}
