/**
 * OpenStreetMap Crawler
 * Crawls POI data from OpenStreetMap using Overpass API
 */

import type { CrawlJob, CrawlJobConfig } from '@pathfinding/crawler-types';

import type { CrawlResult } from './base.crawler.js';

import { Request } from 'crawlee';
import { BaseCrawler } from './base.crawler.js';

// City center coordinates for common Chinese cities
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  北京: { lat: 39.9042, lng: 116.4074 },
  上海: { lat: 31.2304, lng: 121.4737 },
  广州: { lat: 23.1291, lng: 113.2644 },
  深圳: { lat: 22.5431, lng: 114.0579 },
  杭州: { lat: 30.2741, lng: 120.1551 },
  成都: { lat: 30.5728, lng: 104.0668 },
  西安: { lat: 34.3416, lng: 108.9398 },
  南京: { lat: 32.0603, lng: 118.7969 },
  武汉: { lat: 30.5928, lng: 114.3055 },
  重庆: { lat: 29.4316, lng: 106.9123 },
  苏州: { lat: 31.2989, lng: 120.5853 },
  天津: { lat: 39.3434, lng: 117.3616 },
  厦门: { lat: 24.4798, lng: 118.0894 },
  青岛: { lat: 36.0671, lng: 120.3826 },
  大连: { lat: 38.914, lng: 121.6147 },
};

// POI categories mapping for Overpass queries
const CATEGORY_QUERIES: Record<string, string> = {
  restaurant: '[amenity~"restaurant|cafe|fast_food|bar|pub|food_court"]',
  attraction: '[tourism~"attraction|museum|viewpoint|artwork|gallery"]',
  hotel: '[tourism~"hotel|hostel|guest_house|motel"]',
  shopping:
    '[shop~"mall|supermarket|convenience|department_store|marketplace"]',
  transport:
    '[public_transport~"station|stop_position"][railway~"station|halt"]',
  entertainment: '[amenity~"cinema|theatre|nightclub|casino"]',
  service: '[amenity~"bank|hospital|pharmacy|post_office|police"]',
};

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

/**
 * OpenStreetMap crawler using Overpass API
 */
export class OSMCrawler extends BaseCrawler {
  private overpassUrl: string;

  constructor(job: CrawlJob) {
    super(job);
    this.overpassUrl =
      process.env.OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter';
  }

  get platform(): string {
    return 'osm';
  }

  /**
   * Generate Overpass API queries for the configured scope
   */
  generateRequests(config: CrawlJobConfig): Request[] {
    const requests: Request[] = [];
    const categories = config.categories || [
      'restaurant',
      'attraction',
      'hotel',
    ];
    const cities = config.geographic_scope?.cities || ['北京'];
    const radius = 5000; // 5km radius around city center

    for (const city of cities) {
      const coords = CITY_COORDINATES[city];
      if (!coords) {
        console.warn(`Unknown city: ${city}, skipping`);
        continue;
      }

      for (const category of categories) {
        const categoryQuery = CATEGORY_QUERIES[category];
        if (!categoryQuery) {
          console.warn(`Unknown category: ${category}, skipping`);
          continue;
        }

        // Build Overpass QL query
        const query = this.buildOverpassQuery(
          coords.lat,
          coords.lng,
          radius,
          categoryQuery
        );
        const url = `${this.overpassUrl}?data=${encodeURIComponent(query)}`;

        requests.push(
          new Request({
            url,
            userData: { city, category },
          })
        );
      }
    }

    // Also handle bounds-based queries
    if (config.geographic_scope?.bounds) {
      const { ne, sw } = config.geographic_scope.bounds;

      for (const category of categories) {
        const categoryQuery = CATEGORY_QUERIES[category];
        if (!categoryQuery) continue;

        const query = this.buildBoundsQuery(
          sw[0],
          sw[1],
          ne[0],
          ne[1],
          categoryQuery
        );
        const url = `${this.overpassUrl}?data=${encodeURIComponent(query)}`;

        requests.push(
          new Request({
            url,
            userData: { category, bounds: config.geographic_scope.bounds },
          })
        );
      }
    }

    return requests;
  }

  /**
   * Build Overpass QL query for radius search
   */
  private buildOverpassQuery(
    lat: number,
    lng: number,
    radius: number,
    categoryQuery: string
  ): string {
    return `
      [out:json][timeout:60];
      (
        node${categoryQuery}(around:${radius},${lat},${lng});
        way${categoryQuery}(around:${radius},${lat},${lng});
        relation${categoryQuery}(around:${radius},${lat},${lng});
      );
      out center body;
    `.trim();
  }

  /**
   * Build Overpass QL query for bounding box search
   */
  private buildBoundsQuery(
    minLat: number,
    minLng: number,
    maxLat: number,
    maxLng: number,
    categoryQuery: string
  ): string {
    const bbox = `${minLat},${minLng},${maxLat},${maxLng}`;
    return `
      [out:json][timeout:60];
      (
        node${categoryQuery}(${bbox});
        way${categoryQuery}(${bbox});
        relation${categoryQuery}(${bbox});
      );
      out center body;
    `.trim();
  }

  /**
   * Parse Overpass API JSON response
   */
  async parseContent(content: string, url: string): Promise<CrawlResult[]> {
    const results: CrawlResult[] = [];

    try {
      // Extract JSON from page content (Overpass returns raw JSON)
      const jsonMatch = content.match(/\{[\s\S]*"elements"[\s\S]*\}/);
      if (!jsonMatch) {
        // Try to parse the content directly as JSON
        const parsed: OverpassResponse = JSON.parse(content);
        return this.processOverpassResponse(parsed);
      }

      const parsed: OverpassResponse = JSON.parse(jsonMatch[0]);
      return this.processOverpassResponse(parsed);
    } catch (error) {
      console.error(`Failed to parse Overpass response from ${url}:`, error);

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

  /**
   * Process Overpass API response elements
   */
  private processOverpassResponse(response: OverpassResponse): CrawlResult[] {
    const results: CrawlResult[] = [];

    for (const element of response.elements) {
      // Skip elements without name
      if (!element.tags?.name) continue;

      // Get coordinates (handle ways/relations with center)
      const lat = element.lat || element.center?.lat;
      const lon = element.lon || element.center?.lon;

      if (!lat || !lon) continue;

      const externalId = `${element.type}/${element.id}`;

      results.push({
        url: `https://www.openstreetmap.org/${externalId}`,
        content: JSON.stringify(element),
        contentType: 'json',
        externalId,
      });
    }

    return results;
  }
}
