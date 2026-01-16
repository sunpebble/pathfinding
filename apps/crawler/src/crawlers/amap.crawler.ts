/**
 * Amap (Gaode) Crawler
 * Crawls POI data from Amap (高德地图) using their Web Service API
 */

import type { CrawlJob, CrawlJobConfig } from '@pathfinding/crawler-types';

import type { CrawlResult } from './base.crawler.js';

import { Request } from 'crawlee';
import { BaseCrawler, calculateBackoff, sleep } from './base.crawler.js';

// Amap POI type codes
// Reference: https://lbs.amap.com/api/webservice/download
const POI_TYPE_CODES: Record<string, string> = {
  restaurant: '050000', // 餐饮服务
  attraction: '110000|140000', // 风景名胜|科教文化服务
  hotel: '100000', // 住宿服务
  shopping: '060000', // 购物服务
  transport: '150000', // 交通设施服务
  entertainment: '080000', // 体育休闲服务
  service: '070000|090000', // 生活服务|医疗保健服务
};

// City codes for Amap API
const CITY_CODES: Record<string, string> = {
  北京: '110000',
  上海: '310000',
  广州: '440100',
  深圳: '440300',
  杭州: '330100',
  成都: '510100',
  西安: '610100',
  南京: '320100',
  武汉: '420100',
  重庆: '500000',
  苏州: '320500',
  天津: '120000',
  厦门: '350200',
  青岛: '370200',
  大连: '210200',
};

interface AmapPOI {
  id: string;
  name: string;
  type: string;
  typecode: string;
  address: string;
  location: string;
  tel?: string;
  website?: string;
  pname?: string;
  cityname?: string;
  adname?: string;
  photos?: Array<{ url: string }>;
  rating?: string;
  cost?: string;
  biz_ext?: {
    rating?: string;
    cost?: string;
    open_time?: string;
  };
}

interface AmapResponse {
  status: string;
  count: string;
  infocode: string;
  pois: AmapPOI[];
}

/**
 * Amap (Gaode) API crawler
 */
export class AmapCrawler extends BaseCrawler {
  private apiKey: string;
  private baseUrl: string;
  private apiKeyPool: string[];
  private currentKeyIndex: number;
  private requestCount: Map<string, number>;

  constructor(job: CrawlJob) {
    super(job);

    const apiKey = process.env.AMAP_API_KEY;
    if (!apiKey) {
      throw new Error('AMAP_API_KEY environment variable is required');
    }

    // Support multiple API keys for rate limit management
    this.apiKeyPool = apiKey.split(',').map((k) => k.trim());
    this.currentKeyIndex = 0;
    this.requestCount = new Map();

    this.apiKey = this.apiKeyPool[0];
    this.baseUrl = 'https://restapi.amap.com/v3';
  }

  get platform(): string {
    return 'amap';
  }

  /**
   * Get next API key (for rotation)
   */
  private getNextApiKey(): string {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeyPool.length;
    return this.apiKeyPool[this.currentKeyIndex];
  }

  /**
   * Check and handle rate limiting
   */
  private async checkRateLimit(): Promise<void> {
    const currentKey = this.apiKeyPool[this.currentKeyIndex];
    const count = this.requestCount.get(currentKey) || 0;

    // Amap free tier: 5000 requests/day per key, ~3 requests/second
    const maxRequestsPerKey = 5000;

    if (count >= maxRequestsPerKey) {
      // Try rotating to next key
      if (this.apiKeyPool.length > 1) {
        console.warn(`API key rate limit reached, rotating to next key`);
        this.apiKey = this.getNextApiKey();
      } else {
        // No more keys, wait and retry
        console.warn('All API keys exhausted, waiting before retry');
        await sleep(calculateBackoff(3));
      }
    }
  }

  /**
   * Record API request
   */
  private recordRequest(key: string): void {
    const count = this.requestCount.get(key) || 0;
    this.requestCount.set(key, count + 1);
  }

  /**
   * Generate Amap API requests for the configured scope
   */
  generateRequests(config: CrawlJobConfig): Request[] {
    const requests: Request[] = [];
    const categories = config.categories || [
      'restaurant',
      'attraction',
      'hotel',
    ];
    const cities = config.geographic_scope?.cities || ['北京'];
    const pageSize = 25; // Amap API max page size

    for (const city of cities) {
      const cityCode = CITY_CODES[city];
      if (!cityCode) {
        console.warn(`Unknown city code for: ${city}, using name instead`);
      }

      for (const category of categories) {
        const typeCode = POI_TYPE_CODES[category];
        if (!typeCode) {
          console.warn(`Unknown category: ${category}, skipping`);
          continue;
        }

        // Generate requests for multiple pages
        // Start with page 1, we'll discover more pages as we crawl
        const params = new URLSearchParams({
          key: this.apiKey,
          types: typeCode,
          city: cityCode || city,
          offset: pageSize.toString(),
          page: '1',
          extensions: 'all', // Get detailed info including photos
          output: 'json',
        });

        requests.push(
          new Request({
            url: `${this.baseUrl}/place/text?${params.toString()}`,
            userData: { city, category, page: 1, pageSize },
          })
        );
      }
    }

    // Handle bounds-based queries
    if (config.geographic_scope?.bounds) {
      const { ne, sw } = config.geographic_scope.bounds;
      // Amap polygon format: lng1,lat1;lng2,lat2;...
      const polygon = `${sw[1]},${sw[0]};${ne[1]},${sw[0]};${ne[1]},${ne[0]};${sw[1]},${ne[0]}`;

      for (const category of categories) {
        const typeCode = POI_TYPE_CODES[category];
        if (!typeCode) continue;

        const params = new URLSearchParams({
          key: this.apiKey,
          types: typeCode,
          polygon,
          offset: '25',
          page: '1',
          extensions: 'all',
          output: 'json',
        });

        requests.push(
          new Request({
            url: `${this.baseUrl}/place/polygon?${params.toString()}`,
            userData: {
              category,
              bounds: config.geographic_scope.bounds,
              page: 1,
            },
          })
        );
      }
    }

    return requests;
  }

  /**
   * Parse Amap API JSON response
   */
  async parseContent(content: string, url: string): Promise<CrawlResult[]> {
    const results: CrawlResult[] = [];

    try {
      // Rate limit check
      await this.checkRateLimit();
      this.recordRequest(this.apiKey);

      // Extract JSON from page content
      const jsonMatch = content.match(/\{[\s\S]*"pois"[\s\S]*\}/);
      let parsed: AmapResponse;

      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(content);
      }

      // Check API response status
      if (parsed.status !== '1') {
        console.error(`Amap API error: ${parsed.infocode}`);

        // Handle rate limiting (10003 = daily quota exceeded)
        if (parsed.infocode === '10003' || parsed.infocode === '10004') {
          console.warn('Rate limit detected, rotating API key');
          this.apiKey = this.getNextApiKey();
        }

        return results;
      }

      // Process each POI
      for (const poi of parsed.pois || []) {
        if (!poi.name || !poi.location) continue;

        results.push({
          url: `https://www.amap.com/place/${poi.id}`,
          content: JSON.stringify(poi),
          contentType: 'json',
          externalId: poi.id,
        });
      }

      // Handle pagination: if there are more results, enqueue next page
      // This will be handled by the crawler's addRequests method
    } catch (error) {
      console.error(`Failed to parse Amap response from ${url}:`, error);

      // Store raw content for debugging
      results.push({
        url,
        content,
        contentType: 'json',
        externalId: undefined,
      });
    }

    return results;
  }
}
