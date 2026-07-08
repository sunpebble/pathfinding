import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

/** Chain for `db.insert(table).values(...).returning()`. */
function createInsertChain(result: unknown) {
  const returning = vi.fn().mockResolvedValue(result);
  const values = vi.fn().mockReturnValue({ returning });

  return { values, returning };
}

function stubFrankfurter(rates: Record<string, number>) {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ base: 'CNY', date: '2026-07-08', rates }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('currency routes', () => {
  beforeEach(() => {
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('gET /api/currency/rates returns the latest rate when the cache is fresh', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const rateChain = createSelectChain([
      {
        id: 1,
        baseCurrency: 'CNY',
        rates: { USD: 0.14, EUR: 0.12 },
        fetchedAt: new Date(),
      },
    ]);
    mockDb.select.mockReturnValueOnce(rateChain);

    const response = await requestWithEnv(createApp(), '/api/currency/rates');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.data.base_currency).toBe('CNY');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('gET /api/currency/rates fetches from frankfurter and persists when cache is empty', async () => {
    const emptyChain = createSelectChain([]);
    mockDb.select.mockReturnValueOnce(emptyChain);
    const insertedRow = {
      id: 10,
      baseCurrency: 'CNY',
      rates: { USD: 0.14, JPY: 21.5 },
      fetchedAt: new Date(),
      createdAt: new Date(),
    };
    const insertChain = createInsertChain([insertedRow]);
    mockDb.insert.mockReturnValueOnce({ values: insertChain.values });
    const fetchMock = stubFrankfurter({ USD: 0.14, JPY: 21.5 });

    const response = await requestWithEnv(createApp(), '/api/currency/rates?base=CNY');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.rates.USD).toBe(0.14);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mockDb.insert).toHaveBeenCalledOnce();
  });

  it('gET /api/currency/rates refetches when the cached row is stale', async () => {
    const staleChain = createSelectChain([
      {
        id: 1,
        baseCurrency: 'CNY',
        rates: { USD: 0.13 },
        fetchedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ]);
    mockDb.select.mockReturnValueOnce(staleChain);
    const insertedRow = {
      id: 11,
      baseCurrency: 'CNY',
      rates: { USD: 0.145 },
      fetchedAt: new Date(),
      createdAt: new Date(),
    };
    const insertChain = createInsertChain([insertedRow]);
    mockDb.insert.mockReturnValueOnce({ values: insertChain.values });
    const fetchMock = stubFrankfurter({ USD: 0.145 });

    const response = await requestWithEnv(createApp(), '/api/currency/rates');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.rates.USD).toBe(0.145);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('gET /api/currency/rates falls back to the cached row when frankfurter is unreachable', async () => {
    const staleRow = {
      id: 1,
      baseCurrency: 'CNY',
      rates: { USD: 0.13 },
      fetchedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    };
    const staleChain = createSelectChain([staleRow]);
    mockDb.select.mockReturnValueOnce(staleChain);
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));

    const response = await requestWithEnv(createApp(), '/api/currency/rates');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.rates.USD).toBe(0.13);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('gET /api/currency/rates returns null when cache is empty and frankfurter is unreachable', async () => {
    const emptyChain = createSelectChain([]);
    mockDb.select.mockReturnValueOnce(emptyChain);
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));

    const response = await requestWithEnv(createApp(), '/api/currency/rates');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBe(null);
  });

  it('gET /api/currency/rates rejects an invalid base currency', async () => {
    const response = await requestWithEnv(createApp(), '/api/currency/rates?base=usdollar');

    expect(response.status).toBe(400);
  });

  it('gET /api/currency/rates accepts a base currency parameter', async () => {
    const rateChain = createSelectChain([
      {
        id: 2,
        baseCurrency: 'USD',
        rates: { CNY: 7.1, EUR: 0.85 },
        fetchedAt: new Date(),
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
