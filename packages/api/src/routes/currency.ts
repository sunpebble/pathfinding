import type { AppContext } from '../env.js';
import { zValidator } from '@hono/zod-validator';
import { currencyHistory, currencyRates } from '@pathfinding/database';
import { and, desc, eq, sql } from 'drizzle-orm';
/**
 * Currency routes — exchange rates, history, cache stats.
 * Mirrors the Convex /api/currency/* HTTP endpoints.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { jsonData } from '../lib/response.js';

const app = new Hono<AppContext>();

const FRANKFURTER_URL = 'https://api.frankfurter.app/latest';

// ponytail: simple on-demand daily cache — refetch happens lazily on the next
// request once a row goes stale. No cron/scheduler. If pre-warmed rates or a
// real trend feed are needed later, add a scheduled worker writing
// currency_history instead of growing this endpoint.
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

const ratesQuerySchema = z.object({
  base: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'base must be a 3-letter currency code').optional().default('CNY'),
});

type CurrencyRateRow = typeof currencyRates.$inferSelect;

// convertKeysToSnakeCase recurses into the `rates` JSON blob too, which would
// mangle currency codes (USD -> _u_s_d). Map the known top-level shape by
// hand instead so nested currency keys pass through untouched.
function serializeRate(row: CurrencyRateRow) {
  return {
    id: row.id,
    base_currency: row.baseCurrency,
    rates: row.rates,
    fetched_at: row.fetchedAt,
    created_at: row.createdAt,
  };
}

function isStale(row: CurrencyRateRow | undefined): boolean {
  return !row || Date.now() - new Date(row.fetchedAt).getTime() > STALE_AFTER_MS;
}

async function fetchFrankfurterRates(base: string): Promise<Record<string, number>> {
  const response = await fetch(`${FRANKFURTER_URL}?base=${base}`, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`frankfurter.app responded ${response.status}`);
  }
  const payload = await response.json() as { rates: Record<string, number> };
  return payload.rates;
}

// ── GET /rates — Get cached exchange rates, refreshing from frankfurter.app when stale ──
app.get('/rates', zValidator('query', ratesQuerySchema), async (c) => {
  const { base } = c.req.valid('query');

  const db = c.get('db');

  const cached = await db
    .select()
    .from(currencyRates)
    .where(eq(currencyRates.baseCurrency, base))
    .orderBy(desc(currencyRates.fetchedAt))
    .limit(1);
  const latest = cached[0];

  if (!isStale(latest)) {
    return jsonData(c, serializeRate(latest!));
  }

  try {
    const rates = await fetchFrankfurterRates(base);
    const [inserted] = await db
      .insert(currencyRates)
      .values({ baseCurrency: base, rates, fetchedAt: new Date() })
      .returning();
    return jsonData(c, serializeRate(inserted!));
  }
  catch (error) {
    console.warn(`[currency] frankfurter.app fetch failed for base=${base}, falling back to cache`, error);
    return jsonData(c, latest ? serializeRate(latest) : null);
  }
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
