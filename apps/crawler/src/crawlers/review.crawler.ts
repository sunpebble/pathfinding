/**
 * Review Crawler
 * Crawls POI reviews from various platforms
 */

import type {
  CrawlJob,
  CrawlJobConfig,
  POIReview,
} from '@pathfinding/crawler-types';
import type { CrawlResult } from './base.crawler.js';

import { Request } from 'crawlee';
import { analyzeSentiment } from '../processors/sentiment-analyzer.js';
import { BaseCrawler, calculateBackoff, sleep } from './base.crawler.js';

interface AmapReview {
  id: string;
  content: string;
  rating?: number;
  author?: string;
  author_level?: string;
  publish_time?: string;
  helpful_count?: number;
  reply_count?: number;
  images?: string[];
}

interface AmapDetailResponse {
  status: string;
  infocode: string;
  pois?: Array<{
    id: string;
    name: string;
    biz_ext?: {
      rating?: string;
      cost?: string;
    };
    indoor_data?: {
      cpid?: string;
    };
  }>;
}

/**
 * Review Crawler for fetching POI reviews
 */
export class ReviewCrawler extends BaseCrawler {
  private apiKey: string;
  private baseUrl: string;
  private requestCount: number = 0;
  private maxRequestsPerRun: number = 1000;

  constructor(job: CrawlJob) {
    super(job);

    const apiKey = process.env.AMAP_API_KEY;
    if (!apiKey) {
      throw new Error('AMAP_API_KEY environment variable is required');
    }

    this.apiKey = apiKey.split(',')[0].trim();
    this.baseUrl = 'https://restapi.amap.com/v3';
  }

  get platform(): string {
    return 'amap_reviews';
  }

  /**
   * Generate requests for POI detail pages (which contain reviews)
   */
  generateRequests(config: CrawlJobConfig): Request[] {
    const requests: Request[] = [];
    // Get POI IDs from filters if provided
    const poiIds = (config.filters?.poi_ids as string[]) || [];

    for (const poiId of poiIds) {
      const params = new URLSearchParams({
        key: this.apiKey,
        id: poiId,
        extensions: 'all',
        output: 'json',
      });

      requests.push(
        new Request({
          url: `${this.baseUrl}/place/detail?${params.toString()}`,
          userData: { poiId, type: 'detail' },
        })
      );
    }

    return requests;
  }

  /**
   * Parse review content from API response
   */
  async parseContent(content: string, url: string): Promise<CrawlResult[]> {
    const results: CrawlResult[] = [];

    // Rate limiting
    this.requestCount++;
    if (this.requestCount > this.maxRequestsPerRun) {
      console.warn('Review crawler: max requests reached, stopping');
      return results;
    }

    // Add delay between requests
    if (this.requestCount % 10 === 0) {
      await sleep(calculateBackoff(1));
    }

    try {
      const parsed: AmapDetailResponse = JSON.parse(content);

      if (parsed.status !== '1') {
        console.error(`Amap API error: ${parsed.infocode}`);
        return results;
      }

      // Store the detail response for processing
      if (parsed.pois && parsed.pois.length > 0) {
        const poi = parsed.pois[0];
        results.push({
          url,
          content: JSON.stringify(poi),
          contentType: 'json',
          externalId: poi.id,
        });
      }
    } catch (error) {
      console.error(`Failed to parse review response from ${url}:`, error);
    }

    return results;
  }

  /**
   * Process reviews and add sentiment analysis
   */
  static processReviews(
    reviews: AmapReview[],
    poiId: string,
    platform: string = 'amap'
  ): Partial<POIReview>[] {
    return reviews.map((review) => {
      const sentiment = analyzeSentiment(review.content);

      return {
        poi_id: poiId,
        content: review.content,
        rating: review.rating,
        author_name: review.author,
        author_level: review.author_level,
        published_at: review.publish_time
          ? new Date(review.publish_time)
          : undefined,
        helpful_count: review.helpful_count || 0,
        reply_count: review.reply_count || 0,
        sentiment_score: sentiment.score,
        sentiment_label: sentiment.label,
        source_platform: platform,
        source_external_id: review.id,
      };
    });
  }
}

/**
 * Batch fetch reviews for multiple POIs
 */
export async function batchFetchReviews(
  poiIds: string[],
  options: { limit?: number; platform?: string } = {}
): Promise<Map<string, Partial<POIReview>[]>> {
  const { limit = 50, platform: _platform = 'amap' } = options;
  const results = new Map<string, Partial<POIReview>[]>();

  // For now, return empty results as actual review fetching
  // requires authenticated API access or web scraping
  for (const poiId of poiIds.slice(0, limit)) {
    results.set(poiId, []);
  }

  console.warn(`Review fetch placeholder: ${poiIds.length} POIs requested`);
  return results;
}
