/**
 * POI Service - Convex-based implementation
 *
 * This service provides direct access to Convex POI functions.
 * For React components, prefer using Convex hooks (useQuery) directly.
 */

import type { Id, TableNames } from '../../../../convex/_generated/dataModel';
import { convex } from '@/providers/ConvexProvider';
import { api } from '../../../../convex/_generated/api';

// Helper to cast string to Convex ID type
function asId<T extends TableNames>(id: string): Id<T> {
  return id as Id<T>;
}

/**
 * POI search filters
 */
export interface PoiSearchFilters {
  cityId: Id<'cities'>;
  category?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Nearby POI filters
 */
export interface NearbyFilters {
  cityId: Id<'cities'>;
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
}

/**
 * POI service for mobile app using Convex
 *
 * Note: For reactive UI updates, use Convex hooks directly in components:
 * - useQuery(api.pois.listByCity, { cityId, category, page, pageSize })
 * - useQuery(api.pois.getById, { id })
 * - useQuery(api.pois.search, { cityId, keyword, category, limit })
 * - useQuery(api.pois.getNearby, { cityId, latitude, longitude, radiusKm, limit })
 */
export const poiService = {
  /**
   * List POIs by city with optional category filter
   */
  async listByCity(filters: PoiSearchFilters) {
    return convex.query(api.pois.listByCity, {
      cityId: filters.cityId,
      category: filters.category,
      page: filters.page,
      pageSize: filters.pageSize,
    });
  },

  /**
   * Search POIs by keyword
   */
  async search(
    cityId: Id<'cities'>,
    keyword: string,
    category?: string,
    limit?: number
  ) {
    return convex.query(api.pois.search, {
      cityId,
      keyword,
      category,
      limit,
    });
  },

  /**
   * Get nearby POIs based on location
   */
  async getNearby(filters: NearbyFilters) {
    return convex.query(api.pois.getNearby, {
      cityId: filters.cityId,
      latitude: filters.latitude,
      longitude: filters.longitude,
      radiusKm: filters.radiusKm,
      limit: filters.limit,
    });
  },

  /**
   * Get POI by ID
   */
  async getById(poiId: Id<'pois'>) {
    return convex.query(api.pois.getById, { id: poiId });
  },

  /**
   * Get POI categories for a city
   */
  async getCategories(cityId: Id<'cities'>) {
    return convex.query(api.pois.getCategories, { cityId });
  },

  /**
   * Get recommended POIs (alias for getNearby, for backward compatibility)
   * Used by add-poi.tsx and POIRecommendScreen
   */
  async getRecommendations(cityId: string | Id<'cities'>) {
    // Return nearby POIs based on a default location
    // In a real implementation, this would use the user's current location
    return convex.query(api.pois.listByCity, {
      cityId: typeof cityId === 'string' ? asId<'cities'>(cityId) : cityId,
      page: 1,
      pageSize: 20,
    });
  },
};

// Re-export the API for use with Convex hooks
export { api };
