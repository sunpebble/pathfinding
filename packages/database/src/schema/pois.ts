/**
 * POIs schema - points of interest, Q&A.
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
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns';

// ── JSON column type definitions ───────────────────────
/** Business hours per day of week */
export type BusinessHours = Record<string, { open: string; close: string } | null>;
/** Best time to visit a POI */
export interface BestVisitTime { season?: string; timeOfDay?: string; notes?: string }
/** Local recommendation details */
export interface LocalRecommendation { tip?: string; reason?: string; source?: string }

// ── POIs ───────────────────────────────────────────────
export const pois = mysqlTable(
  'pois',
  {
    id: id(),
    externalId: varchar('external_id', { length: 255 }),
    name: varchar('name', { length: 500 }).notNull(),
    nameEn: varchar('name_en', { length: 500 }),
    category: varchar('category', { length: 50 }).notNull(),
    cityId: fk('city_id').notNull(),
    address: text('address'),
    latitude: double('latitude').notNull(),
    longitude: double('longitude').notNull(),
    rating: double('rating'),
    ratingCount: int('rating_count').notNull().default(0),
    priceLevel: int('price_level'),
    businessHours: json('business_hours').$type<BusinessHours>(),
    bestVisitTime: json('best_visit_time').$type<BestVisitTime>(),
    phone: varchar('phone', { length: 50 }),
    imageUrls: json('image_urls').$type<string[]>(),
    source: varchar('source', { length: 100 }).notNull(),
    isHiddenGem: boolean('is_hidden_gem'),
    hiddenGemScore: double('hidden_gem_score'),
    hiddenGemRating: double('hidden_gem_rating'),
    hiddenGemRatingCount: int('hidden_gem_rating_count'),
    localRecommendation: json('local_recommendation').$type<LocalRecommendation>(),
    popularityLevel: varchar('popularity_level', { length: 20 }),
    cuisineType: varchar('cuisine_type', { length: 100 }),
    isLocalFavorite: boolean('is_local_favorite'),
    signatureDishes: json('signature_dishes').$type<string[]>(),
    dietaryOptions: json('dietary_options').$type<string[]>(),
    averagePrice: double('average_price'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('pois_city_idx').on(t.cityId),
    index('pois_category_idx').on(t.category),
    index('pois_city_category_idx').on(t.cityId, t.category),
    index('pois_external_source_idx').on(t.externalId, t.source),
    index('pois_hidden_gem_idx').on(t.isHiddenGem),
    index('pois_city_hidden_gem_idx').on(t.cityId, t.isHiddenGem),
    index('pois_popularity_idx').on(t.popularityLevel),
  ],
);

// ── POI Questions ──────────────────────────────────────
export const poiQuestions = mysqlTable(
  'poi_questions',
  {
    id: id(),
    poiId: fk('poi_id').notNull(),
    userId: fk('user_id').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    content: text('content').notNull(),
    category: varchar('category', { length: 30 }).notNull(),
    tags: json('tags').$type<string[]>(),
    imageUrls: json('image_urls').$type<string[]>(),
    viewsCount: int('views_count').notNull().default(0),
    answersCount: int('answers_count').notNull().default(0),
    followersCount: int('followers_count').notNull().default(0),
    status: varchar('status', { length: 20 }).notNull().default('open'),
    acceptedAnswerId: fk('accepted_answer_id'),
    bestAnswerId: fk('best_answer_id'),
    hasBestAnswer: boolean('has_best_answer').default(false),
    isEdited: boolean('is_edited').notNull().default(false),
    isPinned: boolean('is_pinned').notNull().default(false),
    reportCount: int('report_count').notNull().default(0),
    isHidden: boolean('is_hidden').notNull().default(false),
    isDeleted: boolean('is_deleted').default(false),
    upvotesCount: int('upvotes_count').default(0),
    downvotesCount: int('downvotes_count').default(0),
    authorName: varchar('author_name', { length: 255 }),
    authorAvatarUrl: text('author_avatar_url'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    lastActivityAt: timestamp('last_activity_at', { mode: 'date' }).notNull(),
  },
  t => [
    index('poi_questions_poi_idx').on(t.poiId),
    index('poi_questions_user_idx').on(t.userId),
    index('poi_questions_poi_status_idx').on(t.poiId, t.status),
    index('poi_questions_poi_category_idx').on(t.poiId, t.category),
    index('poi_questions_status_idx').on(t.status),
    index('poi_questions_category_idx').on(t.category),
    index('poi_questions_created_idx').on(t.createdAt),
    index('poi_questions_last_activity_idx').on(t.lastActivityAt),
    index('poi_questions_poi_last_idx').on(t.poiId, t.lastActivityAt),
  ],
);

// ── POI Answers ────────────────────────────────────────
export const poiAnswers = mysqlTable(
  'poi_answers',
  {
    id: id(),
    questionId: fk('question_id').notNull(),
    poiId: fk('poi_id'),
    userId: fk('user_id').notNull(),
    content: text('content').notNull(),
    imageUrls: json('image_urls').$type<string[]>(),
    authorName: varchar('author_name', { length: 255 }),
    authorAvatarUrl: text('author_avatar_url'),
    upvotesCount: int('upvotes_count').notNull().default(0),
    downvotesCount: int('downvotes_count').notNull().default(0),
    commentsCount: int('comments_count').notNull().default(0),
    isAccepted: boolean('is_accepted').notNull().default(false),
    isBestAnswer: boolean('is_best_answer').default(false),
    isEdited: boolean('is_edited').notNull().default(false),
    isDeleted: boolean('is_deleted').notNull().default(false),
    isVerifiedAuthor: boolean('is_verified_author').notNull().default(false),
    authorBadgeType: varchar('author_badge_type', { length: 30 }),
    reportCount: int('report_count').notNull().default(0),
    isHidden: boolean('is_hidden').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('poi_answers_question_idx').on(t.questionId),
    index('poi_answers_user_idx').on(t.userId),
    index('poi_answers_q_accepted_idx').on(t.questionId, t.isAccepted),
    index('poi_answers_q_upvotes_idx').on(t.questionId, t.upvotesCount),
    index('poi_answers_created_idx').on(t.createdAt),
  ],
);
