import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { requestWithAuth } from '../test/helpers.js';

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

vi.mock('@pathfinding/database', async () => {
  const actual = await vi.importActual<typeof import('@pathfinding/database')>('@pathfinding/database');

  return {
    ...actual,
    createDb: vi.fn(() => mockDb),
    getDb: vi.fn(() => mockDb),
  };
});

function createSelectChain(result: unknown) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where, limit });

  return { from, where, limit };
}

function createUpdateChain(result: unknown) {
  const where = vi.fn().mockResolvedValue(result);
  const set = vi.fn().mockReturnValue({ where });

  return { set, where };
}

describe('push-token routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
  });

  describe('pOST /api/push-tokens', () => {
    it('registers a new push token', async () => {
      // Existing token check — not found
      const existingChain = createSelectChain([]);
      mockDb.select.mockReturnValueOnce(existingChain);

      // Insert returns raw result
      const values = vi.fn().mockResolvedValue([{ insertId: 1 }]);
      mockDb.insert.mockReturnValueOnce({ values });

      const response = await requestWithAuth(createApp(), '/api/push-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'expo-push-token-abc123',
          platform: 'ios',
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('推送令牌已注册');
    });

    it('updates existing token', async () => {
      const existingChain = createSelectChain([
        { id: 5, userId: 1, token: 'expo-push-token-abc123', platform: 'ios' },
      ]);
      mockDb.select.mockReturnValueOnce(existingChain);

      const updateChain = createUpdateChain([{ id: 5 }]);
      mockDb.update.mockReturnValueOnce(updateChain);

      const response = await requestWithAuth(createApp(), '/api/push-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'expo-push-token-abc123',
          platform: 'ios',
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('推送令牌已更新');
    });

    it('returns 400 for missing platform', async () => {
      const response = await requestWithAuth(createApp(), '/api/push-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'abc123' }),
      });

      expect(response.status).toBe(400);
    });

    it('returns 400 for invalid platform', async () => {
      const response = await requestWithAuth(createApp(), '/api/push-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'abc123', platform: 'windows' }),
      });

      expect(response.status).toBe(400);
    });

    it('returns 400 when token is not a string', async () => {
      const response = await requestWithAuth(createApp(), '/api/push-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 123, platform: 'ios' }),
      });

      expect(response.status).toBe(400);
      expect(mockDb.select).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('dELETE /api/push-tokens', () => {
    it('deactivates a token', async () => {
      const updateChain = createUpdateChain([{ id: 5 }]);
      mockDb.update.mockReturnValueOnce(updateChain);

      const response = await requestWithAuth(createApp(), '/api/push-tokens', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'expo-push-token-abc123' }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('returns 400 when token is missing', async () => {
      const response = await requestWithAuth(createApp(), '/api/push-tokens', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });

    it('returns 400 when token is not a string', async () => {
      const response = await requestWithAuth(createApp(), '/api/push-tokens', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 123 }),
      });

      expect(response.status).toBe(400);
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('gET /api/push-tokens', () => {
    it('lists active push tokens for the user', async () => {
      // GET route uses from().where() — no limit
      const where = vi.fn().mockResolvedValue([
        { id: 5, userId: 1, token: 'expo-token-1', platform: 'ios', isActive: true },
      ]);
      const from = vi.fn().mockReturnValue({ where });
      mockDb.select.mockReturnValueOnce({ from });

      const response = await requestWithAuth(createApp(), '/api/push-tokens');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(1);
    });

    it('requires auth', async () => {
      const response = await createApp().request('/api/push-tokens');
      expect(response.status).toBe(401);
    });
  });
});
