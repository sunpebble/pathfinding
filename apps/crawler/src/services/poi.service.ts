/**
 * POI Service
 * Business logic for POI operations
 */

import type {
  NormalizedPOI,
  POIReview,
  SourceAttribution,
} from '@pathfinding/crawler-types';
import { calculateDistance, getBoundingBox } from '../lib/geo.js';
import { supabase, TABLES } from '../lib/supabase.js';

export interface POISearchParams {
  query?: string;
  category?: string;
  subcategory?: string;
  city?: string;
  district?: string;
  lat?: number;
  lng?: number;
  radius?: number; // meters
  minRating?: number;
  minQuality?: number;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'quality' | 'rating' | 'distance' | 'updated';
  sortOrder?: 'asc' | 'desc';
}

export interface POISearchResult {
  pois: NormalizedPOI[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Search POIs with various filters
 */
export async function searchPOIs(
  params: POISearchParams
): Promise<POISearchResult> {
  const {
    query,
    category,
    subcategory,
    city,
    district,
    lat,
    lng,
    radius = 5000,
    minRating,
    minQuality,
    tags,
    page = 1,
    limit = 20,
    sortBy = 'quality',
    sortOrder = 'desc',
  } = params;

  const offset = (page - 1) * limit;

  // Build query
  let dbQuery = supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('*', { count: 'exact' })
    .eq('is_duplicate', false);

  // Text search
  if (query) {
    dbQuery = dbQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
  }

  // Category filter
  if (category) {
    dbQuery = dbQuery.eq('category', category);
  }
  if (subcategory) {
    dbQuery = dbQuery.eq('subcategory', subcategory);
  }

  // Location filter
  if (city) {
    dbQuery = dbQuery.eq('city', city);
  }
  if (district) {
    dbQuery = dbQuery.eq('district', district);
  }

  // Geo filter (bounding box for performance)
  if (lat !== undefined && lng !== undefined) {
    const bbox = getBoundingBox(lat, lng, radius);
    dbQuery = dbQuery
      .gte('location_lat', bbox.minLat)
      .lte('location_lat', bbox.maxLat)
      .gte('location_lng', bbox.minLng)
      .lte('location_lng', bbox.maxLng);
  }

  // Rating filter
  if (minRating !== undefined) {
    dbQuery = dbQuery.gte('rating_overall', minRating);
  }

  // Quality filter
  if (minQuality !== undefined) {
    dbQuery = dbQuery.gte('quality_score', minQuality);
  }

  // Tags filter
  if (tags && tags.length > 0) {
    dbQuery = dbQuery.contains('tags', tags);
  }

  // Sorting
  const sortColumn =
    sortBy === 'distance'
      ? 'location_lat'
      : sortBy === 'rating'
        ? 'rating_overall'
        : sortBy === 'updated'
          ? 'last_updated_at'
          : 'quality_score';

  dbQuery = dbQuery.order(sortColumn, { ascending: sortOrder === 'asc' });

  // Pagination
  dbQuery = dbQuery.range(offset, offset + limit - 1);

  const { data, error, count } = await dbQuery;

  if (error) {
    throw new Error(`Failed to search POIs: ${error.message}`);
  }

  let pois = data as NormalizedPOI[];

  // Post-filter by exact distance if geo search
  if (lat !== undefined && lng !== undefined) {
    pois = pois.filter((poi) => {
      const distance = calculateDistance(
        lat,
        lng,
        poi.location_lat,
        poi.location_lng
      );
      return distance <= radius;
    });

    // Sort by distance if requested
    if (sortBy === 'distance') {
      pois.sort((a, b) => {
        const distA = calculateDistance(
          lat,
          lng,
          a.location_lat,
          a.location_lng
        );
        const distB = calculateDistance(
          lat,
          lng,
          b.location_lat,
          b.location_lng
        );
        return sortOrder === 'asc' ? distA - distB : distB - distA;
      });
    }
  }

  return {
    pois,
    total: count || 0,
    page,
    limit,
    hasMore: offset + pois.length < (count || 0),
  };
}

/**
 * Get POI by ID
 */
export async function getPOIById(id: string): Promise<NormalizedPOI | null> {
  const { data, error } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get POI: ${error.message}`);
  }

  return data as NormalizedPOI;
}

/**
 * Get POI reviews
 */
export async function getPOIReviews(
  poiId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ reviews: POIReview[]; total: number }> {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from(TABLES.POI_REVIEWS)
    .select('*', { count: 'exact' })
    .eq('poi_id', poiId)
    .order('review_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to get reviews: ${error.message}`);
  }

