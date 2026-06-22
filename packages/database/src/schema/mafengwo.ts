/**
 * Mafengwo schema - 马蜂窝 crawled travel content.
 * Destinations and guides.
 */
import {
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
import { id } from './columns';

// ── Mafengwo Destinations (马蜂窝目的地) ───────────────
export const mafengwoDestinations = mysqlTable(
  'mafengwo_destinations',
  {
    id: id(),
    /** 马蜂窝目的地 ID */
    mddId: varchar('mdd_id', { length: 50 }).notNull(),
    sourceUrl: text('source_url').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    nameEn: varchar('name_en', { length: 255 }),
    country: varchar('country', { length: 100 }),
    province: varchar('province', { length: 100 }),
    description: text('description'),
    coverImageUrl: text('cover_image_url'),
    /** Array of image URLs */
    imageUrls: json('image_urls').notNull(),
    latitude: double('latitude'),
    longitude: double('longitude'),
    timezone: varchar('timezone', { length: 50 }),
    bestTravelTime: varchar('best_travel_time', { length: 255 }),
    avgStayDays: varchar('avg_stay_days', { length: 50 }),
    climate: varchar('climate', { length: 255 }),
    language: varchar('language', { length: 100 }),
    currency: varchar('currency', { length: 50 }),
    visa: varchar('visa', { length: 255 }),
    travelNotesCount: int('travel_notes_count').notNull().default(0),
    poisCount: int('pois_count').notNull().default(0),
    questionsCount: int('questions_count').notNull().default(0),
    guidesCount: int('guides_count'),
    crawledAt: timestamp('crawled_at', { mode: 'date' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }),
  },
  t => [
    // Unique business key (D1). Run scripts/dedupe-travel-guides.ts before db:push.
    uniqueIndex('mafengwo_dest_mdd_id_idx').on(t.mddId),
    index('mafengwo_dest_name_idx').on(t.name),
    index('mafengwo_dest_country_idx').on(t.country),
  ],
);

// ── Mafengwo Guides (马蜂窝攻略) ─────────────────────
export const mafengwoGuides = mysqlTable(
  'mafengwo_guides',
  {
    id: id(),
    guideId: varchar('guide_id', { length: 50 }).notNull(),
    sourceUrl: text('source_url').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    destinationId: varchar('destination_id', { length: 50 }),
    destinationName: varchar('destination_name', { length: 255 }),
    authorName: varchar('author_name', { length: 100 }),
    authorId: varchar('author_id', { length: 50 }),
    summary: text('summary'),
    content: text('content').notNull(),
    contentHtml: text('content_html'),
    /** Array of section objects {title, content, order} */
    sections: json('sections').notNull(),
    coverImageUrl: text('cover_image_url'),
    /** Array of image URLs */
    imageUrls: json('image_urls').notNull(),
    viewsCount: int('views_count').notNull().default(0),
    likesCount: int('likes_count').notNull().default(0),
    savesCount: int('saves_count').notNull().default(0),
    commentsCount: int('comments_count').notNull().default(0),
    /** Array of tag strings */
    tags: json('tags').notNull(),
    publishedAt: timestamp('published_at', { mode: 'date' }),
    qualityScore: int('quality_score').notNull().default(0),
    crawledAt: timestamp('crawled_at', { mode: 'date' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }),
  },
  t => [
    // Unique business key (D1). Run scripts/dedupe-travel-guides.ts before db:push.
    uniqueIndex('mafengwo_guides_guide_id_idx').on(t.guideId),
    index('mafengwo_guides_destination_idx').on(t.destinationId),
    index('mafengwo_guides_quality_idx').on(t.qualityScore),
    index('mafengwo_guides_views_idx').on(t.viewsCount),
  ],
);
