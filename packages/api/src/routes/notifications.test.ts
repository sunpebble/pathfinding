import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { requestWithAuth, requestWithEnv } from '../test/helpers.js';

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

vi.mock('@pathfinding/database', async () => {
  const actual = await vi.importActual<typeof import('@pathfinding/database')>('@pathfinding/database');

  return {
    ...actual,
    createDb: vi.fn(() => mockDb),
  };
});

/**
 * Creates a flexible select chain mock that can be awaited at any point.
 * Each method returns itself AND resolves to the result if awaited.
 */
function createSelectChain(result: unknown) {
  // Make a thenable object: can be chained or awaited
  const makeThenableStep = () => {
    const step: Record<string, unknown> = {};
    const thenable = vi.fn().mockImplementation(
      (resolve: (v: unknown) => void) => resolve(result),
    );
    step.then = thenable;
    step.offset = vi.fn().mockReturnValue({ then: thenable });
    step.limit = vi.fn().mockReturnValue({ offset: step.offset, then: thenable });
    step.orderBy = vi.fn().mockReturnValue({ limit: step.limit, offset: step.offset, then: thenable });
    step.where = vi.fn().mockReturnValue({ orderBy: step.orderBy, limit: step.limit, offset: step.offset, then: thenable });
    step.from = vi.fn().mockReturnValue({ where: step.where, orderBy: step.orderBy, limit: step.limit, then: thenable });
    return step;
  };

  return makeThenableStep();
}

function createUpdateChain(result: unknown) {
  const where = vi.fn().mockResolvedValue(result);
  const set = vi.fn().mockReturnValue({ where });

  return { set, where };
}

describe('notification routes', () => {
  beforeEach(() => {
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
  });

  describe('gET /api/notifications', () => {
    it('returns notifications for the authenticated user', async () => {
      const notificationsChain = createSelectChain([
        { id: 1, userId: 1, type: 'comment', title: 'New comment', isRead: false },
        { id: 2, userId: 1, type: 'like', title: 'New like', isRead: true },
      ]);
      mockDb.select.mockReturnValueOnce(notificationsChain);

      const response = await requestWithAuth(createApp(), '/api/notifications');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.meta).toBeDefined();
      expect(body.meta.page).toBe(1);
    });

    it('requires auth', async () => {
      const response = await requestWithEnv(createApp(), '/api/notifications');
      expect(response.status).toBe(401);
    });
  });

  describe('gET /api/notifications/unread-count', () => {
    it('returns the unread count', async () => {
      const countChain = createSelectChain([{ count: 3 }]);
      mockDb.select.mockReturnValueOnce(countChain);

      const response = await requestWithAuth(createApp(), '/api/notifications/unread-count');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.count).toBe(3);
    });
  });

  describe('pOST /api/notifications/read', () => {
    it('marks a notification as read', async () => {
      const updateChain = createUpdateChain([]);
      mockDb.update.mockReturnValueOnce(updateChain);

      const response = await requestWithAuth(createApp(), '/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: 1 }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('pOST /api/notifications/read-all', () => {
    it('marks all notifications as read', async () => {
      const updateChain = createUpdateChain([]);
      mockDb.update.mockReturnValueOnce(updateChain);

      const response = await requestWithAuth(createApp(), '/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('gET /api/notifications/settings', () => {
    it('returns default settings when none exist', async () => {
      const emptyChain = createSelectChain([]);
      mockDb.select.mockReturnValueOnce(emptyChain);

      const response = await requestWithAuth(createApp(), '/api/notifications/settings');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.push_enabled).toBe(true);
      expect(body.data.email_enabled).toBe(false);
    });

    it('returns existing settings', async () => {
      const settingsChain = createSelectChain([
        { userId: 1, pushEnabled: false, emailEnabled: true, quietHoursStart: '22:00', quietHoursEnd: '08:00', categories: null },
      ]);
      mockDb.select.mockReturnValueOnce(settingsChain);

      const response = await requestWithAuth(createApp(), '/api/notifications/settings');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
    });
  });

  describe('pUT /api/notifications/settings', () => {
    it('creates new settings when none exist', async () => {
      const emptyChain = createSelectChain([]);
      mockDb.select.mockReturnValueOnce(emptyChain);

      const insertValues = vi.fn().mockResolvedValue([{ insertId: 1 }]);
      mockDb.insert.mockReturnValueOnce({ values: insertValues });

      const response = await requestWithAuth(createApp(), '/api/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pushEnabled: false }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('updates existing settings', async () => {
      const existingChain = createSelectChain([
        { userId: 1, pushEnabled: true, emailEnabled: false },
      ]);
      mockDb.select.mockReturnValueOnce(existingChain);

      const updateChain = createUpdateChain([]);
      mockDb.update.mockReturnValueOnce(updateChain);

      const response = await requestWithAuth(createApp(), '/api/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailEnabled: true }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });
});
