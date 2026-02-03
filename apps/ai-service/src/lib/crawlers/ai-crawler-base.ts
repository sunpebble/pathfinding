/**
 * AI Crawler Base - AI-driven web crawling
 *
 * This base class provides AI-powered extraction methods using direct LLM calls
 * via extractWithDirectLLM(). This approach bypasses Stagehand's internal LLM
 * handling, allowing use of custom OpenAI-compatible APIs (e.g., Gemini via proxy).
 *
 * Key features:
 * - Uses Kernel.sh cloud browser for anti-detection
 * - Direct LLM extraction with Zod schema validation
 * - No dependency on Stagehand's model restrictions
 */

import type { z } from 'zod';
import type { BrowserClient } from './clients/index.js';
import type { ContentBlock, CrawlResult } from './index.js';
import { createLogger } from '../logger.js';
import { AntiDetectionBrowserClient } from './clients/anti-detection-client.js';
import { rateLimiter } from './rate-limiter/index.js';

const _log = createLogger('ai-crawler-base');

/**
 * Common schemas for AI extraction
 */
export const AISchemas = {
  /**
   * Travel guide list item schema for extracting links from list pages
   */
  guideListItem: (zod: typeof z) =>
    zod.object({
      title: zod.string().describe('游记或攻略标题'),
      url: zod.string().describe('游记详情页链接'),
      author: zod.string().nullable().optional().describe('作者名称'),
      thumbnail: zod.string().nullable().optional().describe('缩略图URL'),
    }),

  /**
   * Full travel guide schema for detail pages
   */
  guideDetail: (zod: typeof z) =>
    zod.object({
      title: zod.string().describe('文章标题'),
      content: zod.string().describe('文章正文内容，包含完整的旅行攻略文字'),
      author: zod
        .object({
          name: zod.string().describe('作者名称'),
          avatar: zod.string().nullable().optional().describe('作者头像URL'),
        })
        .nullable()
        .optional(),
      publishDate: zod.string().nullable().optional().describe('发布日期'),
      images: zod
        .array(zod.string())
        .nullable()
        .optional()
        .describe('文章中的图片URL列表'),
      stats: zod
        .object({
          views: zod.number().nullable().optional().describe('浏览量'),
          likes: zod.number().nullable().optional().describe('点赞数'),
          comments: zod.number().optional().describe('评论数'),
          saves: zod.number().optional().describe('收藏数'),
        })
        .optional(),
      tags: zod.array(zod.string()).optional().describe('文章标签'),
      destinations: zod.array(zod.string()).optional().describe('目的地列表'),
    }),
};

/**
 * Options for AI-powered crawling
 */
export interface AICrawlOptions {
  /** Maximum number of pages to crawl */
  maxPages?: number;
  /** Maximum guides per page */
  maxGuidesPerPage?: number;
  /** Custom extraction instructions */
  customInstructions?: string;
  /** Whether to use stealth mode */
  stealth?: boolean;
  /** Existing browser client to reuse */
  client?: BrowserClient;
}

/**
 * Result from AI list extraction
 */
export interface AIListResult {
  guides: Array<{
    title: string;
    url: string;
    author?: string | null;
    thumbnail?: string | null;
  }>;
  hasMore: boolean;
  nextPageUrl?: string | null;
}

/**
 * Result from AI detail extraction
 */
export interface AIDetailResult {
  title: string;
  content: string;
  author?: {
    name: string;
    avatar?: string | null;
  } | null;
  publishDate?: string | null;
  images?: string[] | null;
  stats?: {
    views?: number | null;
    likes?: number | null;
    comments?: number | null;
    saves?: number | null;
  } | null;
  tags?: string[] | null;
  destinations?: string[] | null;
}

/**
 * Abstract base class for AI-powered crawlers
 *
 * Subclasses should implement platform-specific URL generation and
 * any custom extraction logic needed.
 */
export abstract class AICrawlerBase {
  protected log: ReturnType<typeof createLogger>;
  protected client: AntiDetectionBrowserClient | null = null;
  protected shouldCloseClient = false;

  constructor(
    protected readonly platformName: string,
    protected readonly platformDisplayName: string,
  ) {
    this.log = createLogger(platformName);
  }

  /**
   * Get the list page URL for a city
   */
  protected abstract getListPageUrl(city: string, page: number): string;

  /**
   * Get city ID mapping (platform-specific)
   */
  protected abstract getCityId(city: string): string | undefined;

  /**
   * Get the source external ID from a URL
   */
  protected abstract getSourceExternalId(url: string): string;

