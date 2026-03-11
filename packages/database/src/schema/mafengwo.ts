/**
 * Mafengwo schema - 马蜂窝 crawled travel content.
 * Destinations, POIs, guides, Q&A, reviews, rankings, crawl tasks.
 */
import {
  double,
  index,
  int,
  json,
  mysqlTable,
  text,
  timestamp,
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
    index('mafengwo_dest_mdd_id_idx').on(t.mddId),
    index('mafengwo_dest_name_idx').on(t.name),
    index('mafengwo_dest_country_idx').on(t.country),
  ],
);

// ── Mafengwo POIs (马蜂窝景点/餐厅/酒店) ─────────────
export const mafengwoPois = mysqlTable(
  'mafengwo_pois',
  {
    id: id(),
    /** 马蜂窝 POI ID */
    poiId: varchar('poi_id', { length: 50 }).notNull(),
    sourceUrl: text('source_url').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    nameEn: varchar('name_en', { length: 255 }),
    /** attraction | restaurant | hotel | shopping | entertainment | transport */
    category: varchar('category', { length: 30 }).notNull(),
    destinationId: varchar('destination_id', { length: 50 }),
    destinationName: varchar('destination_name', { length: 255 }),
    address: text('address'),
    latitude: double('latitude'),
    longitude: double('longitude'),
    rating: double('rating'),
    ratingCount: int('rating_count').notNull().default(0),
    priceLevel: int('price_level'),
    priceRange: varchar('price_range', { length: 100 }),
    ticketPrice: varchar('ticket_price', { length: 100 }),
    openingHours: text('opening_hours'),
    phone: varchar('phone', { length: 50 }),
    website: text('website'),
    description: text('description'),
    /** Array of tip strings */
    tips: json('tips').notNull(),
    /** Array of highlight strings */
    highlights: json('highlights').notNull(),
    coverImageUrl: text('cover_image_url'),
    /** Array of image URLs */
    imageUrls: json('image_urls').notNull(),
    reviewsCount: int('reviews_count').notNull().default(0),
    savesCount: int('saves_count').notNull().default(0),
    /** Array of tag strings */
    tags: json('tags').notNull(),
    // Restaurant specific
    cuisineType: varchar('cuisine_type', { length: 100 }),
    /** Array of dish name strings */
    signatureDishes: json('signature_dishes').notNull(),
    // Hotel specific
    starRating: int('star_rating'),
    /** Array of amenity strings */
    amenities: json('amenities').notNull(),
    checkInTime: varchar('check_in_time', { length: 20 }),
    checkOutTime: varchar('check_out_time', { length: 20 }),
    qualityScore: int('quality_score').notNull().default(0),
    crawledAt: timestamp('crawled_at', { mode: 'date' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }),
  },
  t => [
    index('mafengwo_pois_poi_id_idx').on(t.poiId),
    index('mafengwo_pois_name_idx').on(t.name),
    index('mafengwo_pois_category_idx').on(t.category),
    index('mafengwo_pois_destination_idx').on(t.destinationId),
    index('mafengwo_pois_dest_cat_idx').on(t.destinationId, t.category),
    index('mafengwo_pois_rating_idx').on(t.rating),
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
    index('mafengwo_guides_guide_id_idx').on(t.guideId),
    index('mafengwo_guides_destination_idx').on(t.destinationId),
    index('mafengwo_guides_quality_idx').on(t.qualityScore),
    index('mafengwo_guides_views_idx').on(t.viewsCount),
  ],
);

// ── Mafengwo Q&A (马蜂窝问答) ────────────────────────
export const mafengwoQa = mysqlTable(
  'mafengwo_qa',
  {
    id: id(),
    questionId: varchar('question_id', { length: 50 }).notNull(),
    sourceUrl: text('source_url').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    content: text('content').notNull(),
    destinationId: varchar('destination_id', { length: 50 }),
    destinationName: varchar('destination_name', { length: 255 }),
    authorName: varchar('author_name', { length: 100 }),
    authorId: varchar('author_id', { length: 50 }),
    answersCount: int('answers_count').notNull().default(0),
    viewsCount: int('views_count').notNull().default(0),
    /** Array of tag strings */
    tags: json('tags').notNull(),
    /** Best answer object {content, authorName, authorId, likesCount, createdAt} */
    bestAnswer: json('best_answer'),
    questionCreatedAt: timestamp('question_created_at', { mode: 'date' }),
    crawledAt: timestamp('crawled_at', { mode: 'date' }).notNull(),
  },
  t => [
    index('mafengwo_qa_question_id_idx').on(t.questionId),
    index('mafengwo_qa_destination_idx').on(t.destinationId),
    index('mafengwo_qa_answers_idx').on(t.answersCount),
  ],
);

