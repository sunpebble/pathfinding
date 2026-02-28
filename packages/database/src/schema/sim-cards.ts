/**
 * SIM Cards schema - SIM card products, reviews, votes, favorites.
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

export const simCards = mysqlTable(
  'sim_cards',
  {
    id: id(),
    name: varchar('name', { length: 255 }).notNull(),
    provider: varchar('provider', { length: 255 }).notNull(),
    cardType: varchar('card_type', { length: 20 }).notNull(),
    coverageType: varchar('coverage_type', { length: 20 }),
    coverageCountries: json('coverage_countries'),
    dataPlan: json('data_plan'),
    price: double('price'),
    currency: varchar('currency', { length: 10 }),
    purchaseUrl: text('purchase_url'),
    isActive: boolean('is_active').notNull().default(true),
    rating: double('rating'),
    ratingCount: int('rating_count').notNull().default(0),
    priority: int('priority').notNull().default(0),
    isPromoted: boolean('is_promoted').notNull().default(false),
    features: json('features'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('sim_cards_type_idx').on(t.cardType),
    index('sim_cards_provider_idx').on(t.provider),
    index('sim_cards_active_idx').on(t.isActive),
    index('sim_cards_coverage_idx').on(t.coverageType),
    index('sim_cards_priority_idx').on(t.priority),
    index('sim_cards_promoted_idx').on(t.isPromoted),
    index('sim_cards_rating_idx').on(t.rating),
  ],
);

export const simCardReviews = mysqlTable(
  'sim_card_reviews',
  {
    id: id(),
    simCardId: fk('sim_card_id').notNull(),
    userId: fk('user_id').notNull(),
    overallRating: double('overall_rating').notNull(),
    speedRating: double('speed_rating'),
    coverageRating: double('coverage_rating'),
    valueRating: double('value_rating'),
    title: varchar('title', { length: 500 }),
    content: text('content'),
    pros: json('pros'),
    cons: json('cons'),
    usageDuration: varchar('usage_duration', { length: 50 }),
    isVerified: boolean('is_verified').notNull().default(false),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    helpfulCount: int('helpful_count').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('sim_reviews_card_idx').on(t.simCardId),
    index('sim_reviews_user_idx').on(t.userId),
    index('sim_reviews_overall_idx').on(t.overallRating),
    index('sim_reviews_card_rating_idx').on(t.simCardId, t.overallRating),
    index('sim_reviews_status_idx').on(t.status),
    index('sim_reviews_verified_idx').on(t.isVerified),
    index('sim_reviews_helpful_idx').on(t.helpfulCount),
  ],
);

export const simCardReviewVotes = mysqlTable(
  'sim_card_review_votes',
  {
    id: id(),
    reviewId: fk('review_id').notNull(),
    userId: fk('user_id').notNull(),
    isHelpful: boolean('is_helpful').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('sim_review_votes_review_idx').on(t.reviewId),
    index('sim_review_votes_user_idx').on(t.userId),
    index('sim_review_votes_pair_idx').on(t.reviewId, t.userId),
  ],
);

export const favoriteSimCards = mysqlTable(
  'favorite_sim_cards',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    simCardId: fk('sim_card_id').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('fav_sim_user_idx').on(t.userId),
    index('fav_sim_card_idx').on(t.simCardId),
    index('fav_sim_pair_idx').on(t.userId, t.simCardId),
  ],
);
