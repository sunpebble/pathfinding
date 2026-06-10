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

/**
 * Mock the five db.select calls behind runFullAnalysis:
 * ranked field gaps → field summary → covered subquery (un-awaited) →
 * destination gap list → destination gap count.
 */
function mockGapAnalysisSelects() {
  const rankedGapChain = {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            guideId: 1,
            title: 'Test Guide',
            platform: 'xiaohongshu',
            missingCount: 7,
            content: 1,
            imageUrls: 1,
            destinations: 1,
            dayItineraries: 1,
            geoData: 1,
            enrichedData: 1,
            coverImageUrl: 1,
          }]),
        }),
      }),
    }),
  };
  const summaryChain = {
    from: vi.fn().mockResolvedValue([{
      totalGuides: 2,
      guidesWithGaps: 1,
      content: 1,
      imageUrls: 1,
      destinations: 1,
      dayItineraries: 1,
      geoData: 1,
      enrichedData: 1,
      coverImageUrl: 1,
    }]),
  };
  const subqueryChain = {
    from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({}) }),
  };
  const gapListChain = {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ cityName: 'Chengdu', countryCode: 'CN' }]),
        }),
      }),
    }),
  };
  const gapCountChain = {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ total: 1 }]),
    }),
  };

  mockDb.select
    .mockReturnValueOnce(rankedGapChain)
    .mockReturnValueOnce(summaryChain)
    .mockReturnValueOnce(subqueryChain)
    .mockReturnValueOnce(gapListChain)
    .mockReturnValueOnce(gapCountChain);
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
      mockGapAnalysisSelects();

      const response = await requestWithAuth(createApp(), '/api/crawl-jobs/backfill-analysis', {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.totalFieldGaps).toBe(1);
      expect(body.data.totalGuides).toBe(2);
      expect(body.data.totalDestinationGaps).toBe(1);
    });
  });

  describe('gET /api/crawl-jobs/ingest-stats', () => {
    it('returns daily ingest counts and field fill rates', async () => {
      // Arrange: inserted groupBy, updated groupBy, full-table field summary.
      const insertedChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
      const updatedChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
      const summaryChain = {
        from: vi.fn().mockResolvedValue([{
          totalGuides: 4,
          guidesWithGaps: 1,
          content: 1,
          imageUrls: 0,
          destinations: 0,
          dayItineraries: 0,
          geoData: 0,
          enrichedData: 0,
          coverImageUrl: 0,
        }]),
      };
      mockDb.select
        .mockReturnValueOnce(insertedChain)
        .mockReturnValueOnce(updatedChain)
        .mockReturnValueOnce(summaryChain);

      // Act
      const response = await requestWithAuth(createApp(), '/api/crawl-jobs/ingest-stats?days=3');

      // Assert
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.days).toBe(3);
      expect(body.data.daily).toHaveLength(3);
      expect(body.data.totalGuides).toBe(4);
      expect(body.data.fieldFillRates.content).toBe(0.75);
    });

    it('rejects out-of-range days', async () => {
      const response = await requestWithAuth(createApp(), '/api/crawl-jobs/ingest-stats?days=365');
      expect(response.status).toBe(400);
    });

    it('requires admin auth', async () => {
      const response = await createApp().request('/api/crawl-jobs/ingest-stats');
      expect(response.status).toBe(401);
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
