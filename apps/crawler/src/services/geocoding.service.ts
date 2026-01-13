/**
 * Unified Geocoding Orchestrator Service
 * Combines multiple geocoding sources (AMap, Nominatim, Overpass) with fallback chain
 * and confidence aggregation for accurate Chinese POI geocoding
 */

import type {
  AmapGeocodedLocation,
  AmapGeocodingService,
} from './amap-geocoding.service.js';
import type {
  GeocodedLocation,
  NominatimService,
} from './nominatim.service.js';
import type {
  OverpassGeocodedLocation,
  OverpassGeocodingService,
} from './overpass-geocoding.service.js';

import { getAmapGeocodingService } from './amap-geocoding.service.js';
import {
  CITY_CENTERS,
  haversineDistance,
  isInChinaBounds,
  isNearCity,
} from './geo-constants.js';
import { getNominatimService } from './nominatim.service.js';
import { getOverpassGeocodingService } from './overpass-geocoding.service.js';

/**
 * Source types for geocoding results
 */
export type GeocodingSource =
  | 'amap'
  | 'nominatim'
  | 'overpass'
  | 'consensus'
  | 'cache'
  | 'city_fallback';

/**
 * Geocoding strategy
 */
export type GeocodingStrategy = 'amap' | 'nominatim' | 'multi';

/**
 * Unified geocode result interface
 */
export interface GeocodeResult {
  latitude: number;
  longitude: number;
  confidence: number;
  source: GeocodingSource;
  address: string;
  verifiedBy?: GeocodingSource[];
  placeType?: string;
  metadata?: {
    amapId?: string;
    osmId?: string;
  };
}

/**
 * Metrics tracking for geocoding performance
 */
export interface GeocodingMetrics {
  totalRequests: number;
  cacheHits: number;
  sourceDistribution: Record<GeocodingSource, number>;
  averageConfidence: number;
  confidenceSum: number;
  failedRequests: number;
  consensusMatches: number;
}

/**
 * Distance threshold for consensus matching (in km)
 */
const CONSENSUS_DISTANCE_THRESHOLD_KM = 0.5;

/**
 * Confidence boost when sources agree
 */
const CONSENSUS_CONFIDENCE_BOOST = 0.15;

/**
 * Simple in-memory LRU cache for unified geocoding results
 */
