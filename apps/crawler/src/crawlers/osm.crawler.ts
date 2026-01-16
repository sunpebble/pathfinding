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
  // Tier 1 cities
  北京: { lat: 39.9042, lng: 116.4074 },
  上海: { lat: 31.2304, lng: 121.4737 },
  广州: { lat: 23.1291, lng: 113.2644 },
  深圳: { lat: 22.5431, lng: 114.0579 },
  // New tier 1 cities
  杭州: { lat: 30.2741, lng: 120.1551 },
  成都: { lat: 30.5728, lng: 104.0668 },
  西安: { lat: 34.3416, lng: 108.9398 },
  南京: { lat: 32.0603, lng: 118.7969 },
  武汉: { lat: 30.5928, lng: 114.3055 },
  重庆: { lat: 29.4316, lng: 106.9123 },
  苏州: { lat: 31.2989, lng: 120.5853 },
  天津: { lat: 39.3434, lng: 117.3616 },
  // Tier 2 cities
  长沙: { lat: 28.2282, lng: 112.9388 },
  郑州: { lat: 34.7466, lng: 113.6254 },
  东莞: { lat: 23.0207, lng: 113.7518 },
  青岛: { lat: 36.0671, lng: 120.3826 },
  沈阳: { lat: 41.8057, lng: 123.4315 },
  宁波: { lat: 29.8683, lng: 121.544 },
  昆明: { lat: 25.0389, lng: 102.7183 },
  合肥: { lat: 31.8206, lng: 117.2272 },
  佛山: { lat: 23.0218, lng: 113.1218 },
  无锡: { lat: 31.4912, lng: 120.3119 },
  厦门: { lat: 24.4798, lng: 118.0894 },
  福州: { lat: 26.0745, lng: 119.2965 },
  大连: { lat: 38.914, lng: 121.6147 },
  哈尔滨: { lat: 45.803, lng: 126.535 },
  济南: { lat: 36.6512, lng: 117.1201 },
  温州: { lat: 28.0, lng: 120.6667 },
  南宁: { lat: 22.817, lng: 108.3665 },
  长春: { lat: 43.8171, lng: 125.3235 },
  // Tier 3 cities
  石家庄: { lat: 38.0428, lng: 114.5149 },
  太原: { lat: 37.87, lng: 112.5489 },
  贵阳: { lat: 26.6477, lng: 106.6302 },
  南昌: { lat: 28.682, lng: 115.8579 },
  金华: { lat: 29.0785, lng: 119.6495 },
  常州: { lat: 31.8112, lng: 119.9741 },
  泉州: { lat: 24.9139, lng: 118.5858 },
  嘉兴: { lat: 30.7522, lng: 120.755 },
  烟台: { lat: 37.4638, lng: 121.4479 },
  惠州: { lat: 23.1115, lng: 114.4152 },
  珠海: { lat: 22.2709, lng: 113.5767 },
  中山: { lat: 22.5176, lng: 113.3926 },
  海口: { lat: 20.044, lng: 110.1999 },
  三亚: { lat: 18.2528, lng: 109.5119 },
  兰州: { lat: 36.0611, lng: 103.8343 },
  乌鲁木齐: { lat: 43.8256, lng: 87.6168 },
  呼和浩特: { lat: 40.8427, lng: 111.7498 },
  银川: { lat: 38.4872, lng: 106.2309 },
  西宁: { lat: 36.6171, lng: 101.7782 },
  拉萨: { lat: 29.652, lng: 91.1721 },
  南通: { lat: 31.9798, lng: 120.8943 },
  绍兴: { lat: 30.0, lng: 120.5833 },
  徐州: { lat: 34.2044, lng: 117.2859 },
  扬州: { lat: 32.3936, lng: 119.4128 },
  镇江: { lat: 32.1871, lng: 119.4247 },
  台州: { lat: 28.6561, lng: 121.4205 },
  威海: { lat: 37.5091, lng: 122.1164 },
  洛阳: { lat: 34.6188, lng: 112.4539 },
  唐山: { lat: 39.6292, lng: 118.1742 },
  秦皇岛: { lat: 39.9385, lng: 119.5977 },
  桂林: { lat: 25.2742, lng: 110.2902 },
  九江: { lat: 29.705, lng: 116.0019 },
  赣州: { lat: 25.831, lng: 114.9347 },
  遵义: { lat: 27.7257, lng: 106.9273 },
  芜湖: { lat: 31.3525, lng: 118.4325 },
  泰州: { lat: 32.4555, lng: 119.9232 },
  宜昌: { lat: 30.6919, lng: 111.2864 },
  襄阳: { lat: 32.009, lng: 112.1227 },
  岳阳: { lat: 29.3572, lng: 113.1289 },
  株洲: { lat: 27.8274, lng: 113.1339 },
  湘潭: { lat: 27.8299, lng: 112.9441 },
  衡阳: { lat: 26.8932, lng: 112.5719 },
  柳州: { lat: 24.3264, lng: 109.4281 },
  北海: { lat: 21.4733, lng: 109.1192 },
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
   * Includes source-level deduplication to handle node/way/relation duplicates
   */
  private processOverpassResponse(response: OverpassResponse): CrawlResult[] {
    // First, deduplicate elements at source level
    const deduped = this.deduplicateElements(response.elements);
    const results: CrawlResult[] = [];

    for (const element of deduped) {
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

  /**
   * Deduplicate OSM elements at source level
   * Same POI can appear as node, way, and relation - keep only one
   * Priority: node > way > relation (nodes have most precise coordinates)
   */
  private deduplicateElements(elements: OverpassElement[]): OverpassElement[] {
    const seen = new Map<string, OverpassElement>();
    const typePriority: Record<string, number> = {
      node: 3,
      way: 2,
      relation: 1,
    };

    for (const el of elements) {
      if (!el.tags?.name) continue;

      // Get coordinates
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      if (!lat || !lon) continue;

      // Create dedup key: name + approximate location (5 decimal places ≈ 1m precision)
      const key = `${el.tags.name.toLowerCase().trim()}_${lat.toFixed(5)}_${lon.toFixed(5)}`;

      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, el);
      } else {
        // Keep the one with higher priority (node > way > relation)
        const existingPriority = typePriority[existing.type] || 0;
        const newPriority = typePriority[el.type] || 0;
        if (newPriority > existingPriority) {
          seen.set(key, el);
        }
      }
    }

    return Array.from(seen.values());
  }
}
