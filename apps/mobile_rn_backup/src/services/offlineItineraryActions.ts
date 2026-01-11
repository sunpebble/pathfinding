import type {
  CreateItineraryInput,
  TransportMode,
  UpdateItineraryInput,
} from '@pathfinding/types';
import type { Itinerary as ItineraryModel } from '@/database/models/Itinerary';
import type { ItineraryDay as ItineraryDayModel } from '@/database/models/ItineraryDay';
import type ItineraryItemModel from '@/database/models/ItineraryItem';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/database';

/**
 * Offline itinerary actions using WatermelonDB
 */
export const offlineItineraryActions = {
  /**
   * Create an itinerary offline
   */
  create: async (
    input: CreateItineraryInput,
    userId: string
  ): Promise<ItineraryModel> => {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    const dayCount =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

    return database.write(async () => {
      // Create the itinerary
      const itinerary = await database
        .get<ItineraryModel>('itineraries')
        .create((record) => {
          record.remoteId = null; // Will be set when synced
          record.userId = userId;
          record.cityId = input.cityId;
          record.title = input.title;
          record.description = input.description || null;
          record.startDate = input.startDate;
          record.endDate = input.endDate;
          record.coverImageUrl = input.coverImageUrl || null;
          record.visibility = input.visibility || 'private';
          record.syncStatus = 'pending';
          record.lastSyncedAt = null;
        });

      // Create days for the itinerary
      for (let i = 0; i < dayCount; i++) {
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + i);

        await database
          .get<ItineraryDayModel>('itinerary_days')
          .create((record) => {
            record.remoteId = null;
            record.itineraryId = itinerary.id;
            record.dayNumber = i + 1;
            record.date = dayDate.toISOString().split('T')[0];
            record.notes = null;
          });
      }

      return itinerary;
    });
  },

  /**
   * Update an itinerary offline
   */
  update: async (
    id: string,
    input: UpdateItineraryInput
  ): Promise<ItineraryModel | null> => {
    try {
      const itinerary = await database
        .get<ItineraryModel>('itineraries')
        .find(id);

      return database.write(async () => {
        await itinerary.update((record) => {
          if (input.title !== undefined) record.title = input.title;
          if (input.description !== undefined)
            record.description = input.description || null;
          if (input.coverImageUrl !== undefined)
            record.coverImageUrl = input.coverImageUrl || null;
          if (input.visibility !== undefined)
            record.visibility = input.visibility;
          record.syncStatus = 'pending';
        });
        return itinerary;
      });
    } catch {
      return null;
    }
  },

  /**
   * Delete an itinerary offline (soft delete)
   */
  delete: async (id: string): Promise<boolean> => {
    try {
      const itinerary = await database
        .get<ItineraryModel>('itineraries')
        .find(id);

      await database.write(async () => {
        await itinerary.markAsDeleted();
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get all local itineraries for a user
   */
  getAll: async (_userId: string): Promise<ItineraryModel[]> => {
    const collection = database.get<ItineraryModel>('itineraries');
    return collection.query().fetch();
  },

  /**
   * Get a single itinerary by local ID
   */
  getById: async (id: string): Promise<ItineraryModel | null> => {
    try {
      return await database.get<ItineraryModel>('itineraries').find(id);
    } catch {
      return null;
    }
  },

  /**
   * Get itineraries pending sync
   */
  getPendingSync: async (): Promise<ItineraryModel[]> => {
    const collection = database.get<ItineraryModel>('itineraries');
    // In WatermelonDB, we would query by syncStatus = 'pending'
    // For now, return all and filter
    const all = await collection.query().fetch();
    return all.filter((i) => i.syncStatus === 'pending');
  },

  /**
   * Mark itinerary as synced
   */
  markSynced: async (id: string, remoteId: string): Promise<void> => {
    const itinerary = await database
      .get<ItineraryModel>('itineraries')
      .find(id);

    await database.write(async () => {
      await itinerary.update((record) => {
        record.remoteId = remoteId;
        record.syncStatus = 'synced';
        record.lastSyncedAt = new Date();
      });
    });
  },

  // ==================== Item Operations (US5) ====================

  /**
   * Update an itinerary item offline
   */
  updateItem: async (
    itemId: string,
    updates: {
      startTime?: string | null;
      endTime?: string | null;
      notes?: string;
      transportMode?: TransportMode;
      transportMinutes?: number | null;
    }
  ): Promise<ItineraryItemModel | null> => {
    try {
      const item = await database
        .get<ItineraryItemModel>('itinerary_items')
        .find(itemId);

      return database.write(async () => {
        await item.update((record) => {
          if (updates.startTime !== undefined)
            record.startTime = updates.startTime;
          if (updates.endTime !== undefined) record.endTime = updates.endTime;
          if (updates.notes !== undefined) record.notes = updates.notes || null;
          if (updates.transportMode !== undefined)
            record.transportMode = updates.transportMode;
          if (updates.transportMinutes !== undefined)
            record.transportMinutes = updates.transportMinutes;
          record.syncStatus = 'pending';
        });
        return item;
      });
    } catch (error) {
      console.error('[offlineItineraryActions] updateItem error:', error);
      return null;
    }
  },

  /**
   * Delete an itinerary item offline (soft delete)
   */
  deleteItem: async (itemId: string): Promise<boolean> => {
    try {
      const item = await database
        .get<ItineraryItemModel>('itinerary_items')
        .find(itemId);

      await database.write(async () => {
        await item.markAsDeleted();
      });
      return true;
    } catch (error) {
      console.error('[offlineItineraryActions] deleteItem error:', error);
      return false;
    }
  },

  /**
   * Reorder items within a day offline
   */
  reorderItems: async (
    dayId: string,
    itemIds: string[]
  ): Promise<ItineraryItemModel[]> => {
    try {
      // Get all items for this day
      const items = await database
        .get<ItineraryItemModel>('itinerary_items')
        .query(Q.where('day_id', dayId))
        .fetch();

      // Create a map for quick lookup
      const itemMap = new Map(items.map((item) => [item.id, item]));

      return database.write(async () => {
        const updatedItems: ItineraryItemModel[] = [];

        for (let i = 0; i < itemIds.length; i++) {
          const item = itemMap.get(itemIds[i]);
          if (item) {
            await item.update((record) => {
              record.orderIndex = i;
              record.syncStatus = 'pending';
            });
            updatedItems.push(item);
          }
        }

        return updatedItems;
      });
    } catch (error) {
      console.error('[offlineItineraryActions] reorderItems error:', error);
      return [];
    }
  },

  /**
   * Get items for a day
   */
  getItemsByDay: async (dayId: string): Promise<ItineraryItemModel[]> => {
    try {
      return database
        .get<ItineraryItemModel>('itinerary_items')
        .query(Q.where('day_id', dayId), Q.sortBy('order_index', Q.asc))
        .fetch();
    } catch (error) {
      console.error('[offlineItineraryActions] getItemsByDay error:', error);
      return [];
    }
  },

  /**
   * Get items pending sync
   */
  getItemsPendingSync: async (): Promise<ItineraryItemModel[]> => {
    try {
      return database
        .get<ItineraryItemModel>('itinerary_items')
        .query(Q.where('sync_status', 'pending'))
        .fetch();
    } catch (error) {
      console.error(
        '[offlineItineraryActions] getItemsPendingSync error:',
        error
      );
      return [];
    }
  },

  /**
   * Mark item as synced
   */
  markItemSynced: async (itemId: string, remoteId: string): Promise<void> => {
    try {
      const item = await database
        .get<ItineraryItemModel>('itinerary_items')
        .find(itemId);

      await database.write(async () => {
        await item.update((record) => {
          record.remoteId = remoteId;
          record.syncStatus = 'synced';
        });
      });
    } catch (error) {
      console.error('[offlineItineraryActions] markItemSynced error:', error);
    }
  },
};

export default offlineItineraryActions;
