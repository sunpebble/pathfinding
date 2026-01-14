/**
 * Draft Service - Convex Implementation
 * Auto-save and draft management for itineraries
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// Types
export interface DraftDayItem {
  poiId?: string;
  orderIndex: number;
  startTime?: string;
  endTime?: string;
  transportMode?: 'walking' | 'driving' | 'transit' | 'cycling' | 'taxi';
  notes?: string;
  inlinePoi?: {
    name: string;
    category: 'attraction' | 'restaurant' | 'hotel' | 'shopping' | 'other';
    address?: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface DraftDay {
  dayNumber: number;
  date?: string;
  items: DraftDayItem[];
}

export interface SaveDraftInput {
  draftId?: string;
  itineraryId?: string;
  title: string;
  cityId?: string;
  startDate?: string;
  endDate?: string;
  visibility?: 'private' | 'team' | 'public';
  coverImageUrl?: string;
  days?: DraftDay[];
  deviceId?: string;
  expectedVersion?: number;
}

export interface DraftListQuery {
  page: number;
  pageSize: number;
}

/**
 * Draft service for auto-save and draft management
 */
export const DraftService = {
  /**
   * List drafts for a user with pagination
   */
  async list(userId: string, query: DraftListQuery) {
    const result = await convex.query(api.itineraryDrafts.listByUser, {
      userId,
      page: query.page,
      pageSize: query.pageSize,
    });

    return result;
  },

  /**
   * Get a single draft by ID
   */
  async getById(draftId: string, userId: string) {
    const draft = await convex.query(api.itineraryDrafts.getById, {
      id: draftId as Id<'itineraryDrafts'>,
    });

    if (!draft) {
      throw new NotFoundError('Draft not found or has expired');
    }

    // Verify ownership
    if (draft.userId !== userId) {
      throw new NotFoundError('Draft not found');
    }

    return draft;
  },

  /**
   * Get draft for a specific itinerary
   */
  async getByItinerary(itineraryId: string, userId: string) {
    const draft = await convex.query(api.itineraryDrafts.getByItinerary, {
      userId,
      itineraryId: itineraryId as Id<'itineraries'>,
    });

    return draft;
  },

  /**
   * Save or update a draft (auto-save)
   */
  async save(userId: string, input: SaveDraftInput) {
    // Transform days to include proper POI ID types
    const transformedDays = input.days?.map((day) => ({
      ...day,
      items: day.items.map((item) => ({
        ...item,
        poiId: item.poiId as Id<'pois'> | undefined,
      })),
    }));

    const draftId = await convex.mutation(api.itineraryDrafts.save, {
      userId,
      draftId: input.draftId as Id<'itineraryDrafts'> | undefined,
      itineraryId: input.itineraryId as Id<'itineraries'> | undefined,
      title: input.title,
      cityId: input.cityId as Id<'cities'> | undefined,
      startDate: input.startDate,
      endDate: input.endDate,
      visibility: input.visibility,
      coverImageUrl: input.coverImageUrl,
      days: transformedDays,
      deviceId: input.deviceId,
      expectedVersion: input.expectedVersion,
    });

    // Fetch the saved draft
    const draft = await convex.query(api.itineraryDrafts.getById, {
      id: draftId,
    });

    return draft;
  },

  /**
   * Delete a draft
   */
  async delete(draftId: string, userId: string) {
    await convex.mutation(api.itineraryDrafts.remove, {
      id: draftId as Id<'itineraryDrafts'>,
      userId,
    });
  },

  /**
   * Delete draft for a specific itinerary (after successful save)
   */
  async deleteByItinerary(itineraryId: string, userId: string) {
    await convex.mutation(api.itineraryDrafts.removeByItinerary, {
      userId,
      itineraryId: itineraryId as Id<'itineraries'>,
    });
  },

  /**
   * Get draft count for a user
   */
  async count(userId: string) {
    const count = await convex.query(api.itineraryDrafts.countByUser, {
      userId,
    });

    return count;
  },

  /**
   * Extend draft expiration
   */
  async extendExpiration(
    draftId: string,
    userId: string,
    additionalDays?: number
  ) {
    const result = await convex.mutation(api.itineraryDrafts.extendExpiration, {
      id: draftId as Id<'itineraryDrafts'>,
      userId,
      additionalDays,
    });

    return result;
  },

  /**
   * Clean up expired drafts (admin/cron operation)
   */
  async cleanupExpired(batchSize?: number) {
    const result = await convex.mutation(api.itineraryDrafts.cleanupExpired, {
      batchSize,
    });

    return result;
  },
};