  /**
   * Custom instructions for list page extraction
   */
  protected getListExtractionInstruction(city: string): string {
    return `
      从页面中提取所有旅游攻略/游记的列表。
      目标城市: ${city}
      
      请提取每篇攻略的:
      - 标题
      - 详情页链接URL (完整URL)
      - 作者名称 (如果可见)
      - 缩略图URL (如果可见)
      
      只提取与旅游、游记、攻略相关的内容链接，忽略广告和其他无关内容。
    `;
  }

  /**
   * Custom instructions for detail page extraction
   */
  protected getDetailExtractionInstruction(): string {
    return `
      从这篇旅游攻略/游记页面中提取完整信息。
      
      请提取:
      - 文章标题
      - 完整的文章正文内容（保留段落结构）
      - 作者信息（名称和头像URL）
      - 发布日期
      - 所有配图的URL
      - 统计数据（浏览量、点赞数、评论数、收藏数）
      - 文章标签
      - 提到的目的地/景点名称
      
      确保提取完整的正文内容，不要截断。
    `;
  }

  /**
   * Initialize the browser client
   */
  protected async initClient(options: AICrawlOptions): Promise<void> {
    if (options.client && options.client instanceof AntiDetectionBrowserClient) {
      this.client = options.client;
      this.shouldCloseClient = false;
    }
    else {
      this.client = new AntiDetectionBrowserClient();
      await this.client.init({
        headless: true,
      });
      this.shouldCloseClient = true;
    }
  }

  /**
   * Close the browser client if we own it
   */
  protected async closeClient(): Promise<void> {
    if (this.shouldCloseClient && this.client) {
      await this.client.close();
      this.client = null;
    }
  }

  /**
   * Get the underlying page for direct operations
   */
  protected getPage() {
    if (!this.client) {
      throw new Error('Client not initialized');
    }
    return this.client.getPage();
  }

  /**
   * Navigate to a URL with error handling
   * Includes waiting for page to fully load
   */
  protected async navigateTo(url: string): Promise<boolean> {
    try {
      await this.client!.navigateTo(url, {
        timeout: 60000,
        waitUntil: 'domcontentloaded',
      });
      // Additional wait for JavaScript rendering
      await this.sleep(2000);
      return true;
    }
    catch (error) {
      this.log.error({ error, url }, 'Navigation failed');
      return false;
    }
  }

  /**
   * Scroll the page to load dynamic content
   */
  protected async scrollToLoadContent(scrollCount = 3): Promise<void> {
    for (let i = 0; i < scrollCount; i++) {
      await this.client!.scroll('down', 500);
      await this.sleep(500);
    }
  }

  /**
   * Use AI to perform an action on the page
   */
  protected async act(instruction: string): Promise<void> {
    await this.client!.act(instruction);
  }

  /**
   * Use AI to extract structured data from the page
   * Uses direct LLM extraction to bypass Stagehand's model restrictions
   */
  protected async performAIExtraction<T>(
    instruction: string,
    schema: z.ZodSchema<T>,
  ): Promise<T> {
    return await this.client!.extractWithDirectLLM(instruction, schema);
  }

  /**
   * Extract guide list from the current page using AI
   */
  protected async extractGuideList(
    city: string,
    zod: typeof z,
  ): Promise<AIListResult> {
    const instruction = this.getListExtractionInstruction(city);
    const schema = zod.object({
      guides: zod.array(AISchemas.guideListItem(zod)),
      hasMore: zod.boolean().describe('是否还有更多内容可以加载'),
      nextPageUrl: zod.string().nullable().optional().describe('下一页的URL，如果没有则为null'),
    });

    try {
      // @ts-ignore
      const result = await (this as any).performAIExtraction(instruction, schema);
      return {
        guides: result.guides,
        hasMore: result.hasMore,
        nextPageUrl: result.nextPageUrl || undefined,
      };
    }
    catch (error) {
      this.log.error({ error }, 'Failed to extract guide list');
      return { guides: [], hasMore: false };
    }
  }

  /**
   * Extract guide detail from the current page using AI
   */
  protected async extractGuideDetail(
    zod: typeof z,
  ): Promise<AIDetailResult | null> {
    const instruction = this.getDetailExtractionInstruction();
    const schema = AISchemas.guideDetail(zod);

    try {
      // @ts-ignore
      const result = await (this as any).performAIExtraction(instruction, schema);
      return result;
    }
    catch (error) {
      this.log.error({ error }, 'Failed to extract guide detail');
      return null;
    }
  }

