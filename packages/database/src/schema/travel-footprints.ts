/**
 * Travel Footprints schema - visited cities/countries, stats, yearly reviews.
 */
import {
  double,
  index,
  int,
  json,
  mysqlTable,
  text,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns';

export const visitedCities = mysqlTable(
  'visited_cities',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    cityId: fk('city_id').notNull(),
    countryCode: varchar('country_code', { length: 10 }),
    visitDate: varchar('visit_date', { length: 10 }),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  t => [
    index('visited_cities_user_idx').on(t.userId),
    index('visited_cities_user_city_idx').on(t.userId, t.cityId),
    index('visited_cities_user_country_idx').on(t.userId, t.countryCode),
    index('visited_cities_country_idx').on(t.countryCode),
  ],
);

export const visitedCountries = mysqlTable(
  'visited_countries',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    countryCode: varchar('country_code', { length: 10 }).notNull(),
    firstVisitDate: varchar('first_visit_date', { length: 10 }),
    lastVisitDate: varchar('last_visit_date', { length: 10 }),
    visitCount: int('visit_count').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('visited_countries_user_idx').on(t.userId),
    index('visited_countries_user_code_idx').on(t.userId, t.countryCode),
    index('visited_countries_country_idx').on(t.countryCode),
  ],
);

export const travelStats = mysqlTable(
  'travel_stats',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    totalCountries: int('total_countries').notNull().default(0),
    totalCities: int('total_cities').notNull().default(0),
    totalTrips: int('total_trips').notNull().default(0),
    totalDistance: double('total_distance').notNull().default(0),
    totalDays: int('total_days').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [index('travel_stats_user_idx').on(t.userId)],
);

export const yearlyReviews = mysqlTable(
  'yearly_reviews',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    year: int('year').notNull(),
    data: json('data'),
    status: varchar('status', { length: 20 }).notNull().default('generated'),
    shareCode: varchar('share_code', { length: 50 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('yearly_reviews_user_idx').on(t.userId),
    index('yearly_reviews_year_idx').on(t.year),
    index('yearly_reviews_user_year_idx').on(t.userId, t.year),
    index('yearly_reviews_status_idx').on(t.status),
  ],
);
