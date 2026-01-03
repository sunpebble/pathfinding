import type {
  Itinerary,
} from '@pathfinding/types';
import type { Itinerary as ItineraryModel } from '@/database/models/Itinerary';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/database';
import * as itineraryService from './itineraryService';

/**
 * Sync conflict strategies
 */
export type ConflictStrategy = 'local' | 'remote' | 'merge';

/**
 * Sync status for offline changes
 */
export interface SyncItem {
  id: string;
  type: 'itinerary' | 'itinerary_day' | 'itinerary_item';
  status: 'pending' | 'synced' | 'conflict';
  localVersion: number;
  remoteVersion: number;
  lastSyncedAt: string | null;
  conflictResolution?: ConflictStrategy;
}

/**
 * Offline sync adapter for WatermelonDB with conflict resolution
 */
export const offlineSync = {
  /**
   * Sync pending changes to the server
   */
  syncPendingChanges: async (userId: string): Promise<SyncItem[]> => {
    const syncedItems: SyncItem[] = [];

    try {
      // Get all pending itineraries
      const pendingItineraries = await database
        .get<ItineraryModel>('itineraries')
        .query(Q.where('user_id', userId), Q.where('sync_status', 'pending'))
        .fetch();

      // Sync each pending itinerary
      for (const localItinerary of pendingItineraries) {
        try {
          // Check if it's a create, update, or delete
          if (!localItinerary.remoteId) {
            // New itinerary - create on server
            const remoteItinerary = await itineraryService.createItinerary({
              title: localItinerary.title,
              city_id: localItinerary.cityId,
              start_date: localItinerary.startDate,
              end_date: localItinerary.endDate,
              visibility: localItinerary.visibility,
              cover_image_url: localItinerary.coverImageUrl,
              description: localItinerary.description,
            });

            // Update local record with remote ID
            await database.write(async () => {
              await localItinerary.update((record) => {
                record.remoteId = remoteItinerary.id;
                record.syncStatus = 'synced';
                record.lastSyncedAt = new Date().toISOString();
              });
            });

            syncedItems.push({
              id: localItinerary.id,
              type: 'itinerary',
              status: 'synced',
              localVersion: 1,
              remoteVersion: 1,
              lastSyncedAt: new Date().toISOString(),
            });
          } else {
            // Existing itinerary - update on server
            await itineraryService.updateItinerary(localItinerary.remoteId, {
              title: localItinerary.title,
              visibility: localItinerary.visibility,
              cover_image_url: localItinerary.coverImageUrl,
              description: localItinerary.description,
            });

            // Mark as synced
            await database.write(async () => {
              await localItinerary.update((record) => {
                record.syncStatus = 'synced';
                record.lastSyncedAt = new Date().toISOString();
              });
            });

            syncedItems.push({
              id: localItinerary.id,
              type: 'itinerary',
              status: 'synced',
              localVersion: 2,
              remoteVersion: 2,
              lastSyncedAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error(
            `[offlineSync] Failed to sync itinerary ${localItinerary.id}:`,
            error
          );
          syncedItems.push({
            id: localItinerary.id,
            type: 'itinerary',
            status: 'conflict',
            localVersion: 1,
            remoteVersion: 0,
            lastSyncedAt: null,
            conflictResolution: 'local',
          });
        }
      }

      return syncedItems;
    } catch (error) {
      console.error('[offlineSync] Sync failed:', error);
      throw error;
    }
  },

  /**
   * Pull remote changes and merge with local data
   */
  pullRemoteChanges: async (_userId: string): Promise<void> => {
    try {
      // Fetch latest itineraries from server
      const remoteItineraries = await itineraryService.listItineraries({
        limit: 100,
        offset: 0,
      });

      // For each remote itinerary, check for conflicts
      for (const remoteItinerary of remoteItineraries.data || []) {
        try {
          const localItinerary = await database
            .get<ItineraryModel>('itineraries')
            .query(Q.where('remote_id', remoteItinerary.id))
            .fetchOne()
            .catch(() => null);

          if (localItinerary) {
            // Check if there's a conflict (both local and remote modified)
            const lastSyncedAt = localItinerary.lastSyncedAt
              ? new Date(localItinerary.lastSyncedAt)
              : null;
            const remoteUpdatedAt = new Date(remoteItinerary.updated_at);

            const hasLocalChanges = localItinerary.syncStatus === 'pending';
            const hasRemoteChanges =
              !lastSyncedAt || remoteUpdatedAt > lastSyncedAt;

            if (hasLocalChanges && hasRemoteChanges) {
              // Conflict detected - use merge strategy
              await handleSyncConflict(
                localItinerary,
                remoteItinerary,
                'merge'
              );
            } else if (hasRemoteChanges && !hasLocalChanges) {
              // Remote is newer - update local
              await database.write(async () => {
                await localItinerary.update((record) => {
                  record.title = remoteItinerary.title;
                  record.description = remoteItinerary.description;
                  record.coverImageUrl = remoteItinerary.cover_image_url;
                  record.visibility = remoteItinerary.visibility;
                  record.syncStatus = 'synced';
                  record.lastSyncedAt = new Date().toISOString();
                });
              });
            }
          }
        } catch (error) {
          console.error(
            `[offlineSync] Failed to pull changes for itinerary ${remoteItinerary.id}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error('[offlineSync] Pull remote changes failed:', error);
      throw error;
    }
  },

  /**
   * Get sync status for a specific itinerary
   */
  getSyncStatus: async (itineraryId: string): Promise<SyncItem | null> => {
    try {
      const itinerary = await database
        .get<ItineraryModel>('itineraries')
        .find(itineraryId)
        .catch(() => null);

      if (!itinerary) return null;

      return {
        id: itinerary.id,
        type: 'itinerary',
        status:
          (itinerary.syncStatus as 'pending' | 'synced' | 'conflict') ||
          'synced',
        localVersion: itinerary.version || 1,
        remoteVersion: itinerary.remoteVersion || 0,
        lastSyncedAt: itinerary.lastSyncedAt,
      };
    } catch (error) {
      console.error(
        `[offlineSync] Failed to get sync status for ${itineraryId}:`,
        error
      );
      return null;
    }
  },

  /**
   * Clear all pending sync items
   */
  clearPendingItems: async (userId: string): Promise<void> => {
    try {
      const pendingItineraries = await database
        .get<ItineraryModel>('itineraries')
        .query(Q.where('user_id', userId), Q.where('sync_status', 'pending'))
        .fetch();

      await database.write(async () => {
        for (const itinerary of pendingItineraries) {
          await itinerary.update((record) => {
            record.syncStatus = 'synced';
          });
        }
      });
    } catch (error) {
      console.error('[offlineSync] Failed to clear pending items:', error);
      throw error;
    }
  },

  /**
   * Get count of pending sync items
   */
  getPendingCount: async (userId: string): Promise<number> => {
    try {
      const pendingItineraries = await database
        .get<ItineraryModel>('itineraries')
        .query(Q.where('user_id', userId), Q.where('sync_status', 'pending'))
        .fetch();

      return pendingItineraries.length;
    } catch (error) {
      console.error('[offlineSync] Failed to get pending count:', error);
      return 0;
    }
  },
};

/**
 * Handle conflicts between local and remote versions
 */
async function handleSyncConflict(
  localItinerary: ItineraryModel,
  remoteItinerary: Itinerary,
  strategy: ConflictStrategy
): Promise<void> {
  try {
    if (strategy === 'local') {
      // Keep local version, mark as pending
      await database.write(async () => {
        await localItinerary.update((record) => {
          record.syncStatus = 'pending';
        });
      });
    } else if (strategy === 'remote') {
      // Use remote version
      await database.write(async () => {
        await localItinerary.update((record) => {
          record.title = remoteItinerary.title;
          record.description = remoteItinerary.description;
          record.coverImageUrl = remoteItinerary.cover_image_url;
          record.visibility = remoteItinerary.visibility;
          record.syncStatus = 'synced';
          record.lastSyncedAt = new Date().toISOString();
        });
      });
    } else {
      // Merge strategy: merge titles and descriptions, keep local visibility
      const mergedTitle = `${localItinerary.title} (updated)`;
      const mergedDescription = [
        localItinerary.description,
        remoteItinerary.description,
      ]
        .filter(Boolean)
        .join('\n\n');

      await database.write(async () => {
        await localItinerary.update((record) => {
          record.title = mergedTitle;
          record.description = mergedDescription;
          record.syncStatus = 'synced';
          record.lastSyncedAt = new Date().toISOString();
          record.conflictResolution = 'merge';
        });
      });
    }
  } catch (error) {
    console.error('[handleSyncConflict] Failed to resolve conflict:', error);
    throw error;
  }
}
