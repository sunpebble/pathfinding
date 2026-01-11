/**
 * Ctrip (携程) Crawler
 * Crawls travel guides from Ctrip using DOM-based extraction
 * Two-phase: 1) List pages to collect article URLs, 2) Article pages for full content
 */

import type {
  CrawlJobConfig,
  TravelGuideRaw,
} from '@pathfinding/crawler-types';
import type { Page } from 'playwright';

import type { GuideExtractionResult } from './base-guide.crawler.js';
import { Request } from 'crawlee';
import { BaseGuideCrawler, sleep } from './base-guide.crawler.js';

// City name to Ctrip path mapping
const CITY_PATHS: Record<string, string> = {
  北京: 'beijing1',
  上海: 'shanghai2',
  广州: 'guangzhou152',
  深圳: 'shenzhen26',
  杭州: 'hangzhou14',
  成都: 'chengdu104',
  西安: 'xian7',
  南京: 'nanjing9',
  武汉: 'wuhan145',
  重庆: 'chongqing158',
  三亚: 'sanya61',
  厦门: 'xiamen21',
  苏州: 'suzhou11',
  大理: 'dali31',
  丽江: 'lijiang32',
  桂林: 'guilin28',
  青岛: 'qingdao5',
  昆明: 'kunming29',
  拉萨: 'lasa36',
  张家界: 'zhangjiajie16',
  长沙: 'changsha148',
  天津: 'tianjin154',
  哈尔滨: 'haerbin151',
  沈阳: 'shenyang155',
};

/**
 * Ctrip Crawler using DOM-based extraction
 * Visits individual article pages to get full content
 */
export class CtripCrawler extends BaseGuideCrawler {
  private baseUrl = 'https://you.ctrip.com';

  get platform(): string {
    return 'ctrip';
  }

  generateRequests(config: CrawlJobConfig): Request[] {
    const requests: Request[] = [];
    const destinations = config.geographic_scope?.cities || [];

    for (const dest of destinations) {
      const cityPath = CITY_PATHS[dest];
      if (cityPath) {
        requests.push(
          new Request({
            url: `${this.baseUrl}/travels/${cityPath}/`,
            userData: {
              type: 'list',
              destination: dest,
              cityPath,
              page: 1,
            },
          })
        );
      }
    }

    return requests;
  }

