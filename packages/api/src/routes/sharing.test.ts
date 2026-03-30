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

describe('sharing routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
  });

  describe('pOST /api/sharing/link', () => {
    it('creates a share link', async () => {
      // Insert share link
      const insertValues1 = vi.fn().mockResolvedValue([{ insertId: '42' }]);
      // Insert share event
      const insertValues2 = vi.fn().mockResolvedValue([{ insertId: '43' }]);

      mockDb.insert
        .mockReturnValueOnce({ values: insertValues1 })
        .mockReturnValueOnce({ values: insertValues2 });

      const response = await requestWithAuth(createApp(), '/api/sharing/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceType: 'itinerary',
          resourceId: 5,
        }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.share_code).toBeDefined();
      expect(body.resource_type).toBe('itinerary');
      expect(body.resource_id).toBe(5);
    });

    it('requires auth', async () => {
      const response = await createApp().request('/api/sharing/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceType: 'itinerary', resourceId: 5 }),
      });
      expect(response.status).toBe(401);
    });
  });

  describe('pOST /api/sharing/track', () => {
    it('tracks a share view event', async () => {
      // Find share link
      const linkChain = createSelectChain([
        { id: 42, shareCode: 'abc123', resourceType: 'itinerary', resourceId: 5, viewCount: 10 },
      ]);
      mockDb.select.mockReturnValueOnce(linkChain);

      // Insert event log
      const insertValues = vi.fn().mockResolvedValue([{ insertId: '1' }]);
      mockDb.insert.mockReturnValueOnce({ values: insertValues });

      // Update view count
      const updateChain = createUpdateChain([]);
      mockDb.update.mockReturnValueOnce(updateChain);

      const response = await createApp().request('/api/sharing/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareCode: 'abc123',
          eventType: 'view',
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('handles non-existent share code gracefully', async () => {
      const emptyChain = createSelectChain([]);
      mockDb.select.mockReturnValueOnce(emptyChain);

      const response = await createApp().request('/api/sharing/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareCode: 'nonexistent',
          eventType: 'view',
        }),
      });

      expect(response.status).toBe(200);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('gET /api/sharing/stats', () => {
    it('returns 400 when resourceId or resourceType missing', async () => {
      const response = await createApp().request('/api/sharing/stats');
      expect(response.status).toBe(400);
    });

    it('returns share statistics', async () => {
      // stats uses where without limit — adjust chain
      const where = vi.fn().mockResolvedValue([
        { shareCode: 'abc', viewCount: 15, createdAt: '2026-01-01' },
        { shareCode: 'def', viewCount: 5, createdAt: '2026-01-02' },
      ]);
      const from = vi.fn().mockReturnValue({ where });
      mockDb.select.mockReturnValueOnce({ from });

      const response = await createApp().request('/api/sharing/stats?resourceId=5&resourceType=itinerary');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.total_links).toBe(2);
      expect(body.total_views).toBe(20);
    });
  });
});
