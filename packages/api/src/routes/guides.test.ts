import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { requestWithAuth } from '../test/helpers.js';

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
  const orderBy = vi.fn().mockReturnValue({ limit, offset });
  const where = vi.fn().mockReturnValue({ orderBy, limit, offset });
  const from = vi.fn().mockReturnValue({ where, orderBy, limit, offset });

  return { from, where, orderBy, limit, offset };
}

function createGroupByChain(result: unknown) {
  const groupBy = vi.fn().mockResolvedValue(result);
  const from = vi.fn().mockReturnValue({ groupBy });

  return { from, groupBy };
}

function createWhereSelectChain(result: unknown) {
  const where = vi.fn().mockResolvedValue(result);
  const from = vi.fn().mockReturnValue({ where });

  return { from, where };
}

function createSearchSelectChain(result: unknown) {
  const limit = vi.fn().mockResolvedValue(result);
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ orderBy, limit });
  const from = vi.fn().mockReturnValue({ where, orderBy, limit });

  return { from, where, orderBy, limit };
}

function createInsertReturningChain(id: number) {
  return {
    values: vi.fn().mockReturnValue({
      $returningId: vi.fn().mockResolvedValue([{ id }]),
    }),
  };
}

function createUpdateChain() {
  return { set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) };
}

const guideMock = {
  id: 1,
  title: 'Paris Guide',
  platform: 'xiaohongshu',
  qualityScore: 0.9,
  viewCount: 100,
  likeCount: 50,
  createdAt: new Date(),
  authorName: 'User',
  content: '...',
  coverImageUrl: null,
  imageUrls: null,
  destinations: ['Paris'],
  enrichedData: null,
  dayItineraries: null,
  sourceUrl: null,
  tags: null,
  category: null,
};

describe('guides routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
  });

  describe('gET /api/guides', () => {
    it('returns guides list', async () => {
      const chain = createPaginatedSelectChain([guideMock]);
      const countChain = createWhereSelectChain([{ count: 1 }]);
      mockDb.select
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(countChain);

      const response = await createApp().request('/api/guides');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.pagination).toBeDefined();
    });

    it('filters by platform and min_quality', async () => {
      const chain = createPaginatedSelectChain([]);
      const countChain = createWhereSelectChain([{ count: 0 }]);
      mockDb.select
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(countChain);

      const response = await createApp().request('/api/guides?platform=xiaohongshu&min_quality=0.8');
      expect(response.status).toBe(200);
    });
  });

  describe('gET /api/guides/search', () => {
    it('searches by query', async () => {
      const chain = createSearchSelectChain([guideMock]);
      const countChain = createWhereSelectChain([{ count: 1 }]);
      mockDb.select
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(countChain);

      const response = await createApp().request('/api/guides/search?q=paris');
      expect(response.status).toBe(200);
    });

    it('searches by destination', async () => {
      const chain = createSearchSelectChain([guideMock]);
      const countChain = createWhereSelectChain([{ count: 1 }]);
      mockDb.select
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(countChain);

      const response = await createApp().request('/api/guides/search?destination=Paris');
      expect(response.status).toBe(200);
    });

    it('returns guides when no params', async () => {
      const chain = createSearchSelectChain([]);
      const countChain = createWhereSelectChain([{ count: 0 }]);
      mockDb.select
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(countChain);

      const response = await createApp().request('/api/guides/search');
      expect(response.status).toBe(200);
    });
  });

  describe('gET /api/guides/destinations', () => {
    it('returns popular destinations', async () => {
      const chain = createSelectChain([
        { destinations: ['Paris', 'London', 'Paris'] },
      ]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await createApp().request('/api/guides/destinations');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
    });
  });

  describe('gET /api/guides/by-id', () => {
    it('returns guide by ID', async () => {
      const chain = createSelectChain([guideMock]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await createApp().request('/api/guides/by-id?id=1');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.title).toBe('Paris Guide');
    });

    it('returns 400 when id is missing', async () => {
      const response = await createApp().request('/api/guides/by-id');
      expect(response.status).toBe(400);
    });

    it('returns 404 for non-existent guide', async () => {
      const chain = createSelectChain([]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await createApp().request('/api/guides/by-id?id=999');
      expect(response.status).toBe(404);
    });
  });

  describe('gET /api/guides/stats', () => {
    it('returns stats', async () => {
      const chain = createGroupByChain([
        { platform: 'xiaohongshu', count: 10 },
        { platform: 'douyin', count: 5 },
      ]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await createApp().request('/api/guides/stats');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.total).toBe(15);
      expect(body.by_platform).toBeDefined();
    });
  });

  describe('gET /api/guides/:id', () => {
    it('returns guide by path param', async () => {
      const chain = createSelectChain([guideMock]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await createApp().request('/api/guides/1');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
    });

    it('returns 400 for invalid ID', async () => {
      const response = await createApp().request('/api/guides/abc');
      expect(response.status).toBe(400);
    });

    it('returns 404 for non-existent guide', async () => {
      const chain = createSelectChain([]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await createApp().request('/api/guides/999');
      expect(response.status).toBe(404);
    });
  });

  describe('pOST /api/guides', () => {
    it('creates a guide', async () => {
      mockDb.insert.mockReturnValueOnce(createInsertReturningChain(10));

      const response = await requestWithAuth(createApp(), '/api/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'xiaohongshu', title: 'New Guide' }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data.id).toBe(10);
    });
  });

  describe('pATCH /api/guides/:id', () => {
    it('updates a guide', async () => {
      mockDb.update.mockReturnValueOnce(createUpdateChain());

      const response = await requestWithAuth(createApp(), '/api/guides/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Guide' }),
      });

      expect(response.status).toBe(200);
    });

    it('returns 400 when no fields to update', async () => {
      const response = await requestWithAuth(createApp(), '/api/guides/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('pATCH /api/guides/:id/poi-coordinates', () => {
    it('returns 404 when day itinerary not found', async () => {
      const chain = createSelectChain([{ ...guideMock, dayItineraries: [] }]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithAuth(createApp(), '/api/guides/1/poi-coordinates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayNumber: 1, poiIndex: 0, latitude: 1, longitude: 1 }),
      });

      expect(response.status).toBe(404);
    });
  });
});
