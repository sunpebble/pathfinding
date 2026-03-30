import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { requestWithAuth } from '../test/helpers.js';

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
};

vi.mock('@pathfinding/database', async () => {
  const actual = await vi.importActual<typeof import('@pathfinding/database')>('@pathfinding/database');

  return {
    ...actual,
    createDb: vi.fn(() => mockDb),
    getDb: vi.fn(() => mockDb),
  };
});

/**
 * Chain where `.limit()` is the terminal (resolves when awaited).
 * Matches: db.select().from(x).where(...).limit(1)
 */
function createSelectChain(result: unknown) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where, limit });

  return { from, where, limit };
}

/**
 * Chain where `.offset()` is the terminal (resolves when awaited).
 * Matches: db.select().from(x).where(...).limit(n).offset(n)
 */
function _createPaginatedSelectChain(result: unknown) {
  const offset = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ offset });
  const where = vi.fn().mockReturnValue({ limit, offset });
  const from = vi.fn().mockReturnValue({ where, limit, offset });

  return { from, where, limit, offset };
}

describe('user routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
    mockDb.transaction.mockReset();
  });

  describe('gET /api/users/:id', () => {
    it('returns user profile', async () => {
      const userChain = createSelectChain([
        { id: 1, name: 'Test User', email: 'test@example.com', image: null, createdAt: '2026-01-01' },
      ]);
      const profileChain = createSelectChain([
        { userId: 1, displayName: 'Test Display', bio: 'Hello', avatarUrl: null, followersCount: 5, followingCount: 3 },
      ]);
      mockDb.select
        .mockReturnValueOnce(userChain)
        .mockReturnValueOnce(profileChain);

      const response = await createApp().request('/api/users/1');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.data.display_name).toBe('Test Display');
      expect(body.data.followers_count).toBe(5);
    });

    it('returns 404 when user does not exist', async () => {
      const emptyChain = createSelectChain([]);
      mockDb.select.mockReturnValueOnce(emptyChain);

      const response = await createApp().request('/api/users/999');

      expect(response.status).toBe(404);
    });

    it('returns 400 for invalid user ID', async () => {
      const response = await createApp().request('/api/users/abc');

      expect(response.status).toBe(400);
    });
  });

  describe('pATCH /api/users/:id', () => {
    it('allows updating own profile', async () => {
      mockDb.transaction.mockImplementation(async (callback: (tx: typeof mockDb) => Promise<void>) => {
        const txSelectChain = createSelectChain([
          { userId: 1, displayName: 'Old Name', bio: null },
        ]);
        const txUpdateChain = {
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        };
        await callback({
          ...mockDb,
          select: vi.fn().mockReturnValue(txSelectChain),
          update: vi.fn().mockReturnValue(txUpdateChain),
        });
      });

      const response = await requestWithAuth(createApp(), '/api/users/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'New Name' }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('rejects updating another user\'s profile', async () => {
      const response = await requestWithAuth(createApp(), '/api/users/2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Hacker' }),
      });

      expect(response.status).toBe(403);
    });

    it('requires auth', async () => {
      const response = await createApp().request('/api/users/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Anon' }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('gET /api/users/:id/follow/status', () => {
    it('returns follow status', async () => {
      const followChain = createSelectChain([
        { followerId: 1, followingId: 2 },
      ]);
      mockDb.select.mockReturnValueOnce(followChain);

      const response = await createApp().request('/api/users/1/follow/status?followingId=2');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.is_following).toBe(true);
    });

    it('returns not following when no record', async () => {
      const emptyChain = createSelectChain([]);
      mockDb.select.mockReturnValueOnce(emptyChain);

      const response = await createApp().request('/api/users/1/follow/status?followingId=3');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.is_following).toBe(false);
    });

    it('returns 400 when followingId is missing', async () => {
      const response = await createApp().request('/api/users/1/follow/status');

      expect(response.status).toBe(400);
    });
  });

  describe('pOST /api/users/:id/follow', () => {
    it('prevents self-follow', async () => {
      const response = await requestWithAuth(createApp(), '/api/users/1/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followingId: 1 }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('不能关注自己');
    });

    it('returns 409 when already following', async () => {
      const existingChain = createSelectChain([{ followerId: 1, followingId: 2 }]);
      mockDb.select.mockReturnValueOnce(existingChain);

      const response = await requestWithAuth(createApp(), '/api/users/1/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followingId: 2 }),
      });

      expect(response.status).toBe(409);
    });
  });
});
