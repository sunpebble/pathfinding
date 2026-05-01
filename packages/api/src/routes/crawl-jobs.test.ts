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

function createOrderBySelectChain(result: unknown) {
  const limit = vi.fn().mockResolvedValue(result);
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ orderBy, limit });
  const from = vi.fn().mockReturnValue({ where, orderBy, limit });

  return { from, where, orderBy, limit };
}

function createInsertChain(insertId: number) {
  return { values: vi.fn().mockResolvedValue([{ insertId: String(insertId) }]) };
}

function createUpdateChain() {
  return { set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) };
}

describe('crawl-jobs routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.ADMIN_EMAILS = 'owner@example.com';
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
  });

  describe('gET /api/crawl-jobs', () => {
    it('returns crawl jobs', async () => {
      const chain = createOrderBySelectChain([
        { id: 1, platform: 'xiaohongshu', status: 'pending' },
      ]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithAuth(createApp(), '/api/crawl-jobs');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
    });

    it('filters by status and platform', async () => {
      const chain = createOrderBySelectChain([]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithAuth(createApp(), '/api/crawl-jobs?status=pending&platform=xiaohongshu');
      expect(response.status).toBe(200);
    });
  });

  describe('pOST /api/crawl-jobs', () => {
    it('creates a crawl job', async () => {
      mockDb.insert.mockReturnValueOnce(createInsertChain(10));
      const selectChain = createSelectChain([{ id: 10, platform: 'xiaohongshu', status: 'pending' }]);
      mockDb.select.mockReturnValueOnce(selectChain);

      const response = await requestWithAuth(createApp(), '/api/crawl-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Job', platform: 'xiaohongshu', config: {} }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data).toBeDefined();
    });
  });

  describe('gET /api/crawl-jobs/job', () => {
    it('returns a job by ID', async () => {
      const chain = createSelectChain([{ id: 1, platform: 'xiaohongshu' }]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithAuth(createApp(), '/api/crawl-jobs/job?id=1');
      expect(response.status).toBe(200);
    });

    it('returns 400 when id is missing', async () => {
      const response = await requestWithAuth(createApp(), '/api/crawl-jobs/job');
      expect(response.status).toBe(400);
    });

    it('returns 404 for non-existent job', async () => {
      const chain = createSelectChain([]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithAuth(createApp(), '/api/crawl-jobs/job?id=999');
      expect(response.status).toBe(404);
    });
  });

  describe('dELETE /api/crawl-jobs', () => {
    it('deletes a job', async () => {
      mockDb.delete.mockReturnValueOnce({ where: vi.fn().mockResolvedValue([]) });

      const response = await requestWithAuth(createApp(), '/api/crawl-jobs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 1 }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('pOST /api/crawl-jobs/start', () => {
    it('starts a job', async () => {
      mockDb.update.mockReturnValueOnce(createUpdateChain());
      const selectChain = createSelectChain([{ id: 1, status: 'running' }]);
      mockDb.select.mockReturnValueOnce(selectChain);

      const response = await requestWithAuth(createApp(), '/api/crawl-jobs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 1 }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('pOST /api/crawl-jobs/complete', () => {
    it('completes a job', async () => {
      mockDb.update.mockReturnValueOnce(createUpdateChain());
      const selectChain = createSelectChain([{ id: 1, status: 'completed' }]);
      mockDb.select.mockReturnValueOnce(selectChain);

      const response = await requestWithAuth(createApp(), '/api/crawl-jobs/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 1 }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('pOST /api/crawl-jobs/fail', () => {
    it('marks a job as failed', async () => {
      mockDb.update.mockReturnValueOnce(createUpdateChain());
      const selectChain = createSelectChain([{ id: 1, status: 'failed' }]);
      mockDb.select.mockReturnValueOnce(selectChain);

      const response = await requestWithAuth(createApp(), '/api/crawl-jobs/fail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 1, errorMessage: 'Failed' }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('pOST /api/crawl-jobs/backfill-analysis', () => {
    it('returns backfill analysis', async () => {
      // First select call: travelGuides
      const guidesFrom = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([
          { id: 1, title: 'Test Guide', platform: 'xiaohongshu', content: '', imageUrls: null, destinations: null, dayItineraries: null, geoData: null, enrichedData: null, coverImageUrl: null },
        ]),
      });

      // Second select call: cities
      const citiesFrom = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([
          { id: 1, name: 'Chengdu', countryCode: 'CN' },
        ]),
      });

      // Third select call: guideDestinations groupBy
      const destGroupBy = vi.fn().mockResolvedValue([]);
      const destFrom = vi.fn().mockReturnValue({ groupBy: destGroupBy });

      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1)
          return { from: guidesFrom };
        if (callCount === 2)
          return { from: citiesFrom };
        return { from: destFrom };
      });

      const response = await requestWithAuth(createApp(), '/api/crawl-jobs/backfill-analysis', {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.totalFieldGaps).toBe(1);
      expect(body.data.totalDestinationGaps).toBe(1);
    });
  });

  describe('pOST /api/crawl-jobs/backfill-jobs', () => {
    it('creates field backfill jobs', async () => {
      mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

      const response = await requestWithAuth(createApp(), '/api/crawl-jobs/backfill-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldGapGuideIds: [1, 2] }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data.jobsCreated).toBe(1);
    });

    it('returns 400 when no targets selected', async () => {
      const response = await requestWithAuth(createApp(), '/api/crawl-jobs/backfill-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });
  });
});
