/**
 * Guides schema - travel guides, comments, AI data, recommendations, refetch tasks.
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
/** Destination referenced in a guide */
export interface GuideDestination { name: string; country?: string; coordinates?: { lat: number; lng: number } }
/** Geographic data extracted from a guide */
export interface GeoData { coordinates?: Array<{ lat: number; lng: number; label?: string }>; region?: string }
/** POI coordinates referenced in a guide */
export interface PoiCoordinate { name: string; lat: number; lng: number; category?: string }
/** Day-by-day itinerary extracted from a guide */
export interface DayItinerary { day: number; title?: string; pois: PoiCoordinate[] }

// ── Travel Guides ──────────────────────────────────────
export const travelGuides = sqliteTable(
  'travel_guides',
  {
    id: id(),
    platform: text('platform').notNull(),
    externalId: text('external_id'),
    title: text('title').notNull(),
    content: text('content'),
    authorName: text('author_name'),
    authorUrl: text('author_url'),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    sourceUrl: text('source_url'),
    coverImageUrl: text('cover_image_url'),
    imageUrls: text('image_urls', { mode: 'json' }).$type<string[]>(),
    destinations: text('destinations', { mode: 'json' }).$type<GuideDestination[]>(),
    tags: text('tags', { mode: 'json' }).$type<string[]>(),
    category: text('category'),
    viewCount: integer('view_count').notNull().default(0),
    likeCount: integer('like_count').notNull().default(0),
    commentCount: integer('comment_count').notNull().default(0),
    qualityScore: real('quality_score'),
    completenessScore: real('completeness_score'),
    /** Completeness level from crawler-types validators: complete | usable | incomplete */
    completenessLevel: text('completeness_level'),
    enrichedData: text('enriched_data', { mode: 'json' }).$type<Record<string, unknown>>(),
    geoData: text('geo_data', { mode: 'json' }).$type<GeoData>(),
    dayItineraries: text('day_itineraries', { mode: 'json' }).$type<DayItinerary[]>(),
    crawledAt: integer('crawled_at', { mode: 'timestamp' }),
    lastUpdatedAt: integer('last_updated_at', { mode: 'timestamp' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('travel_guides_platform_idx').on(t.platform),
    // Unique business key (D1): one row per crawled guide. NULL external_id
    // (manual records) is exempt — MySQL unique indexes allow multiple NULLs.
    // Run scripts/dedupe-travel-guides.ts BEFORE pushing this index.
    uniqueIndex('travel_guides_platform_ext_idx').on(t.platform, t.externalId),
    index('travel_guides_quality_idx').on(t.qualityScore),
    index('travel_guides_completeness_idx').on(t.completenessScore),
  ],
);

// ── Guide Destinations ─────────────────────────────────
export const guideDestinations = sqliteTable(
  'guide_destinations',
  {
    id: id(),
    guideId: fk('guide_id').notNull(),
    destination: text('destination').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('guide_dest_destination_idx').on(t.destination),
    index('guide_dest_guide_idx').on(t.guideId),
    index('guide_dest_dest_guide_idx').on(t.destination, t.guideId),
  ],
);

// ── Travel Guide AI Data ───────────────────────────────
export const travelGuideAiData = sqliteTable(
  'travel_guide_ai_data',
  {
    id: id(),
    guideId: fk('guide_id').notNull(),
    version: integer('version').notNull().default(1),
    aiSummary: text('ai_summary'),
    aiTags: text('ai_tags', { mode: 'json' }).$type<string[]>(),
    aiCategories: text('ai_categories', { mode: 'json' }).$type<string[]>(),
    aiQualityNotes: text('ai_quality_notes'),
    processedAt: integer('processed_at', { mode: 'timestamp' }),
    createdAt: createdAt(),
  },
  t => [
    index('guide_ai_guide_idx').on(t.guideId),
    index('guide_ai_guide_ver_idx').on(t.guideId, t.version),
  ],
);

// ── Guide Comments ─────────────────────────────────────
export const guideComments = sqliteTable(
  'guide_comments',
  {
    id: id(),
    guideId: fk('guide_id').notNull(),
    userId: fk('user_id').notNull(),
    parentId: fk('parent_id'),
    content: text('content').notNull(),
    likesCount: integer('likes_count').notNull().default(0),
    repliesCount: integer('replies_count').notNull().default(0),
    isEdited: integer('is_edited', { mode: 'boolean' }).notNull().default(false),
    isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
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
export const guideCommentLikes = sqliteTable(
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
export const guideRecommendations = sqliteTable(
  'guide_recommendations',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    guideId: fk('guide_id').notNull(),
    score: real('score').notNull(),
    reason: text('reason'),
    createdAt: createdAt(),
  },
  t => [
    index('guide_recs_user_idx').on(t.userId),
    index('guide_recs_user_guide_idx').on(t.userId, t.guideId),
    index('guide_recs_score_idx').on(t.score),
  ],
);

// ── Refetch Tasks ──────────────────────────────────────
export const refetchTasks = sqliteTable(
  'refetch_tasks',
  {
    id: id(),
    guideId: fk('guide_id').notNull(),
    status: text('status').notNull().default('pending'),
    reason: text('reason'),
    retryCount: integer('retry_count').notNull().default(0),
    nextRetryAt: integer('next_retry_at', { mode: 'timestamp' }),
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
