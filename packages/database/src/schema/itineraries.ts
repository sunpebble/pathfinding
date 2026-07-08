/**
 * Itineraries schema - itineraries, days, items, collaborators, budgets, expenses.
 */
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { createdAt, fk, id, updatedAt } from './columns';

// ── JSON column type definitions ───────────────────────
/** Category budget breakdown */
export type CategoryBudgets = Record<string, number>;

// ── Itineraries ────────────────────────────────────────
export const itineraries = sqliteTable(
  'itineraries',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    title: text('title').notNull(),
    cityId: fk('city_id').notNull(),
    startDate: text('start_date').notNull(),
    endDate: text('end_date').notNull(),
    visibility: text('visibility').notNull().default('private'),
    coverImageUrl: text('cover_image_url'),
    copiedFromId: fk('copied_from_id'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('itineraries_user_idx').on(t.userId),
    index('itineraries_visibility_idx').on(t.visibility),
    index('itineraries_city_idx').on(t.cityId),
    index('itineraries_visibility_city_idx').on(t.visibility, t.cityId),
    index('itineraries_user_visibility_idx').on(t.userId, t.visibility),
  ],
);

// ── Itinerary Days ─────────────────────────────────────
export const itineraryDays = sqliteTable(
  'itinerary_days',
  {
    id: id(),
    itineraryId: fk('itinerary_id').notNull(),
    dayNumber: integer('day_number').notNull(),
    date: text('date').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [index('itinerary_days_itinerary_idx').on(t.itineraryId)],
);

// ── Itinerary Items ────────────────────────────────────
export const itineraryItems = sqliteTable(
  'itinerary_items',
  {
    id: id(),
    dayId: fk('day_id').notNull(),
    poiId: fk('poi_id').notNull(),
    orderIndex: integer('order_index').notNull(),
    startTime: text('start_time'),
    endTime: text('end_time'),
    transportMode: text('transport_mode').notNull(),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [index('itinerary_items_day_idx').on(t.dayId)],
);

// ── Itinerary Collaborators ────────────────────────────
export const itineraryCollaborators = sqliteTable(
  'itinerary_collaborators',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    itineraryId: fk('itinerary_id').notNull(),
    role: text('role').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('itinerary_collabs_itinerary_idx').on(t.itineraryId),
    index('itinerary_collabs_user_idx').on(t.userId),
    uniqueIndex('itinerary_collabs_uniq').on(t.itineraryId, t.userId),
  ],
);

// ── Itinerary Budgets ──────────────────────────────────
export const itineraryBudgets = sqliteTable(
  'itinerary_budgets',
  {
    id: id(),
    itineraryId: fk('itinerary_id').notNull(),
    userId: fk('user_id').notNull(),
    totalBudget: real('total_budget'),
    currency: text('currency').notNull().default('CNY'),
    categoryBudgets: text('category_budgets', { mode: 'json' }).$type<CategoryBudgets>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('itin_budgets_itinerary_idx').on(t.itineraryId),
    index('itin_budgets_user_idx').on(t.userId),
  ],
);

// ── Expenses ───────────────────────────────────────────
export const expenses = sqliteTable(
  'expenses',
  {
    id: id(),
    itineraryId: fk('itinerary_id').notNull(),
    userId: fk('user_id').notNull(),
    categoryId: fk('category_id'),
    amount: real('amount').notNull(),
    currency: text('currency').notNull().default('CNY'),
    description: text('description'),
    date: text('date').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('expenses_itinerary_idx').on(t.itineraryId),
    index('expenses_user_idx').on(t.userId),
    index('expenses_category_idx').on(t.categoryId),
    index('expenses_itin_category_idx').on(t.itineraryId, t.categoryId),
    index('expenses_date_idx').on(t.date),
  ],
);