  /**
   * Extract guides from Ctrip page using DOM queries
   * Handles both list pages (collect URLs) and article pages (full content)
   */
  async extractFromPage(
    page: Page,
    url: string
  ): Promise<GuideExtractionResult> {
    const guides: TravelGuideRaw[] = [];
    const _userData = await page.evaluate(
      () => (window as any).__userData || {}
    );

    // Wait for dynamic content
    await sleep(2000);

    // Check if this is a list page or article page
    const isArticlePage = url.match(/\/travels\/[^/]+\/\d+\.html/);

    if (isArticlePage) {
      // Extract full content from article page
      const guide = await this.extractArticleContent(page, url);
      if (guide) {
        guides.push(guide);
      }
      return { guides };
    }

    // List page: extract article URLs and basic info
    try {
      const extractedData = await page.evaluate(() => {
        const articles: Array<{
          title: string;
          summary: string;
          url: string;
          author: string;
          publishDate: string;
          views: string;
          likes: string;
          comments: string;
          coverImage: string;
        }> = [];

        // Find all travel note links with titles
        const noteLinks = Array.from(
          document.querySelectorAll('a[href*="/travels/"]')
        ).filter((a): a is HTMLAnchorElement => {
          return a instanceof HTMLAnchorElement && !!a.querySelector('h2');
        });

        for (const link of noteLinks) {
          const title = link.querySelector('h2')?.textContent?.trim() || '';
          const summary = link.querySelector('p')?.textContent?.trim() || '';
          const noteUrl = link.href;

          // Get cover image
          const img = link.querySelector('img');
          const coverImage = img?.src || '';

          // Find author and date info
          const allSpans = Array.from(link.querySelectorAll('span'));
          const authorSpan = allSpans.find((s) =>
            s.textContent?.includes('发表于')
          );
          let author = '';
          let publishDate = '';

          if (authorSpan) {
            const parts = authorSpan.textContent?.split('发表于') || [];
            author = parts[0]?.trim() || '';
            publishDate = parts[1]?.trim() || '';
          }

          // Find stats
          const statsSpans = Array.from(link.querySelectorAll('div.flex span'));
          const views = statsSpans[0]?.textContent?.trim() || '0';
          const likes = statsSpans[1]?.textContent?.trim() || '0';
          const comments = statsSpans[2]?.textContent?.trim() || '0';

          if (title && noteUrl.includes('.html')) {
            articles.push({
              title,
              summary,
              url: noteUrl,
              author,
              publishDate,
              views,
              likes,
              comments,
              coverImage,
            });
          }
        }

        // Find next page URL
        const pageLinks = Array.from(
          document.querySelectorAll('a[href*="-p"]')
        );
        const currentPage =
          window.location.pathname.match(/-p(\d+)/)?.[1] || '1';
        const nextPageNum = Number.parseInt(currentPage) + 1;
        const nextPageLink = pageLinks.find(
          (a) =>
            a instanceof HTMLAnchorElement &&
            a.href.includes(`-p${nextPageNum}`)
        );
        const nextPageUrl =
          nextPageLink instanceof HTMLAnchorElement ? nextPageLink.href : null;

        return { articles, nextPageUrl };
      });

      console.warn(
        `Found ${extractedData.articles.length} articles on list page ${url}`
      );

      // Don't save list page summaries - only return article URLs for full content extraction
      // The article pages will extract and save the full content
      return {
        guides: [], // Don't save truncated summaries
        nextPageUrl: extractedData.nextPageUrl || undefined,
        // Return article URLs for enqueueing to get full content
        articleUrls: extractedData.articles.slice(0, 10).map((a) => a.url),
      } as GuideExtractionResult & { articleUrls?: string[] };
    } catch (error) {
      console.error(`Failed to extract from ${url}:`, error);
      return { guides: [] };
    }
  }

  /**
   * Extract full content from individual article page
   */
  private async extractArticleContent(
    page: Page,
    url: string
  ): Promise<TravelGuideRaw | null> {
    try {
      await sleep(1500);

      const articleData = await page.evaluate(() => {
        // Title
        const title =
          document.querySelector('h1')?.textContent?.trim() ||
          document.querySelector('.title')?.textContent?.trim() ||
          '';

        // Author name - try multiple selectors
        const authorSelectors = [
          '.author-name',
          '.user-name',
          '[class*="author"] a',
          '[class*="author"] span',
          '.avatar-container + *',
        ];
        let author = '';
        for (const sel of authorSelectors) {
          const el = document.querySelector(sel);
          if (el?.textContent?.trim()) {
            author = el.textContent.trim();
            break;
          }
        }

        // Author ID - try to extract from URL or data attribute
        let authorId = '';
        const authorLink = document.querySelector(
          '.author-name a, [class*="author"] a'
        ) as HTMLAnchorElement;
        if (authorLink?.href) {
          const match = authorLink.href.match(
            /\/(?:user|member|profile)\/(\d+)/
          );
          if (match) authorId = match[1];
        }
        // Try data attribute
        if (!authorId) {
          const authorEl = document.querySelector(
            '[data-user-id], [data-author-id]'
          );
          authorId =
            authorEl?.getAttribute('data-user-id') ||
            authorEl?.getAttribute('data-author-id') ||
            '';
        }

        // Publish date
        const dateEl = document.querySelector(
          '.publish-date, [class*="date"], time'
        );
        const publishDate = dateEl?.textContent?.trim() || '';

        // Full content - try multiple selectors (travel-content-wrapper is the main one)
        let content = '';
        const contentSelectors = [
          '.travel-content-wrapper',
          '.rich-text-container',
          '.ctd_content',
          '.travel-detail',
          '.article-content',
          'article',
          '.main-content',
        ];

        let contentHtml = '';
        for (const selector of contentSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            // Get HTML content for rich text rendering
            const html = el.innerHTML?.trim() || '';
            // Use innerText for plain text (preserves line breaks better than textContent)
            // eslint-disable-next-line unicorn/prefer-dom-node-text-content
            const text = (el as HTMLElement).innerText?.trim() || '';

            if (text.length > 100) {
              content = text;
              // Clean up HTML: remove scripts, styles, excessive whitespace
              contentHtml = html
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/\s+/g, ' ')
                .trim();
              break;
            }
          }
        }

        // Images - update selectors for new page structure
        const images: string[] = [];
        document
          .querySelectorAll(
            '.travel-content-wrapper img, .rich-text-container img, article img, .content img'
          )
          .forEach((img) => {
            if (img instanceof HTMLImageElement && img.src) {
              images.push(img.src);
            }
          });

        // Stats - enhanced selectors for likes, views, saves, comments
        const getStatValue = (selectors: string[]): string => {
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el?.textContent?.trim()) {
              return el.textContent.trim();
            }
          }
          return '0';
        };

