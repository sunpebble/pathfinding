import type { Poi, PoiCategory } from '@pathfinding/types';
import { supabase } from '@/lib/supabase';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/v1';

/**
 * POI search filters
 */
interface PoiSearchFilters {
  cityId: string;
  category?: PoiCategory;
  query?: string;
  minRating?: number;
  priceLevel?: number;
  nearbyLat?: number;
  nearbyLng?: number;
  radiusKm?: number;
  page?: number;
  pageSize?: number;
}

/**
 * POI search response
 */
interface PoiSearchResponse {
  data: Poi[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Get access token for authenticated requests
 */
async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * POI service for mobile app
 */
export const poiService = {
  /**
   * Search POIs with filters
   */
  async search(filters: PoiSearchFilters): Promise<PoiSearchResponse> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const params = new URLSearchParams();
    params.append('cityId', filters.cityId);
    if (filters.category) params.append('category', filters.category);
    if (filters.query) params.append('query', filters.query);
    if (filters.minRating !== undefined)
      params.append('minRating', filters.minRating.toString());
    if (filters.priceLevel !== undefined)
      params.append('priceLevel', filters.priceLevel.toString());
    if (filters.nearbyLat !== undefined)
      params.append('nearbyLat', filters.nearbyLat.toString());
    if (filters.nearbyLng !== undefined)
      params.append('nearbyLng', filters.nearbyLng.toString());
    if (filters.radiusKm !== undefined)
      params.append('radiusKm', filters.radiusKm.toString());
    if (filters.page !== undefined)
      params.append('page', filters.page.toString());
    if (filters.pageSize !== undefined)
      params.append('pageSize', filters.pageSize.toString());

    const response = await fetch(
      `${API_BASE_URL}/pois/search?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to search POIs');
    }

    return response.json();
  },

  /**
   * Get POI recommendations for a city
   */
  async getRecommendations(
    cityId: string,
    category?: PoiCategory,
    limit = 20
  ): Promise<Poi[]> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const params = new URLSearchParams();
    params.append('cityId', cityId);
    if (category) params.append('category', category);
    params.append('limit', limit.toString());

    const response = await fetch(
      `${API_BASE_URL}/pois/recommend?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get recommendations');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Get nearby POIs
   */
  async getNearby(
    lat: number,
    lng: number,
    radiusKm = 5,
    category?: PoiCategory,
    limit = 20
  ): Promise<Poi[]> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const params = new URLSearchParams();
    params.append('lat', lat.toString());
    params.append('lng', lng.toString());
    params.append('radiusKm', radiusKm.toString());
    if (category) params.append('category', category);
    params.append('limit', limit.toString());

    const response = await fetch(
      `${API_BASE_URL}/pois/nearby?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get nearby POIs');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Get POI by ID
   */
  async getById(poiId: string): Promise<Poi> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/pois/${poiId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get POI');
    }

    const result = await response.json();
    return result.data;
  },
};
