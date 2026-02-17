import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkHandler, recordFailureHandler, resetHandler } from './authRateLimit';

describe('authRateLimit', () => {
  // Mock ctx.db
  const mockDb = {
    query: vi.fn(),
    insert: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };

  const mockCtx = {
    db: mockDb,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkHandler', () => {
    it('should allow if no record exists', async () => {
      mockDb.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const result = await checkHandler(mockCtx, { identifier: 'test@example.com' });
      expect(result).toEqual({ allowed: true });
    });

    it('should allow if count is below limit', async () => {
      mockDb.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 1, expiresAt: Date.now() + 10000 }),
        }),
      });

      const result = await checkHandler(mockCtx, { identifier: 'test@example.com' });
      expect(result).toEqual({ allowed: true });
    });

    it('should block if count is above limit and not expired', async () => {
      const future = Date.now() + 10000;
      mockDb.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 5, expiresAt: future }),
        }),
      });

      const result = await checkHandler(mockCtx, { identifier: 'test@example.com' });
      // @ts-expect-error - result type is inferred
      expect(result.allowed).toBe(false);
      // @ts-expect-error - result type is inferred
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should allow if count is above limit but expired', async () => {
      const past = Date.now() - 10000;
      mockDb.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 5, expiresAt: past }),
        }),
      });

      const result = await checkHandler(mockCtx, { identifier: 'test@example.com' });
      expect(result).toEqual({ allowed: true });
    });
  });

  describe('recordFailureHandler', () => {
    it('should insert new record if none exists', async () => {
      mockDb.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      await recordFailureHandler(mockCtx, { identifier: 'test@example.com' });

      expect(mockDb.insert).toHaveBeenCalledWith('rateLimits', expect.objectContaining({
        key: 'login_fail:test@example.com',
        count: 1,
      }));
    });

    it('should increment count if record exists and valid', async () => {
      const future = Date.now() + 10000;
      mockDb.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ _id: 'id1', count: 1, expiresAt: future }),
        }),
      });

      await recordFailureHandler(mockCtx, { identifier: 'test@example.com' });

      expect(mockDb.patch).toHaveBeenCalledWith('id1', expect.objectContaining({
        count: 2,
      }));
    });

    it('should reset count if record exists but expired', async () => {
      const past = Date.now() - 10000;
      mockDb.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ _id: 'id1', count: 5, expiresAt: past }),
        }),
      });

      await recordFailureHandler(mockCtx, { identifier: 'test@example.com' });

      expect(mockDb.patch).toHaveBeenCalledWith('id1', expect.objectContaining({
        count: 1,
      }));
    });
  });

  describe('resetHandler', () => {
    it('should delete record if exists', async () => {
      mockDb.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ _id: 'id1' }),
        }),
      });

      await resetHandler(mockCtx, { identifier: 'test@example.com' });

      expect(mockDb.delete).toHaveBeenCalledWith('id1');
    });

    it('should do nothing if record does not exist', async () => {
      mockDb.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      await resetHandler(mockCtx, { identifier: 'test@example.com' });

      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });
});
