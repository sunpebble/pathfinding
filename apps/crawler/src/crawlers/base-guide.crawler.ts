/**
 * Base Guide Crawler
 * Extended base crawler for travel guide platforms that require DOM-based extraction
 */

import type {
  CrawlJob,
  CrawlJobConfig,
  CrawlJobStatistics,
  TravelGuideRaw,
} from '@pathfinding/crawler-types';
import type { PlaywrightCrawlingContext, Request } from 'crawlee';
import type { Page } from 'playwright';

import { Buffer } from 'node:buffer';
import { PlaywrightCrawler } from 'crawlee';
import { TABLES } from '../lib/convex.js';
import { processGuide, saveGuide } from '../processors/guide-processor.js';

export interface GuideExtractionResult {
  guides: TravelGuideRaw[];
  nextPageUrl?: string;
  articleUrls?: string[]; // URLs of individual articles to crawl for full content
}

export interface GuideCrawlerOptions {
  maxConcurrency?: number;
  maxRequestsPerMinute?: number;
  maxRetries?: number;
  requestHandlerTimeoutSecs?: number;
  headless?: boolean;
  maxPages?: number;
}

/**
 * Abstract base class for travel guide crawlers
 * Uses DOM-based extraction instead of HTML parsing
 */
export abstract class BaseGuideCrawler {
  protected job: CrawlJob;
  protected statistics: CrawlJobStatistics;
  protected abortController: AbortController;
  protected pagesProcessed: number = 0;
  protected maxPages: number = 50;

  constructor(job: CrawlJob) {
    this.job = job;
    this.statistics = {
      requests_total: 0,
      requests_success: 0,
      requests_failed: 0,
      records_extracted: 0,
      bytes_downloaded: 0,
      duration_seconds: 0,
    };
    this.abortController = new AbortController();
    this.maxPages = (job.config.filters?.max_pages as number) || 50;
  }

  /**
   * Platform identifier
   */
  abstract get platform(): string;

  /**
   * Generate initial request URLs
   */
  abstract generateRequests(config: CrawlJobConfig): Request[];

  /**
   * Extract guides from the page using DOM queries
   * This method receives the Playwright Page object for direct DOM access
   */
  abstract extractFromPage(
    page: Page,
    url: string
  ): Promise<GuideExtractionResult>;

  /**
   * Get crawler options
   */
  protected getCrawlerOptions(): GuideCrawlerOptions {
    const rateLimit = this.job.config.rate_limit;
    return {
      maxConcurrency: rateLimit?.max_concurrent || 3,
      maxRequestsPerMinute: (rateLimit?.requests_per_second || 0.5) * 60,
      maxRetries: 2,
      requestHandlerTimeoutSecs: 120,
      headless: process.env.CRAWLEE_HEADLESS !== 'false',
    };
  }

  /**
   * Update job status
   */
  protected async updateJobStatus(
    status: 'running' | 'completed' | 'failed' | 'cancelled',
    errorMessage?: string
  ): Promise<void> {
    const update: Record<string, unknown> = { status };

    if (status === 'running') {
      update.started_at = new Date().toISOString();
    } else {
      update.completed_at = new Date().toISOString();
    }

    if (errorMessage) {
      update.error_message = errorMessage;
    }

    await supabase.from(TABLES.CRAWL_JOBS).update(update).eq('id', this.job.id);
  }

  /**
   * Update statistics
   */
  protected async updateStatistics(): Promise<void> {
    await supabase
      .from(TABLES.CRAWL_JOBS)
      .update({ statistics: this.statistics })
      .eq('id', this.job.id);
  }

  /**
   * Cancel the crawl
   */
  public cancel(): void {
    this.abortController.abort();
  }

