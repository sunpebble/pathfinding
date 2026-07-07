/**
 * Mafengwo schema - 马蜂窝 crawled travel content.
 * Destinations and guides.
 */
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { id } from './columns';

// ── Mafengwo Destinations (马蜂窝目的地) ───────────────
export const mafengwoDestinations = sqliteTable(
  'mafengwo_destinations',
  {
    id: id(),
    /** 马蜂窝目的地 ID */
    mddId: text('mdd_id').notNull(),
    sourceUrl: text('source_url').notNull(),
    name: text('name').notNull(),
    nameEn: text('name_en'),
    country: text('country'),
    province: text('province'),
    description: text('description'),
    coverImageUrl: text('cover_image_url'),
    /** Array of image URLs */
    imageUrls: text('image_urls', { mode: 'json' }).notNull(),
    latitude: real('latitude'),
    longitude: real('longitude'),
    timezone: text('timezone'),
    bestTravelTime: text('best_travel_time'),
    avgStayDays: text('avg_stay_days'),
    climate: text('climate'),
    language: text('language'),
    currency: text('currency'),
    visa: text('visa'),
    travelNotesCount: integer('travel_notes_count').notNull().default(0),
    poisCount: integer('pois_count').notNull().default(0),
    questionsCount: integer('questions_count').notNull().default(0),
    guidesCount: integer('guides_count'),
    crawledAt: integer('crawled_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  t => [
    // Unique business key (D1). Run scripts/dedupe-travel-guides.ts before db:push.
    uniqueIndex('mafengwo_dest_mdd_id_idx').on(t.mddId),
    index('mafengwo_dest_name_idx').on(t.name),
    index('mafengwo_dest_country_idx').on(t.country),
  ],
);

// ── Mafengwo Guides (马蜂窝攻略) ─────────────────────
export const mafengwoGuides = sqliteTable(
  'mafengwo_guides',
  {
    id: id(),
    guideId: text('guide_id').notNull(),
    sourceUrl: text('source_url').notNull(),
    title: text('title').notNull(),
    destinationId: text('destination_id'),
    destinationName: text('destination_name'),
    authorName: text('author_name'),
    authorId: text('author_id'),
    summary: text('summary'),
    content: text('content').notNull(),
    contentHtml: text('content_html'),
    /** Array of section objects {title, content, order} */
    sections: text('sections', { mode: 'json' }).notNull(),
    coverImageUrl: text('cover_image_url'),
    /** Array of image URLs */
    imageUrls: text('image_urls', { mode: 'json' }).notNull(),
    viewsCount: integer('views_count').notNull().default(0),
    likesCount: integer('likes_count').notNull().default(0),
    savesCount: integer('saves_count').notNull().default(0),
    commentsCount: integer('comments_count').notNull().default(0),
    /** Array of tag strings */
    tags: text('tags', { mode: 'json' }).notNull(),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    qualityScore: integer('quality_score').notNull().default(0),
    crawledAt: integer('crawled_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  t => [
    // Unique business key (D1). Run scripts/dedupe-travel-guides.ts before db:push.
    uniqueIndex('mafengwo_guides_guide_id_idx').on(t.guideId),
    index('mafengwo_guides_destination_idx').on(t.destinationId),
    index('mafengwo_guides_quality_idx').on(t.qualityScore),
    index('mafengwo_guides_views_idx').on(t.viewsCount),
  ],
);

// Restored: live crawl-pipeline staging tables, deduped by scripts/dedupe-travel-guides.ts.
// ── Mafengwo POIs (马蜂窝景点/餐厅/酒店) ─────────────
export const mafengwoPois = sqliteTable(
  'mafengwo_pois',
  {
    id: id(),
    /** 马蜂窝 POI ID */
    poiId: text('poi_id').notNull(),
    sourceUrl: text('source_url').notNull(),
    name: text('name').notNull(),
    nameEn: text('name_en'),
    /** attraction | restaurant | hotel | shopping | entertainment | transport */
    category: text('category').notNull(),
    destinationId: text('destination_id'),
    destinationName: text('destination_name'),
    address: text('address'),
    latitude: real('latitude'),
    longitude: real('longitude'),
    rating: real('rating'),
    ratingCount: integer('rating_count').notNull().default(0),
    priceLevel: integer('price_level'),
    priceRange: text('price_range'),
    ticketPrice: text('ticket_price'),
    openingHours: text('opening_hours'),
    phone: text('phone'),
    website: text('website'),
    description: text('description'),
    /** Array of tip strings */
    tips: text('tips', { mode: 'json' }).notNull(),
    /** Array of highlight strings */
    highlights: text('highlights', { mode: 'json' }).notNull(),
    coverImageUrl: text('cover_image_url'),
    /** Array of image URLs */
    imageUrls: text('image_urls', { mode: 'json' }).notNull(),
    reviewsCount: integer('reviews_count').notNull().default(0),
    savesCount: integer('saves_count').notNull().default(0),
    /** Array of tag strings */
    tags: text('tags', { mode: 'json' }).notNull(),
    // Restaurant specific
    cuisineType: text('cuisine_type'),
    /** Array of dish name strings */
    signatureDishes: text('signature_dishes', { mode: 'json' }).notNull(),
    // Hotel specific
    starRating: integer('star_rating'),
    /** Array of amenity strings */
    amenities: text('amenities', { mode: 'json' }).notNull(),
    checkInTime: text('check_in_time'),
    checkOutTime: text('check_out_time'),
    qualityScore: integer('quality_score').notNull().default(0),
    crawledAt: integer('crawled_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  t => [
    // Unique business key (D1). Run scripts/dedupe-travel-guides.ts before db:push.
    uniqueIndex('mafengwo_pois_poi_id_idx').on(t.poiId),
    index('mafengwo_pois_name_idx').on(t.name),
    index('mafengwo_pois_category_idx').on(t.category),
    index('mafengwo_pois_destination_idx').on(t.destinationId),
    index('mafengwo_pois_dest_cat_idx').on(t.destinationId, t.category),
    index('mafengwo_pois_rating_idx').on(t.rating),
  ],
);

// ── Mafengwo Q&A (马蜂窝问答) ────────────────────────
export const mafengwoQa = sqliteTable(
  'mafengwo_qa',
  {
    id: id(),
    questionId: text('question_id').notNull(),
    sourceUrl: text('source_url').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    destinationId: text('destination_id'),
    destinationName: text('destination_name'),
    authorName: text('author_name'),
    authorId: text('author_id'),
    answersCount: integer('answers_count').notNull().default(0),
    viewsCount: integer('views_count').notNull().default(0),
    /** Array of tag strings */
    tags: text('tags', { mode: 'json' }).notNull(),
    /** Best answer object {content, authorName, authorId, likesCount, createdAt} */
    bestAnswer: text('best_answer', { mode: 'json' }),
    questionCreatedAt: integer('question_created_at', { mode: 'timestamp' }),
    crawledAt: integer('crawled_at', { mode: 'timestamp' }).notNull(),
  },
  t => [
    // Unique business key (D1). Run scripts/dedupe-travel-guides.ts before db:push.
    uniqueIndex('mafengwo_qa_question_id_idx').on(t.questionId),
    index('mafengwo_qa_destination_idx').on(t.destinationId),
    index('mafengwo_qa_answers_idx').on(t.answersCount),
  ],
);

// ── Mafengwo Rankings (马蜂窝榜单) ───────────────────
export const mafengwoRankings = sqliteTable(
  'mafengwo_rankings',
  {
    id: id(),
    rankingId: text('ranking_id').notNull(),
    sourceUrl: text('source_url').notNull(),
    /** must_visit | food | hotel | shopping | hidden_gem */
    rankingType: text('ranking_type').notNull(),
    title: text('title').notNull(),
    destinationId: text('destination_id'),
    destinationName: text('destination_name'),
    description: text('description'),
    /** Array of ranking item objects {rank, poiExternalId, name, ...} */
    items: text('items', { mode: 'json' }).notNull(),
    crawledAt: integer('crawled_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
  },
  t => [
    index('mafengwo_rankings_ranking_id_idx').on(t.rankingId),
    index('mafengwo_rankings_destination_idx').on(t.destinationId),
    index('mafengwo_rankings_type_idx').on(t.rankingType),
    // Unique business key (D1): one ranking per (destination, type).
    // Run scripts/dedupe-travel-guides.ts before db:push.
    uniqueIndex('mafengwo_rankings_dest_type_idx').on(t.destinationId, t.rankingType),
  ],
);
