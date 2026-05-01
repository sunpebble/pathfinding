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

function createGroupByChain(result: unknown) {
  const limit = vi.fn().mockResolvedValue(result);
  const groupBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ groupBy, limit });
  const from = vi.fn().mockReturnValue({ where, groupBy, limit });

  return { from, where, groupBy, limit };
}

function createPaginatedSelectChain(result: unknown) {
  const offset = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ offset });
  const orderBy = vi.fn().mockReturnValue({ limit, offset });
  const where = vi.fn().mockReturnValue({ orderBy, limit, offset });
  const from = vi.fn().mockReturnValue({ where, orderBy, limit, offset });

  return { from, where, orderBy, limit, offset };
}

function createInsertChain(insertId: number) {
  return { values: vi.fn().mockResolvedValue([{ insertId: String(insertId) }]) };
}

function createUpdateChain() {
  return { set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) };
}

describe('translation routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
  });

  describe('gET /api/translations/categories', () => {
    it('returns categories', async () => {
      const chain = createGroupByChain([
        { category: 'greetings', count: 5 },
      ]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await createApp().request('/api/translations/categories');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
    });
  });

  describe('gET /api/translations/phrases', () => {
    it('returns phrases by category', async () => {
      const chain = createSelectChain([
        { id: 1, category: 'greetings', sourceText: 'Hello', translatedText: '你好' },
      ]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await createApp().request('/api/translations/phrases?category=greetings');
      expect(response.status).toBe(200);
    });

    it('returns 400 when category is missing', async () => {
      const response = await createApp().request('/api/translations/phrases');
      expect(response.status).toBe(400);
    });
  });

  describe('gET /api/translations/phrases/search', () => {
    it('searches phrases', async () => {
      const chain = createSelectChain([
        { id: 1, sourceText: 'Hello', translatedText: '你好' },
      ]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await createApp().request('/api/translations/phrases/search?q=hello');
      expect(response.status).toBe(200);
    });

    it('returns 400 when query is missing', async () => {
      const response = await createApp().request('/api/translations/phrases/search');
      expect(response.status).toBe(400);
    });
  });

  describe('gET /api/translations/saved', () => {
    it('returns saved translations', async () => {
      const chain = createPaginatedSelectChain([
        { id: 1, sourceText: 'Hello', translatedText: '你好' },
      ]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithAuth(createApp(), '/api/translations/saved');
      expect(response.status).toBe(200);
    });
  });

  describe('pOST /api/translations/saved', () => {
    it('saves a translation', async () => {
      mockDb.insert.mockReturnValueOnce(createInsertChain(5));

      const response = await requestWithAuth(createApp(), '/api/translations/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText: 'Hello',
          sourceLang: 'en',
          targetText: '你好',
          targetLang: 'zh',
          translationType: 'text',
        }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBe(5);
    });
  });

  describe('dELETE /api/translations/saved', () => {
    it('deletes a saved translation', async () => {
      const chain = createSelectChain([{ id: 5, userId: 1 }]);
      mockDb.select.mockReturnValueOnce(chain);
      mockDb.delete.mockReturnValueOnce({ where: vi.fn().mockResolvedValue([]) });

      const response = await requestWithAuth(createApp(), '/api/translations/saved', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 5 }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('pOST /api/translations/saved/favorite', () => {
    it('toggles favorite', async () => {
      const chain = createSelectChain([{ id: 5, userId: 1, isFavorite: false }]);
      mockDb.select.mockReturnValueOnce(chain);
      mockDb.update.mockReturnValueOnce(createUpdateChain());

      const response = await requestWithAuth(createApp(), '/api/translations/saved/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 5 }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.isFavorite).toBe(true);
    });
  });

  describe('gET /api/translations/packs', () => {
    it('returns translation packs', async () => {
      const chain = createSelectChain([
        { id: 1, name: 'Basic Pack', isActive: true },
      ]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await createApp().request('/api/translations/packs');
      expect(response.status).toBe(200);
    });
  });

  describe('gET /api/translations/languages', () => {
    it('returns supported languages', async () => {
      const response = await createApp().request('/api/translations/languages');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.data.length).toBeGreaterThan(0);
    });
  });
});
