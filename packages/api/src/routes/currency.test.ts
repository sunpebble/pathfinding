import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { requestWithEnv } from '../test/helpers.js';

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
  const limit = vi.fn().mockResolvedValue(result);
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ orderBy, limit });
  const from = vi.fn().mockReturnValue({ where, orderBy, limit });

  return { from, where, orderBy, limit };
}

describe('currency routes', () => {
  beforeEach(() => {
    mockDb.select.mockReset();
  });

  it('gET /api/currency/rates returns the latest rate', async () => {
    const rateChain = createSelectChain([
      {
        id: 1,
        baseCurrency: 'CNY',
        rates: { USD: 0.14, EUR: 0.12 },
        fetchedAt: '2026-03-30T00:00:00Z',
      },
    ]);
    mockDb.select.mockReturnValueOnce(rateChain);

    const response = await requestWithEnv(createApp(), '/api/currency/rates');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.data.base_currency).toBe('CNY');
  });

  it('gET /api/currency/rates returns null when no rates exist', async () => {
    const emptyChain = createSelectChain([]);
    mockDb.select.mockReturnValueOnce(emptyChain);

    const response = await requestWithEnv(createApp(), '/api/currency/rates');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBe(null);
  });

  it('gET /api/currency/rates accepts a base currency parameter', async () => {
    const rateChain = createSelectChain([
      {
        id: 2,
        baseCurrency: 'USD',
        rates: { CNY: 7.1, EUR: 0.85 },
        fetchedAt: '2026-03-30T00:00:00Z',
      },
    ]);
    mockDb.select.mockReturnValueOnce(rateChain);

    const response = await requestWithEnv(createApp(), '/api/currency/rates?base=USD');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.base_currency).toBe('USD');
  });

  it('gET /api/currency/history returns rate history', async () => {
    const historyChain = createSelectChain([
      { id: 1, baseCurrency: 'CNY', targetCurrency: 'USD', rate: 0.14, fetchedAt: '2026-03-30' },
      { id: 2, baseCurrency: 'CNY', targetCurrency: 'USD', rate: 0.139, fetchedAt: '2026-03-29' },
    ]);
    mockDb.select.mockReturnValueOnce(historyChain);

    const response = await requestWithEnv(createApp(), '/api/currency/history?base=CNY&target=USD&days=2');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(2);
  });

  it('gET /api/currency/stats returns cache statistics', async () => {
    const countChain = createSelectChain([{ count: 42 }]);
    const latestChain = createSelectChain([{ fetchedAt: '2026-03-30T00:00:00Z' }]);

    // stats does Promise.all with two selects
    mockDb.select
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(latestChain);

    const response = await requestWithEnv(createApp(), '/api/currency/stats');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
  });
});
