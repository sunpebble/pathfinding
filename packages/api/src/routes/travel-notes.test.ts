import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { requestWithAuth } from '../test/helpers.js';

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
    getDb: vi.fn(() => mockDb),
  };
});

function createPaginatedSelectChain(items: unknown[], count: number) {
  const offset = vi.fn().mockResolvedValue(items);
  const limit = vi.fn().mockReturnValue({ offset });
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ orderBy });
  const from = vi.fn().mockReturnValue({ where });

  // Count chain
  const countWhere = vi.fn().mockResolvedValue([{ count }]);
  const countFrom = vi.fn().mockReturnValue({ where: countWhere });

  return {
    itemsChain: { from },
    countChain: { from: countFrom },
  };
}

describe('travel-notes routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
  });

  it('gET /api/travel-notes returns public notes for unauthenticated users', async () => {
    const { itemsChain, countChain } = createPaginatedSelectChain(
      [
        { id: 1, authorId: 1, title: 'Tokyo Trip', content: 'Great!', visibility: 'public' },
      ],
      1,
    );

    mockDb.select
      .mockReturnValueOnce(itemsChain)
      .mockReturnValueOnce(countChain);

    const response = await createApp().request('/api/travel-notes');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.total).toBeDefined();
  });

  it('gET /api/travel-notes returns notes for authenticated users', async () => {
    const { itemsChain, countChain } = createPaginatedSelectChain(
      [
        { id: 1, authorId: 1, title: 'My Private Note', content: 'Secret', visibility: 'private' },
      ],
      1,
    );

    mockDb.select
      .mockReturnValueOnce(itemsChain)
      .mockReturnValueOnce(countChain);

    const response = await requestWithAuth(createApp(), '/api/travel-notes');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
  });

  it('pOST /api/travel-notes creates a new note', async () => {
    const insertResult = vi.fn().mockResolvedValue([{ insertId: 33 }]);
    mockDb.insert.mockReturnValueOnce({ values: insertResult });

    const response = await requestWithAuth(createApp(), '/api/travel-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Note',
        content: 'My travel experience.',
        visibility: 'public',
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe(33);
  });

  it('pOST /api/travel-notes requires auth', async () => {
    const response = await createApp().request('/api/travel-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Note',
        content: 'My travel experience.',
      }),
    });

    expect(response.status).toBe(401);
  });

  it('pOST /api/travel-notes validates required fields', async () => {
    const response = await requestWithAuth(createApp(), '/api/travel-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    });

    expect(response.status).toBe(400);
  });
});