  /**
   * Run the crawler
   */
  public async run(): Promise<CrawlJobStatistics> {
    const startTime = Date.now();

    try {
      await this.updateJobStatus('running');

      const requests = this.generateRequests(this.job.config);
      const options = this.getCrawlerOptions();

      console.warn(
        `Starting ${this.platform} guide crawl with ${requests.length} initial requests`
      );

      const crawler = new PlaywrightCrawler({
        maxConcurrency: options.maxConcurrency,
        maxRequestsPerMinute: options.maxRequestsPerMinute,
        maxRequestRetries: options.maxRetries,
        requestHandlerTimeoutSecs: options.requestHandlerTimeoutSecs,
        headless: options.headless,

        requestHandler: async (context: PlaywrightCrawlingContext) => {
          if (this.abortController.signal.aborted) {
            console.warn('Crawl aborted');
            return;
          }

          if (this.pagesProcessed >= this.maxPages) {
            console.warn(`Max pages (${this.maxPages}) reached, stopping`);
            return;
          }

          this.statistics.requests_total++;

          try {
            const { page, request, enqueueLinks } = context;
            const url = request.url;

            // Wait for content to load
            await page
              .waitForLoadState('networkidle', { timeout: 30000 })
              .catch(() => {
                console.warn(
                  `Network idle timeout for ${url}, proceeding anyway`
                );
              });

            // Extract guides using DOM
            const result = await this.extractFromPage(page, url);

            // Process and save each guide
            for (const guideRaw of result.guides) {
              try {
                const externalId = this.generateExternalId(guideRaw, url);
                const sourceUrl = guideRaw.title ? `${url}#${externalId}` : url;
                const processed = processGuide(
                  guideRaw,
                  this.platform,
                  externalId,
                  sourceUrl
                );
                const saved = await saveGuide(
                  processed,
                  this.platform,
                  externalId,
                  sourceUrl
                );

                if (saved.success) {
                  this.statistics.records_extracted++;
                  console.warn(
                    `Saved guide: ${guideRaw.title?.substring(0, 50) || 'Untitled'}`
                  );
                }
              } catch (error) {
                console.error(`Failed to save guide:`, error);
              }
            }

            // Enqueue next page if available
            if (result.nextPageUrl && this.pagesProcessed < this.maxPages - 1) {
              await enqueueLinks({
                urls: [result.nextPageUrl],
                userData: {
                  ...request.userData,
                  page: (request.userData?.page || 1) + 1,
                },
              });
            }

            // Enqueue individual article URLs for full content extraction
            if (result.articleUrls && result.articleUrls.length > 0) {
              await enqueueLinks({
                urls: result.articleUrls,
                userData: {
                  type: 'article',
                  ...request.userData,
                },
              });
            }

            this.pagesProcessed++;
            this.statistics.requests_success++;

            // Update statistics periodically
            if (this.statistics.requests_total % 5 === 0) {
              await this.updateStatistics();
            }
          } catch (error) {
            this.statistics.requests_failed++;
            console.error(`Request failed: ${context.request.url}`, error);
          }
        },

        failedRequestHandler: async (context) => {
          this.statistics.requests_failed++;
          console.error(`Request failed after retries: ${context.request.url}`);
        },
      });

      await crawler.addRequests(requests);
      await crawler.run();

      this.statistics.duration_seconds = Math.round(
        (Date.now() - startTime) / 1000
      );

      await this.updateStatistics();
      await this.updateJobStatus('completed');

      console.warn(`Crawl completed: ${JSON.stringify(this.statistics)}`);

      return this.statistics;
    } catch (error) {
      this.statistics.duration_seconds = Math.round(
        (Date.now() - startTime) / 1000
      );
      await this.updateStatistics();

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.updateJobStatus('failed', errorMessage);

      throw error;
    }
  }

  /**
   * Generate a unique external ID for a guide
   */
  protected generateExternalId(guide: TravelGuideRaw, url: string): string {
    const title = guide.title || '';
    const author = guide.author_name || '';
    // Use btoa for base64 encoding in browser-compatible way
    const encoded = Buffer.from(title + author + url).toString('base64');
    return `${this.platform}_${encoded.substring(0, 20)}`;
  }
}

/**
 * Sleep helper
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
