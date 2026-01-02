import { useState, useEffect, useCallback, useRef } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { database } from "../database";
import { SyncQueue } from "../database/models/SyncQueue";
import { Itinerary as ItineraryModel } from "../database/models/Itinerary";
import { itineraryService } from "./itineraryService";
import { useAppStore } from "../store";
import type { CreateItineraryInput, UpdateItineraryInput } from "@pathfinding/types";

interface SyncState {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  pendingCount: number;
  error: string | null;
}

/**
 * Hook for offline sync functionality
 */
export function useOfflineSync() {
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSyncAt: null,
    pendingCount: 0,
    error: null,
  });

  const { isOnline, setIsOnline } = useAppStore();
  const syncInProgress = useRef(false);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online ?? false);
    });

    return () => unsubscribe();
  }, [setIsOnline]);

  /**
   * Get pending sync items count
   */
  const updatePendingCount = useCallback(async () => {
    try {
      const collection = database.get<SyncQueue>("sync_queue");
      const pending = await collection.query().fetch();
      setSyncState((prev) => ({ ...prev, pendingCount: pending.length }));
    } catch (error) {
      console.error("Failed to get pending count:", error);
    }
  }, []);

  /**
   * Add item to sync queue
   */
  const queueSync = useCallback(
    async (
      entityType: "itinerary" | "itinerary_day" | "itinerary_item",
      entityId: string,
      operation: "create" | "update" | "delete",
      payload: Record<string, unknown>
    ) => {
      await database.write(async () => {
        await database.get<SyncQueue>("sync_queue").create((record) => {
          record.entityType = entityType;
          record.entityId = entityId;
          record.operation = operation;
          record.payload = JSON.stringify(payload);
          record.retryCount = 0;
          record.lastError = null;
        });
      });

      await updatePendingCount();
    },
    [updatePendingCount]
  );

  /**
   * Process a single sync queue item
   */
  const processSyncItem = useCallback(async (item: SyncQueue): Promise<boolean> => {
    try {
      const payload = JSON.parse(item.payload);

      switch (item.entityType) {
        case "itinerary":
          if (item.operation === "create") {
            const result = await itineraryService.create(payload as CreateItineraryInput);
            if (result) {
              // Update local record with remote ID
              const localItinerary = await database
                .get<ItineraryModel>("itineraries")
                .find(item.entityId);
              await database.write(async () => {
                await localItinerary.update((record) => {
                  record.remoteId = result.id;
                  record.syncStatus = "synced";
                  record.lastSyncedAt = new Date();
                });
              });
            }
          } else if (item.operation === "update") {
            await itineraryService.update(item.entityId, payload as UpdateItineraryInput);
          } else if (item.operation === "delete") {
            await itineraryService.delete(item.entityId);
          }
          break;

        // Add cases for other entity types as needed
        default:
          console.warn("Unknown entity type:", item.entityType);
      }

      // Remove from sync queue on success
      await database.write(async () => {
        await item.markAsDeleted();
      });

      return true;
    } catch (error) {
      // Update retry count and error
      await database.write(async () => {
        await item.update((record) => {
          record.retryCount = (record.retryCount || 0) + 1;
          record.lastError = error instanceof Error ? error.message : "Unknown error";
        });
      });

      return false;
    }
  }, []);

  /**
   * Sync all pending items
   */
  const syncAll = useCallback(async () => {
    if (!isOnline || syncInProgress.current) return;

    syncInProgress.current = true;
    setSyncState((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const collection = database.get<SyncQueue>("sync_queue");
      const pendingItems = await collection.query().fetch();

      // Sort by created_at to process in order
      const sorted = [...pendingItems].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      );

      let _successCount = 0;
      let failCount = 0;

      for (const item of sorted) {
        // Skip items that have failed too many times
        if ((item.retryCount || 0) >= 5) {
          failCount++;
          continue;
        }

        const success = await processSyncItem(item);
        if (success) {
          _successCount++;
        } else {
          failCount++;
        }
      }

      await updatePendingCount();

      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date(),
        error: failCount > 0 ? `${failCount} items failed to sync` : null,
      }));
    } catch (error) {
      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : "Sync failed",
      }));
    } finally {
      syncInProgress.current = false;
    }
  }, [isOnline, processSyncItem, updatePendingCount]);

  /**
   * Auto-sync when coming online
   */
  useEffect(() => {
    if (isOnline) {
      syncAll();
    }
  }, [isOnline, syncAll]);

  // Initial pending count
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  return {
    ...syncState,
    isOnline,
    queueSync,
    syncAll,
    updatePendingCount,
  };
}

export default useOfflineSync;