// ── Mafengwo Reviews (马蜂窝评论) ────────────────────
export const mafengwoReviews = mysqlTable(
  'mafengwo_reviews',
  {
    id: id(),
    reviewId: varchar('review_id', { length: 50 }).notNull(),
    /** External POI ID reference */
    poiExternalId: varchar('poi_external_id', { length: 50 }).notNull(),
    poiName: varchar('poi_name', { length: 255 }),
    authorName: varchar('author_name', { length: 100 }),
    authorId: varchar('author_id', { length: 50 }),
    authorAvatarUrl: text('author_avatar_url'),
    rating: double('rating'),
    content: text('content').notNull(),
    /** Array of image URLs */
    imageUrls: json('image_urls').notNull(),
    likesCount: int('likes_count').notNull().default(0),
    /** Array of tag strings */
    tags: json('tags').notNull(),
    visitDate: varchar('visit_date', { length: 20 }),
    reviewCreatedAt: timestamp('review_created_at', { mode: 'date' }),
    crawledAt: timestamp('crawled_at', { mode: 'date' }).notNull(),
  },
  t => [
    index('mafengwo_reviews_review_id_idx').on(t.reviewId),
    index('mafengwo_reviews_poi_idx').on(t.poiExternalId),
    index('mafengwo_reviews_rating_idx').on(t.rating),
  ],
);

// ── Mafengwo Rankings (马蜂窝榜单) ───────────────────
export const mafengwoRankings = mysqlTable(
  'mafengwo_rankings',
  {
    id: id(),
    rankingId: varchar('ranking_id', { length: 50 }).notNull(),
    sourceUrl: text('source_url').notNull(),
    /** must_visit | food | hotel | shopping | hidden_gem */
    rankingType: varchar('ranking_type', { length: 30 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    destinationId: varchar('destination_id', { length: 50 }),
    destinationName: varchar('destination_name', { length: 255 }),
    description: text('description'),
    /** Array of ranking item objects {rank, poiExternalId, name, ...} */
    items: json('items').notNull(),
    crawledAt: timestamp('crawled_at', { mode: 'date' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }),
  },
  t => [
    index('mafengwo_rankings_ranking_id_idx').on(t.rankingId),
    index('mafengwo_rankings_destination_idx').on(t.destinationId),
    index('mafengwo_rankings_type_idx').on(t.rankingType),
    index('mafengwo_rankings_dest_type_idx').on(t.destinationId, t.rankingType),
  ],
);

// ── Mafengwo Crawl Tasks (马蜂窝爬取任务) ────────────
export const mafengwoCrawlTasks = mysqlTable(
  'mafengwo_crawl_tasks',
  {
    id: id(),
    /** Task type: destination_list, poi_list, guide_detail, etc. */
    taskType: varchar('task_type', { length: 30 }).notNull(),
    /** Task configuration JSON (destinationId, page, etc.) */
    config: json('config').notNull(),
    /** pending | running | completed | failed | cancelled */
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    priority: int('priority').notNull().default(0),
    itemsCollected: int('items_collected'),
    errorMessage: text('error_message'),
    retryCount: int('retry_count').notNull().default(0),
    maxRetries: int('max_retries').notNull().default(3),
    nextRetryAt: timestamp('next_retry_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    startedAt: timestamp('started_at', { mode: 'date' }),
    completedAt: timestamp('completed_at', { mode: 'date' }),
  },
  t => [
    index('mafengwo_crawl_status_idx').on(t.status),
    index('mafengwo_crawl_type_idx').on(t.taskType),
    index('mafengwo_crawl_priority_idx').on(t.priority),
    index('mafengwo_crawl_status_priority_idx').on(t.status, t.priority),
    index('mafengwo_crawl_next_retry_idx').on(t.status, t.nextRetryAt),
  ],
);
