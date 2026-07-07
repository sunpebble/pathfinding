import type { Database } from '@pathfinding/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendPushNotification } from './push.service.js';

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

vi.mock('../lib/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

function createSelectChain(result: unknown) {
  const where = vi.fn().mockResolvedValue(result);
  const from = vi.fn().mockReturnValue({ where });

  return { from, where };
}

describe('push.service — sendPushNotification', () => {
  beforeEach(() => {
    mockDb.select.mockReset();
  });

  it('returns 0 when user has no active push tokens', async () => {
    const chain = createSelectChain([]);
    mockDb.select.mockReturnValueOnce(chain);

    const count = await sendPushNotification(mockDb as unknown as Database, 1, 'Test', 'Hello');
    expect(count).toBe(0);
  });

  it('returns the number of active tokens sent to', async () => {
    const chain = createSelectChain([
      { id: 1, userId: 1, token: 'token-1', platform: 'ios', isActive: true },
      { id: 2, userId: 1, token: 'token-2', platform: 'android', isActive: true },
    ]);
    mockDb.select.mockReturnValueOnce(chain);

    const count = await sendPushNotification(mockDb as unknown as Database, 1, 'New Message', 'You have a new message');
    expect(count).toBe(2);
  });

  it('returns 1 for a single active token', async () => {
    const chain = createSelectChain([
      { id: 3, userId: 42, token: 'token-3', platform: 'web', isActive: true },
    ]);
    mockDb.select.mockReturnValueOnce(chain);

    const count = await sendPushNotification(mockDb as unknown as Database, 42, 'Reminder', 'Check your itinerary');
    expect(count).toBe(1);
  });
});
