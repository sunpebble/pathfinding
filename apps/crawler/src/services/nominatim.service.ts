/**
 * Nominatim Geocoding Service
 * Uses OpenStreetMap's free geocoding API with caching and validation
 */

export interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  class: string;
  importance: number;
}

export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  address: string;
  confidence: number;
  source: 'cache' | 'nominatim';
  placeType?: string;
}

/**
 * China bounding box for coordinate validation
 */
const CHINA_BOUNDS = {
  minLat: 18.0,
  maxLat: 54.0,
  minLng: 73.0,
  maxLng: 135.0,
};

/**
 * City center coordinates for distance-based validation
 */
const CITY_CENTERS: Record<
  string,
  { lat: number; lng: number; radius: number }
> = {
  北京: { lat: 39.9042, lng: 116.4074, radius: 100 },
  上海: { lat: 31.2304, lng: 121.4737, radius: 80 },
  广州: { lat: 23.1291, lng: 113.2644, radius: 70 },
  深圳: { lat: 22.5431, lng: 114.0579, radius: 60 },
  杭州: { lat: 30.2741, lng: 120.1551, radius: 70 },
  成都: { lat: 30.5728, lng: 104.0668, radius: 80 },
  西安: { lat: 34.3416, lng: 108.9398, radius: 70 },
  南京: { lat: 32.0603, lng: 118.7969, radius: 70 },
  武汉: { lat: 30.5928, lng: 114.3055, radius: 80 },
  重庆: { lat: 29.4316, lng: 106.9123, radius: 100 },
  厦门: { lat: 24.4798, lng: 118.0894, radius: 50 },
  青岛: { lat: 36.0671, lng: 120.3826, radius: 60 },
  大连: { lat: 38.914, lng: 121.6147, radius: 60 },
  苏州: { lat: 31.2989, lng: 120.5853, radius: 60 },
  三亚: { lat: 18.2528, lng: 109.5117, radius: 50 },
  丽江: { lat: 26.8721, lng: 100.2336, radius: 40 },
  桂林: { lat: 25.2742, lng: 110.2902, radius: 50 },
  昆明: { lat: 24.8801, lng: 102.8329, radius: 60 },
  拉萨: { lat: 29.65, lng: 91.1, radius: 50 },
  香港: { lat: 22.3193, lng: 114.1694, radius: 40 },
  澳门: { lat: 22.1987, lng: 113.5439, radius: 20 },
};

/**
 * POI type weights for ranking results
 * Higher weight = more likely to be a tourist POI
 */
const POI_TYPE_WEIGHTS: Record<string, number> = {
  tourism: 1.5,
  amenity: 1.2,
  historic: 1.4,
  leisure: 1.3,
  shop: 0.8,
  building: 0.7,
  place: 0.6,
  boundary: 0.3,
  highway: 0.2,
};

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'Pathfinding/1.0 (travel planning app)';
const REQUEST_DELAY_MS = 1100; // Nominatim rate limit: 1 request/second (add buffer)

/**
 * Simple in-memory LRU cache for geocoding results
 */
class GeocodingCache {
  private cache = new Map<
    string,
    { result: GeocodedLocation | null; timestamp: number }
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