class UnifiedGeocodingCache {
  private cache = new Map<
    string,
    { result: GeocodeResult | null; timestamp: number }
  >();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize = 2000, ttlHours = 48) {
    this.maxSize = maxSize;
    this.ttlMs = ttlHours * 60 * 60 * 1000;
  }

  private generateKey(
    query: string,
    city?: string,
    strategy?: GeocodingStrategy
  ): string {
    return `${query.toLowerCase().trim()}|${(city || '').toLowerCase().trim()}|${strategy || 'multi'}`;
  }

  get(
    query: string,
    city?: string,
    strategy?: GeocodingStrategy
  ): GeocodeResult | null | undefined {
    const key = this.generateKey(query, city, strategy);
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
    strategy: GeocodingStrategy | undefined,
    result: GeocodeResult | null
  ): void {
    const key = this.generateKey(query, city, strategy);

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
 * Convert AMap result to unified format
 */
function amapToUnified(result: AmapGeocodedLocation): GeocodeResult {
  return {
    latitude: result.latitude,
    longitude: result.longitude,
    confidence: result.confidence,
    source: result.source === 'cache' ? 'cache' : 'amap',
    address: result.address,
    placeType: result.placeType,
    metadata: {
      amapId: result.amapId,
    },
  };
}

/**
 * Convert Nominatim result to unified format
 */
function nominatimToUnified(result: GeocodedLocation): GeocodeResult {
  return {
    latitude: result.latitude,
    longitude: result.longitude,
    confidence: result.confidence,
    source: result.source === 'cache' ? 'cache' : 'nominatim',
    address: result.address,
    placeType: result.placeType,
  };
}

/**
 * Convert Overpass result to unified format
 */
function overpassToUnified(result: OverpassGeocodedLocation): GeocodeResult {
  return {
    latitude: result.latitude,
    longitude: result.longitude,
    confidence: result.confidence,
    source: result.source === 'cache' ? 'cache' : 'overpass',
    address: result.address,
    placeType: result.placeType,
    metadata: {
      osmId: result.osmId,
    },
  };
}

/**
 * Check if two results are in consensus (close enough in location)
 */
function areResultsInConsensus(
  result1: GeocodeResult,
  result2: GeocodeResult
): boolean {
  const distance = haversineDistance(
    result1.latitude,
    result1.longitude,
    result2.latitude,
    result2.longitude
  );
  return distance <= CONSENSUS_DISTANCE_THRESHOLD_KM;
}

/**
 * GeocodingService - Unified orchestrator for multiple geocoding sources
 */
export class GeocodingService {
  private amapService: AmapGeocodingService | null = null;
  private nominatimService: NominatimService;
  private overpassService: OverpassGeocodingService;
  private cache: UnifiedGeocodingCache;
  private metrics: GeocodingMetrics;
  private amapAvailable: boolean = false;

  constructor() {
    // Try to initialize AMap service (requires API key)
    try {
      this.amapService = getAmapGeocodingService();
      this.amapAvailable = true;
    } catch {
      // AMap not available (no API key), will use Nominatim as primary
      this.amapAvailable = false;
    }

    this.nominatimService = getNominatimService();
    this.overpassService = getOverpassGeocodingService();
    this.cache = new UnifiedGeocodingCache(3000, 48);
    this.metrics = this.initMetrics();
  }

  /**
   * Initialize metrics object
   */
  private initMetrics(): GeocodingMetrics {
    return {
      totalRequests: 0,
      cacheHits: 0,
      sourceDistribution: {
        amap: 0,
        nominatim: 0,
        overpass: 0,
        consensus: 0,
        cache: 0,
        city_fallback: 0,
      },
      averageConfidence: 0,
      confidenceSum: 0,
      failedRequests: 0,
      consensusMatches: 0,
    };
  }

  /**
   * Update metrics with a result
   */
  private recordMetric(result: GeocodeResult | null, wasCache: boolean): void {
    this.metrics.totalRequests++;

    if (wasCache) {
      this.metrics.cacheHits++;
    }

    if (result) {
      this.metrics.sourceDistribution[result.source]++;
      this.metrics.confidenceSum += result.confidence;
      this.metrics.averageConfidence =
        this.metrics.confidenceSum / this.metrics.totalRequests;

      if (result.verifiedBy && result.verifiedBy.length > 0) {
        this.metrics.consensusMatches++;
      }
    } else {
      this.metrics.failedRequests++;
    }
  }

  /**
   * Get city center as fallback
   */
  private getCityFallback(city: string): GeocodeResult | null {
    const cityInfo = CITY_CENTERS[city] || CITY_CENTERS[city.replace('市', '')];
    if (!cityInfo) return null;

    return {
      latitude: cityInfo.lat,
      longitude: cityInfo.lng,
      confidence: 0.2,
      source: 'city_fallback',
      address: city,
      placeType: 'city_center_fallback',
    };
  }

  /**
   * Geocode using AMap service
   */
  private async geocodeWithAmap(
    query: string,
    city?: string
  ): Promise<GeocodeResult | null> {
    if (!this.amapService || !this.amapAvailable) {
      return null;
    }

    try {
      const result = await this.amapService.geocode(query, city);
      if (result) {
        return amapToUnified(result);
      }
    } catch {
      // AMap service failed, continue with fallback
    }

    return null;
  }

  /**
   * Geocode using Nominatim service
   */
  private async geocodeWithNominatim(
    query: string,
    city?: string
  ): Promise<GeocodeResult | null> {
    try {
      const result = await this.nominatimService.geocode(query, city);
      if (result) {
        return nominatimToUnified(result);
      }
    } catch {
      // Nominatim service failed, continue with fallback
    }

    return null;
  }

  /**
   * Geocode using Overpass service
   */
  private async geocodeWithOverpass(
    query: string,
    city?: string
  ): Promise<GeocodeResult | null> {
    try {
      const result = await this.overpassService.geocode(query, city);
      if (result) {
        return overpassToUnified(result);
      }
    } catch {
      // Overpass service failed
    }

    return null;
  }

  /**
   * Cross-validate a result using Overpass
   */
  private async crossValidate(
    result: GeocodeResult,
    query: string
  ): Promise<GeocodeResult> {
    try {
      const overpassResult = await this.overpassService.validateCoordinates(
        result.latitude,
        result.longitude,
        query,
        500 // 500 meter radius
      );

      if (overpassResult) {
        const overpassUnified = overpassToUnified(overpassResult);

        // Check if Overpass agrees with the result
        if (areResultsInConsensus(result, overpassUnified)) {
          // Boost confidence and mark as verified
          return {
            ...result,
            confidence: Math.min(
              1,
              result.confidence + CONSENSUS_CONFIDENCE_BOOST
            ),
            verifiedBy: [result.source as GeocodingSource, 'overpass'],
          };
        }
      }
    } catch {
      // Cross-validation failed, return original
    }

    return result;
  }

  /**
   * Aggregate results from multiple sources
   * If sources agree (consensus), boost confidence
   */
  private aggregateResults(
    results: GeocodeResult[],
    primaryResult: GeocodeResult
  ): GeocodeResult {
    if (results.length <= 1) {
      return primaryResult;
    }

    // Find results that agree with primary
    const agreeing = results.filter(
      (r) => r !== primaryResult && areResultsInConsensus(r, primaryResult)
    );

    if (agreeing.length === 0) {
      return primaryResult;
    }

    // Calculate average coordinates from agreeing sources
    const allAgreeing = [primaryResult, ...agreeing];
    const avgLat =
      allAgreeing.reduce((sum, r) => sum + r.latitude, 0) / allAgreeing.length;
    const avgLng =
      allAgreeing.reduce((sum, r) => sum + r.longitude, 0) / allAgreeing.length;

    // Boost confidence based on number of agreeing sources
    const confidenceBoost = agreeing.length * 0.1;
    const newConfidence = Math.min(
      1,
      primaryResult.confidence + confidenceBoost
    );

    // Collect verified sources
    const verifiedBy = allAgreeing.map((r) => r.source as GeocodingSource);

    return {
      latitude: avgLat,
      longitude: avgLng,
      confidence: newConfidence,
      source: 'consensus',
      address: primaryResult.address,
      placeType: primaryResult.placeType,
      verifiedBy,
      metadata: {
        ...primaryResult.metadata,
        ...agreeing.reduce((acc, r) => ({ ...acc, ...r.metadata }), {}),
      },
    };
  }

  /**
   * Geocode using specified strategy
   */
  async geocode(
    query: string,
    city?: string,
    options?: {
      strategy?: GeocodingStrategy;
      crossValidate?: boolean;
    }
  ): Promise<GeocodeResult | null> {
    const strategy = options?.strategy || 'multi';
    const shouldCrossValidate = options?.crossValidate ?? true;

    // Check cache first
    const cached = this.cache.get(query, city, strategy);
    if (cached !== undefined) {
      this.recordMetric(cached, true);
      if (cached) {
        return { ...cached, source: 'cache' };
      }
      return null;
    }

    let result: GeocodeResult | null = null;

    switch (strategy) {
      case 'amap':
        result = await this.geocodeWithAmap(query, city);
        break;

      case 'nominatim':
        result = await this.geocodeWithNominatim(query, city);
        break;

      case 'multi':
      default:
        result = await this.geocodeMultiSource(
          query,
          city,
          shouldCrossValidate
        );
        break;
    }

    // Apply city fallback if no result and city is specified
    if (!result && city) {
      result = this.getCityFallback(city);
    }

    // Cache the result
    this.cache.set(query, city, strategy, result);
    this.recordMetric(result, false);

    return result;
  }

  /**
   * Multi-source geocoding with fallback chain
   * Fallback chain: AMap (primary for China) -> Nominatim -> Overpass
   */
  private async geocodeMultiSource(
    query: string,
    city?: string,
    crossValidate: boolean = true
  ): Promise<GeocodeResult | null> {
    const results: GeocodeResult[] = [];

    // Try AMap first (primary for China)
    const amapResult = await this.geocodeWithAmap(query, city);
    if (amapResult) {
      results.push(amapResult);

      // If high confidence, optionally cross-validate and return
      if (amapResult.confidence >= 0.85) {
        if (crossValidate) {
          return this.crossValidate(amapResult, query);
        }
        return amapResult;
      }
    }

    // Fallback to Nominatim
    const nominatimResult = await this.geocodeWithNominatim(query, city);
    if (nominatimResult) {
      results.push(nominatimResult);

      // If AMap failed but Nominatim is high confidence
      if (!amapResult && nominatimResult.confidence >= 0.8) {
        if (crossValidate) {
          return this.crossValidate(nominatimResult, query);
        }
        return nominatimResult;
      }
    }

    // Fallback to Overpass as last resort
    if (results.length === 0) {
      const overpassResult = await this.geocodeWithOverpass(query, city);
      if (overpassResult) {
        results.push(overpassResult);
      }
    }

    // No results from any source
    if (results.length === 0) {
      return null;
    }

    // If we have multiple results, try to find consensus
    if (results.length > 1) {
      // Use the highest confidence result as primary
      const sortedResults = [...results].sort(
        (a, b) => b.confidence - a.confidence
      );
      const primaryResult = sortedResults[0];

      return this.aggregateResults(results, primaryResult);
    }

    // Single result
    const singleResult = results[0];
    if (crossValidate && singleResult.confidence < 0.85) {
      return this.crossValidate(singleResult, query);
    }

    return singleResult;
  }

  /**
   * Batch geocode multiple POIs
   */
  async batchGeocode(
    pois: Array<{ name: string; city?: string }>,
    options?: {
      strategy?: GeocodingStrategy;
      crossValidate?: boolean;
      onProgress?: (completed: number, total: number) => void;
      skipInvalid?: boolean;
    }
  ): Promise<Map<string, GeocodeResult>> {
    const results = new Map<string, GeocodeResult>();
    const total = pois.length;

    for (let i = 0; i < pois.length; i++) {
      const poi = pois[i];
      const location = await this.geocode(poi.name, poi.city, {
        strategy: options?.strategy,
        crossValidate: options?.crossValidate,
      });

      if (location) {
        results.set(poi.name, location);
      } else if (!options?.skipInvalid && poi.city) {
        // Use city center as fallback
        const fallback = this.getCityFallback(poi.city);
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

  /**
   * Cross-validate existing coordinates with OSM data
   */
  async validateExistingCoordinates(
    lat: number,
    lng: number,
    expectedName?: string
  ): Promise<GeocodeResult | null> {
    const validation = await this.overpassService.validateCoordinates(
      lat,
      lng,
      expectedName,
      200
    );

    if (validation) {
      return overpassToUnified(validation);
    }

    return null;
  }

  /**
   * Get geocoding metrics
   */
  getMetrics(): GeocodingMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    unified: number;
    amap: { size: number; keyCount: number } | null;
    nominatim: { size: number };
    overpass: { size: number };
  } {
    return {
      unified: this.cache.size,
      amap: this.amapService?.getCacheStats() || null,
      nominatim: this.nominatimService.getCacheStats(),
      overpass: this.overpassService.getCacheStats(),
    };
  }

  /**
   * Get service availability status
   */
  getServiceStatus(): {
    amap: boolean;
    nominatim: boolean;
    overpass: boolean;
  } {
    return {
      amap: this.amapAvailable,
      nominatim: true,
      overpass: true,
    };
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.cache.clear();
    this.amapService?.clearCache();
    this.nominatimService.clearCache();
    this.overpassService.clearCache();
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = this.initMetrics();
  }

  /**
   * Get hit rate as percentage
   */
  getHitRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return (this.metrics.cacheHits / this.metrics.totalRequests) * 100;
  }

  /**
   * Get success rate as percentage
   */
  getSuccessRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    const successful = this.metrics.totalRequests - this.metrics.failedRequests;
    return (successful / this.metrics.totalRequests) * 100;
  }
}

// Singleton instance
let geocodingServiceInstance: GeocodingService | null = null;

export function getGeocodingService(): GeocodingService {
  if (!geocodingServiceInstance) {
    geocodingServiceInstance = new GeocodingService();
  }
  return geocodingServiceInstance;
}

export default GeocodingService;
