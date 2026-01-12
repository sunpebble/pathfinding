/**
 * Overpass/Nominatim Geocoding Service
 * Uses Overpass API for POI lookup with Nominatim for address resolution
 * Provides cross-validation capability for geocoding results
 */

/**
 * Overpass API element types
 */
export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  version: number;
  generator: string;
  elements: OverpassElement[];
}

export interface OverpassGeocodedLocation {
  latitude: number;
  longitude: number;
  address: string;
  confidence: number;
  source: 'cache' | 'overpass';
  placeType?: string;
  osmId?: string;
  osmType?: string;
  tags?: Record<string, string>;
}

/**
 * Match type for confidence scoring
 */
type MatchType = 'exact' | 'fuzzy' | 'partial' | 'none';

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
 * City center coordinates for distance-based validation and bounds generation
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
  天津: { lat: 39.1256, lng: 117.1909, radius: 70 },
};

/**
 * OSM tag weights for confidence scoring
 * Higher weight = more complete/reliable POI data
 */
const TAG_WEIGHTS: Record<string, number> = {
  name: 2.0,
  'name:zh': 1.5,
  'name:en': 0.5,
  addr: 1.0,
  'addr:street': 0.8,
  'addr:city': 0.5,
  website: 0.3,
  phone: 0.3,
  opening_hours: 0.4,
  tourism: 1.5,
  amenity: 1.2,
  historic: 1.4,
  leisure: 1.3,
  shop: 0.8,
};

/**
 * POI type mapping for Overpass queries
 */
const POI_TYPE_QUERIES: Record<string, string> = {
  tourism:
    '[tourism~"attraction|museum|viewpoint|artwork|gallery|hotel|hostel"]',
  amenity:
    '[amenity~"restaurant|cafe|bar|pub|theatre|cinema|library|place_of_worship"]',
  historic: '[historic~"monument|memorial|castle|ruins|archaeological_site"]',
  leisure: '[leisure~"park|garden|nature_reserve|stadium"]',
  shop: '[shop~"mall|supermarket|department_store"]',
};

const OVERPASS_URL =
  process.env.OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'Pathfinding/1.0 (travel planning app)';
const REQUEST_DELAY_MS = 2000; // Overpass rate limit: be conservative (~10K requests/day)

/**
 * Simple in-memory LRU cache for geocoding results
 */
class GeocodingCache {
  private cache = new Map<
    string,
    { result: OverpassGeocodedLocation | null; timestamp: number }
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

  get(
    query: string,
    city?: string
  ): OverpassGeocodedLocation | null | undefined {
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
    result: OverpassGeocodedLocation | null
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
      return 0.9;
    case 'fuzzy':
      return 0.75;
    case 'partial':
      return 0.55;
    case 'none':
      return 0.25;
  }
}

/**
 * Calculate tag completeness score
 */
function calculateTagScore(tags: Record<string, string>): number {
  let score = 0;
  let maxScore = 0;

  for (const [tag, weight] of Object.entries(TAG_WEIGHTS)) {
    maxScore += weight;
    // Check for tag or prefix match (e.g., addr matches addr:street)
    const hasTag = Object.keys(tags).some(
      (t) => t === tag || t.startsWith(`${tag}:`) || t.startsWith(tag)
    );
    if (hasTag) {
      score += weight;
    }
  }

  return maxScore > 0 ? score / maxScore : 0;
}

/**
 * OverpassGeocodingService - POI lookup using Overpass API
 * Used for cross-validation of geocoding results from other sources
 */
export class OverpassGeocodingService {
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
   * Clean query string for better search results
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
   * Get coordinates from an Overpass element
   */
  private getCoordinates(
    element: OverpassElement
  ): { lat: number; lng: number } | null {
    // For nodes, coordinates are directly on the element
    if (element.lat !== undefined && element.lon !== undefined) {
      return { lat: element.lat, lng: element.lon };
    }

    // For ways/relations, use center if available
    if (element.center) {
      return { lat: element.center.lat, lng: element.center.lon };
    }

    return null;
  }

  /**
   * Get name from tags with fallbacks
   */
  private getName(tags: Record<string, string>): string | null {
    return (
      tags['name:zh'] || tags.name || tags['name:en'] || tags.alt_name || null
    );
  }

  /**
   * Build Overpass QL query for POI name search within city bounds
   */
  private buildNameSearchQuery(
    name: string,
    lat: number,
    lng: number,
    radiusMeters: number
  ): string {
    // Escape special characters in name for regex
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return `
      [out:json][timeout:30];
      (
        node["name"~"${escapedName}",i](around:${radiusMeters},${lat},${lng});
        node["name:zh"~"${escapedName}",i](around:${radiusMeters},${lat},${lng});
        way["name"~"${escapedName}",i](around:${radiusMeters},${lat},${lng});
        way["name:zh"~"${escapedName}",i](around:${radiusMeters},${lat},${lng});
        relation["name"~"${escapedName}",i](around:${radiusMeters},${lat},${lng});
        relation["name:zh"~"${escapedName}",i](around:${radiusMeters},${lat},${lng});
      );
      out center body;
    `.trim();
  }

