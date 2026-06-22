/**
 * Itineraries schema - itineraries, days, items, collaborators, comments, likes, etc.
 */
import {
  boolean,
  double,
  index,
  int,
  json,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns';

// ── JSON column type definitions ───────────────────────
/** Category budget breakdown */
export type CategoryBudgets = Record<string, number>;

// ── Itineraries ────────────────────────────────────────
export const itineraries = mysqlTable(
  'itineraries',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    cityId: fk('city_id').notNull(),
    startDate: varchar('start_date', { length: 10 }).notNull(),
    endDate: varchar('end_date', { length: 10 }).notNull(),
    visibility: varchar('visibility', { length: 20 }).notNull().default('private'),
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
export const itineraryDays = mysqlTable(
  'itinerary_days',
  {
    id: id(),
    itineraryId: fk('itinerary_id').notNull(),
    dayNumber: int('day_number').notNull(),
    date: varchar('date', { length: 10 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [index('itinerary_days_itinerary_idx').on(t.itineraryId)],
);

// ── Itinerary Items ────────────────────────────────────
export const itineraryItems = mysqlTable(
  'itinerary_items',
  {
    id: id(),
    dayId: fk('day_id').notNull(),
    poiId: fk('poi_id').notNull(),
    orderIndex: int('order_index').notNull(),
    startTime: varchar('start_time', { length: 5 }),
    endTime: varchar('end_time', { length: 5 }),
    transportMode: varchar('transport_mode', { length: 20 }).notNull(),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [index('itinerary_items_day_idx').on(t.dayId)],
);

// ── Itinerary Collaborators ────────────────────────────
export const itineraryCollaborators = mysqlTable(
  'itinerary_collaborators',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    itineraryId: fk('itinerary_id').notNull(),
    role: varchar('role', { length: 20 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('itinerary_collabs_itinerary_idx').on(t.itineraryId),
    index('itinerary_collabs_user_idx').on(t.userId),
    uniqueIndex('itinerary_collabs_uniq').on(t.itineraryId, t.userId),
  ],
);

// ── Comment Reports ────────────────────────────────────
export const commentReports = mysqlTable(
  'comment_reports',
  {
    id: id(),
    commentId: fk('comment_id').notNull(),
    userId: fk('user_id').notNull(),
    reason: varchar('reason', { length: 50 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: createdAt(),
    reviewedAt: timestamp('reviewed_at', { mode: 'date' }),
    reviewedBy: fk('reviewed_by'),
  },
  t => [
    index('comment_reports_comment_idx').on(t.commentId),
    index('comment_reports_user_idx').on(t.userId),
    index('comment_reports_status_idx').on(t.status),
    uniqueIndex('comment_reports_uniq').on(t.commentId, t.userId),
  ],
);

// ── Itinerary Likes ────────────────────────────────────
export const itineraryLikes = mysqlTable(
  'itinerary_likes',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    itineraryId: fk('itinerary_id').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('itin_likes_user_idx').on(t.userId),
    index('itin_likes_itinerary_idx').on(t.itineraryId),
    uniqueIndex('itin_likes_uniq').on(t.userId, t.itineraryId),
  ],
);

// ── Favorite Collections ───────────────────────────────
export const favoriteCollections = mysqlTable(
  'favorite_collections',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    coverImageUrl: text('cover_image_url'),
    isDefault: boolean('is_default').notNull().default(false),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('fav_collections_user_idx').on(t.userId),
    index('fav_collections_user_default_idx').on(t.userId, t.isDefault),
    index('fav_collections_user_sort_idx').on(t.userId, t.sortOrder),
  ],
);

// ── Itinerary Favorites ────────────────────────────────
export const itineraryFavorites = mysqlTable(
  'itinerary_favorites',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    itineraryId: fk('itinerary_id').notNull(),
    collectionId: fk('collection_id'),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  t => [
    index('itin_favs_user_idx').on(t.userId),
    index('itin_favs_itinerary_idx').on(t.itineraryId),
    index('itin_favs_collection_idx').on(t.collectionId),
    uniqueIndex('itin_favs_uniq').on(t.userId, t.itineraryId),
    index('itin_favs_user_collection_idx').on(t.userId, t.collectionId),
  ],
);

// ── Itinerary Budgets ──────────────────────────────────
export const itineraryBudgets = mysqlTable(
  'itinerary_budgets',
  {
    id: id(),
    itineraryId: fk('itinerary_id').notNull(),
    userId: fk('user_id').notNull(),
    totalBudget: double('total_budget'),
    currency: varchar('currency', { length: 10 }).notNull().default('CNY'),
    categoryBudgets: json('category_budgets').$type<CategoryBudgets>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('itin_budgets_itinerary_idx').on(t.itineraryId),
    index('itin_budgets_user_idx').on(t.userId),
  ],
);

// ── Expenses ───────────────────────────────────────────
export const expenses = mysqlTable(
  'expenses',
  {
    id: id(),
    itineraryId: fk('itinerary_id').notNull(),
    userId: fk('user_id').notNull(),
    categoryId: fk('category_id'),
    amount: double('amount').notNull(),
    currency: varchar('currency', { length: 10 }).notNull().default('CNY'),
    description: text('description'),
    date: varchar('date', { length: 10 }).notNull(),
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
