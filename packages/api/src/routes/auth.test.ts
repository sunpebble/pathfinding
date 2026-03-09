import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { requestWithAuth } from '../test/helpers.js';

const mockLimit = vi.fn();
const mockWhere = vi.fn(() => ({ limit: mockLimit }));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

const mockDb = {
  select: mockSelect,
};

vi.mock('@pathfinding/database', async () => {
  const actual = await vi.importActual<typeof import('@pathfinding/database')>('@pathfinding/database');

  return {
    ...actual,
    createDb: vi.fn(() => mockDb),
    getDb: vi.fn(() => mockDb),
  };
});

describe('gET /api/auth/me', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    mockLimit.mockResolvedValue([
      {
        id: 1,
        name: 'Owner',
        email: 'owner@example.com',
        image: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('returns 200 with a valid bearer token', async () => {
    const response = await requestWithAuth(createApp(), '/api/auth/me');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        id: '1',
        email: 'owner@example.com',
      },
    });
  });
});
