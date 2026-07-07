import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

function createInsertChain(id: number) {
  return { values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id }]) }) };
}

function createUpdateChain() {
  return { set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) };
}

function stubDeepSeek(content: string) {
  vi.stubGlobal('fetch', vi.fn(async () =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })));
}

describe('translation routes', () => {
  beforeEach(() => {
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('gET /api/translations/categories', () => {
    it('returns categories', async () => {
      const chain = createGroupByChain([
        { category: 'greetings', count: 5 },
      ]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithEnv(createApp(), '/api/translations/categories');
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

      const response = await requestWithEnv(createApp(), '/api/translations/phrases?category=greetings');
      expect(response.status).toBe(200);
    });

    it('returns 400 when category is missing', async () => {
      const response = await requestWithEnv(createApp(), '/api/translations/phrases');
      expect(response.status).toBe(400);
    });
  });

  describe('gET /api/translations/phrases/search', () => {
    it('searches phrases', async () => {
      const chain = createSelectChain([
        { id: 1, sourceText: 'Hello', translatedText: '你好' },
      ]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithEnv(createApp(), '/api/translations/phrases/search?q=hello');
      expect(response.status).toBe(200);
    });

    it('returns 400 when query is missing', async () => {
      const response = await requestWithEnv(createApp(), '/api/translations/phrases/search');
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

      const response = await requestWithEnv(createApp(), '/api/translations/packs');
      expect(response.status).toBe(200);
    });
  });

  describe('gET /api/translations/languages', () => {
    it('returns supported languages', async () => {
      const response = await requestWithEnv(createApp(), '/api/translations/languages');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.data.length).toBeGreaterThan(0);
    });
  });

  describe('pOST /api/translations/text', () => {
    it('translates text with DeepSeek', async () => {
      stubDeepSeek('你好');

      const response = await requestWithEnv(createApp(), '/api/translations/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Hello', source_lang: 'en', target_lang: 'zh' }),
      }, { DEEPSEEK_API_KEY: 'test-key' });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        success: true,
        data: {
          source_text: 'Hello',
          source_lang: 'en',
          target_text: '你好',
          target_lang: 'zh',
        },
      });
    });
  });

  describe('pOST /api/translations/detect', () => {
    it('detects language with DeepSeek', async () => {
      stubDeepSeek('en');

      const response = await requestWithEnv(createApp(), '/api/translations/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Hello' }),
      }, { DEEPSEEK_API_KEY: 'test-key' });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        success: true,
        data: { language: 'en' },
      });
    });
  });

  describe('pOST /api/translations/photo', () => {
    it('returns 501 while OCR is not migrated', async () => {
      const response = await requestWithEnv(createApp(), '/api/translations/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: 'x', target_lang: 'zh' }),
      });

      expect(response.status).toBe(501);
    });
  });
});
