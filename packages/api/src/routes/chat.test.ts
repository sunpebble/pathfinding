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

function createOrderBySelectChain(result: unknown) {
  const limit = vi.fn().mockResolvedValue(result);
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ orderBy, limit });
  const from = vi.fn().mockReturnValue({ where, orderBy, limit });

  return { from, where, orderBy, limit };
}

function createInsertReturningChain(id: number) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id }]),
    }),
  };
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

describe('chat routes', () => {
  beforeEach(() => {
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('gET /api/chat/sessions', () => {
    it('returns user sessions', async () => {
      const chain = createOrderBySelectChain([
        { id: 1, userId: 1, title: 'Session 1', isArchived: false },
      ]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithAuth(createApp(), '/api/chat/sessions');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
    });
  });

  describe('pOST /api/chat/sessions', () => {
    it('creates a session', async () => {
      mockDb.insert.mockReturnValueOnce(createInsertReturningChain(10));
      const selectChain = createSelectChain([
        { id: 10, userId: 1, title: '新对话', metadata: null },
      ]);
      mockDb.select.mockReturnValueOnce(selectChain);

      const response = await requestWithAuth(createApp(), '/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Session' }),
      });

      expect(response.status).toBe(201);
    });
  });

  describe('gET /api/chat/messages', () => {
    it('returns messages for a session', async () => {
      const sessionChain = createSelectChain([{ userId: 1 }]);
      const msgChain = createOrderBySelectChain([
        { id: 1, sessionId: 1, role: 'user', content: 'Hello' },
      ]);

      mockDb.select
        .mockReturnValueOnce(sessionChain)
        .mockReturnValueOnce(msgChain);

      const response = await requestWithAuth(createApp(), '/api/chat/messages?sessionId=1');
      expect(response.status).toBe(200);
    });

    it('returns 400 for invalid sessionId', async () => {
      const response = await requestWithAuth(createApp(), '/api/chat/messages?sessionId=abc');
      expect(response.status).toBe(400);
    });
  });

  describe('gET /api/chat/sessions/:id/messages', () => {
    it('lists messages for an owned session ascending by createdAt', async () => {
      const chain = createOrderBySelectChain([
        { id: 1, sessionId: 5, role: 'user', content: 'hi', createdAt: new Date('2026-07-08T10:00:00Z') },
        { id: 2, sessionId: 5, role: 'assistant', content: 'hello', createdAt: new Date('2026-07-08T10:00:01Z') },
      ]);
      const ownChain = createSelectChain([{ userId: 1 }]);
      mockDb.select.mockReturnValueOnce(ownChain).mockReturnValueOnce(chain);

      const response = await requestWithAuth(createApp(), '/api/chat/sessions/5/messages');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(2);
      expect(body.data[0].content).toBe('hi');
    });

    it('rejects non-owner with 403', async () => {
      const ownChain = createSelectChain([{ userId: 999 }]);
      mockDb.select.mockReturnValueOnce(ownChain);
      const response = await requestWithAuth(createApp(), '/api/chat/sessions/5/messages');
      expect(response.status).toBe(403);
    });
  });

  describe('pOST /api/chat/sessions/:id/messages (send-and-reply)', () => {
    it('persists user+assistant messages and returns both', async () => {
      stubDeepSeek('sure- reply');
      const ownChain = createSelectChain([{ userId: 1 }]);
      const historyChain = createOrderBySelectChain([]);
      mockDb.select.mockReturnValueOnce(ownChain).mockReturnValueOnce(historyChain);
      mockDb.insert
        .mockReturnValueOnce({
          values: () => ({
            returning: vi.fn().mockResolvedValue([{ id: 10, sessionId: 5, role: 'user', content: 'hi', createdAt: new Date() }]),
          }),
        })
        .mockReturnValueOnce({
          values: () => ({
            returning: vi.fn().mockResolvedValue([{ id: 11, sessionId: 5, role: 'assistant', content: 'sure- reply', createdAt: new Date() }]),
          }),
        });
      mockDb.update.mockReturnValueOnce(createUpdateChain());

      const response = await requestWithAuth(
        createApp(),
        '/api/chat/sessions/5/messages',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'hi' }),
        },
        {},
        { DEEPSEEK_API_KEY: 'test-key' },
      );
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data.user_message.content).toBe('hi');
      expect(body.data.assistant_message.content).toBe('sure- reply');
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });

    it('returns 503 and persists nothing when AI fails', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => {
        throw new Error('upstream down');
      }));
      const ownChain = createSelectChain([{ userId: 1 }]);
      const historyChain = createOrderBySelectChain([]);
      mockDb.select.mockReturnValueOnce(ownChain).mockReturnValueOnce(historyChain);

      const response = await requestWithAuth(
        createApp(),
        '/api/chat/sessions/5/messages',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'hi' }),
        },
        {},
        { DEEPSEEK_API_KEY: 'test-key' },
      );
      expect(response.status).toBe(503);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('rejects non-owner with 403', async () => {
      const ownChain = createSelectChain([{ userId: 999 }]);
      mockDb.select.mockReturnValueOnce(ownChain);
      const response = await requestWithAuth(createApp(), '/api/chat/sessions/5/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'hi' }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('pOST /api/chat/messages', () => {
    it('creates a message', async () => {
      const sessionChain = createSelectChain([{ userId: 1 }]);
      mockDb.select.mockReturnValueOnce(sessionChain);
      mockDb.insert.mockReturnValueOnce(createInsertReturningChain(20));
      mockDb.update.mockReturnValueOnce(createUpdateChain());

      const response = await requestWithAuth(createApp(), '/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 1, role: 'user', content: 'Hello' }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBe(20);
    });
  });

  describe('dELETE /api/chat/sessions/:id', () => {
    it('archives a session', async () => {
      const sessionChain = createSelectChain([{ userId: 1 }]);
      mockDb.select.mockReturnValueOnce(sessionChain);
      mockDb.update.mockReturnValueOnce(createUpdateChain());

      const response = await requestWithAuth(createApp(), '/api/chat/sessions/1', {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);
    });

    it('returns 400 for invalid session ID', async () => {
      const response = await requestWithAuth(createApp(), '/api/chat/sessions/abc', {
        method: 'DELETE',
      });
      expect(response.status).toBe(400);
    });
  });

  describe('pOST /api/chat/query', () => {
    it('rejects unauthenticated POST /api/chat/query with 401', async () => {
      const response = await requestWithEnv(createApp(), '/api/chat/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'hi' }),
      });

      expect(response.status).toBe(401);
    });

    it('returns DeepSeek quick chat response', async () => {
      stubDeepSeek('建议先确定城市和天数。');

      const response = await requestWithAuth(createApp(), '/api/chat/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '怎么规划京都？' }),
      }, {}, { DEEPSEEK_API_KEY: 'test-key' });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        success: true,
        data: { content: '建议先确定城市和天数。' },
      });
    });
  });
});