  /**
   * Build Overpass QL query for POI search with type filter
   */
  private buildTypedSearchQuery(
    name: string,
    lat: number,
    lng: number,
    radiusMeters: number,
    poiType: string
  ): string {
    const typeQuery = POI_TYPE_QUERIES[poiType] || '';
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return `
      [out:json][timeout:30];
      (
        node${typeQuery}["name"~"${escapedName}",i](around:${radiusMeters},${lat},${lng});
        way${typeQuery}["name"~"${escapedName}",i](around:${radiusMeters},${lat},${lng});
        relation${typeQuery}["name"~"${escapedName}",i](around:${radiusMeters},${lat},${lng});
      );
      out center body;
    `.trim();
  }

  /**
   * Score a search result for ranking
   */
  private scoreResult(
    element: OverpassElement,
    query: string,
    cityLat?: number,
    cityLng?: number
  ): number {
    const tags = element.tags || {};
    const name = this.getName(tags);
    if (!name) return 0;

    // Name match score
    const matchType = determineMatchType(query, name);
    let score = getConfidenceFromMatchType(matchType);

    // Tag completeness score
    const tagScore = calculateTagScore(tags);
    score *= 0.7 + tagScore * 0.3;

    // Distance from city center (if available)
    if (cityLat !== undefined && cityLng !== undefined) {
      const coords = this.getCoordinates(element);
      if (coords) {
        const distance = haversineDistance(
          coords.lat,
          coords.lng,
          cityLat,
          cityLng
        );
        // Boost POIs closer to city center
        if (distance < 10) {
          score *= 1.3;
        } else if (distance < 30) {
          score *= 1.1;
        }
      }
    }

    // Boost tourism/amenity POIs
    if (tags.tourism) score *= 1.3;
    if (tags.historic) score *= 1.2;
    if (tags.amenity) score *= 1.1;

    return score;
  }

  /**
   * Build address string from OSM tags
   */
  private buildAddress(tags: Record<string, string>): string {
    const parts: string[] = [];

    // Try structured address first
    if (tags['addr:country']) parts.push(tags['addr:country']);
    if (tags['addr:province'] || tags['addr:state']) {
      parts.push(tags['addr:province'] || tags['addr:state']);
    }
    if (tags['addr:city']) parts.push(tags['addr:city']);
    if (tags['addr:district']) parts.push(tags['addr:district']);
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);

    if (parts.length > 0) {
      return parts.join(', ');
    }

    // Fallback to simple address
    if (tags.addr) return tags.addr;
    if (tags.address) return tags.address;

    // Build from name and location tags
    const name = this.getName(tags) || '';
    if (tags['addr:full']) return tags['addr:full'];

