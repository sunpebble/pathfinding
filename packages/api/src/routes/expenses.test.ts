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

function createSelectChain(result: unknown) {
  const limit = vi.fn().mockResolvedValue(result);
  const orderBy = vi.fn().mockReturnValue(result);
  const where = vi.fn().mockReturnValue({ orderBy, limit });
  const from = vi.fn().mockReturnValue({ where });

  return { from, where, orderBy, limit };
}

describe('expense routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
  });

  it('gET /api/expenses returns expenses for an itinerary', async () => {
    // First select: verify itinerary ownership
    const ownershipLimit = vi.fn().mockResolvedValue([{ id: 5 }]);
    const ownershipWhere = vi.fn().mockReturnValue({ limit: ownershipLimit });
    const ownershipFrom = vi.fn().mockReturnValue({ where: ownershipWhere });
    mockDb.select.mockReturnValueOnce({ from: ownershipFrom });

    // Second select: fetch expenses
    const expensesChain = createSelectChain([
      { id: 1, itineraryId: 5, userId: 1, amount: 120, categoryId: 1, description: 'Lunch', date: '2026-04-01', currency: 'CNY' },
    ]);
    mockDb.select.mockReturnValueOnce(expensesChain);

    const response = await requestWithAuth(createApp(), '/api/expenses?itineraryId=5');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].amount).toBe(120);
  });

  it('gET /api/expenses returns 400 without itineraryId', async () => {
    const response = await requestWithAuth(createApp(), '/api/expenses');

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('pOST /api/expenses creates a new expense', async () => {
    const insertResult = vi.fn().mockResolvedValue([{ insertId: 77 }]);
    mockDb.insert.mockReturnValueOnce({ values: insertResult });

    const response = await requestWithAuth(createApp(), '/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itineraryId: 5,
        amount: 200,
        category: 2,
        description: 'Dinner',
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe(77);
  });
});
