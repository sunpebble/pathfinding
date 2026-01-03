import type { Poi, PoiCategory } from '@pathfinding/types';
import type { PoiSearchQuery } from '../models/poi';
import { getSupabaseClient } from '../lib/supabase';
import { NotFoundError } from '../middleware/errorHandler';

/**
 * POI database row type
 */
interface PoiRow {
  id: string;
  external_id: string | null;
  name: string;
  name_en: string | null;
  category: PoiCategory;
  city_id: string;
  address: string | null;
  latitude: number;
  longitude: number;
  rating: number | null;
  rating_count: number;
  price_level: number | null;
  business_hours: Record<string, unknown> | null;
  phone: string | null;
  image_urls: string[] | null;
  source: string;
  created_at: string;
  updated_at: string;
}

/**
 * Convert database row to API response
 */
function toPoiResponse(row: PoiRow): Poi {
  return {
    id: row.id,
    externalId: row.external_id || undefined,
    name: row.name,
    nameEn: row.name_en || undefined,
    category: row.category,
    cityId: row.city_id,
    address: row.address || undefined,
    latitude: row.latitude,
    longitude: row.longitude,
    rating: row.rating || undefined,
    ratingCount: row.rating_count,
    priceLevel: row.price_level || undefined,
    businessHours: row.business_hours as Poi['businessHours'],
    phone: row.phone || undefined,
    imageUrls: row.image_urls || undefined,
    source: row.source,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Calculate distance between two points in kilometers (Haversine formula)
 */
function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
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

/**
 * POI service for search and retrieval operations
 */
export const PoiService = {
  /**
   * Search POIs with filters
   */
  async search(
    query: PoiSearchQuery,
    accessToken: string
  ): Promise<{
    data: Poi[];
    meta: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    const supabase = getSupabaseClient(accessToken);
    const {
      cityId,
      category,
      query: searchQuery,
      minRating,
      priceLevel,
      nearbyLat,
      nearbyLng,
      radiusKm,
      page,
      pageSize,
    } = query;

    // Build query
    let dbQuery = supabase.from('pois').select('*', { count: 'exact' });

    // Required filter: city
    dbQuery = dbQuery.eq('city_id', cityId);

    // Optional filters
    if (category) {
      dbQuery = dbQuery.eq('category', category);
    }

    if (searchQuery) {
      // Full text search on name and name_en
      dbQuery = dbQuery.or(
        `name.ilike.%${searchQuery}%,name_en.ilike.%${searchQuery}%`
      );
    }

    if (minRating !== undefined) {
      dbQuery = dbQuery.gte('rating', minRating);
    }

    if (priceLevel !== undefined) {
      dbQuery = dbQuery.eq('price_level', priceLevel);
    }

    // Order by rating (descending) then name
    dbQuery = dbQuery
      .order('rating', { ascending: false, nullsFirst: false })
      .order('name');

    // Pagination
    const offset = (page - 1) * pageSize;
    dbQuery = dbQuery.range(offset, offset + pageSize - 1);

    const { data, error, count } = await dbQuery;

    if (error) {
      throw error;
    }

    let pois = (data as PoiRow[]).map(toPoiResponse);

    // Filter by distance if nearby coordinates provided
    if (nearbyLat !== undefined && nearbyLng !== undefined) {
      pois = pois.filter((poi) => {
        const distance = calculateDistanceKm(
          nearbyLat,
          nearbyLng,
          poi.latitude,
          poi.longitude
        );
        return distance <= radiusKm;
      });
    }

    return {
      data: pois,
      meta: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
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
    accessToken: string
  ): Promise<Poi[]> {
    const supabase = getSupabaseClient(accessToken);

    let query = supabase
      .from('pois')
      .select('*')
      .eq('city_id', cityId)
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data as PoiRow[]).map(toPoiResponse);
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
    accessToken: string
  ): Promise<Poi[]> {
    const supabase = getSupabaseClient(accessToken);

    // Calculate bounding box for rough filtering
    const latDelta = radiusKm / 111; // ~111km per degree latitude
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    let query = supabase
      .from('pois')
      .select('*')
      .gte('latitude', lat - latDelta)
      .lte('latitude', lat + latDelta)
      .gte('longitude', lng - lngDelta)
      .lte('longitude', lng + lngDelta);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Filter by exact distance and sort
    const poisWithDistance = (data as PoiRow[])
      .map((row) => ({
        poi: toPoiResponse(row),
        distance: calculateDistanceKm(lat, lng, row.latitude, row.longitude),
      }))
      .filter((item) => item.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return poisWithDistance.map((item) => item.poi);
  },

  /**
   * Get POI by ID
   */
  async getById(poiId: string, accessToken: string): Promise<Poi> {
    const supabase = getSupabaseClient(accessToken);

    const { data, error } = await supabase
      .from('pois')
      .select('*')
      .eq('id', poiId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('POI not found');
      }
      throw error;
    }

    return toPoiResponse(data as PoiRow);
  },
};
