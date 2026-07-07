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

function createSelectChain(result: unknown) {
  const offset = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ offset });
  const orderBy = vi.fn().mockReturnValue({ limit, offset });
  const where = vi.fn().mockReturnValue({ orderBy, limit, offset });
  const from = vi.fn().mockReturnValue({ where, orderBy, limit, offset });

  return { from, where, orderBy, limit, offset };
}

function createLimitSelectChain(result: unknown) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where, limit });

  return { from, where, limit };
}

function createUpdateChain(result: unknown) {
  const where = vi.fn().mockResolvedValue(result);
  const set = vi.fn().mockReturnValue({ where });

  return { set, where };
}

describe('comment routes', () => {
  beforeEach(() => {
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
  });

  describe('gET /api/comments', () => {
    it('returns 400 when itineraryId is missing', async () => {
      const response = await requestWithEnv(createApp(), '/api/comments');
      expect(response.status).toBe(400);
    });

    it('returns comments for a guide', async () => {
      const commentsData = [
        { id: 1, guideId: 5, userId: 1, content: 'Great guide!', isDeleted: false },
      ];
      // items query
      const commentsChain = createSelectChain(commentsData);
      // count query
      const countChain = createSelectChain([{ count: 1 }]);

      mockDb.select
        .mockReturnValueOnce(commentsChain)
        .mockReturnValueOnce(countChain);

      const response = await requestWithEnv(createApp(), '/api/comments?itineraryId=5');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.meta).toBeDefined();
    });
  });

  describe('pOST /api/comments', () => {
    it('creates a comment', async () => {
      const insertValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 10 }]) });
      mockDb.insert.mockReturnValueOnce({ values: insertValues });

      const response = await requestWithAuth(createApp(), '/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itineraryId: 5,
          content: 'Great guide!',
        }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.content).toBe('Great guide!');
    });

    it('requires auth', async () => {
      const response = await requestWithEnv(createApp(), '/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itineraryId: 5, content: 'Hello' }),
      });
      expect(response.status).toBe(401);
    });
  });

  describe('pATCH /api/comments', () => {
    it('updates own comment', async () => {
      // Ownership check uses .limit(1)
      const existingChain = createLimitSelectChain([
        { id: 10, userId: 1, content: 'Old content' },
      ]);
      mockDb.select.mockReturnValueOnce(existingChain);

      const updateChain = createUpdateChain([]);
      mockDb.update.mockReturnValueOnce(updateChain);

      // Fetch updated record also uses .limit(1)
      const updatedChain = createLimitSelectChain([
        { id: 10, userId: 1, content: 'Updated content', isEdited: true },
      ]);
      mockDb.select.mockReturnValueOnce(updatedChain);

      const response = await requestWithAuth(createApp(), '/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 10, content: 'Updated content' }),
      });

      expect(response.status).toBe(200);
    });

    it('rejects editing another user\'s comment', async () => {
      const existingChain = createLimitSelectChain([
        { id: 10, userId: 999, content: 'Not mine' },
      ]);
      mockDb.select.mockReturnValueOnce(existingChain);

      const response = await requestWithAuth(createApp(), '/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 10, content: 'Hacked!' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('dELETE /api/comments', () => {
    it('soft-deletes own comment', async () => {
      const updateChain = createUpdateChain([]);
      mockDb.update.mockReturnValueOnce(updateChain);

      const response = await requestWithAuth(createApp(), '/api/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 10 }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('gET /api/comments/replies', () => {
    it('returns 400 when commentId is missing', async () => {
      const response = await requestWithEnv(createApp(), '/api/comments/replies');
      expect(response.status).toBe(400);
    });

    it('returns replies for a comment', async () => {
      const repliesChain = createSelectChain([
        { id: 20, parentId: 10, content: 'Reply!' },
      ]);
      mockDb.select.mockReturnValueOnce(repliesChain);

      const response = await requestWithEnv(createApp(), '/api/comments/replies?commentId=10');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });
  });
});