    return name;
  }

  /**
   * Determine POI place type from tags
   */
  private getPlaceType(tags: Record<string, string>): string {
    if (tags.tourism) return `tourism:${tags.tourism}`;
    if (tags.amenity) return `amenity:${tags.amenity}`;
    if (tags.historic) return `historic:${tags.historic}`;
    if (tags.leisure) return `leisure:${tags.leisure}`;
    if (tags.shop) return `shop:${tags.shop}`;
    if (tags.building) return `building:${tags.building}`;
    return 'unknown';
  }

  /**
   * Geocode a location by name and optional city
   * Uses Overpass API to search for POIs by name within city bounds
   */
  async geocode(
    query: string,
    city?: string
  ): Promise<OverpassGeocodedLocation | null> {
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

    // Get city center for search bounds
    const cityInfo = city
      ? CITY_CENTERS[city] || CITY_CENTERS[city.replace('市', '')]
      : null;

    // Default to Beijing if no city specified
    const searchLat = cityInfo?.lat ?? 35.86;
    const searchLng = cityInfo?.lng ?? 104.2;
    const searchRadius = cityInfo ? cityInfo.radius * 1000 : 500000; // Convert km to meters, or use large radius

    await this.throttle();

    try {
      // Try name search first
      const overpassQuery = this.buildNameSearchQuery(
        cleanQuery,
        searchLat,
        searchLng,
        searchRadius
      );

      const response = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        console.error(`Overpass API error: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as OverpassResponse;

      if (!data.elements || data.elements.length === 0) {
        this.cache.set(query, city, null);
        return null;
      }

      // Filter and score results
      const validResults = data.elements
        .map((element) => {
          const coords = this.getCoordinates(element);
          if (!coords) return null;

          const name = this.getName(element.tags || {});
          if (!name) return null;

          return {
            element,
            lat: coords.lat,
            lng: coords.lng,
            name,
            score: this.scoreResult(element, cleanQuery, searchLat, searchLng),
            matchType: determineMatchType(cleanQuery, name),
          };
        })
        .filter(
          (
            r
          ): r is NonNullable<typeof r> & {
            element: OverpassElement;
            lat: number;
            lng: number;
            name: string;
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
      const tags = best.element.tags || {};

      // Calculate final confidence
      const nameConfidence = getConfidenceFromMatchType(best.matchType);
      const tagConfidence = calculateTagScore(tags);
      const confidence = nameConfidence * 0.7 + tagConfidence * 0.3;

      const location: OverpassGeocodedLocation = {
        latitude: best.lat,
        longitude: best.lng,
        address: this.buildAddress(tags),
        confidence: Math.min(0.85, confidence), // Cap at 0.85 since Overpass is less reliable than dedicated geocoders
        source: 'overpass',
        placeType: this.getPlaceType(tags),
        osmId: `${best.element.type}/${best.element.id}`,
        osmType: best.element.type,
        tags,
      };

      this.cache.set(query, city, location);
      return location;
    } catch (error) {
      console.error('Overpass geocoding error:', error);
      return null;
    }
  }

  /**
   * Search for POIs by type within a city
   * Useful for validation and cross-reference
   */
  async searchByType(
    poiType: string,
    city: string,
    name?: string
  ): Promise<OverpassGeocodedLocation[]> {
    const cityInfo = CITY_CENTERS[city] || CITY_CENTERS[city.replace('市', '')];
    if (!cityInfo) return [];

    await this.throttle();

    try {
      const searchName = name ? this.cleanQuery(name) : '.*';
      const overpassQuery = this.buildTypedSearchQuery(
        searchName,
        cityInfo.lat,
        cityInfo.lng,
        cityInfo.radius * 1000,
        poiType
      );

      const response = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        console.error(`Overpass API error: ${response.status}`);
        return [];
      }

      const data = (await response.json()) as OverpassResponse;

      if (!data.elements || data.elements.length === 0) {
        return [];
      }

      return data.elements
        .map((element) => {
          const coords = this.getCoordinates(element);
          if (!coords) return null;

          const tags = element.tags || {};
          const poiName = this.getName(tags);
          if (!poiName) return null;

          if (!isInChinaBounds(coords.lat, coords.lng)) return null;

          const tagConfidence = calculateTagScore(tags);

          return {
            latitude: coords.lat,
            longitude: coords.lng,
            address: this.buildAddress(tags),
            confidence: Math.min(0.85, 0.5 + tagConfidence * 0.35),
            source: 'overpass' as const,
            placeType: this.getPlaceType(tags),
            osmId: `${element.type}/${element.id}`,
            osmType: element.type,
            tags,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);
    } catch (error) {
      console.error('Overpass search error:', error);
      return [];
    }
  }

  /**
   * Validate coordinates by checking if a POI exists nearby in OSM
   * Returns matching POI if found, null otherwise
   */
  async validateCoordinates(
    lat: number,
    lng: number,
    expectedName?: string,
    radiusMeters: number = 100
  ): Promise<OverpassGeocodedLocation | null> {
    if (!isInChinaBounds(lat, lng)) {
      return null;
    }

    await this.throttle();

    try {
      // Search for any POI near the coordinates
      const query = expectedName
        ? this.buildNameSearchQuery(
            this.cleanQuery(expectedName),
            lat,
            lng,
            radiusMeters
          )
        : `
            [out:json][timeout:15];
            (
              node(around:${radiusMeters},${lat},${lng})["name"];
              way(around:${radiusMeters},${lat},${lng})["name"];
            );
            out center body;
          `.trim();

      const response = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as OverpassResponse;

      if (!data.elements || data.elements.length === 0) {
        return null;
      }

      // Find best matching element
      let best: {
        element: OverpassElement;
        coords: { lat: number; lng: number };
        score: number;
      } | null = null;

      for (const element of data.elements) {
        const coords = this.getCoordinates(element);
        if (!coords) continue;

        const tags = element.tags || {};
        const name = this.getName(tags);
        if (!name) continue;

        let score = calculateTagScore(tags);

        // Boost if name matches expected
        if (expectedName) {
          const matchType = determineMatchType(expectedName, name);
          score *= getConfidenceFromMatchType(matchType);
        }

        // Boost closer POIs
        const distance = haversineDistance(lat, lng, coords.lat, coords.lng);
        score *= 1 - distance / radiusMeters;

        if (!best || score > best.score) {
          best = { element, coords, score };
        }
      }

      if (!best) return null;

      const tags = best.element.tags || {};

      return {
        latitude: best.coords.lat,
        longitude: best.coords.lng,
        address: this.buildAddress(tags),
        confidence: Math.min(0.85, best.score),
        source: 'overpass',
        placeType: this.getPlaceType(tags),
        osmId: `${best.element.type}/${best.element.id}`,
        osmType: best.element.type,
        tags,
      };
    } catch (error) {
      console.error('Overpass validation error:', error);
      return null;
    }
  }

  /**
   * Get city center coordinates as fallback
   */
  getCityCenter(city: string): OverpassGeocodedLocation | null {
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
  ): Promise<Map<string, OverpassGeocodedLocation>> {
    const results = new Map<string, OverpassGeocodedLocation>();
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
  validateCoordinatesBounds(
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
let overpassGeocodingServiceInstance: OverpassGeocodingService | null = null;

export function getOverpassGeocodingService(): OverpassGeocodingService {
  if (!overpassGeocodingServiceInstance) {
    overpassGeocodingServiceInstance = new OverpassGeocodingService();
  }
  return overpassGeocodingServiceInstance;
}

export default OverpassGeocodingService;
