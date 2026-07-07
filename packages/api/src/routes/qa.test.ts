import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { requestWithAuth, requestWithEnv } from '../test/helpers.js';

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

describe('qa routes', () => {
  beforeEach(() => {
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
  });

  describe('gET /api/qa/questions', () => {
    it('returns questions for a POI', async () => {
      const itemsChain = createPaginatedSelectChain([
        { id: 1, poiId: 1, title: 'Question 1', content: 'Content', category: 'general', tags: null, answersCount: 0, lastActivityAt: new Date(), createdAt: new Date() },
      ]);
      const countChain = createCountSelectChain([{ count: 1 }]);

      mockDb.select
        .mockReturnValueOnce(itemsChain)
        .mockReturnValueOnce(countChain);

      const response = await requestWithEnv(createApp(), '/api/qa/questions?poiId=1');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
    });

    it('returns 400 when poiId is missing', async () => {
      const response = await requestWithEnv(createApp(), '/api/qa/questions');
      expect(response.status).toBe(400);
    });
  });

  describe('pOST /api/qa/questions', () => {
    it('creates a question', async () => {
      mockDb.insert.mockReturnValueOnce(createInsertChain(10));

      const response = await requestWithAuth(createApp(), '/api/qa/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poiId: 1, title: 'New Question' }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBe(10);
    });

    it('requires auth', async () => {
      const response = await requestWithEnv(createApp(), '/api/qa/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poiId: 1, title: 'New Question' }),
      });
      expect(response.status).toBe(401);
    });
  });

  describe('gET /api/qa/answers', () => {
    it('returns answers for a question', async () => {
      const itemsChain = createPaginatedSelectChain([
        { id: 1, questionId: 1, content: 'Answer 1', createdAt: new Date() },
      ]);
      const countChain = createCountSelectChain([{ count: 1 }]);

      mockDb.select
        .mockReturnValueOnce(itemsChain)
        .mockReturnValueOnce(countChain);

      const response = await requestWithEnv(createApp(), '/api/qa/answers?questionId=1');
      expect(response.status).toBe(200);
    });

    it('returns 400 when questionId is missing', async () => {
      const response = await requestWithEnv(createApp(), '/api/qa/answers');
      expect(response.status).toBe(400);
    });
  });

  describe('pOST /api/qa/answers', () => {
    it('creates an answer', async () => {
      mockDb.insert.mockReturnValueOnce(createInsertChain(20));
      mockDb.update.mockReturnValueOnce(createUpdateChain());

      const response = await requestWithAuth(createApp(), '/api/qa/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: 1, content: 'Answer content' }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBe(20);
    });
  });
});
