import { describe, it, expect, vi } from 'vitest';
import { getUserByIdHandler, getUserProfileHandler } from './users';

describe('User Queries Performance', () => {
  describe('getUserByIdHandler', () => {
    it('should use by_email index for user lookup', async () => {
      // Mock the query builder chain
      const mockQueryBuilder = {
        withIndex: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      };

      const mockDb = {
        query: vi.fn().mockReturnValue(mockQueryBuilder),
      };

      const mockCtx = {
        db: mockDb,
      };

      await getUserByIdHandler(mockCtx as any, { userId: 'test@example.com' });

      // Verify query starts with 'profiles' table
      expect(mockDb.query).toHaveBeenCalledWith('profiles');

      // Verify it uses the index
      expect(mockQueryBuilder.withIndex).toHaveBeenCalledWith(
        'by_email',
        expect.any(Function)
      );

      // Verify it does NOT use full table scan filter
      expect(mockQueryBuilder.filter).not.toHaveBeenCalled();
    });
  });

  describe('getUserProfileHandler', () => {
    it('should use by_email index for profile lookup', async () => {
      const mockQueryBuilder = {
        withIndex: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      };

      const mockDb = {
        query: vi.fn().mockReturnValue(mockQueryBuilder),
      };

      const mockCtx = {
        db: mockDb,
      };

      await getUserProfileHandler(mockCtx as any, { userId: 'test@example.com' });

      expect(mockDb.query).toHaveBeenCalledWith('profiles');

      // Verify it uses the index
      expect(mockQueryBuilder.withIndex).toHaveBeenCalledWith(
        'by_email',
        expect.any(Function)
      );

      // Verify it does NOT use full table scan filter (for the main profile query)
      // Note: getUserProfile might use other queries for follow status, but the first query
      // should be the profile lookup using index.
      // Since we mock first() to return null, it returns early, so no other queries happen.
      expect(mockQueryBuilder.filter).not.toHaveBeenCalled();
    });
  });
});
