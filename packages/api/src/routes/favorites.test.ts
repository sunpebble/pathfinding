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

describe('favorites routes', () => {
  beforeEach(() => {
    mockDb.select.mockReset();
  });

  it('gET /api/favorites returns paginated favorites', async () => {
    // Items query chain
    const itemsOffset = vi.fn().mockResolvedValue([
      { itinerary_favorites: { id: 1, userId: 1, itineraryId: 5 }, itineraries: { id: 5, title: 'Kyoto' } },
    ]);
    const itemsLimit = vi.fn().mockReturnValue({ offset: itemsOffset });
    const itemsOrderBy = vi.fn().mockReturnValue({ limit: itemsLimit });
    const itemsWhere = vi.fn().mockReturnValue({ orderBy: itemsOrderBy });
    const itemsLeftJoin = vi.fn().mockReturnValue({ where: itemsWhere });
    const itemsFrom = vi.fn().mockReturnValue({ leftJoin: itemsLeftJoin });

    // Count query chain
    const countWhere = vi.fn().mockResolvedValue([{ count: 1 }]);
    const countFrom = vi.fn().mockReturnValue({ where: countWhere });

    mockDb.select
      .mockReturnValueOnce({ from: itemsFrom })
      .mockReturnValueOnce({ from: countFrom });

    const response = await requestWithAuth(createApp(), '/api/favorites');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.total).toBeDefined();
  });

  it('gET /api/favorites requires auth', async () => {
    const response = await requestWithEnv(createApp(), '/api/favorites');

    expect(response.status).toBe(401);
  });
});