  return {
    reviews: data as POIReview[],
    total: count || 0,
  };
}

/**
 * Get POI statistics
 */
export async function getPOIStats(): Promise<{
  total: number;
  byCategory: Record<string, number>;
  byCity: Record<string, number>;
  avgQuality: number;
  avgCompleteness: number;
}> {
  // Get total count
  const { count: total } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('*', { count: 'exact', head: true })
    .eq('is_duplicate', false);

  // Get category breakdown
  const { data: categoryData } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('category')
    .eq('is_duplicate', false);

  const byCategory: Record<string, number> = {};
  if (categoryData) {
    for (const row of categoryData) {
      byCategory[row.category] = (byCategory[row.category] || 0) + 1;
    }
  }

  // Get city breakdown
  const { data: cityData } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('city')
    .eq('is_duplicate', false)
    .not('city', 'is', null);

  const byCity: Record<string, number> = {};
  if (cityData) {
    for (const row of cityData) {
      if (row.city) {
        byCity[row.city] = (byCity[row.city] || 0) + 1;
      }
    }
  }

  // Get average quality scores
  const { data: qualityData } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('quality_score, completeness_score')
    .eq('is_duplicate', false);

  let avgQuality = 0;
  let avgCompleteness = 0;
  if (qualityData && qualityData.length > 0) {
    avgQuality =
      qualityData.reduce((sum, row) => sum + (row.quality_score || 0), 0) /
      qualityData.length;
    avgCompleteness =
      qualityData.reduce((sum, row) => sum + (row.completeness_score || 0), 0) /
      qualityData.length;
  }

  return {
    total: total || 0,
    byCategory,
    byCity,
    avgQuality: Math.round(avgQuality * 100) / 100,
    avgCompleteness: Math.round(avgCompleteness * 100) / 100,
  };
}

/**
 * Get nearby POIs
 */
export async function getNearbyPOIs(
  lat: number,
  lng: number,
  options: {
    radius?: number;
    category?: string;
    limit?: number;
    excludeId?: string;
  } = {}
): Promise<NormalizedPOI[]> {
  const { radius = 1000, category, limit = 10, excludeId } = options;

  // Use bounding box for initial filter
  const bbox = getBoundingBox(lat, lng, radius);

  let query = supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('*')
    .eq('is_duplicate', false)
    .gte('location_lat', bbox.minLat)
    .lte('location_lat', bbox.maxLat)
    .gte('location_lng', bbox.minLng)
    .lte('location_lng', bbox.maxLng);

  if (category) {
    query = query.eq('category', category);
  }

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  query = query.limit(limit * 2); // Get extra to filter by exact distance

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get nearby POIs: ${error.message}`);
  }

  // Filter by exact distance and sort
  const pois = (data as NormalizedPOI[])
    .map((poi) => ({
      ...poi,
      distance: calculateDistance(lat, lng, poi.location_lat, poi.location_lng),
    }))
    .filter((poi) => poi.distance <= radius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);

  return pois;
}

/**
 * Get source info for a POI
 */
export async function getPOISources(
  poiId: string
): Promise<SourceAttribution[]> {
  const { data, error } = await supabase
    .from(TABLES.POI_SOURCE_MAPPINGS)
    .select('*')
    .eq('poi_id', poiId);

  if (error) {
    throw new Error(`Failed to get POI sources: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    platform: row.platform,
    external_id: row.external_id,
    url: row.external_url,
    confidence: row.confidence,
    last_crawled: row.last_crawled_at,
  }));
}
