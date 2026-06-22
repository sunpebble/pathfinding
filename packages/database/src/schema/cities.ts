/**
 * Cities schema - city reference data.
 */
import {
  boolean,
  double,
  index,
  mysqlTable,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, id, updatedAt } from './columns';

// ── Cities ─────────────────────────────────────────────
export const cities = mysqlTable(
  'cities',
  {
    id: id(),
    name: varchar('name', { length: 255 }).notNull(),
    nameEn: varchar('name_en', { length: 255 }),
    timezone: varchar('timezone', { length: 100 }),
    countryCode: varchar('country_code', { length: 10 }),
    latitude: double('latitude').notNull(),
    longitude: double('longitude').notNull(),
    utcOffset: double('utc_offset'),
    utcOffsetDst: double('utc_offset_dst'),
    hasDst: boolean('has_dst').default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('cities_name_idx').on(t.name),
    index('cities_country_idx').on(t.countryCode),
    index('cities_timezone_idx').on(t.timezone),
  ],
);
