/**
 * Currency schema - exchange rates, history.
 */
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createdAt, id } from './columns';

export const currencyRates = sqliteTable('currency_rates', {
  id: id(),
  baseCurrency: text('base_currency').notNull(),
  rates: text('rates', { mode: 'json' }).notNull(),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
  createdAt: createdAt(),
}, t => [
  index('currency_rates_base_idx').on(t.baseCurrency),
  index('currency_rates_fetched_idx').on(t.fetchedAt),
]);

export const currencyHistory = sqliteTable('currency_history', {
  id: id(),
  baseCurrency: text('base_currency').notNull(),
  targetCurrency: text('target_currency').notNull(),
  rate: real('rate').notNull(),
  days: integer('days').notNull().default(1),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
  createdAt: createdAt(),
}, t => [
  index('currency_hist_pair_idx').on(t.baseCurrency, t.targetCurrency),
  index('currency_hist_pair_days_idx').on(t.baseCurrency, t.targetCurrency, t.days),
  index('currency_hist_fetched_idx').on(t.fetchedAt),
]);
