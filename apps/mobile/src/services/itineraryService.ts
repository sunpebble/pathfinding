import type {
  ApiMeta,
  CreateItineraryInput,
  Itinerary,
  ItineraryDay,
  ItineraryItem,
  ItineraryWithStats,
  TransportMode,
  UpdateItineraryInput,
} from '@pathfinding/types';
import { supabase } from '@/lib/supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface ListResponse {
  success: boolean;
  data: ItineraryWithStats[];
  meta: ApiMeta;
}

interface SingleResponse {
  success: boolean;
  data: Itinerary & { days: ItineraryDay[] };
}

/**
 * Get authorization header with current session token
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Itinerary service for API communication
 */
export const itineraryService = {
  /**
   * Create a new itinerary
   */
  async create(input: CreateItineraryInput): Promise<ItineraryWithStats> {
    const headers = await getAuthHeader();

    const response = await fetch(`${API_BASE_URL}/v1/itineraries`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: input.title,
        cityId: input.cityId,
        startDate:
          typeof input.startDate === 'string'
            ? input.startDate
            : input.startDate.toISOString().split('T')[0],
        endDate:
          typeof input.endDate === 'string'
            ? input.endDate
            : input.endDate.toISOString().split('T')[0],
        visibility: input.visibility,
        coverImageUrl: input.coverImageUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create itinerary');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * List user's itineraries with pagination
   */
  async list(
    params: {
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ data: ItineraryWithStats[]; meta: ApiMeta }> {
    const headers = await getAuthHeader();

    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const url = `${API_BASE_URL}/v1/itineraries?${searchParams}`;
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch itineraries');
    }

    const result: ListResponse = await response.json();
    return { data: result.data, meta: result.meta };
  },

  /**
   * Get itinerary by ID with days and items
   */
  async getById(id: string): Promise<Itinerary & { days: ItineraryDay[] }> {
    const headers = await getAuthHeader();

    const response = await fetch(`${API_BASE_URL}/v1/itineraries/${id}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch itinerary');
    }

    const result: SingleResponse = await response.json();
    return result.data;
  },

  /**
   * Update an itinerary
   */
  async update(id: string, input: UpdateItineraryInput): Promise<Itinerary> {
    const headers = await getAuthHeader();

    const body: Record<string, unknown> = {};
    if (input.title !== undefined) body.title = input.title;
    if (input.cityId !== undefined) body.cityId = input.cityId;
    if (input.visibility !== undefined) body.visibility = input.visibility;
    if (input.coverImageUrl !== undefined)
      body.coverImageUrl = input.coverImageUrl;
    if (input.startDate !== undefined) {
      body.startDate =
        typeof input.startDate === 'string'
          ? input.startDate
          : input.startDate.toISOString().split('T')[0];
    }
    if (input.endDate !== undefined) {
      body.endDate =
        typeof input.endDate === 'string'
          ? input.endDate
          : input.endDate.toISOString().split('T')[0];
    }

    const response = await fetch(`${API_BASE_URL}/v1/itineraries/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update itinerary');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Delete an itinerary
   */
  async delete(id: string): Promise<void> {
    const headers = await getAuthHeader();

    const response = await fetch(`${API_BASE_URL}/v1/itineraries/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to delete itinerary');
    }
  },

  // ==================== Item Operations ====================

  /**
   * Get items for a specific day
   */
  async getItems(itineraryId: string, dayId: string): Promise<ItineraryItem[]> {
    const headers = await getAuthHeader();

    const response = await fetch(
      `${API_BASE_URL}/v1/itineraries/${itineraryId}/days/${dayId}/items`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch items');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Add an item to a day
   */
  async addItem(
    itineraryId: string,
    dayId: string,
    input: {
      poiId?: string;
      startTime?: string;
      endTime?: string;
      notes?: string;
      transportMode?: TransportMode;
      transportMinutes?: number;
    }
  ): Promise<{ item: ItineraryItem; conflicts: TimeConflict[] }> {
    const headers = await getAuthHeader();

    const response = await fetch(
      `${API_BASE_URL}/v1/itineraries/${itineraryId}/days/${dayId}/items`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to add item');
    }

    const result = await response.json();
    return {
      item: result.data,
      conflicts: result.conflicts || [],
    };
  },

  /**
   * Update an item
   */
  async updateItem(
    itineraryId: string,
    dayId: string,
    itemId: string,
    input: {
      poiId?: string;
      startTime?: string | null;
      endTime?: string | null;
      notes?: string;
      transportMode?: TransportMode;
      transportMinutes?: number | null;
    }
  ): Promise<{ item: ItineraryItem; conflicts: TimeConflict[] }> {
    const headers = await getAuthHeader();

    const response = await fetch(
      `${API_BASE_URL}/v1/itineraries/${itineraryId}/days/${dayId}/items/${itemId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify(input),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update item');
    }

    const result = await response.json();
    return {
      item: result.data,
      conflicts: result.conflicts || [],
    };
  },

  /**
   * Delete an item
   */
  async deleteItem(
    itineraryId: string,
    dayId: string,
    itemId: string
  ): Promise<void> {
    const headers = await getAuthHeader();

    const response = await fetch(
      `${API_BASE_URL}/v1/itineraries/${itineraryId}/days/${dayId}/items/${itemId}`,
      {
        method: 'DELETE',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to delete item');
    }
  },

  /**
   * Reorder items within a day
   */
  async reorderItems(
    itineraryId: string,
    dayId: string,
    itemIds: string[]
  ): Promise<ItineraryItem[]> {
    const headers = await getAuthHeader();

    const response = await fetch(
      `${API_BASE_URL}/v1/itineraries/${itineraryId}/days/${dayId}/items/reorder`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ itemIds }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to reorder items');
    }

    const result = await response.json();
    return result.data;
  },

  // ==================== Community Operations ====================

  /**
   * List public itineraries for community discovery
   */
  async listPublic(
    params: {
      cityId?: string;
      page?: number;
      pageSize?: number;
      sortBy?: 'created_at' | 'copy_count';
    } = {}
  ): Promise<{
    data: (ItineraryWithStats & { authorName?: string; copyCount?: number })[];
    meta: ApiMeta;
  }> {
    const headers = await getAuthHeader();

    const searchParams = new URLSearchParams();
    if (params.cityId) searchParams.set('cityId', params.cityId);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);

    const url = `${API_BASE_URL}/v1/itineraries/public?${searchParams}`;
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.error?.message || 'Failed to fetch public itineraries'
      );
    }

    const result = await response.json();
    return { data: result.data, meta: result.meta };
  },

  /**
   * Copy a public itinerary to user's collection
   */
  async copy(
    itineraryId: string,
    startDate: string
  ): Promise<ItineraryWithStats> {
    const headers = await getAuthHeader();

    const response = await fetch(
      `${API_BASE_URL}/v1/itineraries/${itineraryId}/copy`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ startDate }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to copy itinerary');
    }

    const result = await response.json();
    return result.data;
  },
};

/**
 * Time conflict information
 */
interface TimeConflict {
  itemId: string;
  startTime: string;
  endTime: string;
  poiName?: string;
}
