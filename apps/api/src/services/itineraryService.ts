/**
 * Itinerary Service - Convex Implementation
 * CRUD operations for travel itineraries
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// Types
export interface CreateItineraryInput {
  title: string;
  cityId: string;
  startDate: string;
  endDate: string;
  visibility?: 'private' | 'team' | 'public';
  coverImageUrl?: string;
}

export interface UpdateItineraryInput {
  title?: string;
  cityId?: string;
  startDate?: string;
  endDate?: string;
  visibility?: 'private' | 'team' | 'public';
  coverImageUrl?: string;
}

export interface ItineraryListQuery {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Itinerary service for CRUD operations
 */
export const ItineraryService = {
  /**
   * Create a new itinerary with auto-generated days
   */
  async create(
    userId: string,
    input: CreateItineraryInput,
    _accessToken: string
  ) {
    const itineraryId = await convex.mutation(api.itineraries.create, {
      userId,
      title: input.title,
      cityId: input.cityId as Id<'cities'>,
      startDate: input.startDate,
      endDate: input.endDate,
      visibility: input.visibility,
      coverImageUrl: input.coverImageUrl,
    });

    // Fetch the created itinerary
    const itinerary = await convex.query(api.itineraries.getById, {
      id: itineraryId,
    });

    return itinerary;
  },

  /**
   * List itineraries for a user with pagination
   */
  async list(userId: string, query: ItineraryListQuery, _accessToken: string) {
    const result = await convex.query(api.itineraries.listByUser, {
      userId,
      page: query.page,
      pageSize: query.pageSize,
    });

    return result;
  },

  /**
   * List public itineraries for community discovery
   */
  async listPublic(query: {
    cityId?: string;
    page: number;
    pageSize: number;
    sortBy: 'created_at' | 'copy_count';
  }) {
    const result = await convex.query(api.itineraries.listPublic, {
      cityId: query.cityId as Id<'cities'> | undefined,
      page: query.page,
      pageSize: query.pageSize,
    });

    return result;
  },

  /**
   * Get a single itinerary by ID with days and items
   */
  async getById(itineraryId: string, userId: string, _accessToken: string) {
    const itinerary = await convex.query(api.itineraries.getById, {
      id: itineraryId as Id<'itineraries'>,
    });

    if (!itinerary) {
      throw new NotFoundError('Itinerary not found');
    }

    // Check access (own itinerary or public)
    if (itinerary.userId !== userId && itinerary.visibility !== 'public') {
      throw new NotFoundError('Itinerary not found');
    }

    return itinerary;
  },

  /**
   * Update an itinerary
   */
  async update(
    itineraryId: string,
    userId: string,
    input: UpdateItineraryInput,
    _accessToken: string
  ) {
    // First check ownership
    const existing = await convex.query(api.itineraries.getById, {
      id: itineraryId as Id<'itineraries'>,
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('Itinerary not found');
    }

    const updated = await convex.mutation(api.itineraries.update, {
      id: itineraryId as Id<'itineraries'>,
      title: input.title,
      cityId: input.cityId as Id<'cities'> | undefined,
      startDate: input.startDate,
      endDate: input.endDate,
      visibility: input.visibility,
      coverImageUrl: input.coverImageUrl,
    });

    return updated;
  },

  /**
   * Delete an itinerary
   */
  async delete(itineraryId: string, userId: string, _accessToken: string) {
    // First check ownership
    const existing = await convex.query(api.itineraries.getById, {
      id: itineraryId as Id<'itineraries'>,
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('Itinerary not found');
    }

    await convex.mutation(api.itineraries.remove, {
      id: itineraryId as Id<'itineraries'>,
    });
  },

  /**
   * Copy an itinerary to user's collection
   */
  async copy(
    itineraryId: string,
    userId: string,
    newStartDate: string,
    _accessToken: string
  ) {
    // Check if source itinerary exists and is accessible
    const original = await convex.query(api.itineraries.getById, {
      id: itineraryId as Id<'itineraries'>,
    });

    if (!original) {
      throw new NotFoundError('Itinerary not found');
    }

    if (original.userId !== userId && original.visibility !== 'public') {
      throw new NotFoundError('Itinerary not found');
    }

    const newItineraryId = await convex.mutation(api.itineraries.copy, {
      itineraryId: itineraryId as Id<'itineraries'>,
      userId,
      newStartDate,
    });

    return await convex.query(api.itineraries.getById, {
      id: newItineraryId,
    });
  },
};
