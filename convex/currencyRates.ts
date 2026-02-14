/**
 * Currency Rates Convex Functions
 * Handles caching and retrieval of exchange rate data
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// Typed validator for rates - Record<string, number>
const currencyRatesMapValidator = v.record(v.string(), v.number());

// Type validator for exchange rate history data
const exchangeRateHistoryValidator = v.object({
  base: v.string(),
  target: v.string(),
  rates: v.array(
    v.object({
      date: v.string(),
      rate: v.number(),
    }),
  ),
  change: v.number(),
  trend: v.union(v.literal('up'), v.literal('down'), v.literal('stable')),
});

/**
 * Get cached exchange rates for a base currency
 */
export const get = query({
  args: {
    base: v.string(),
  },
  handler: async (ctx, args) => {
    const baseUpper = args.base.toUpperCase();

    const cached = await ctx.db
      .query('currencyRates')
      .withIndex('by_base', q => q.eq('base', baseUpper))
      .first();

    return cached;
  },
});

/**
 * Upsert exchange rates for a base currency
 */
export const upsert = mutation({
  args: {
    base: v.string(),
    rates: currencyRatesMapValidator,
    fetchedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const baseUpper = args.base.toUpperCase();

    // Check if entry already exists
    const existing = await ctx.db
      .query('currencyRates')
      .withIndex('by_base', q => q.eq('base', baseUpper))
      .first();

    if (existing) {
      // Update existing entry
      await ctx.db.patch(existing._id, {
        rates: args.rates,
        fetchedAt: args.fetchedAt,
      });
      return existing._id;
    }

    // Create new entry
    return await ctx.db.insert('currencyRates', {
      base: baseUpper,
      rates: args.rates,
      fetchedAt: args.fetchedAt,
    });
  },
});

/**
 * Get cached exchange rate history for a currency pair
 */
export const getHistory = query({
  args: {
    base: v.string(),
    target: v.string(),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    const baseUpper = args.base.toUpperCase();
    const targetUpper = args.target.toUpperCase();

    const cached = await ctx.db
      .query('currencyHistory')
      .withIndex('by_pair_days', q =>
        q.eq('base', baseUpper).eq('target', targetUpper).eq('days', args.days))
      .first();

    return cached;
  },
});

/**
 * Upsert exchange rate history for a currency pair
 */
export const upsertHistory = mutation({
  args: {
    base: v.string(),
    target: v.string(),
    days: v.number(),
    data: exchangeRateHistoryValidator,
    fetchedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const baseUpper = args.base.toUpperCase();
    const targetUpper = args.target.toUpperCase();

    // Check if entry already exists
    const existing = await ctx.db
      .query('currencyHistory')
      .withIndex('by_pair_days', q =>
        q.eq('base', baseUpper).eq('target', targetUpper).eq('days', args.days))
      .first();

    if (existing) {
      // Update existing entry
      await ctx.db.patch(existing._id, {
        data: args.data,
        fetchedAt: args.fetchedAt,
      });
      return existing._id;
    }

    // Create new entry
    return await ctx.db.insert('currencyHistory', {
      base: baseUpper,
      target: targetUpper,
      days: args.days,
      data: args.data,
      fetchedAt: args.fetchedAt,
    });
  },
});

/**
 * Delete old cache entries (older than specified hours)
 */
export const cleanup = mutation({
  args: {
    maxAgeHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxAgeMs = (args.maxAgeHours || 24) * 60 * 60 * 1000;
    const cutoffTime = Date.now() - maxAgeMs;

    // Clean up rates cache
    const oldRates = await ctx.db
      .query('currencyRates')
      .withIndex('by_fetched_at', q => q.lt('fetchedAt', cutoffTime))
      .collect();

    let deletedRates = 0;
    for (const entry of oldRates) {
      await ctx.db.delete(entry._id);
      deletedRates++;
    }

    // Clean up history cache
    const oldHistory = await ctx.db
      .query('currencyHistory')
      .withIndex('by_fetched_at', q => q.lt('fetchedAt', cutoffTime))
      .collect();

    let deletedHistory = 0;
    for (const entry of oldHistory) {
      await ctx.db.delete(entry._id);
      deletedHistory++;
    }

    return { deletedRates, deletedHistory };
  },
});

/**
 * Get currency cache statistics
 */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    let ratesTotal = 0;
    let recentRatesCount = 0;
    let staleRatesCount = 0;

    for await (const entry of ctx.db.query('currencyRates').withIndex('by_fetched_at')) {
      ratesTotal++;
      if (entry.fetchedAt > oneHourAgo) {
        recentRatesCount++;
      }
      else if (entry.fetchedAt < oneDayAgo) {
        staleRatesCount++;
      }
    }

    let historyTotal = 0;
    let recentHistoryCount = 0;
    let staleHistoryCount = 0;

    for await (const entry of ctx.db.query('currencyHistory').withIndex('by_fetched_at')) {
      historyTotal++;
      if (entry.fetchedAt > oneHourAgo) {
        recentHistoryCount++;
      }
      else if (entry.fetchedAt < oneDayAgo) {
        staleHistoryCount++;
      }
    }

    return {
      rates: {
        total: ratesTotal,
        recent: recentRatesCount,
        stale: staleRatesCount,
      },
      history: {
        total: historyTotal,
        recent: recentHistoryCount,
        stale: staleHistoryCount,
      },
    };
  },
});
