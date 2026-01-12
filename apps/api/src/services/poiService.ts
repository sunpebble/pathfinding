/**
 * POI Service - Convex Implementation
 * Search and retrieval operations for Points of Interest
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// Local type definitions (avoiding circular dependency with @pathfinding/types)
export type PoiCategory =
  | 'attraction'
  | 'restaurant'
  | 'hotel'
  | 'shopping'
  | 'other';

export interface Poi {
  id: string;
  externalId?: string;
  name: string;
  nameEn?: string;
  category: PoiCategory;
  cityId: string;
  address?: string;
  latitude: number;
  longitude: number;
  rating?: number;
  ratingCount?: number;
  priceLevel?: number;
  businessHours?: Record<string, string>;
  phone?: string;
  imageUrls?: string[];
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

// Types
export interface PoiSearchQuery {
  cityId: string;
  category?: PoiCategory;
  query?: string;
  minRating?: number;
  priceLevel?: number;
  nearbyLat?: number;
  nearbyLng?: number;
  radiusKm: number;
  page: number;
  pageSize: number;
}

/**
 * POI service for search and retrieval operations
 */
export const PoiService = {
  /**
   * Search POIs with filters
   */
  async search(
    query: PoiSearchQuery,
    _accessToken: string
  ): Promise<{
    data: Poi[];
    meta: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    // Use search if query provided, otherwise use list
    let pois;

    if (query.query) {
      pois = await convex.query(api.pois.search, {
        query: query.query,
        cityId: query.cityId as Id<'cities'>,
        category: query.category as any,
        minRating: query.minRating,
        limit: query.pageSize * query.page, // Get enough for pagination
      });
    } else {
      pois = await convex.query(api.pois.list, {
        cityId: query.cityId as Id<'cities'>,
        category: query.category as any,
        limit: query.pageSize * query.page,
      });
    }

    // Filter by nearby if coordinates provided
    if (query.nearbyLat !== undefined && query.nearbyLng !== undefined) {
      pois = pois.filter((poi: any) => {
        const distance = calculateDistanceKm(
          query.nearbyLat!,
          query.nearbyLng!,
          poi.latitude,
          poi.longitude
        );
        return distance <= query.radiusKm;
      });
    }

    // Apply pagination
    const offset = (query.page - 1) * query.pageSize;
    const total = pois.length;
    const data = pois.slice(offset, offset + query.pageSize);

    return {
      data: data.map(toPoi),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  },

  /**
   * Get POI recommendations sorted by rating
   */
  async getRecommendations(
    cityId: string,
    category: PoiCategory | undefined,
    limit: number,
    _accessToken: string
  ): Promise<Poi[]> {
    const pois = await convex.query(api.pois.getRecommendations, {
      cityId: cityId as Id<'cities'>,
      category: category as any,
      limit,
    });

    return pois.map(toPoi);
  },

  /**
   * Get nearby POIs
   */
  async getNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    category: PoiCategory | undefined,
    limit: number,
    _accessToken: string
  ): Promise<Poi[]> {
    const pois = await convex.query(api.pois.getNearby, {
      latitude: lat,
      longitude: lng,
      radiusKm,
      category: category as any,
      limit,
    });

    return pois.map(toPoi);
  },

  /**
   * Get POI by ID
   */
  async getById(poiId: string, _accessToken: string): Promise<Poi> {
    const poi = await convex.query(api.pois.getById, {
      id: poiId as Id<'pois'>,
    });

    if (!poi) {
      throw new NotFoundError('POI not found');
    }

    return toPoi(poi);
  },
};

// Helper function to convert Convex POI to API response
function toPoi(row: any): Poi {
  return {
    id: row._id,
    externalId: row.externalId,
    name: row.name,
    nameEn: row.nameEn,
    category: row.category,
    cityId: row.cityId,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    rating: row.rating,
    ratingCount: row.ratingCount,
    priceLevel: row.priceLevel,
    businessHours: row.businessHours,
    phone: row.phone,
    imageUrls: row.imageUrls,
    source: row.source,
    createdAt: new Date(row._creationTime),
    updatedAt: new Date(row._creationTime), // Convex doesn't have updatedAt by default
  };
}

// Haversine formula for distance calculation
function calculateDistanceKm(
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
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
