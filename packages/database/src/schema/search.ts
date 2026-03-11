/**
 * Search schema - search history, search trends.
 */
import {
  index,
  int,
  mysqlTable,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, fk, id } from './columns';

export const searchHistory = mysqlTable(
  'search_history',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    query: varchar('query', { length: 500 }).notNull(),
    searchType: varchar('search_type', { length: 30 }),
    resultCount: int('result_count').notNull().default(0),
    createdAt: createdAt(),
  },
  t => [
    index('search_history_user_query_idx').on(t.userId, t.query),
    index('search_history_user_created_idx').on(t.userId, t.createdAt),
  ],
);

export const searchTrends = mysqlTable(
  'search_trends',
  {
    id: id(),
    query: varchar('query', { length: 500 }).notNull(),
    date: varchar('date', { length: 10 }).notNull(),
    count: int('count').notNull().default(0),
    createdAt: createdAt(),
  },
  t => [
    index('search_trends_query_date_idx').on(t.query, t.date),
    index('search_trends_date_idx').on(t.date),
    index('search_trends_count_idx').on(t.count),
  ],
);