        const likes = getStatValue([
          '[class*="like"] span',
          '.like-count',
          '[class*="zan"] span',
          '[data-type="like"] span',
        ]);

        const views = getStatValue([
          '[class*="view"] span',
          '.view-count',
          '[class*="read"] span',
          '.visits span',
          '[data-type="view"] span',
        ]);

        const saves = getStatValue([
          '[class*="collect"] span',
          '.collect-count',
          '[class*="save"] span',
          '[class*="favor"] span',
          '[data-type="collect"] span',
        ]);

        const comments = getStatValue([
          '[class*="comment"] span',
          '.comment-count',
          '[class*="reply"] span',
          '[data-type="comment"] span',
        ]);

        return {
          title,
          author,
          authorId,
          publishDate,
          content,
          contentHtml,
          images,
          likes,
          views,
          saves,
          comments,
        };
      });

      if (!articleData.title && !articleData.content) {
        console.warn(`No content found for ${url}`);
        return null;
      }

      console.warn(
        `Extracted article: ${articleData.title?.slice(0, 30)}... (${articleData.content.length} chars)`
      );

      return {
        title: articleData.title,
        content: articleData.content,
        content_html: articleData.contentHtml,
        author_name: articleData.author,
        author_id: articleData.authorId,
        image_urls: articleData.images,
        cover_image_url: articleData.images[0],
        likes_count: this.parseCount(articleData.likes),
        saves_count: this.parseCount(articleData.saves),
        views_count: this.parseCount(articleData.views),
        comments_count: this.parseCount(articleData.comments),
        published_at: articleData.publishDate
          ? this.parseDate(articleData.publishDate)
          : undefined,
      };
    } catch (error) {
      console.error(`Failed to extract article from ${url}:`, error);
      return null;
    }
  }

  /**
   * Parse count strings like "9.2万" to numbers
   */
  private parseCount(countStr: string): number {
    if (!countStr) return 0;

    const num = Number.parseFloat(countStr);
    if (Number.isNaN(num)) return 0;

    if (countStr.includes('万')) {
      return Math.round(num * 10000);
    }
    if (countStr.includes('亿')) {
      return Math.round(num * 100000000);
    }

    return Math.round(num);
  }

  /**
   * Parse date strings to ISO format
   */
  private parseDate(dateStr: string): string {
    try {
      const cleaned = dateStr
        .replace('年', '-')
        .replace('月', '-')
        .replace('日', '')
        .trim();

      const date = new Date(cleaned);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      // Ignore parse errors
    }
    return new Date().toISOString();
  }
}
