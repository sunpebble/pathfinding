import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
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

function createPaginatedSelectChain(result: unknown) {
  const offset = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ offset });
  const where = vi.fn().mockReturnValue({ limit, offset });
  const from = vi.fn().mockReturnValue({ where, limit, offset });
  return { from, where, limit, offset };
}

function createNearbySelectChain(result: unknown) {
  const limit = vi.fn().mockResolvedValue(result);
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ orderBy, limit });
  const from = vi.fn().mockReturnValue({ where, orderBy, limit });
  return { from, where, orderBy, limit };
}

function createCountSelectChain(count: number) {
  const where = vi.fn().mockResolvedValue([{ count }]);
  const from = vi.fn().mockReturnValue({ where });
  return { from, where };
}

describe('poi routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
  });

  describe('gET /api/pois', () => {
    it('returns POIs list', async () => {
      const chain = createPaginatedSelectChain([
        { id: 1, name: 'Eiffel Tower', cityId: 1, category: 'attraction', latitude: 48.8584, longitude: 2.2945 },
      ]);
      const countChain = createCountSelectChain(1);
      mockDb.select.mockReturnValueOnce(chain).mockReturnValueOnce(countChain);

      const response = await createApp().request('/api/pois');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.pagination).toBeDefined();
    });

    it('filters by query, cityId and category', async () => {
      const chain = createPaginatedSelectChain([
        { id: 1, name: 'Eiffel Tower', cityId: 1, category: 'attraction' },
      ]);
      const countChain = createCountSelectChain(1);
      mockDb.select.mockReturnValueOnce(chain).mockReturnValueOnce(countChain);

      const response = await createApp().request('/api/pois?q=tower&cityId=1&category=attraction');
      expect(response.status).toBe(200);
    });

    it('returns 400 for invalid cityId', async () => {
      const response = await createApp().request('/api/pois?cityId=abc');
      expect(response.status).toBe(400);
    });
  });

  describe('gET /api/pois/nearby', () => {
    it('returns nearby POIs', async () => {
      const chain = createNearbySelectChain([
        { poi: { id: 1, name: 'Eiffel Tower' }, distance: 0.5 },
      ]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await createApp().request('/api/pois/nearby?lat=48.8584&lng=2.2945&radius=5');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
    });

    it('filters nearby by category', async () => {
      const chain = createNearbySelectChain([
        { poi: { id: 1, name: 'Eiffel Tower', category: 'attraction' }, distance: 0.5 },
      ]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await createApp().request('/api/pois/nearby?lat=48.8584&lng=2.2945&category=attraction');
      expect(response.status).toBe(200);
    });

    it('returns 400 when lat/lng are missing', async () => {
      const response = await createApp().request('/api/pois/nearby');
      expect(response.status).toBe(400);
    });
  });

  describe('gET /api/pois/:id', () => {
    it('returns POI by ID', async () => {
      const chain = createSelectChain([
        { id: 1, name: 'Eiffel Tower', cityId: 1, category: 'attraction' },
      ]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await createApp().request('/api/pois/1');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
    });

    it('returns 404 for non-existent POI', async () => {
      const chain = createSelectChain([]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await createApp().request('/api/pois/999');
      expect(response.status).toBe(404);
    });

    it('returns 400 for invalid ID', async () => {
      const response = await createApp().request('/api/pois/abc');
      expect(response.status).toBe(400);
    });
  });
});
