/**
 * Currency Exchange API Routes
 * Endpoints for exchange rates, conversions, and history
 */

import type { Context } from 'hono';
import { Hono } from 'hono';
import { Errors } from '../middleware/error-handler.js';
import {
  getCurrencyService,
  getCurrencyInfo,
  POPULAR_CURRENCIES,
} from '../services/currency.service.js';

export const currencyRouter = new Hono();

/**
 * GET /api/currency/rates
 * Get exchange rates for a base currency
 * Query params: base (required), targets (optional, comma-separated)
 */
currencyRouter.get('/rates', async (c: Context) => {
  const base = c.req.query('base') || 'CNY';
  const targetsParam = c.req.query('targets');
  const forceRefresh = c.req.query('force_refresh') === 'true';

  // Validate base currency
  if (!getCurrencyInfo(base)) {
    throw Errors.badRequest(`Unsupported currency: ${base}`);
  }

  const targets = targetsParam
    ? targetsParam.split(',').map((t) => t.trim().toUpperCase())
    : undefined;

  // Validate target currencies if provided
  if (targets) {
    for (const target of targets) {
      if (!getCurrencyInfo(target)) {
        throw Errors.badRequest(`Unsupported currency: ${target}`);
      }
    }
  }

  const currencyService = getCurrencyService();
  const rates = await currencyService.getExchangeRates(base, targets, {
    forceRefresh,
  });

  return c.json({
    success: true,
    data: {
      base: base.toUpperCase(),
      rates,
      count: Object.keys(rates).length,
      fetchedAt: Date.now(),
    },
  });
});

/**
 * GET /api/currency/convert
 * Convert an amount from one currency to another
 * Query params: from, to, amount
 */
