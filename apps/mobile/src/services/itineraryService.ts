/**
 * Itinerary Service - Convex-based implementation
 *
 * This service provides direct access to Convex itinerary functions.
 * For React components, prefer using Convex hooks (useQuery, useMutation) directly.
 */

import type { TransportMode } from '@pathfinding/types';
import type { Id, TableNames } from '../../../../convex/_generated/dataModel';
import { convex } from '@/providers/ConvexProvider';
import { api } from '../../../../convex/_generated/api';

// Helper to cast string to Convex ID type
function asId<T extends TableNames>(id: string): Id<T> {
  return id as Id<T>;
}

/**
 * Create itinerary input
 */
export interface CreateItineraryInput {
  userId: Id<'users'>;
  cityId: Id<'cities'>;
  title: string;
  startDate: string;
  endDate: string;
  visibility?: 'private' | 'public';
  coverImage?: string;
}

/**
 * Itinerary service for mobile app using Convex
 *
 * Note: For reactive UI updates, use Convex hooks directly in components:
 * - useQuery(api.itineraries.list, { userId, page, pageSize })
 * - useQuery(api.itineraries.getById, { id })
 * - useMutation(api.itineraries.create)
 * - useMutation(api.itineraries.update)
 * - useMutation(api.itineraries.remove)
 */
export const itineraryService = {
  /**
   * List user's itineraries
   */
  async list(args: { userId: Id<'users'>; page?: number; pageSize?: number }) {
    return convex.query(api.itineraries.list, args);
  },

  /**
   * Get itinerary by ID
   */
  async getById(id: string | Id<'itineraries'>) {
    return convex.query(api.itineraries.getById, {
      id: typeof id === 'string' ? asId<'itineraries'>(id) : id,
    });
  },

  /**
   * Create a new itinerary
   */
  async create(input: CreateItineraryInput) {
    return convex.mutation(api.itineraries.create, input);
  },

  /**
   * Update itinerary
   */
  async update(
    id: Id<'itineraries'>,
    userId: Id<'users'>,
    updates: {
      title?: string;
      visibility?: 'private' | 'public';
      coverImage?: string;
    }
  ) {
    return convex.mutation(api.itineraries.update, { id, userId, ...updates });
  },

  /**
   * Delete itinerary
   */
  async remove(id: Id<'itineraries'>, userId: Id<'users'>) {
    return convex.mutation(api.itineraries.remove, { id, userId });
  },

  /**
   * Delete itinerary (alias for remove)
   */
  async delete(id: string, userId?: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return convex.mutation(api.itineraries.remove, {
      id: asId<'itineraries'>(id),
      userId: asId<'users'>(userId),
    });
  },

  /**
   * List public itineraries (community)
   */
  async listPublic(args: {
    cityId?: Id<'cities'>;
    sortBy?: 'recent' | 'popular';
    page?: number;
    pageSize?: number;
  }) {
    return convex.query(api.itineraries.listPublic, args);
  },

  /**
   * Copy a public itinerary
   */
  async copy(
    sourceId: Id<'itineraries'>,
    userId: Id<'users'>,
    startDate: string
  ) {
    return convex.mutation(api.itineraries.copy, {
      sourceId,
      userId,
      startDate,
    });
  },

  /**
   * Get items for a specific day
   * @param _itineraryId - The itinerary ID (not used, kept for API compatibility)
   * @param dayId - The day ID
   */
  async getItems(_itineraryId: string, dayId: string) {
    const items = await convex.query(api.itineraryItems.listByDay, {
      dayId: asId<'itineraryDays'>(dayId),
    });
    return items;
  },

  /**
   * Add an item to a day
   */
  async addItem(
    _itineraryId: string,
    dayId: string,
    input: {
      poiId?: string;
      startTime?: string;
      endTime?: string;
      notes?: string;
      transportMode?: TransportMode;
      transportMinutes?: number;
    },
    userId?: string
  ) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const result = await convex.mutation(api.itineraryItems.create, {
      dayId: asId<'itineraryDays'>(dayId),
      userId: asId<'users'>(userId),
      poiId: input.poiId ? asId<'pois'>(input.poiId) : undefined,
      startTime: input.startTime,
      endTime: input.endTime,
      notes: input.notes,
      transportMode: input.transportMode,
      transportMinutes: input.transportMinutes,
    });

    // Return in the format expected by useItinerary hook
    const items = await convex.query(api.itineraryItems.listByDay, {
      dayId: asId<'itineraryDays'>(dayId),
    });
    const newItem = items.find((item) => item.id === result.id);

    return {
      item: newItem || { id: result.id },
      conflicts: [] as Array<{
        itemId: string;
        startTime: string;
        endTime: string;
        poiName?: string;
      }>,
    };
  },

  /**
   * Update an item
   */
  async updateItem(
    _itineraryId: string,
    dayId: string,
    itemId: string,
    input: {
      poiId?: string;
      startTime?: string | null;
      endTime?: string | null;
      notes?: string;
      transportMode?: TransportMode;
      transportMinutes?: number | null;
    },
    userId?: string
  ) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    await convex.mutation(api.itineraryItems.update, {
      id: asId<'itineraryItems'>(itemId),
      userId: asId<'users'>(userId),
      poiId: input.poiId ? asId<'pois'>(input.poiId) : undefined,
      startTime: input.startTime ?? undefined,
      endTime: input.endTime ?? undefined,
      notes: input.notes,
      transportMode: input.transportMode,
      transportMinutes: input.transportMinutes ?? undefined,
    });

    // Fetch updated item
    const items = await convex.query(api.itineraryItems.listByDay, {
      dayId: asId<'itineraryDays'>(dayId),
    });
    const updatedItem = items.find((item) => String(item.id) === itemId);

    return {
      item: updatedItem || { id: itemId },
      conflicts: [] as Array<{
        itemId: string;
        startTime: string;
        endTime: string;
        poiName?: string;
      }>,
    };
  },

  /**
   * Delete an item
   */
  async deleteItem(
    _itineraryId: string,
    _dayId: string,
    itemId: string,
    userId?: string
  ) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    await convex.mutation(api.itineraryItems.remove, {
      id: asId<'itineraryItems'>(itemId),
      userId: asId<'users'>(userId),
    });
  },

  /**
   * Reorder items in a day
   */
  async reorderItems(
    _itineraryId: string,
    dayId: string,
    itemIds: string[],
    userId?: string
  ) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    await convex.mutation(api.itineraryItems.reorder, {
      dayId: asId<'itineraryDays'>(dayId),
      userId: asId<'users'>(userId),
      itemIds: itemIds.map((id) => asId<'itineraryItems'>(id)),
    });

    // Return updated items
    const items = await convex.query(api.itineraryItems.listByDay, {
      dayId: asId<'itineraryDays'>(dayId),
    });
    return items;
  },
};

// Re-export the API for use with Convex hooks
export { api };

export default itineraryService;
