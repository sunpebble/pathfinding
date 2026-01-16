/**
 * Offline Sync Hook - Stub implementation for Convex
 *
 * Since Convex provides real-time synchronization, offline sync is handled
 * automatically by the Convex client. This hook provides a compatible API
 * for components that previously relied on manual sync.
 */

import { useState } from 'react';

interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  error: string | null;
  syncAll: () => Promise<void>;
}

/**
 * Hook for offline sync status
 *
 * With Convex, data is automatically synchronized when online.
 * This hook provides backwards compatibility for UI components.
 */
export function useOfflineSync(): OfflineSyncState {
  const [isOnline] = useState(true); // Convex handles this internally

  return {
    isOnline,
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    error: null,
    syncAll: async () => {
      // No-op: Convex handles sync automatically
    },
  };
}

export default useOfflineSync;
