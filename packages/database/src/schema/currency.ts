/**
 * Currency schema - exchange rates, history.
 */
import { double, index, int, json, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { createdAt, id } from './columns';

export const currencyRates = mysqlTable('currency_rates', {
  id: id(),
  baseCurrency: varchar('base_currency', { length: 10 }).notNull(),
  rates: json('rates').notNull(),
  fetchedAt: timestamp('fetched_at', { mode: 'date' }).notNull(),
  createdAt: createdAt(),
}, t => [
  index('currency_rates_base_idx').on(t.baseCurrency),
  index('currency_rates_fetched_idx').on(t.fetchedAt),
]);

export const currencyHistory = mysqlTable('currency_history', {
  id: id(),
  baseCurrency: varchar('base_currency', { length: 10 }).notNull(),
  targetCurrency: varchar('target_currency', { length: 10 }).notNull(),
  rate: double('rate').notNull(),
  days: int('days').notNull().default(1),
  fetchedAt: timestamp('fetched_at', { mode: 'date' }).notNull(),
  createdAt: createdAt(),
}, t => [
  index('currency_hist_pair_idx').on(t.baseCurrency, t.targetCurrency),
  index('currency_hist_pair_days_idx').on(t.baseCurrency, t.targetCurrency, t.days),
  index('currency_hist_fetched_idx').on(t.fetchedAt),
]);
