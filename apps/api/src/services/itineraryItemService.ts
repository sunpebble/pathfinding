/**
 * Itinerary Item Service - Convex Implementation
 * CRUD operations for items within itinerary days
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// Types
export interface CreateItineraryItemInput {
  dayId: string;
  poiId?: string;
  orderIndex?: number;
  startTime?: string;
  endTime?: string;
  transportMode?: 'walking' | 'driving' | 'transit' | 'cycling' | 'taxi';
  transportMinutes?: number;
  notes?: string;
}

export interface UpdateItineraryItemInput {
  orderIndex?: number;
  startTime?: string;
  endTime?: string;
  transportMode?: 'walking' | 'driving' | 'transit' | 'cycling' | 'taxi';
  notes?: string;
}

/**
 * Itinerary Item service for CRUD operations
 */
export const ItineraryItemService = {
  /**
   * List items for a day
   */
  async listByDay(dayId: string, _accessToken: string) {
    const items = await convex.query(api.itineraryItems.listByDay, {
      dayId: dayId as Id<'itineraryDays'>,
    });

    return items;
  },

  /**
   * Get an item by ID
   */
  async getById(itemId: string, _accessToken: string) {
    const item = await convex.query(api.itineraryItems.getById, {
      id: itemId as Id<'itineraryItems'>,
    });

    if (!item) {
      throw new NotFoundError('Item not found');
    }

    return item;
  },

  /**
   * Create a new item
   */
  async create(input: CreateItineraryItemInput, _accessToken: string) {
    const itemId = await convex.mutation(api.itineraryItems.create, {
      dayId: input.dayId as Id<'itineraryDays'>,
      poiId: input.poiId ? (input.poiId as Id<'pois'>) : undefined,
      orderIndex: input.orderIndex,
      startTime: input.startTime,
      endTime: input.endTime,
      transportMode: input.transportMode,
      notes: input.notes,
    });

    return await convex.query(api.itineraryItems.getById, {
      id: itemId,
    });
  },

  /**
   * Update an item
   */
  async update(
    itemId: string,
    input: UpdateItineraryItemInput,
    _accessToken: string
  ) {
    const existing = await convex.query(api.itineraryItems.getById, {
      id: itemId as Id<'itineraryItems'>,
    });

    if (!existing) {
      throw new NotFoundError('Item not found');
    }

    const updated = await convex.mutation(api.itineraryItems.update, {
      id: itemId as Id<'itineraryItems'>,
      orderIndex: input.orderIndex,
      startTime: input.startTime,
      endTime: input.endTime,
      transportMode: input.transportMode,
      notes: input.notes,
    });

    return updated;
  },

  /**
   * Delete an item
   */
  async delete(itemId: string, _accessToken: string) {
    const existing = await convex.query(api.itineraryItems.getById, {
      id: itemId as Id<'itineraryItems'>,
    });

    if (!existing) {
      throw new NotFoundError('Item not found');
    }

    await convex.mutation(api.itineraryItems.remove, {
      id: itemId as Id<'itineraryItems'>,
    });
  },

  /**
   * Reorder an item within its day
   */
  async reorder(itemId: string, newOrderIndex: number, _accessToken: string) {
    const existing = await convex.query(api.itineraryItems.getById, {
      id: itemId as Id<'itineraryItems'>,
    });

    if (!existing) {
      throw new NotFoundError('Item not found');
    }

    await convex.mutation(api.itineraryItems.reorder, {
      itemId: itemId as Id<'itineraryItems'>,
      newOrderIndex,
    });
  },

  /**
   * Move an item to a different day
   */
  async moveToDay(
    itemId: string,
    newDayId: string,
    orderIndex?: number,
    _accessToken?: string
  ) {
    const existing = await convex.query(api.itineraryItems.getById, {
      id: itemId as Id<'itineraryItems'>,
    });

    if (!existing) {
      throw new NotFoundError('Item not found');
    }

    const updated = await convex.mutation(api.itineraryItems.moveToDay, {
      itemId: itemId as Id<'itineraryItems'>,
      newDayId: newDayId as Id<'itineraryDays'>,
      orderIndex,
    });

    return updated;
  },
};
