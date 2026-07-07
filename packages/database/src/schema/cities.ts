/**
 * Cities schema - city reference data.
 */
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import { createdAt, id, updatedAt } from './columns';

// ── Cities ─────────────────────────────────────────────
export const cities = sqliteTable(
  'cities',
  {
    id: id(),
    name: text('name').notNull(),
    nameEn: text('name_en'),
    timezone: text('timezone'),
    countryCode: text('country_code'),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    utcOffset: real('utc_offset'),
    utcOffsetDst: real('utc_offset_dst'),
    hasDst: integer('has_dst', { mode: 'boolean' }).default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('cities_name_idx').on(t.name),
    index('cities_country_idx').on(t.countryCode),
    index('cities_timezone_idx').on(t.timezone),
  ],
);
