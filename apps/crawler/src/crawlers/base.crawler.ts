/**
 * Base Crawler Abstract Class
 * Foundation for all platform-specific crawlers
 */

import type {
  CrawlJob,
  CrawlJobConfig,
  CrawlJobStatistics,
} from '@pathfinding/crawler-types';
import type { PlaywrightCrawlingContext, Request } from 'crawlee';
import type { Id } from '../lib/convex.js';
import { Buffer } from 'node:buffer';

import { PlaywrightCrawler } from 'crawlee';
import { api, convex } from '../lib/convex.js';
import { hashContent } from '../lib/hash.js';

export interface CrawlContext {
  job: CrawlJob;
  statistics: CrawlJobStatistics;
}

export interface CrawlResult {
  url: string;
  content: string;
  contentType: 'html' | 'json' | 'xml';
  externalId?: string;
  httpStatus?: number;
  httpHeaders?: Record<string, string>;
}

export interface CrawlerOptions {
  maxConcurrency?: number;
  maxRequestsPerMinute?: number;
  maxRetries?: number;
  requestHandlerTimeoutSecs?: number;
  headless?: boolean;
}

/**
 * Abstract base class for all crawlers
 * Provides common functionality for crawling and storing raw data
 */
export abstract class BaseCrawler {
  protected job: CrawlJob;
  protected statistics: CrawlJobStatistics;
  protected abortController: AbortController;

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
  }

  /**
   * Platform identifier (e.g., 'osm', 'amap')
   */
  abstract get platform(): string;

  /**
   * Generate initial request URLs based on job configuration
   */
  abstract generateRequests(config: CrawlJobConfig): Request[];

  /**
   * Parse crawled content and extract data
   */
  abstract parseContent(content: string, url: string): Promise<CrawlResult[]>;

  /**
   * Get crawler-specific options
   */
  protected getCrawlerOptions(): CrawlerOptions {
    const rateLimit = this.job.config.rate_limit;
    return {
      maxConcurrency: rateLimit?.max_concurrent || 5,
      maxRequestsPerMinute: (rateLimit?.requests_per_second || 1) * 60,
      maxRetries: 3,
      requestHandlerTimeoutSecs: 60,
      headless: process.env.CRAWLEE_HEADLESS !== 'false',
    };
  }

  /**
   * Store a raw crawl record in the database
   * NOTE: Raw crawl records are now stored via Convex
   */
  protected async storeRawRecord(result: CrawlResult): Promise<void> {
    const contentHash = hashContent(result.content);

    // For travel guides, we use the guide-processor instead of raw records
    // This is a stub that counts the record
    console.warn(
      `Storing record: ${result.url} (hash: ${contentHash.substring(0, 8)}...)`
    );

    this.statistics.records_extracted++;
    this.statistics.bytes_downloaded += Buffer.byteLength(
      result.content,
      'utf8'
    );
  }

  /**
   * Update job statistics in the database
   */
  protected async updateStatistics(): Promise<void> {
    try {
      await convex.mutation(api.crawlJobs.updateStatistics, {
        id: this.job.id as Id<'crawlJobs'>,
        statistics: this.statistics,
      });
    } catch (error) {
      console.error('Failed to update statistics:', error);
    }
  }

  /**
   * Update job status in the database
   */
  protected async updateJobStatus(
    status: 'running' | 'completed' | 'failed' | 'cancelled',
    errorMessage?: string
  ): Promise<void> {
    try {
      await convex.mutation(api.crawlJobs.updateStatus, {
        id: this.job.id as Id<'crawlJobs'>,
        status,
        startedAt: status === 'running' ? Date.now() : undefined,
        completedAt: status !== 'running' ? Date.now() : undefined,
        errorMessage,
      });
    } catch (error) {
      console.error('Failed to update job status:', error);
    }
  }

  /**
   * Cancel the crawl job
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
        `Starting ${this.platform} crawl with ${requests.length} initial requests`
      );

      const crawler = new PlaywrightCrawler({
        maxConcurrency: options.maxConcurrency,
        maxRequestsPerMinute: options.maxRequestsPerMinute,
        maxRequestRetries: options.maxRetries,
        requestHandlerTimeoutSecs: options.requestHandlerTimeoutSecs,
        headless: options.headless,

        requestHandler: async (context: PlaywrightCrawlingContext) => {
          // Check for abort
          if (this.abortController.signal.aborted) {
            console.warn('Crawl aborted');
            return;
          }

          this.statistics.requests_total++;

          try {
            // Get page content
            const content = await context.page.content();
            const url = context.request.url;

            // Parse content using platform-specific logic
            const results = await this.parseContent(content, url);

            // Store each result
            for (const result of results) {
              await this.storeRawRecord({
                ...result,
                httpStatus: 200,
              });
            }

            this.statistics.requests_success++;

            // Update statistics periodically
            if (this.statistics.requests_total % 10 === 0) {
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

      // Add initial requests
      await crawler.addRequests(requests);

      // Run crawler
      await crawler.run();

      // Calculate duration
      this.statistics.duration_seconds = Math.round(
        (Date.now() - startTime) / 1000
      );

      // Update final statistics
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
}

/**
 * Exponential backoff delay calculation
 */
export function calculateBackoff(
  attempt: number,
  baseDelay: number = 1000
): number {
  const maxDelay = 60000; // 60 seconds
  const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
  // Add jitter
  return delay + Math.random() * 1000;
}

/**
 * Sleep helper
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