  get(query: string, city?: string): GeocodedLocation | null | undefined {
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
    result: GeocodedLocation | null
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
 * Calculate haversine distance between two points in km
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Validate if coordinates are within China bounds
 */
function isInChinaBounds(lat: number, lng: number): boolean {
  return (
    lat >= CHINA_BOUNDS.minLat &&
    lat <= CHINA_BOUNDS.maxLat &&
    lng >= CHINA_BOUNDS.minLng &&
    lng <= CHINA_BOUNDS.maxLng
  );
}

/**
 * Validate if coordinates are within reasonable distance from city center
 */
function isNearCity(lat: number, lng: number, city: string): boolean {
  const cityInfo = CITY_CENTERS[city] || CITY_CENTERS[city.replace('市', '')];
  if (!cityInfo) return true; // Unknown city, allow

  const distance = haversineDistance(lat, lng, cityInfo.lat, cityInfo.lng);
  return distance <= cityInfo.radius;
}

/**
 * NominatimService - Open-source geocoding using OpenStreetMap
 */
export class NominatimService {
  private lastRequestTime = 0;
  private cache: GeocodingCache;

  constructor() {
    this.cache = new GeocodingCache(2000, 48); // 2000 entries, 48 hour TTL
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
   * Calculate score for a geocoding result
   */
  private scoreResult(result: NominatimResult, city?: string): number {
    let score = result.importance;

    // Boost by POI type
    const typeWeight = POI_TYPE_WEIGHTS[result.class] || 0.5;
    score *= typeWeight;

    // Boost if address contains city name
    if (city) {
      const cityNorm = city.replace('市', '');
      if (
        result.display_name.includes(city) ||
        result.display_name.includes(cityNorm)
      ) {
        score *= 1.5;
      }
    }

    // Penalize generic results
    if (result.type === 'administrative' || result.type === 'city') {
      score *= 0.5;
    }

    return score;
  }

  /**
   * Geocode a location by name and optional city
   * Fetches multiple results and picks the best match with validation
   */
  async geocode(
    query: string,
    city?: string
  ): Promise<GeocodedLocation | null> {
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

    // Build search queries with different strategies
    const searchQueries = this.buildSearchQueries(cleanQuery, city);

    for (const searchQuery of searchQueries) {
      try {
        const params = new URLSearchParams({
          q: searchQuery,
          format: 'json',
          limit: '10', // Fetch more results for better selection
          'accept-language': 'zh,en',
          countrycodes: 'cn',
          addressdetails: '1', // Get detailed address info
        });

        const response = await fetch(`${NOMINATIM_URL}/search?${params}`, {
          headers: {
            'User-Agent': USER_AGENT,
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          console.error(`Nominatim error: ${response.status}`);
          continue;
        }

        const results = (await response.json()) as NominatimResult[];

        if (results.length === 0) {
          continue;
        }

        // Filter and score results
        const validResults = results
          .map((r) => ({
            result: r,
            lat: Number.parseFloat(r.lat),
            lng: Number.parseFloat(r.lon),
            score: this.scoreResult(r, city),
          }))
          .filter(({ lat, lng }) => {
            // Must be in China
            if (!isInChinaBounds(lat, lng)) return false;
            // Must be near city if specified
            if (city && !isNearCity(lat, lng, city)) return false;
            return true;
          })
          .sort((a, b) => b.score - a.score);

        if (validResults.length === 0) {
          continue;
        }

        const best = validResults[0];
        const location: GeocodedLocation = {
          latitude: best.lat,
          longitude: best.lng,
          address: best.result.display_name,
          confidence: Math.min(1, best.score),
          source: 'nominatim',
          placeType: `${best.result.class}:${best.result.type}`,
        };

        this.cache.set(query, city, location);
        return location;
      } catch (error) {
        console.error('Geocoding error:', error);
      }

      await this.throttle();
    }

    // Cache negative result
    this.cache.set(query, city, null);
    return null;
  }

  /**
   * Build multiple search queries for better coverage
   */
  private buildSearchQueries(query: string, city?: string): string[] {
    const queries: string[] = [];

    if (city) {
      const cityNorm = city.replace('市', '');
      // Most specific first
      queries.push(`${query}, ${city}, 中国`);
      queries.push(`${query}, ${cityNorm}, 中国`);
      queries.push(`${query} ${city}`);
      queries.push(`${city} ${query}`);
    }

    queries.push(`${query}, 中国`);
    queries.push(query);

    return queries;
  }

  /**
   * Get city center coordinates as fallback
   */
  getCityCenter(city: string): GeocodedLocation | null {
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
  getCacheStats(): { size: number } {
    return { size: this.cache.size };
  }

  /**
   * Clear the geocoding cache
   */
  clearCache(): void {
    this.cache.clear();
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
  ): Promise<Map<string, GeocodedLocation>> {
    const results = new Map<string, GeocodedLocation>();
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
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(
    lat: number,
    lon: number
  ): Promise<{ address: string; city?: string } | null> {
    // Validate coordinates first
    if (!isInChinaBounds(lat, lon)) {
      return null;
    }

    await this.throttle();

    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        format: 'json',
        'accept-language': 'zh',
        addressdetails: '1',
      });

      const response = await fetch(`${NOMINATIM_URL}/reverse?${params}`, {
        headers: {
          'User-Agent': USER_AGENT,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return null;
      }

      const result = (await response.json()) as {
        display_name: string;
        address?: {
          city?: string;
          state?: string;
          county?: string;
        };
      };

      return {
        address: result.display_name,
        city:
          result.address?.city ||
          result.address?.county ||
          result.address?.state,
      };
    } catch {
      return null;
    }
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
let nominatimServiceInstance: NominatimService | null = null;

export function getNominatimService(): NominatimService {
  if (!nominatimServiceInstance) {
    nominatimServiceInstance = new NominatimService();
  }
  return nominatimServiceInstance;
}

export default NominatimService;
