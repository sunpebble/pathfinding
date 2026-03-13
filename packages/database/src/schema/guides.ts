/**
 * Guides schema - travel guides, comments, AI data, recommendations, refetch tasks.
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
/** Destination referenced in a guide */
export interface GuideDestination { name: string; country?: string; coordinates?: { lat: number; lng: number } }
/** Geographic data extracted from a guide */
export interface GeoData { coordinates?: Array<{ lat: number; lng: number; label?: string }>; region?: string }
/** POI coordinates referenced in a guide */
export interface PoiCoordinate { name: string; lat: number; lng: number; category?: string }
/** Day-by-day itinerary extracted from a guide */
export interface DayItinerary { day: number; title?: string; pois: PoiCoordinate[] }

// ── Travel Guides ──────────────────────────────────────
export const travelGuides = mysqlTable(
  'travel_guides',
  {
    id: id(),
    platform: varchar('platform', { length: 50 }).notNull(),
    externalId: varchar('external_id', { length: 255 }),
    title: varchar('title', { length: 500 }).notNull(),
    content: text('content'),
    authorName: varchar('author_name', { length: 255 }),
    authorUrl: text('author_url'),
    publishedAt: timestamp('published_at', { mode: 'date' }),
    sourceUrl: text('source_url'),
    coverImageUrl: text('cover_image_url'),
    imageUrls: json('image_urls').$type<string[]>(),
    destinations: json('destinations').$type<GuideDestination[]>(),
    tags: json('tags').$type<string[]>(),
    category: varchar('category', { length: 50 }),
    viewCount: int('view_count').notNull().default(0),
    likeCount: int('like_count').notNull().default(0),
    commentCount: int('comment_count').notNull().default(0),
    qualityScore: double('quality_score'),
    completenessScore: double('completeness_score'),
    enrichedData: json('enriched_data').$type<Record<string, unknown>>(),
    geoData: json('geo_data').$type<GeoData>(),
    dayItineraries: json('day_itineraries').$type<DayItinerary[]>(),
    crawledAt: timestamp('crawled_at', { mode: 'date' }),
    lastUpdatedAt: timestamp('last_updated_at', { mode: 'date' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('travel_guides_platform_idx').on(t.platform),
    index('travel_guides_platform_ext_idx').on(t.platform, t.externalId),
    index('travel_guides_quality_idx').on(t.qualityScore),
    index('travel_guides_completeness_idx').on(t.completenessScore),
  ],
);

// ── Guide Destinations ─────────────────────────────────
export const guideDestinations = mysqlTable(
  'guide_destinations',
  {
    id: id(),
    guideId: fk('guide_id').notNull(),
    destination: varchar('destination', { length: 255 }).notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('guide_dest_destination_idx').on(t.destination),
    index('guide_dest_guide_idx').on(t.guideId),
    index('guide_dest_dest_guide_idx').on(t.destination, t.guideId),
  ],
);

// ── Travel Guide AI Data ───────────────────────────────
export const travelGuideAiData = mysqlTable(
  'travel_guide_ai_data',
  {
    id: id(),
    guideId: fk('guide_id').notNull(),
    version: int('version').notNull().default(1),
    aiSummary: text('ai_summary'),
    aiTags: json('ai_tags').$type<string[]>(),
    aiCategories: json('ai_categories').$type<string[]>(),
    aiQualityNotes: text('ai_quality_notes'),
    processedAt: timestamp('processed_at', { mode: 'date' }),
    createdAt: createdAt(),
  },
  t => [
    index('guide_ai_guide_idx').on(t.guideId),
    index('guide_ai_guide_ver_idx').on(t.guideId, t.version),
  ],
);

// ── Guide Comments ─────────────────────────────────────
export const guideComments = mysqlTable(
  'guide_comments',
  {
    id: id(),
    guideId: fk('guide_id').notNull(),
    userId: fk('user_id').notNull(),
    parentId: fk('parent_id'),
    content: text('content').notNull(),
    likesCount: int('likes_count').notNull().default(0),
    repliesCount: int('replies_count').notNull().default(0),
    isEdited: boolean('is_edited').notNull().default(false),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('guide_comments_guide_idx').on(t.guideId),
    index('guide_comments_user_idx').on(t.userId),
    index('guide_comments_parent_idx').on(t.parentId),
    index('guide_comments_guide_created_idx').on(t.guideId, t.createdAt),
  ],
);

// ── Guide Comment Likes ────────────────────────────────
export const guideCommentLikes = mysqlTable(
  'guide_comment_likes',
  {
    id: id(),
    commentId: fk('comment_id').notNull(),
    userId: fk('user_id').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('guide_clikes_comment_idx').on(t.commentId),
    index('guide_clikes_user_idx').on(t.userId),
    uniqueIndex('guide_clikes_uniq').on(t.commentId, t.userId),
  ],
);

// ── Guide Recommendations ──────────────────────────────
export const guideRecommendations = mysqlTable(
  'guide_recommendations',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    guideId: fk('guide_id').notNull(),
    score: double('score').notNull(),
    reason: varchar('reason', { length: 100 }),
    createdAt: createdAt(),
  },
  t => [
    index('guide_recs_user_idx').on(t.userId),
    index('guide_recs_user_guide_idx').on(t.userId, t.guideId),
    index('guide_recs_score_idx').on(t.score),
  ],
);

// ── Refetch Tasks ──────────────────────────────────────
export const refetchTasks = mysqlTable(
  'refetch_tasks',
  {
    id: id(),
    guideId: fk('guide_id').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    reason: text('reason'),
    retryCount: int('retry_count').notNull().default(0),
    nextRetryAt: timestamp('next_retry_at', { mode: 'date' }),
    lastError: text('last_error'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('refetch_tasks_status_idx').on(t.status),
    index('refetch_tasks_guide_idx').on(t.guideId),
    index('refetch_tasks_retry_idx').on(t.nextRetryAt),
  ],
);
