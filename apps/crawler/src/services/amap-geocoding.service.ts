/**
 * AMap (Gaode) Geocoding Service
 * Uses AMap's Place Text Search API for geocoding Chinese POIs
 * Supports API key rotation, caching, and GCJ-02 to WGS-84 conversion
 */

import type { Coordinates } from '../lib/geo.js';

import { gcj02ToWgs84 } from '../processors/coordinate-validator.js';
import {
  CITY_CENTERS,
  isInChinaBounds,
  isNearCity,
} from './geo-constants.js';

/**
 * AMap Place Text Search API response types
 */
export interface AmapPlaceResult {
  id: string;
  name: string;
  type: string;
  typecode: string;
  address: string;
  location: string;
  tel?: string;
  pname?: string;
  cityname?: string;
  adname?: string;
  photos?: Array<{ url: string }>;
}

export interface AmapSearchResponse {
  status: string;
  count: string;
  infocode: string;
  pois: AmapPlaceResult[];
}

export interface AmapGeocodedLocation {
  latitude: number;
  longitude: number;
  address: string;
  confidence: number;
  source: 'cache' | 'amap';
  placeType?: string;
  amapId?: string;
}

/**
 * Match type for confidence scoring
 */
type MatchType = 'exact' | 'fuzzy' | 'partial' | 'none';

/**
 * City codes for AMap API
 */
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
  三亚: '460200',
  丽江: '530700',
  桂林: '450300',
  昆明: '530100',
  拉萨: '540100',
  香港: '810000',
  澳门: '820000',
};

/**
 * POI type weights for ranking results
 * Higher weight = more likely to be a tourist POI
 */
const POI_TYPE_WEIGHTS: Record<string, number> = {
  '110000': 1.5, // 风景名胜
  '140000': 1.4, // 科教文化服务
  '100000': 1.2, // 住宿服务
  '050000': 1.1, // 餐饮服务
  '060000': 0.9, // 购物服务
  '080000': 1.3, // 体育休闲服务
  '150000': 0.6, // 交通设施服务
  '070000': 0.7, // 生活服务
  '090000': 0.5, // 医疗保健服务
};

const AMAP_BASE_URL = 'https://restapi.amap.com/v3';
const REQUEST_DELAY_MS = 350; // AMap rate limit: ~3 requests/second

/**
 * Simple in-memory LRU cache for geocoding results
 */
