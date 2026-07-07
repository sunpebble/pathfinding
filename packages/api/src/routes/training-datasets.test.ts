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

function createInsertChain(id: number) {
  return { values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id }]) }) };
}

function createUpdateChain() {
  return { set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) };
}

describe('training-datasets routes', () => {
  beforeEach(() => {
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
  });

  describe('gET /api/training-datasets', () => {
    it('returns training datasets', async () => {
      const itemsChain = createPaginatedSelectChain([
        { id: 1, name: 'Dataset 1', version: 1 },
      ]);
      const countChain = createCountSelectChain([{ count: 1 }]);

      mockDb.select
        .mockReturnValueOnce(itemsChain)
        .mockReturnValueOnce(countChain);

      const response = await requestWithAuth(createApp(), '/api/training-datasets');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
    });
  });

  describe('pOST /api/training-datasets', () => {
    it('creates a training dataset', async () => {
      mockDb.insert.mockReturnValueOnce(createInsertChain(10));
      const selectChain = createSelectChain([{ id: 10, name: 'Dataset 1', version: 1 }]);
      mockDb.select.mockReturnValueOnce(selectChain);

      const response = await requestWithAuth(createApp(), '/api/training-datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Dataset 1', version: 1 }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data).toBeDefined();
    });
  });

  describe('gET /api/training-datasets/dataset', () => {
    it('returns a dataset by ID', async () => {
      const chain = createSelectChain([{ id: 1, name: 'Dataset 1' }]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithAuth(createApp(), '/api/training-datasets/dataset?id=1');
      expect(response.status).toBe(200);
    });

    it('returns 400 when id is missing', async () => {
      const response = await requestWithAuth(createApp(), '/api/training-datasets/dataset');
      expect(response.status).toBe(400);
    });

    it('returns 404 for non-existent dataset', async () => {
      const chain = createSelectChain([]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithAuth(createApp(), '/api/training-datasets/dataset?id=999');
      expect(response.status).toBe(404);
    });
  });

  describe('dELETE /api/training-datasets', () => {
    it('deletes a dataset', async () => {
      mockDb.delete.mockReturnValueOnce({ where: vi.fn().mockResolvedValue([]) });

      const response = await requestWithAuth(createApp(), '/api/training-datasets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 1 }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('pATCH /api/training-datasets', () => {
    it('updates a dataset', async () => {
      mockDb.update.mockReturnValueOnce(createUpdateChain());
      const selectChain = createSelectChain([{ id: 1, name: 'Updated', status: 'ready' }]);
      mockDb.select.mockReturnValueOnce(selectChain);

      const response = await requestWithAuth(createApp(), '/api/training-datasets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 1, status: 'ready' }),
      });

      expect(response.status).toBe(200);
    });
  });
});