  /**
   * Check if the page shows a captcha or block
   * Uses text content extraction for more accurate detection
   */
  protected async detectBlock(): Promise<boolean> {
    try {
      // Get text content instead of HTML for better detection
      const page = this.getPage();
      if (!page)
        return true;

      // Extract visible text content
      const textContent = await page.evaluate(() => {
        return document.body?.textContent || '';
      });

      const content = textContent.toLowerCase();

      // Check for explicit block indicators
      const blockIndicators = [
        '验证码',
        'captcha',
        '滑动验证',
        '请完成验证',
        '安全验证',
        '频繁访问',
        '请求过于频繁',
        '访问受限',
        '403 forbidden',
        'access denied',
        'blocked',
        '请输入验证码',
        '人机验证',
      ];

      for (const indicator of blockIndicators) {
        if (content.includes(indicator)) {
          this.log.warn({ indicator }, 'Block indicator detected');
          return true;
        }
      }

      // Check for very short content - but use higher threshold
      // and check for actual page structure
      if (content.length < 100) {
        // Check if page has any meaningful elements
        const hasContent = await page.evaluate(() => {
          const links = document.querySelectorAll('a[href]');
          const images = document.querySelectorAll('img');
          return links.length > 5 || images.length > 2;
        });

        if (!hasContent) {
          this.log.debug({ contentLength: content.length }, 'Content too short and no meaningful elements');
          return true;
        }
      }

      return false;
    }
    catch (error) {
      this.log.error({ error }, 'Error detecting block');
      return true;
    }
  }

  /**
   * Convert AI extraction result to CrawlResult
   */
  protected convertToCrawlResult(
    detail: AIDetailResult,
    url: string,
    city: string,
  ): CrawlResult {
    const contentBlocks: ContentBlock[] = [
      { type: 'text', content: detail.content },
    ];

    if (detail.images) {
      for (const imgUrl of detail.images) {
        contentBlocks.push({ type: 'image', url: imgUrl });
      }
    }

    return {
      sourceExternalId: this.getSourceExternalId(url),
      sourceUrl: url,
      title: detail.title,
      content: detail.content.substring(0, 50000),
      contentBlocks,
      contentType: 'normal',
      authorName: detail.author?.name || `${this.platformDisplayName}用户`,
      authorAvatar: detail.author?.avatar ?? undefined,
      publishedAt: detail.publishDate ?? undefined,
      coverImageUrl: detail.images?.[0],
      imageUrls: detail.images?.slice(0, 20) || [],
      destinations: detail.destinations || [city],
      tags: detail.tags || this.extractTags(detail.title, detail.content),
      likesCount: detail.stats?.likes ?? 0,
      savesCount: detail.stats?.saves ?? 0,
      commentsCount: detail.stats?.comments ?? 0,
      viewsCount: detail.stats?.views ?? 0,
      qualityScore: this.calculateQualityScore(
        detail.content,
        detail.images?.length || 0,
        detail.stats?.views || 0,
      ),
    };
  }

  /**
   * Minimum content length to consider page loaded successfully
   * If content is shorter, it's likely a WAF block or error page
   */
  protected readonly MIN_CONTENT_LENGTH = 10000;

  /**
   * Maximum retries for a single page when content is too short
   */
  protected readonly MAX_PAGE_RETRIES = 3;

  /**
   * Check if page content is valid (not blocked/error)
   */
  protected async isPageContentValid(): Promise<boolean> {
    try {
      const content = await this.client!.getPageContent();
      const contentLength = content.length;

      if (contentLength < this.MIN_CONTENT_LENGTH) {
        this.log.warn(
          { contentLength, minRequired: this.MIN_CONTENT_LENGTH },
          'Page content too short - possible WAF block or error',
        );
        return false;
      }

      return true;
    }
    catch (error) {
      this.log.error({ error }, 'Failed to check page content');
      return false;
    }
  }

  /**
   * Navigate with retry logic for short content
   */
  protected async navigateWithRetry(url: string, retries = this.MAX_PAGE_RETRIES): Promise<boolean> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const success = await this.navigateTo(url);
      if (!success) {
        this.log.warn({ url, attempt }, 'Navigation failed');
        if (attempt < retries) {
          await this.sleep(5000 * attempt); // Exponential backoff
          continue;
        }
        return false;
      }

      // Scroll to load dynamic content
      await this.scrollToLoadContent();

      // Check if content is valid
      if (await this.isPageContentValid()) {
        return true;
      }

