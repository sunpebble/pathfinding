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

function createCountSelectChain(result: unknown) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where, limit });

  return { from, where, limit };
}

function createSimpleSelectChain(result: unknown) {
  const from = vi.fn().mockResolvedValue(result);

  return { from };
}

function createGroupBySelectChain(result: unknown) {
  const groupBy = vi.fn().mockResolvedValue(result);
  const from = vi.fn().mockReturnValue({ groupBy });

  return { from, groupBy };
}

function createInsertChain(insertId: number) {
  return { values: vi.fn().mockResolvedValue([{ insertId: String(insertId) }]) };
}

describe('quality-reports routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.ADMIN_EMAILS = 'owner@example.com';
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
  });

  describe('gET /api/quality-reports', () => {
    it('returns quality reports', async () => {
      const itemsChain = createPaginatedSelectChain([
        { id: 1, reportType: 'accuracy', metrics: {} },
      ]);
      const countChain = createCountSelectChain([{ count: 1 }]);

      mockDb.select
        .mockReturnValueOnce(itemsChain)
        .mockReturnValueOnce(countChain);

      const response = await requestWithAuth(createApp(), '/api/quality-reports');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
    });
  });

  describe('pOST /api/quality-reports', () => {
    it('creates a quality report', async () => {
      mockDb.insert.mockReturnValueOnce(createInsertChain(10));
      const selectChain = createSelectChain([{ id: 10, reportType: 'accuracy' }]);
      mockDb.select.mockReturnValueOnce(selectChain);

      const response = await requestWithAuth(createApp(), '/api/quality-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType: 'accuracy', metrics: { score: 95 } }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data).toBeDefined();
    });
  });

  describe('gET /api/quality-reports/report', () => {
    it('returns a report by ID', async () => {
      const chain = createSelectChain([{ id: 1, reportType: 'accuracy' }]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithAuth(createApp(), '/api/quality-reports/report?id=1');
      expect(response.status).toBe(200);
    });

    it('returns 400 when id is missing', async () => {
      const response = await requestWithAuth(createApp(), '/api/quality-reports/report');
      expect(response.status).toBe(400);
    });

    it('returns 404 for non-existent report', async () => {
      const chain = createSelectChain([]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithAuth(createApp(), '/api/quality-reports/report?id=999');
      expect(response.status).toBe(404);
    });
  });

  describe('dELETE /api/quality-reports', () => {
    it('deletes a report', async () => {
      mockDb.delete.mockReturnValueOnce({ where: vi.fn().mockResolvedValue([]) });

      const response = await requestWithAuth(createApp(), '/api/quality-reports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 1 }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('gET /api/quality-reports/summary', () => {
    it('returns summary', async () => {
      const totalChain = createSimpleSelectChain([{ count: 5 }]);
      const byTypeChain = createGroupBySelectChain([
        { reportType: 'accuracy', count: 3 },
        { reportType: 'completeness', count: 2 },
      ]);

      mockDb.select
        .mockReturnValueOnce(totalChain)
        .mockReturnValueOnce(byTypeChain);

      const response = await requestWithAuth(createApp(), '/api/quality-reports/summary');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.total_reports).toBe(5);
    });
  });
});
