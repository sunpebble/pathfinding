import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { requestWithAuth, requestWithEnv } from '../test/helpers.js';

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
};

vi.mock('@pathfinding/database', async () => {
  const actual = await vi.importActual<typeof import('@pathfinding/database')>('@pathfinding/database');

  return {
    ...actual,
    createDb: vi.fn(() => mockDb),
  };
});

function createSelectChain(result: unknown) {
  const orderBy = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ orderBy });
  const from = vi.fn().mockReturnValue({ where });

  return { from, where, orderBy };
}

describe('collection routes', () => {
  beforeEach(() => {
    mockDb.select.mockReset();
  });

  it('gET /api/collections returns user collections', async () => {
    const collectionsChain = createSelectChain([
      { id: 1, userId: 1, name: 'Japan Trips', sortOrder: 1 },
      { id: 2, userId: 1, name: 'Europe Trips', sortOrder: 0 },
    ]);
    mockDb.select.mockReturnValueOnce(collectionsChain);

    const response = await requestWithAuth(createApp(), '/api/collections');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
  });

  it('gET /api/collections returns empty array when no collections', async () => {
    const emptyChain = createSelectChain([]);
    mockDb.select.mockReturnValueOnce(emptyChain);

    const response = await requestWithAuth(createApp(), '/api/collections');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it('gET /api/collections requires auth', async () => {
    const response = await requestWithEnv(createApp(), '/api/collections');

    expect(response.status).toBe(401);
  });
});