      // Content too short, retry
      if (attempt < retries) {
        this.log.info({ attempt, maxRetries: retries }, 'Retrying due to short content...');
        await this.sleep(10000 * attempt); // Wait longer before retry
      }
    }

    this.log.error({ url }, 'All retries exhausted - page content still too short');
    return false;
  }

  /**
   * Main crawl method - orchestrates the crawling process
   */
  async crawl(city: string, options: AICrawlOptions = {}): Promise<CrawlResult[]> {
    const results: CrawlResult[] = [];
    const maxPages = options.maxPages || 5;
    const maxGuidesPerPage = options.maxGuidesPerPage || 10;

    const cityId = this.getCityId(city);
    if (!cityId) {
      this.log.warn({ city }, 'City not mapped');
      return results;
    }

    this.log.info({ city, cityId }, 'Starting AI-powered crawl');

    try {
      await this.initClient(options);

      // Import zod dynamically to avoid bundling issues
      const { z } = await import('zod');

      for (let page = 1; page <= maxPages; page++) {
        const listUrl = this.getListPageUrl(city, page);
        this.log.info({ page, listUrl }, 'Fetching list page');

        // Use retry-enabled navigation
        const success = await this.navigateWithRetry(listUrl);
        if (!success) {
          this.log.warn({ page }, 'Failed to load list page after retries, stopping');
          break;
        }

        // Check for blocks (after content has loaded)
        if (await this.detectBlock()) {
          this.log.warn({ page }, 'Block detected on list page');
          rateLimiter.notifyRateLimitDetected(this.platformName);
          break;
        }

        // Extract guide list using AI
        const listResult = await this.extractGuideList(city, z);
        this.log.info(
          { count: listResult.guides.length, page },
          'Extracted guides from list',
        );

        // If no guides extracted, might be blocked
        if (listResult.guides.length === 0) {
          this.log.warn({ page }, 'No guides extracted - possible block or empty page');
          // Wait before trying next page
          await this.sleep(10000);
        }

        // Visit each guide detail page
        for (const guide of listResult.guides.slice(0, maxGuidesPerPage)) {
          try {
            await rateLimiter.waitBeforeRequest(this.platformName);

            // Use retry-enabled navigation for detail pages
            const detailSuccess = await this.navigateWithRetry(guide.url, 2);
            if (!detailSuccess)
              continue;

            // Check for blocks
            if (await this.detectBlock()) {
              this.log.warn({ url: guide.url }, 'Block detected on detail page');
              rateLimiter.notifyRateLimitDetected(this.platformName);
              continue;
            }

            const detail = await this.extractGuideDetail(z);
            if (detail && detail.content.length >= 100) {
              const result = this.convertToCrawlResult(detail, guide.url, city);
              results.push(result);
              rateLimiter.resetBackoff(this.platformName);
              this.log.info(
                { title: result.title, contentLength: result.content.length },
                'Extracted guide',
              );
            }
          }
          catch (error) {
            this.log.error({ error, url: guide.url }, 'Error fetching guide');
            rateLimiter.notifyRateLimitDetected(this.platformName);
          }
        }

        // Check if there are more pages
        if (!listResult.hasMore) {
          this.log.info({ page }, 'No more pages available');
          break;
        }

        // Add delay between pages
        await this.sleep(5000);
      }
    }
    catch (error) {
      this.log.error({ error }, 'Crawl failed');
    }
    finally {
      await this.closeClient();
    }

    this.log.info({ count: results.length }, 'Crawl completed');
    return results;
  }

  /**
   * Extract tags from title and content using pattern matching
   */
  protected extractTags(title: string, content: string): string[] {
    const tags: string[] = [];
    const text = `${title} ${content}`.toLowerCase();

    const tagPatterns = [
      { pattern: /美食|餐厅|吃|小吃|火锅|烧烤/, tag: '美食' },
      { pattern: /住宿|酒店|民宿|客栈|青旅/, tag: '住宿' },
      { pattern: /景点|景区|打卡|必去|网红点/, tag: '景点' },
      { pattern: /交通|出行|高铁|飞机|地铁|公交/, tag: '交通' },
      { pattern: /购物|商场|特产|纪念品/, tag: '购物' },
      { pattern: /亲子|带娃|儿童|宝宝|家庭/, tag: '亲子游' },
      { pattern: /情侣|浪漫|蜜月|约会/, tag: '情侣游' },
      { pattern: /自驾游|租车/, tag: '自驾游' },
      { pattern: /拍照|出片|摄影点/, tag: '摄影' },
      { pattern: /徒步|登山|户外|探险/, tag: '户外' },
      { pattern: /海滩|海边|沙滩|海岛/, tag: '海滨' },
      { pattern: /古镇|古城|历史|古建筑/, tag: '人文' },
    ];

    for (const { pattern, tag } of tagPatterns) {
      if (pattern.test(text)) {
        tags.push(tag);
      }
    }

    return tags.slice(0, 5);
  }

  /**
   * Calculate quality score based on content metrics
   */
  protected calculateQualityScore(
    content: string,
    imageCount: number,
    viewsCount: number,
  ): number {
    let score = 50;

    if (content.length > 1000)
      score += 10;
    if (content.length > 3000)
      score += 10;
    if (content.length > 5000)
      score += 5;

    score += Math.min(imageCount * 2, 15);

    if (viewsCount > 1000)
      score += 5;
    if (viewsCount > 10000)
      score += 5;

    return Math.min(score, 100);
  }

  /**
   * Helper for delays
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
