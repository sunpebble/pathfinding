/**
 * NFR: Offline Sync Conflict Resolution Test
 *
 * Validates last-write-wins conflict resolution for offline sync
 *
 * Test requirements:
 * - Detect conflicts between local and server versions
 * - Apply last-write-wins strategy
 * - Notify user of conflicts when appropriate
 */

import { database } from '../../src/database';
import {
  ConflictResolution,
  offlineSync,
} from '../../src/services/offlineSync';

describe('offline Sync Conflict Resolution', () => {
  beforeEach(async () => {
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    jest.clearAllMocks();
  });

  describe('last-Write-Wins Strategy', () => {
    it('should resolve conflict in favor of newer timestamp', async () => {
      const localTimestamp = Date.now() - 1000; // 1 second ago
      const serverTimestamp = Date.now(); // Now

      const localRecord = {
        id: 'item-1',
        title: 'Local Edit',
        updatedAt: localTimestamp,
      };

      const serverRecord = {
        id: 'item-1',
        title: 'Server Edit',
        updatedAt: serverTimestamp,
      };

      const resolution = ConflictResolution.resolve(localRecord, serverRecord);

      expect(resolution.winner).toBe('server');
      expect(resolution.data.title).toBe('Server Edit');
    });

    it('should prefer local changes when local is newer', async () => {
      const localTimestamp = Date.now(); // Now
      const serverTimestamp = Date.now() - 5000; // 5 seconds ago

      const localRecord = {
        id: 'item-1',
        title: 'Local Edit (newer)',
        updatedAt: localTimestamp,
      };

      const serverRecord = {
        id: 'item-1',
        title: 'Server Edit (older)',
        updatedAt: serverTimestamp,
      };

      const resolution = ConflictResolution.resolve(localRecord, serverRecord);

      expect(resolution.winner).toBe('local');
      expect(resolution.data.title).toBe('Local Edit (newer)');
    });

    it('should handle equal timestamps by preferring server', async () => {
      const timestamp = Date.now();

      const localRecord = {
        id: 'item-1',
        title: 'Local',
        updatedAt: timestamp,
      };

      const serverRecord = {
        id: 'item-1',
        title: 'Server',
        updatedAt: timestamp,
      };

      const resolution = ConflictResolution.resolve(localRecord, serverRecord);

      // Tie-breaker: server wins
      expect(resolution.winner).toBe('server');
    });
  });

  describe('conflict Detection', () => {
    it('should detect conflicts during sync', async () => {
      // Create local record
      await database.write(async () => {
        await database.collections.get('itineraries').create((record: any) => {
          record.serverId = 'server-itinerary-1';
          record.title = 'Local Version';
          record.updatedAt = Date.now() - 2000;
          record.syncStatus = 'modified';
        });
      });

      // Simulate server having a newer version
      const serverData = {
        id: 'server-itinerary-1',
        title: 'Server Version',
        updatedAt: Date.now(),
      };

      const conflicts = await offlineSync.detectConflicts([serverData]);

      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe('update_conflict');
    });

    it('should not report conflict for new local records', async () => {
      // Create new local record (never synced)
      await database.write(async () => {
        await database.collections.get('itineraries').create((record: any) => {
          record.serverId = null;
          record.title = 'New Local Record';
          record.syncStatus = 'created';
        });
      });

      const conflicts = await offlineSync.detectConflicts([]);

      expect(conflicts.length).toBe(0);
    });
  });

  describe('sync After Conflict Resolution', () => {
    it('should successfully sync after resolving conflicts', async () => {
      // Setup conflict scenario
      const localId = await database.write(async () => {
        const record = await database.collections
          .get('itineraries')
          .create((record: any) => {
            record.serverId = 'itinerary-conflict';
            record.title = 'Old Local';
            record.updatedAt = Date.now() - 10000;
            record.syncStatus = 'modified';
          });
        return record.id;
      });

      // Sync with server version
      const serverData = {
        id: 'itinerary-conflict',
        title: 'Server Wins',
        updatedAt: Date.now(),
      };

      await offlineSync.resolveAndApply(localId, serverData);

      // Verify resolution applied
      const resolved = await database.collections
        .get('itineraries')
        .find(localId);
      expect((resolved as any).title).toBe('Server Wins');
      expect((resolved as any).syncStatus).toBe('synced');
    });
  });
});
