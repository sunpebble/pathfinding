import type { AppContext } from '../env.js';
import { currencyHistory, currencyRates } from '@pathfinding/database';
import { and, desc, eq, sql } from 'drizzle-orm';
/**
 * Currency routes — exchange rates, history, cache stats.
 * Mirrors the Convex /api/currency/* HTTP endpoints.
 */
import { Hono } from 'hono';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';

const app = new Hono<AppContext>();

// ── GET /rates — Get cached exchange rates ─────────────
app.get('/rates', async (c) => {
  const base = c.req.query('base') ?? 'CNY';

  const db = c.get('db');

  const rates = await db
    .select()
    .from(currencyRates)
    .where(eq(currencyRates.baseCurrency, base))
    .orderBy(desc(currencyRates.fetchedAt))
    .limit(1);

  return c.json({ data: rates[0] ? convertKeysToSnakeCase(rates[0]) : null });
});

// ── GET /history — Get exchange rate history ───────────
app.get('/history', async (c) => {
  const base = c.req.query('base') ?? 'CNY';
  const target = c.req.query('target') ?? 'USD';
  const days = Number.parseInt(c.req.query('days') ?? '30', 10);

  const db = c.get('db');

  const history = await db
    .select()
    .from(currencyHistory)
    .where(
      and(
        eq(currencyHistory.baseCurrency, base),
        eq(currencyHistory.targetCurrency, target),
      ),
    )
    .orderBy(desc(currencyHistory.fetchedAt))
    .limit(days);

  return c.json({ data: convertKeysToSnakeCase(history) });
});

// ── GET /stats — Get currency cache statistics ─────────
app.get('/stats', async (c) => {
  const db = c.get('db');

  const [totalResult, latestResult] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(currencyRates),
    db
      .select()
      .from(currencyRates)
      .orderBy(desc(currencyRates.fetchedAt))
      .limit(1),
  ]);

  return c.json({
    data: convertKeysToSnakeCase({
      totalEntries: totalResult[0]?.count ?? 0,
      lastFetchedAt: latestResult[0]?.fetchedAt ?? null,
    }),
  });
});

export default app;
