/**
 * Weather schema - cached weather data for locations.
 */
import {
  double,
  index,
  json,
  mysqlTable,
  timestamp,
} from 'drizzle-orm/mysql-core';
import { id } from './columns.js';

// ── Weather Cache ──────────────────────────────────────
export const weatherCache = mysqlTable(
  'weather_cache',
  {
    id: id(),
    /** Latitude rounded to 2 decimal places for caching */
    latitude: double('latitude').notNull(),
    /** Longitude rounded to 2 decimal places for caching */
    longitude: double('longitude').notNull(),
    /** Full weather data JSON (current, daily forecasts, alerts) */
    data: json('data').notNull(),
    /** When weather data was last fetched */
    fetchedAt: timestamp('fetched_at', { mode: 'date' }).notNull(),
  },
  t => [
    index('weather_cache_location_idx').on(t.latitude, t.longitude),
    index('weather_cache_fetched_at_idx').on(t.fetchedAt),
  ],
);
