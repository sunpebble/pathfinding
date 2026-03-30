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
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where, limit });

  return { from, where, limit };
}

function createUpdateChain(result: unknown) {
  const where = vi.fn().mockResolvedValue(result);
  const set = vi.fn().mockReturnValue({ where });

  return { set, where };
}

describe('budget routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
    mockDb.transaction.mockReset();
  });

  it('gET /api/budgets returns budget for an itinerary', async () => {
    // 1st select: ownership check — db.select({id}).from(itineraries).where(...).limit(1)
    const ownerChain = createSelectChain([{ id: 5 }]);
    // 2nd select: fetch the budget — db.select().from(itineraryBudgets).where(...).limit(1)
    const budgetChain = createSelectChain([
      {
        id: 1,
        itineraryId: 5,
        userId: 1,
        totalBudget: 5000,
        currency: 'CNY',
        categoryBudgets: {},
      },
    ]);
    mockDb.select
      .mockReturnValueOnce(ownerChain)
      .mockReturnValueOnce(budgetChain);

    const response = await requestWithAuth(createApp(), '/api/budgets?itineraryId=5');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.data.total_budget).toBe(5000);
  });

  it('gET /api/budgets returns null when no budget exists', async () => {
    // 1st select: ownership check passes
    const ownerChain = createSelectChain([{ id: 999 }]);
    // 2nd select: no budget found
    const emptyChain = createSelectChain([]);
    mockDb.select
      .mockReturnValueOnce(ownerChain)
      .mockReturnValueOnce(emptyChain);

    const response = await requestWithAuth(createApp(), '/api/budgets?itineraryId=999');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBe(null);
  });

  it('gET /api/budgets returns 403 when user does not own the itinerary', async () => {
    // Ownership check returns empty — user doesn't own it
    const ownerChain = createSelectChain([]);
    mockDb.select.mockReturnValueOnce(ownerChain);

    const response = await requestWithAuth(createApp(), '/api/budgets?itineraryId=99');

    expect(response.status).toBe(403);
  });

  it('gET /api/budgets returns 400 without itineraryId', async () => {
    const response = await requestWithAuth(createApp(), '/api/budgets');

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('pOST /api/budgets creates a new budget', async () => {
    // First select: verify itinerary ownership
    const ownershipChain = createSelectChain([{ id: 5 }]);
    // Second select: no existing budget
    const existingChain = createSelectChain([]);
    mockDb.select
      .mockReturnValueOnce(ownershipChain)
      .mockReturnValueOnce(existingChain);

    const insertResult = vi.fn().mockResolvedValue([{ insertId: 42 }]);
    mockDb.insert.mockReturnValueOnce({ values: insertResult });

    const response = await requestWithAuth(createApp(), '/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itineraryId: 5,
        totalBudget: 3000,
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe(42);
  });

  it('pOST /api/budgets updates an existing budget', async () => {
    // First select: verify itinerary ownership
    const ownershipChain = createSelectChain([{ id: 5 }]);
    // Second select: existing budget found
    const existingChain = createSelectChain([
      { id: 10, itineraryId: 5, totalBudget: 2000, currency: 'CNY' },
    ]);
    mockDb.select
      .mockReturnValueOnce(ownershipChain)
      .mockReturnValueOnce(existingChain);

    const updateChain = createUpdateChain([{ id: 10 }]);
    mockDb.update.mockReturnValueOnce(updateChain);

    const response = await requestWithAuth(createApp(), '/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itineraryId: 5,
        totalBudget: 5000,
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe(10);
  });
});
