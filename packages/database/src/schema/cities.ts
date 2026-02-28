/**
 * Cities schema - city reference data, encyclopedia, expense/template categories, tipping guides.
 */
import {
  boolean,
  double,
  index,
  int,
  json,
  mysqlTable,
  text,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns.js';

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

// ── City Encyclopedia ──────────────────────────────────
export const cityEncyclopedia = mysqlTable(
  'city_encyclopedia',
  {
    id: id(),
    cityId: fk('city_id').notNull(),
    population: int('population'),
    area: double('area'),
    language: varchar('language', { length: 100 }),
    currency: varchar('currency', { length: 20 }),
    history: text('history'),
    customs: text('customs'),
    practicalInfo: json('practical_info'),
    bestSeasons: json('best_seasons'),
    emergencyNumbers: json('emergency_numbers'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [index('city_encyclopedia_city_idx').on(t.cityId)],
);

// ── Expense Categories ─────────────────────────────────
export const expenseCategories = mysqlTable(
  'expense_categories',
  {
    id: id(),
    name: varchar('name', { length: 100 }).notNull(),
    nameEn: varchar('name_en', { length: 100 }),
    icon: varchar('icon', { length: 50 }),
    sortOrder: int('sort_order').notNull().default(0),
    isDefault: boolean('is_default').default(false),
    createdAt: createdAt(),
  },
  t => [index('expense_categories_sort_idx').on(t.sortOrder)],
);

// ── Template Categories ────────────────────────────────
export const templateCategories = mysqlTable(
  'template_categories',
  {
    id: id(),
    name: varchar('name', { length: 100 }).notNull(),
    nameEn: varchar('name_en', { length: 100 }),
    icon: varchar('icon', { length: 50 }),
    description: text('description'),
    sortOrder: int('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('template_categories_sort_idx').on(t.sortOrder),
    index('template_categories_active_idx').on(t.isActive),
  ],
);

// ── Tipping Guides ─────────────────────────────────────
export const tippingGuides = mysqlTable(
  'tipping_guides',
  {
    id: id(),
    countryCode: varchar('country_code', { length: 10 }).notNull(),
    tippingCulture: varchar('tipping_culture', { length: 30 }),
    restaurantTip: varchar('restaurant_tip', { length: 100 }),
    hotelTip: varchar('hotel_tip', { length: 100 }),
    taxiTip: varchar('taxi_tip', { length: 100 }),
    tourGuideTip: varchar('tour_guide_tip', { length: 100 }),
    generalNotes: text('general_notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('tipping_guides_country_idx').on(t.countryCode),
    index('tipping_guides_culture_idx').on(t.tippingCulture),
  ],
);
