/* eslint-disable ts/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getUserById, getUserProfile } from './users';

// Mock the Convex server functions to return the definition object
vi.mock('./_generated/server', () => ({
  mutation: (args: any) => args,
  query: (args: any) => args,
}));

describe('users.ts', () => {
  let mockDb: any;
  let mockCtx: any;
  let mockQuery: any;

  beforeEach(() => {
    mockQuery = {
      collect: vi.fn().mockResolvedValue([]),
      filter: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
      withIndex: vi.fn().mockReturnThis(),
    };

    mockDb = {
      query: vi.fn().mockReturnValue(mockQuery),
    };

    mockCtx = {
      auth: {
        getUserIdentity: vi.fn().mockResolvedValue(null),
      },
      db: mockDb,
    };
  });

  describe('getUserById', () => {
    it('should query profiles using by_email index', async () => {
      // Act
      // The handler expects an args object as the second argument
      await getUserById.handler(mockCtx, { userId: 'test@example.com' });

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith('profiles');

      // This is the CRITICAL optimization check
      // We expect it to use the index instead of a filter
      expect(mockQuery.withIndex).toHaveBeenCalledWith('by_email', expect.any(Function));
      expect(mockQuery.filter).not.toHaveBeenCalled();
    });
  });

  describe('getUserProfile', () => {
    it('should query profiles using by_email index', async () => {
      // Act
      await getUserProfile.handler(mockCtx, { userId: 'test@example.com' });

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith('profiles');

      // This is the CRITICAL optimization check
      expect(mockQuery.withIndex).toHaveBeenCalledWith('by_email', expect.any(Function));
      expect(mockQuery.filter).not.toHaveBeenCalled();
    });
  });
});