currencyRouter.get('/convert', async (c: Context) => {
  const from = c.req.query('from');
  const to = c.req.query('to');
  const amountStr = c.req.query('amount');
  const forceRefresh = c.req.query('force_refresh') === 'true';

  if (!from || !to || !amountStr) {
    throw Errors.badRequest('from, to, and amount query parameters are required');
  }

  const amount = Number.parseFloat(amountStr);
  if (Number.isNaN(amount) || amount < 0) {
    throw Errors.badRequest('amount must be a valid positive number');
  }

  // Validate currencies
  if (!getCurrencyInfo(from)) {
    throw Errors.badRequest(`Unsupported currency: ${from}`);
  }
  if (!getCurrencyInfo(to)) {
    throw Errors.badRequest(`Unsupported currency: ${to}`);
  }

  const currencyService = getCurrencyService();
  const result = await currencyService.convert(amount, from, to, { forceRefresh });

  if (!result) {
    throw Errors.serviceUnavailable('Currency conversion service is currently unavailable');
  }

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * POST /api/currency/convert/batch
 * Convert an amount to multiple currencies at once
 * Body: { from: string, amount: number, targets: string[] }
 */
currencyRouter.post('/convert/batch', async (c: Context) => {
  const body = await c.req.json();
  const { from, amount, targets } = body;

  if (!from || typeof amount !== 'number' || !Array.isArray(targets)) {
    throw Errors.badRequest('from, amount (number), and targets (array) are required');
  }

  if (amount < 0) {
    throw Errors.badRequest('amount must be a positive number');
  }

  if (targets.length === 0) {
    throw Errors.badRequest('targets array cannot be empty');
  }

  if (targets.length > 30) {
    throw Errors.badRequest('Maximum 30 target currencies allowed per request');
  }

  // Validate currencies
  if (!getCurrencyInfo(from)) {
    throw Errors.badRequest(`Unsupported currency: ${from}`);
  }
  for (const target of targets) {
    if (!getCurrencyInfo(target)) {
      throw Errors.badRequest(`Unsupported currency: ${target}`);
    }
  }

  const currencyService = getCurrencyService();
  const results = await currencyService.convertToMultiple(amount, from, targets);

  return c.json({
    success: true,
    data: {
      from: getCurrencyInfo(from),
      amount,
      conversions: results,
      count: results.length,
    },
  });
});

/**
 * GET /api/currency/history
 * Get exchange rate history for a currency pair
 * Query params: base, target, days (default 30)
 */
currencyRouter.get('/history', async (c: Context) => {
  const base = c.req.query('base');
  const target = c.req.query('target');
  const daysStr = c.req.query('days') || '30';

  if (!base || !target) {
    throw Errors.badRequest('base and target query parameters are required');
  }

  const days = Number.parseInt(daysStr, 10);
  if (Number.isNaN(days) || days < 1 || days > 365) {
    throw Errors.badRequest('days must be a number between 1 and 365');
  }

  // Validate currencies
  if (!getCurrencyInfo(base)) {
    throw Errors.badRequest(`Unsupported currency: ${base}`);
  }
  if (!getCurrencyInfo(target)) {
    throw Errors.badRequest(`Unsupported currency: ${target}`);
  }

  const currencyService = getCurrencyService();
  const history = await currencyService.getExchangeRateHistory(base, target, days);

  if (!history) {
    throw Errors.serviceUnavailable('Exchange rate history is currently unavailable');
  }

  return c.json({
    success: true,
    data: {
      ...history,
      baseInfo: getCurrencyInfo(base),
      targetInfo: getCurrencyInfo(target),
    },
  });
});

/**
 * GET /api/currency/currencies
 * Get list of supported currencies
 * Query params: type (all | popular), search
 */
currencyRouter.get('/currencies', async (c: Context) => {
  const type = c.req.query('type') || 'popular';
  const search = c.req.query('search');

  const currencyService = getCurrencyService();

  let currencies;
  if (search) {
    currencies = currencyService.searchCurrencies(search);
  } else if (type === 'all') {
    currencies = currencyService.getAllCurrencies();
  } else {
    currencies = currencyService.getPopularCurrencies();
  }

  return c.json({
    success: true,
    data: currencies,
    count: currencies.length,
  });
});

/**
 * GET /api/currency/currency/:code
 * Get information about a specific currency
 */
currencyRouter.get('/currency/:code', async (c: Context) => {
  const code = c.req.param('code');

  const currencyInfo = getCurrencyInfo(code);
  if (!currencyInfo) {
    throw Errors.notFound('Currency');
  }

  // Get current rates from this currency to popular currencies
  const currencyService = getCurrencyService();
  const popularCodes = POPULAR_CURRENCIES
    .filter((c) => c.code !== code.toUpperCase())
    .slice(0, 10)
    .map((c) => c.code);

  const rates = await currencyService.getExchangeRates(code, popularCodes);

  return c.json({
    success: true,
    data: {
      currency: currencyInfo,
      rates,
    },
  });
});

/**
 * GET /api/currency/popular-pairs
 * Get rates for popular currency pairs (CNY as base)
 */
currencyRouter.get('/popular-pairs', async (c: Context) => {
  const base = c.req.query('base') || 'CNY';
  const forceRefresh = c.req.query('force_refresh') === 'true';

  if (!getCurrencyInfo(base)) {
    throw Errors.badRequest(`Unsupported currency: ${base}`);
  }

  const currencyService = getCurrencyService();
  const popularCodes = POPULAR_CURRENCIES
    .filter((c) => c.code !== base.toUpperCase())
    .map((c) => c.code);

  const rates = await currencyService.getExchangeRates(base, popularCodes, { forceRefresh });

  // Combine with currency info
  const pairs = Object.entries(rates).map(([code, rate]) => ({
    ...rate,
    targetInfo: getCurrencyInfo(code),
  }));

  return c.json({
    success: true,
    data: {
      base: getCurrencyInfo(base),
      pairs,
      count: pairs.length,
      fetchedAt: Date.now(),
    },
  });
});

/**
 * GET /api/currency/offline-data
 * Get a complete data package for offline usage
 * Returns all rates for popular currencies
 */
currencyRouter.get('/offline-data', async (c: Context) => {
  const currencyService = getCurrencyService();

  // Get rates for all popular currencies as base
  const offlineData: Record<string, Record<string, number>> = {};
  const popularCodes = POPULAR_CURRENCIES.map((c) => c.code);

  // For offline mode, we only need rates from a few key base currencies
  const baseCurrencies = ['CNY', 'USD', 'EUR', 'JPY', 'GBP'];

  for (const base of baseCurrencies) {
    const rates = await currencyService.getExchangeRates(base, popularCodes);
    offlineData[base] = {};
    for (const [target, rate] of Object.entries(rates)) {
      offlineData[base][target] = rate.rate;
    }
  }

  return c.json({
    success: true,
    data: {
      currencies: POPULAR_CURRENCIES,
      rates: offlineData,
      generatedAt: Date.now(),
      validUntil: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    },
  });
});

/**
 * GET /api/currency/stats
 * Get currency service statistics
 */
currencyRouter.get('/stats', async (c: Context) => {
  const currencyService = getCurrencyService();
  const stats = currencyService.getCacheStats();

  return c.json({
    success: true,
    data: {
      ...stats,
      supportedCurrencies: currencyService.getAllCurrencies().length,
      apiConfigured: !!(process.env.EXCHANGE_RATE_API_KEY || process.env.OPEN_EXCHANGE_API_KEY),
    },
  });
});

/**
 * POST /api/currency/cache/clear
 * Clear currency cache
 */
currencyRouter.post('/cache/clear', async (c: Context) => {
  const currencyService = getCurrencyService();
  currencyService.clearCache();

  return c.json({
    success: true,
    message: 'Currency cache cleared',
  });
});
