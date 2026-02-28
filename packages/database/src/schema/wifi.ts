/**
 * WiFi schema - wifi spots, credentials, reviews.
 */
import {
  boolean,
  double,
  index,
  int,
  mysqlTable,
  text,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns.js';

export const wifiSpots = mysqlTable(
  'wifi_spots',
  {
    id: id(),
    cityId: fk('city_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    spotType: varchar('spot_type', { length: 30 }),
    address: text('address'),
    latitude: double('latitude').notNull(),
    longitude: double('longitude').notNull(),
    poiId: fk('poi_id'),
    ssid: varchar('ssid', { length: 255 }),
    passwordRequired: boolean('password_required').default(false),
    speed: varchar('speed', { length: 20 }),
    reliability: double('reliability'),
    isVerified: boolean('is_verified').notNull().default(false),
    rating: double('rating'),
    ratingCount: int('rating_count').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('wifi_spots_city_idx').on(t.cityId),
    index('wifi_spots_type_idx').on(t.spotType),
    index('wifi_spots_city_type_idx').on(t.cityId, t.spotType),
    index('wifi_spots_poi_idx').on(t.poiId),
    index('wifi_spots_verified_idx').on(t.isVerified),
    index('wifi_spots_rating_idx').on(t.rating),
  ],
);

export const wifiCredentials = mysqlTable(
  'wifi_credentials',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    spotId: fk('spot_id').notNull(),
    ssid: varchar('ssid', { length: 255 }),
    password: varchar('password', { length: 255 }),
    notes: text('notes'),
    isShared: boolean('is_shared').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('wifi_creds_user_idx').on(t.userId),
    index('wifi_creds_user_spot_idx').on(t.userId, t.spotId),
    index('wifi_creds_spot_shared_idx').on(t.spotId, t.isShared),
  ],
);

export const wifiReviews = mysqlTable(
  'wifi_reviews',
  {
    id: id(),
    spotId: fk('spot_id').notNull(),
    userId: fk('user_id').notNull(),
    rating: double('rating').notNull(),
    speed: varchar('speed', { length: 20 }),
    reliability: varchar('reliability', { length: 20 }),
    comment: text('comment'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('wifi_reviews_spot_idx').on(t.spotId),
    index('wifi_reviews_user_idx').on(t.userId),
    index('wifi_reviews_user_spot_idx').on(t.userId, t.spotId),
    index('wifi_reviews_rating_idx').on(t.rating),
  ],
);

export const wifiReviewHelpful = mysqlTable(
  'wifi_review_helpful',
  {
    id: id(),
    reviewId: fk('review_id').notNull(),
    userId: fk('user_id').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('wifi_review_help_review_idx').on(t.reviewId),
    index('wifi_review_help_user_idx').on(t.userId),
    index('wifi_review_help_pair_idx').on(t.reviewId, t.userId),
  ],
);
