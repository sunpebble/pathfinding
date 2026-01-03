import type { Poi as PoiType, TransportMode } from '@pathfinding/types';
import type ItineraryItem from '@/database/models/ItineraryItem';
import type Poi from '@/database/models/Poi';
import type SyncQueue from '@/database/models/SyncQueue';
import { database } from '@/database';

/**
 * Create input for new item
 */
interface CreateItemInput {
  dayId: string;
  poiId?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  transportMode?: TransportMode;
  transportMinutes?: number;
}

/**
 * Update input for item
 */
interface UpdateItemInput {
  startTime?: string | null;
  endTime?: string | null;
  notes?: string;
  transportMode?: TransportMode;
  transportMinutes?: number | null;
}

/**
 * Offline actions for itinerary items using WatermelonDB
 */
export const offlineItemActions = {
  /**
   * Create a new item offline
   */
  async create(input: CreateItemInput): Promise<ItineraryItem> {
    const itemsCollection = database.get<ItineraryItem>('itinerary_items');
    const syncQueueCollection = database.get<SyncQueue>('sync_queue');

    // Get max order index for this day
    const existingItems = await itemsCollection.query().fetch();
    const dayItems = existingItems.filter((item) => item.dayId === input.dayId);
    const maxOrderIndex = dayItems.reduce(
      (max, item) => Math.max(max, item.orderIndex),
      -1
    );

    const newItem = await database.write(async () => {
      // Create the item
      const item = await itemsCollection.create((record) => {
        record.serverId = ''; // Will be set after sync
        record.dayId = input.dayId;
        record.poiId = input.poiId || null;
        record.orderIndex = maxOrderIndex + 1;
        record.startTime = input.startTime || null;
        record.endTime = input.endTime || null;
        record.notes = input.notes || null;
        record.transportMode = input.transportMode || 'walking';
        record.transportMinutes = input.transportMinutes || null;
      });

      // Add to sync queue
      await syncQueueCollection.create((record) => {
        record.entityType = 'itinerary_item';
        record.entityId = item.id;
        record.action = 'create';
        record.payload = JSON.stringify(input);
        record.status = 'pending';
        record.retryCount = 0;
      });

      return item;
    });

    return newItem;
  },

  /**
   * Update an existing item offline
   */
  async update(itemId: string, input: UpdateItemInput): Promise<ItineraryItem> {
    const itemsCollection = database.get<ItineraryItem>('itinerary_items');
    const syncQueueCollection = database.get<SyncQueue>('sync_queue');

    const item = await itemsCollection.find(itemId);

    await database.write(async () => {
      await item.update((record) => {
        if (input.startTime !== undefined) record.startTime = input.startTime;
        if (input.endTime !== undefined) record.endTime = input.endTime;
        if (input.notes !== undefined) record.notes = input.notes || null;
        if (input.transportMode !== undefined)
          record.transportMode = input.transportMode;
        if (input.transportMinutes !== undefined)
          record.transportMinutes = input.transportMinutes;
      });

      // Add to sync queue
      await syncQueueCollection.create((record) => {
        record.entityType = 'itinerary_item';
        record.entityId = itemId;
        record.action = 'update';
        record.payload = JSON.stringify(input);
        record.status = 'pending';
        record.retryCount = 0;
      });
    });

    return item;
  },

  /**
   * Delete an item offline
   */
  async delete(itemId: string): Promise<void> {
    const itemsCollection = database.get<ItineraryItem>('itinerary_items');
    const syncQueueCollection = database.get<SyncQueue>('sync_queue');

    const item = await itemsCollection.find(itemId);

    await database.write(async () => {
      // Add to sync queue before deletion
      await syncQueueCollection.create((record) => {
        record.entityType = 'itinerary_item';
        record.entityId = item.serverId || itemId;
        record.action = 'delete';
        record.payload = JSON.stringify({ serverId: item.serverId });
        record.status = 'pending';
        record.retryCount = 0;
      });

      // Mark as deleted (soft delete)
      await item.markAsDeleted();
    });
  },

  /**
   * Get items for a day
   */
  async getByDayId(dayId: string): Promise<ItineraryItem[]> {
    const itemsCollection = database.get<ItineraryItem>('itinerary_items');

    const items = await itemsCollection.query().fetch();

    return items
      .filter((item) => item.dayId === dayId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  },

  /**
   * Reorder items within a day
   */
  async reorder(dayId: string, itemIds: string[]): Promise<void> {
    const itemsCollection = database.get<ItineraryItem>('itinerary_items');
    const syncQueueCollection = database.get<SyncQueue>('sync_queue');

    await database.write(async () => {
      for (let i = 0; i < itemIds.length; i++) {
        const item = await itemsCollection.find(itemIds[i]);
        await item.update((record) => {
          record.orderIndex = i;
        });
      }

      // Add to sync queue
      await syncQueueCollection.create((record) => {
        record.entityType = 'itinerary_item';
        record.entityId = dayId;
        record.action = 'reorder';
        record.payload = JSON.stringify({ dayId, itemIds });
        record.status = 'pending';
        record.retryCount = 0;
      });
    });
  },
};

/**
 * Offline actions for POI caching
 */
export const offlinePoiActions = {
  /**
   * Cache POIs locally
   */
  async cachePois(pois: PoiType[]): Promise<void> {
    const poisCollection = database.get<Poi>('pois');

    await database.write(async () => {
      for (const poi of pois) {
        // Check if POI already exists
        const existing = await poisCollection.query().fetch();
        const existingPoi = existing.find((p) => p.serverId === poi.id);

        if (existingPoi) {
          // Update existing
          await existingPoi.update((record) => {
            record.name = poi.name;
            record.nameEn = poi.nameEn || null;
            record.category = poi.category;
            record.cityId = poi.cityId;
            record.address = poi.address || null;
            record.latitude = poi.latitude;
            record.longitude = poi.longitude;
            record.rating = poi.rating || null;
            record.ratingCount = poi.ratingCount;
            record.priceLevel = poi.priceLevel || null;
            record.businessHours = poi.businessHours
              ? JSON.stringify(poi.businessHours)
              : null;
            record.imageUrls = poi.imageUrls
              ? JSON.stringify(poi.imageUrls)
              : null;
          });
        } else {
          // Create new
          await poisCollection.create((record) => {
            record.serverId = poi.id;
            record.name = poi.name;
            record.nameEn = poi.nameEn || null;
            record.category = poi.category;
            record.cityId = poi.cityId;
            record.address = poi.address || null;
            record.latitude = poi.latitude;
            record.longitude = poi.longitude;
            record.rating = poi.rating || null;
            record.ratingCount = poi.ratingCount;
            record.priceLevel = poi.priceLevel || null;
            record.businessHours = poi.businessHours
              ? JSON.stringify(poi.businessHours)
              : null;
            record.imageUrls = poi.imageUrls
              ? JSON.stringify(poi.imageUrls)
              : null;
          });
        }
      }
    });
  },

  /**
   * Get cached POIs by city
   */
  async getByCityId(cityId: string): Promise<Poi[]> {
    const poisCollection = database.get<Poi>('pois');

    const pois = await poisCollection.query().fetch();

    return pois.filter((poi) => poi.cityId === cityId);
  },

  /**
   * Search cached POIs
   */
  async search(
    cityId: string,
    query?: string,
    category?: string
  ): Promise<Poi[]> {
    const allPois = await this.getByCityId(cityId);

    let filtered = allPois;

    if (category) {
      filtered = filtered.filter((poi) => poi.category === category);
    }

    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (poi) =>
          poi.name.toLowerCase().includes(lowerQuery) ||
          (poi.nameEn && poi.nameEn.toLowerCase().includes(lowerQuery))
      );
    }

    return filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  },
};