class GeocodingCache {
  private cache = new Map<
    string,
    { result: AmapGeocodedLocation | null; timestamp: number }
  >();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize = 1000, ttlHours = 24) {
    this.maxSize = maxSize;
    this.ttlMs = ttlHours * 60 * 60 * 1000;
  }

  private generateKey(query: string, city?: string): string {
    return `${query.toLowerCase().trim()}|${(city || '').toLowerCase().trim()}`;
  }

  get(query: string, city?: string): AmapGeocodedLocation | null | undefined {
    const key = this.generateKey(query, city);
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.result;
  }

  set(
    query: string,
    city: string | undefined,
    result: AmapGeocodedLocation | null
  ): void {
    const key = this.generateKey(query, city);

    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, { result, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Determine match type based on query and result name similarity
 */
function determineMatchType(query: string, resultName: string): MatchType {
  const normalizedQuery = query.toLowerCase().trim();
  const normalizedResult = resultName.toLowerCase().trim();

  // Exact match
  if (normalizedQuery === normalizedResult) {
    return 'exact';
  }

  // Result contains query or query contains result
  if (
    normalizedResult.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedResult)
  ) {
    return 'fuzzy';
  }

  // Check for significant word overlap
  const queryWords = normalizedQuery.split(/[\s,，、·]+/).filter(Boolean);
  const resultWords = normalizedResult.split(/[\s,，、·]+/).filter(Boolean);

  const matchingWords = queryWords.filter((word) =>
    resultWords.some((rw) => rw.includes(word) || word.includes(rw))
  );

  if (matchingWords.length > 0) {
    return 'partial';
  }

  return 'none';
}

/**
 * Get confidence score based on match type
 */
function getConfidenceFromMatchType(matchType: MatchType): number {
  switch (matchType) {
    case 'exact':
      return 0.95;
    case 'fuzzy':
      return 0.8;
    case 'partial':
      return 0.6;
    case 'none':
      return 0.3;
  }
}

/**
 * AmapGeocodingService - Geocoding using AMap's Place Text Search API
 */
export class AmapGeocodingService {
  private lastRequestTime = 0;
  private cache: GeocodingCache;
  private apiKeyPool: string[];
  private currentKeyIndex: number;
  private requestCount: Map<string, number>;

  constructor() {
    const apiKey = process.env.AMAP_API_KEY;
    if (!apiKey) {
      throw new Error('AMAP_API_KEY environment variable is required');
    }

    // Support multiple API keys for rate limit management
    this.apiKeyPool = apiKey.split(',').map((k) => k.trim());
    this.currentKeyIndex = 0;
    this.requestCount = new Map();
    this.cache = new GeocodingCache(2000, 48); // 2000 entries, 48 hour TTL
  }

  /**
   * Get current API key
   */
  private get apiKey(): string {
    return this.apiKeyPool[this.currentKeyIndex];
  }

  /**
   * Get next API key (for rotation)
   */
  private rotateApiKey(): string {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeyPool.length;
    return this.apiKeyPool[this.currentKeyIndex];
  }

  /**
   * Check and handle rate limiting
   */
  private async checkRateLimit(): Promise<void> {
    const currentKey = this.apiKeyPool[this.currentKeyIndex];
    const count = this.requestCount.get(currentKey) || 0;

    // AMap free tier: 5000 requests/day per key
    const maxRequestsPerKey = 5000;

    if (count >= maxRequestsPerKey) {
      // Try rotating to next key
      if (this.apiKeyPool.length > 1) {
        console.warn('AMap API key rate limit reached, rotating to next key');
        this.rotateApiKey();
      } else {
        // No more keys, wait and retry
        console.warn('All AMap API keys exhausted, waiting before retry');
        await new Promise((resolve) => setTimeout(resolve, 30000));
      }
    }
  }

  /**
   * Record API request
   */
  private recordRequest(): void {
    const count = this.requestCount.get(this.apiKey) || 0;
    this.requestCount.set(this.apiKey, count + 1);
  }

  /**
   * Wait to respect rate limits
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < REQUEST_DELAY_MS) {
      await new Promise((resolve) =>
        setTimeout(resolve, REQUEST_DELAY_MS - elapsed)
      );
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Clean query string for better geocoding results
   */
  private cleanQuery(query: string): string {
    return query
      .replace(/[（(].*?[）)]/g, '') // Remove parentheses content
      .replace(/["'「」『』]/g, '') // Remove quotes
      .replace(/[·•・]/g, '') // Remove middle dots
      .replace(/分店|店|总店|旗舰店/g, '') // Remove store suffixes
      .replace(/\d+号店/g, '') // Remove numbered branches
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Parse location string "lng,lat" to coordinates
   */
  private parseLocation(location: string): Coordinates | null {
    const parts = location.split(',');
    if (parts.length !== 2) return null;

    const lng = Number.parseFloat(parts[0]);
    const lat = Number.parseFloat(parts[1]);

    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return { latitude: lat, longitude: lng };
  }

  /**
   * Get POI type weight for scoring
   */
  private getTypeWeight(typecode: string): number {
    // Get major category (first 2 digits)
    const majorCode = `${typecode.substring(0, 2)}0000`;
    return POI_TYPE_WEIGHTS[majorCode] || 1.0;
  }

  /**
   * Score a search result for ranking
   */
  private scoreResult(
    result: AmapPlaceResult,
    query: string,
    city?: string
  ): number {
    let score = 1.0;

    // Match type scoring
    const matchType = determineMatchType(query, result.name);
    score *= getConfidenceFromMatchType(matchType);

    // Boost by POI type weight
    score *= this.getTypeWeight(result.typecode);

    // Boost if city matches
    if (city) {
      const cityNorm = city.replace('市', '');
      if (
        result.cityname?.includes(city) ||
        result.cityname?.includes(cityNorm) ||
        result.adname?.includes(city) ||
        result.adname?.includes(cityNorm)
      ) {
        score *= 1.3;
      }
    }

    return score;
  }

  /**
   * Geocode a location by name and optional city
   * Fetches results from AMap Place Text Search API
   */
  async geocode(
    query: string,
    city?: string
  ): Promise<AmapGeocodedLocation | null> {
    // Check cache first
    const cached = this.cache.get(query, city);
    if (cached !== undefined) {
      if (cached) {
        return { ...cached, source: 'cache' };
      }
      return null; // Cached negative result
    }

    const cleanQuery = this.cleanQuery(query);
    if (!cleanQuery || cleanQuery.length < 2) {
      this.cache.set(query, city, null);
      return null;
    }

    await this.throttle();
    await this.checkRateLimit();

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        keywords: cleanQuery,
        offset: '10', // Get more results for better selection
        page: '1',
        extensions: 'base',
        output: 'json',
      });

      // Add city filter if provided
      if (city) {
        const cityCode = CITY_CODES[city] || CITY_CODES[city.replace('市', '')];
        if (cityCode) {
          params.set('city', cityCode);
        } else {
          // Use city name if no code available
          params.set('city', city);
        }
        params.set('citylimit', 'true');
      }

      const response = await fetch(
        `${AMAP_BASE_URL}/place/text?${params.toString()}`,
        {
          signal: AbortSignal.timeout(15000),
        }
      );

      this.recordRequest();

      if (!response.ok) {
        console.error(`AMap geocoding error: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as AmapSearchResponse;

      // Check API response status
      if (data.status !== '1') {
        console.error(`AMap API error: ${data.infocode}`);

        // Handle rate limiting (10003 = daily quota exceeded)
        if (data.infocode === '10003' || data.infocode === '10004') {
          console.warn('AMap rate limit detected, rotating API key');
          this.rotateApiKey();
        }

        return null;
      }

      if (!data.pois || data.pois.length === 0) {
        this.cache.set(query, city, null);
        return null;
      }

      // Filter and score results
      const validResults = data.pois
        .map((poi) => {
          const gcjCoords = this.parseLocation(poi.location);
          if (!gcjCoords) return null;

          // Convert GCJ-02 to WGS-84
          const wgsCoords = gcj02ToWgs84(
            gcjCoords.latitude,
            gcjCoords.longitude
          );

          return {
            poi,
            lat: wgsCoords.latitude,
            lng: wgsCoords.longitude,
            score: this.scoreResult(poi, cleanQuery, city),
            matchType: determineMatchType(cleanQuery, poi.name),
          };
        })
        .filter(
          (
            r
          ): r is NonNullable<typeof r> & {
            poi: AmapPlaceResult;
            lat: number;
            lng: number;
            score: number;
            matchType: MatchType;
          } => {
            if (!r) return false;
            // Must be in China
            if (!isInChinaBounds(r.lat, r.lng)) return false;
            // Must be near city if specified
            if (city && !isNearCity(r.lat, r.lng, city)) return false;
            return true;
          }
        )
        .sort((a, b) => b.score - a.score);

      if (validResults.length === 0) {
        this.cache.set(query, city, null);
        return null;
      }

      const best = validResults[0];
      const confidence = getConfidenceFromMatchType(best.matchType);

      const location: AmapGeocodedLocation = {
        latitude: best.lat,
        longitude: best.lng,
        address:
          best.poi.address ||
          `${best.poi.pname || ''}${best.poi.cityname || ''}${best.poi.adname || ''}`,
        confidence,
        source: 'amap',
        placeType: best.poi.type,
        amapId: best.poi.id,
      };

      this.cache.set(query, city, location);
      return location;
    } catch (error) {
      console.error('AMap geocoding error:', error);
      return null;
    }
  }

  /**
   * Get city center coordinates as fallback
   */
  getCityCenter(city: string): AmapGeocodedLocation | null {
    const cityInfo = CITY_CENTERS[city] || CITY_CENTERS[city.replace('市', '')];
    if (!cityInfo) return null;

    return {
      latitude: cityInfo.lat,
      longitude: cityInfo.lng,
      address: city,
      confidence: 0.3, // Low confidence for city center fallback
      source: 'cache',
      placeType: 'city_center_fallback',
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keyCount: number } {
    return {
      size: this.cache.size,
      keyCount: this.apiKeyPool.length,
    };
  }

  /**
   * Clear the geocoding cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get API usage statistics
   */
  getApiStats(): { keyIndex: number; requestCounts: Record<string, number> } {
    const requestCounts: Record<string, number> = {};
    for (let i = 0; i < this.apiKeyPool.length; i++) {
      const key = this.apiKeyPool[i];
      const maskedKey = `${key.substring(0, 4)}...${key.slice(-4)}`;
      requestCounts[maskedKey] = this.requestCount.get(key) || 0;
    }
    return {
      keyIndex: this.currentKeyIndex,
      requestCounts,
    };
  }

  /**
   * Batch geocode multiple POIs with progress tracking
   */
  async batchGeocode(
    pois: Array<{ name: string; city?: string }>,
    options?: {
      onProgress?: (completed: number, total: number) => void;
      skipInvalid?: boolean;
    }
  ): Promise<Map<string, AmapGeocodedLocation>> {
    const results = new Map<string, AmapGeocodedLocation>();
    const total = pois.length;

    for (let i = 0; i < pois.length; i++) {
      const poi = pois[i];
      const location = await this.geocode(poi.name, poi.city);

      if (location) {
        results.set(poi.name, location);
      } else if (!options?.skipInvalid && poi.city) {
        // Use city center as fallback
        const fallback = this.getCityCenter(poi.city);
        if (fallback) {
          results.set(poi.name, { ...fallback, confidence: 0.1 });
        }
      }

      options?.onProgress?.(i + 1, total);
    }

    return results;
  }

  /**
   * Validate coordinates for a POI
   */
  validateCoordinates(
    lat: number,
    lng: number,
    city?: string
  ): { valid: boolean; reason?: string } {
    if (lat === 0 && lng === 0) {
      return { valid: false, reason: 'Zero coordinates' };
    }

    if (!isInChinaBounds(lat, lng)) {
      return { valid: false, reason: 'Outside China bounds' };
    }

    if (city && !isNearCity(lat, lng, city)) {
      return { valid: false, reason: `Too far from ${city}` };
    }

    return { valid: true };
  }
}

// Singleton instance
let amapGeocodingServiceInstance: AmapGeocodingService | null = null;

export function getAmapGeocodingService(): AmapGeocodingService {
  if (!amapGeocodingServiceInstance) {
    amapGeocodingServiceInstance = new AmapGeocodingService();
  }
  return amapGeocodingServiceInstance;
}

export default AmapGeocodingService;
