/**
 * POIs schema - points of interest, Q&A.
 */
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import { createdAt, fk, id, updatedAt } from './columns';

// ── JSON column type definitions ───────────────────────
/** Business hours per day of week */
export type BusinessHours = Record<string, { open: string; close: string } | null>;
/** Best time to visit a POI */
export interface BestVisitTime { season?: string; timeOfDay?: string; notes?: string }
/** Local recommendation details */
export interface LocalRecommendation { tip?: string; reason?: string; source?: string }

// ── POIs ───────────────────────────────────────────────
export const pois = sqliteTable(
  'pois',
  {
    id: id(),
    externalId: text('external_id'),
    name: text('name').notNull(),
    nameEn: text('name_en'),
    category: text('category').notNull(),
    cityId: fk('city_id').notNull(),
    address: text('address'),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    rating: real('rating'),
    ratingCount: integer('rating_count').notNull().default(0),
    priceLevel: integer('price_level'),
    businessHours: text('business_hours', { mode: 'json' }).$type<BusinessHours>(),
    bestVisitTime: text('best_visit_time', { mode: 'json' }).$type<BestVisitTime>(),
    phone: text('phone'),
    imageUrls: text('image_urls', { mode: 'json' }).$type<string[]>(),
    source: text('source').notNull(),
    isHiddenGem: integer('is_hidden_gem', { mode: 'boolean' }),
    hiddenGemScore: real('hidden_gem_score'),
    hiddenGemRating: real('hidden_gem_rating'),
    hiddenGemRatingCount: integer('hidden_gem_rating_count'),
    localRecommendation: text('local_recommendation', { mode: 'json' }).$type<LocalRecommendation>(),
    popularityLevel: text('popularity_level'),
    cuisineType: text('cuisine_type'),
    isLocalFavorite: integer('is_local_favorite', { mode: 'boolean' }),
    signatureDishes: text('signature_dishes', { mode: 'json' }).$type<string[]>(),
    dietaryOptions: text('dietary_options', { mode: 'json' }).$type<string[]>(),
    averagePrice: real('average_price'),
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
export const poiQuestions = sqliteTable(
  'poi_questions',
  {
    id: id(),
    poiId: fk('poi_id').notNull(),
    userId: fk('user_id').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    category: text('category').notNull(),
    tags: text('tags', { mode: 'json' }).$type<string[]>(),
    imageUrls: text('image_urls', { mode: 'json' }).$type<string[]>(),
    viewsCount: integer('views_count').notNull().default(0),
    answersCount: integer('answers_count').notNull().default(0),
    followersCount: integer('followers_count').notNull().default(0),
    status: text('status').notNull().default('open'),
    acceptedAnswerId: fk('accepted_answer_id'),
    bestAnswerId: fk('best_answer_id'),
    hasBestAnswer: integer('has_best_answer', { mode: 'boolean' }).default(false),
    isEdited: integer('is_edited', { mode: 'boolean' }).notNull().default(false),
    isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
    reportCount: integer('report_count').notNull().default(0),
    isHidden: integer('is_hidden', { mode: 'boolean' }).notNull().default(false),
    isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),
    upvotesCount: integer('upvotes_count').default(0),
    downvotesCount: integer('downvotes_count').default(0),
    authorName: text('author_name'),
    authorAvatarUrl: text('author_avatar_url'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }).notNull(),
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
export const poiAnswers = sqliteTable(
  'poi_answers',
  {
    id: id(),
    questionId: fk('question_id').notNull(),
    poiId: fk('poi_id'),
    userId: fk('user_id').notNull(),
    content: text('content').notNull(),
    imageUrls: text('image_urls', { mode: 'json' }).$type<string[]>(),
    authorName: text('author_name'),
    authorAvatarUrl: text('author_avatar_url'),
    upvotesCount: integer('upvotes_count').notNull().default(0),
    downvotesCount: integer('downvotes_count').notNull().default(0),
    commentsCount: integer('comments_count').notNull().default(0),
    isAccepted: integer('is_accepted', { mode: 'boolean' }).notNull().default(false),
    isBestAnswer: integer('is_best_answer', { mode: 'boolean' }).default(false),
    isEdited: integer('is_edited', { mode: 'boolean' }).notNull().default(false),
    isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
    isVerifiedAuthor: integer('is_verified_author', { mode: 'boolean' }).notNull().default(false),
    authorBadgeType: text('author_badge_type'),
    reportCount: integer('report_count').notNull().default(0),
    isHidden: integer('is_hidden', { mode: 'boolean' }).notNull().default(false),
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
