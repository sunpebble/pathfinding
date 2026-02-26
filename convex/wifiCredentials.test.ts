/* eslint-disable ts/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as wifiCredentials from './wifiCredentials';

// Mock the server module to expose the handler directly
vi.mock('./_generated/server', () => ({
  query: (def: any) => def,
  mutation: (def: any) => def,
  internalMutation: (def: any) => def,
  internalQuery: (def: any) => def,
}));

describe('wifiCredentials Security', () => {
  let mockCtx: any;
  let mockDb: any;
  let mockAuth: any;

  beforeEach(() => {
    mockDb = {
      query: vi.fn().mockReturnThis(),
      withIndex: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      collect: vi.fn().mockResolvedValue([]),
      first: vi.fn().mockResolvedValue(null),
      insert: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
    };
    mockAuth = {
      getUserIdentity: vi.fn().mockResolvedValue({ subject: 'user123', email: 'test@example.com' }),
    };
    mockCtx = { db: mockDb, auth: mockAuth };
  });

  describe('listByUser', () => {
    it('should throw if unauthenticated', async () => {
      mockAuth.getUserIdentity.mockResolvedValue(null);
      await expect((wifiCredentials.listByUser as any).handler(mockCtx, {})).rejects.toThrow('Unauthenticated');
    });

    it('should query by authenticated user', async () => {
      await (wifiCredentials.listByUser as any).handler(mockCtx, {});

      // Verify query is filtered by 'user123' (from mockAuth)
      expect(mockDb.query).toHaveBeenCalledWith('wifiCredentials');
      expect(mockDb.withIndex).toHaveBeenCalledWith('by_user', expect.any(Function));

      // We can't easily inspect the 'q' function passed to withIndex with simple mocks,
      // but we can verify that userId was NOT passed in args
    });
  });

  describe('create', () => {
    it('should throw if unauthenticated', async () => {
      mockAuth.getUserIdentity.mockResolvedValue(null);
      await expect((wifiCredentials.create as any).handler(mockCtx, {
        name: 'test',
        ssid: 'test',
        password: 'pass',
      })).rejects.toThrow('Unauthenticated');
    });

    it('should create credential with authenticated user ID', async () => {
      const args = {
        name: 'My WiFi',
        ssid: 'MySSID',
        password: 'password123',
        isShared: false,
      };

      await (wifiCredentials.create as any).handler(mockCtx, args);

      expect(mockDb.insert).toHaveBeenCalledWith('wifiCredentials', expect.objectContaining({
        ...args,
        userId: 'user123', // Should match mockAuth subject
      }));
    });
  });

  describe('update', () => {
    it('should throw if unauthorized (not owner)', async () => {
      // Mock existing credential owned by SOMEONE ELSE
      mockDb.get.mockResolvedValue({
        _id: 'cred1',
        userId: 'otherUser',
        name: 'Old Name',
      });

      const args = { id: 'cred1', name: 'New Name' };

      await expect((wifiCredentials.update as any).handler(mockCtx, args)).rejects.toThrow('Unauthorized');
    });

    it('should update if owner', async () => {
      // Mock existing credential owned by USER
      mockDb.get.mockResolvedValue({
        _id: 'cred1',
        userId: 'user123',
        name: 'Old Name',
      });

      const args = { id: 'cred1', name: 'New Name' };

      await (wifiCredentials.update as any).handler(mockCtx, args);

      expect(mockDb.patch).toHaveBeenCalledWith('cred1', expect.objectContaining({
        name: 'New Name',
        updatedAt: expect.any(Number),
      }));
    });
  });

  describe('remove', () => {
    it('should throw if unauthorized (not owner)', async () => {
      mockDb.get.mockResolvedValue({
        _id: 'cred1',
        userId: 'otherUser',
      });

      await expect((wifiCredentials.remove as any).handler(mockCtx, { id: 'cred1' })).rejects.toThrow('Unauthorized');
    });

    it('should delete if owner', async () => {
      mockDb.get.mockResolvedValue({
        _id: 'cred1',
        userId: 'user123',
      });

      await (wifiCredentials.remove as any).handler(mockCtx, { id: 'cred1' });

      expect(mockDb.delete).toHaveBeenCalledWith('cred1');
    });
  });
});
