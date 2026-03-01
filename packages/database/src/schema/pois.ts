/**
 * POIs schema - points of interest, reviews, tickets, photos, Q&A, food, etc.
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
    businessHours: json('business_hours'),
    bestVisitTime: json('best_visit_time'),
    phone: varchar('phone', { length: 50 }),
    imageUrls: json('image_urls'),
    source: varchar('source', { length: 100 }).notNull(),
    isHiddenGem: boolean('is_hidden_gem'),
    hiddenGemScore: double('hidden_gem_score'),
    hiddenGemRating: double('hidden_gem_rating'),
    hiddenGemRatingCount: int('hidden_gem_rating_count'),
    localRecommendation: json('local_recommendation'),
    popularityLevel: varchar('popularity_level', { length: 20 }),
    cuisineType: varchar('cuisine_type', { length: 100 }),
    isLocalFavorite: boolean('is_local_favorite'),
    signatureDishes: json('signature_dishes'),
    dietaryOptions: json('dietary_options'),
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

// ── User Submitted POIs ────────────────────────────────
export const userSubmittedPois = mysqlTable(
  'user_submitted_pois',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    name: varchar('name', { length: 500 }).notNull(),
    nameEn: varchar('name_en', { length: 500 }),
    category: varchar('category', { length: 50 }).notNull(),
    cityId: fk('city_id').notNull(),
    address: text('address'),
    latitude: double('latitude').notNull(),
    longitude: double('longitude').notNull(),
    description: text('description').notNull(),
    localTips: text('local_tips'),
    bestTimeToVisit: varchar('best_time_to_visit', { length: 255 }),
    priceRange: varchar('price_range', { length: 100 }),
    imageUrls: json('image_urls'),
    howDiscovered: text('how_discovered'),
    localSecrets: json('local_secrets'),
    avoidTimes: varchar('avoid_times', { length: 255 }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    moderatorNotes: text('moderator_notes'),
    reviewedBy: fk('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { mode: 'date' }),
    mergedPoiId: fk('merged_poi_id'),
    upvotes: int('upvotes').notNull().default(0),
    downvotes: int('downvotes').notNull().default(0),
    viewCount: int('view_count').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('user_pois_user_idx').on(t.userId),
    index('user_pois_city_idx').on(t.cityId),
    index('user_pois_status_idx').on(t.status),
    index('user_pois_city_status_idx').on(t.cityId, t.status),
    index('user_pois_category_idx').on(t.category),
    index('user_pois_created_idx').on(t.createdAt),
  ],
);

// ── User Submitted POI Votes ───────────────────────────
export const userSubmittedPoiVotes = mysqlTable(
  'user_submitted_poi_votes',
  {
    id: id(),
    poiId: fk('poi_id').notNull(),
    userId: fk('user_id').notNull(),
    voteType: varchar('vote_type', { length: 10 }).notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('user_poi_votes_poi_idx').on(t.poiId),
    index('user_poi_votes_user_idx').on(t.userId),
    index('user_poi_votes_pair_idx').on(t.poiId, t.userId),
  ],
);

// ── Hidden Gem Ratings ─────────────────────────────────
export const hiddenGemRatings = mysqlTable(
  'hidden_gem_ratings',
  {
    id: id(),
    poiId: fk('poi_id').notNull(),
    userId: fk('user_id').notNull(),
    rating: double('rating').notNull(),
    review: text('review'),
    visitDate: varchar('visit_date', { length: 10 }),
    wouldRecommend: boolean('would_recommend').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('gem_ratings_poi_idx').on(t.poiId),
    index('gem_ratings_user_idx').on(t.userId),
    index('gem_ratings_pair_idx').on(t.poiId, t.userId),
    index('gem_ratings_rating_idx').on(t.rating),
  ],
);

// ── POI Holiday Hours ──────────────────────────────────
export const poiHolidayHours = mysqlTable(
  'poi_holiday_hours',
  {
    id: id(),
    poiId: fk('poi_id').notNull(),
    holidayName: varchar('holiday_name', { length: 255 }).notNull(),
    holidayNameEn: varchar('holiday_name_en', { length: 255 }),
    startDate: varchar('start_date', { length: 10 }).notNull(),
    endDate: varchar('end_date', { length: 10 }).notNull(),
    isClosed: boolean('is_closed').notNull(),
    hours: json('hours'),
    notes: text('notes'),
    isRecurring: boolean('is_recurring').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('poi_holiday_poi_idx').on(t.poiId),
    index('poi_holiday_poi_dates_idx').on(t.poiId, t.startDate, t.endDate),
    index('poi_holiday_dates_idx').on(t.startDate, t.endDate),
  ],
);

// ── POI Business Hours Reminders ───────────────────────
export const poiBusinessHoursReminders = mysqlTable(
  'poi_business_hours_reminders',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    poiId: fk('poi_id').notNull(),
    itineraryItemId: fk('itinerary_item_id'),
    reminderType: varchar('reminder_type', { length: 20 }).notNull(),
    minutesBefore: int('minutes_before').notNull(),
    scheduledTime: timestamp('scheduled_time', { mode: 'date' }).notNull(),
    isTriggered: boolean('is_triggered').notNull().default(false),
    triggeredAt: timestamp('triggered_at', { mode: 'date' }),
    createdAt: createdAt(),
  },
  t => [
    index('poi_bh_reminders_user_idx').on(t.userId),
    index('poi_bh_reminders_poi_idx').on(t.poiId),
    index('poi_bh_reminders_user_poi_idx').on(t.userId, t.poiId),
    index('poi_bh_reminders_sched_idx').on(t.scheduledTime),
    index('poi_bh_reminders_item_idx').on(t.itineraryItemId),
  ],
);

// ── POI Tickets ────────────────────────────────────────
export const poiTickets = mysqlTable(
  'poi_tickets',
  {
    id: id(),
    poiId: fk('poi_id').notNull(),
    ticketName: varchar('ticket_name', { length: 255 }).notNull(),
    ticketType: varchar('ticket_type', { length: 20 }).notNull(),
    price: double('price').notNull(),
    originalPrice: double('original_price'),
    currency: varchar('currency', { length: 10 }),
    discountInfo: text('discount_info'),
    discountPercentage: double('discount_percentage'),
    eligibilityRequirements: text('eligibility_requirements'),
    ageRange: json('age_range'),
    validFrom: timestamp('valid_from', { mode: 'date' }),
    validUntil: timestamp('valid_until', { mode: 'date' }),
    validDays: int('valid_days'),
    purchaseUrl: text('purchase_url'),
    purchasePlatform: varchar('purchase_platform', { length: 100 }),
    requiresReservation: boolean('requires_reservation').notNull(),
    reservationUrl: text('reservation_url'),
    reservationTips: text('reservation_tips'),
    advanceBookingDays: int('advance_booking_days'),
    usageInstructions: text('usage_instructions'),
    includedServices: json('included_services'),
    excludedServices: json('excluded_services'),
    isActive: boolean('is_active').notNull(),
    stockStatus: varchar('stock_status', { length: 20 }),
    sortOrder: int('sort_order').notNull().default(0),
    isRecommended: boolean('is_recommended'),
    source: varchar('source', { length: 100 }),
    lastSyncedAt: timestamp('last_synced_at', { mode: 'date' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('poi_tickets_poi_idx').on(t.poiId),
    index('poi_tickets_poi_type_idx').on(t.poiId, t.ticketType),
    index('poi_tickets_active_idx').on(t.isActive),
    index('poi_tickets_poi_active_idx').on(t.poiId, t.isActive),
  ],
);

// ── Ticket Reminders ───────────────────────────────────
export const ticketReminders = mysqlTable(
  'ticket_reminders',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    poiId: fk('poi_id').notNull(),
    ticketId: fk('ticket_id'),
    itineraryId: fk('itinerary_id'),
    reminderType: varchar('reminder_type', { length: 30 }).notNull(),
    reminderTime: timestamp('reminder_time', { mode: 'date' }).notNull(),
    message: text('message'),
    isTriggered: boolean('is_triggered').notNull().default(false),
    triggeredAt: timestamp('triggered_at', { mode: 'date' }),
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at', { mode: 'date' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('ticket_reminders_user_idx').on(t.userId),
    index('ticket_reminders_poi_idx').on(t.poiId),
    index('ticket_reminders_user_poi_idx').on(t.userId, t.poiId),
    index('ticket_reminders_time_idx').on(t.reminderTime),
    index('ticket_reminders_triggered_idx').on(t.isTriggered),
  ],
);

// ── POI Reviews ────────────────────────────────────────
export const poiReviews = mysqlTable(
  'poi_reviews',
  {
    id: id(),
    poiId: fk('poi_id').notNull(),
    sourceId: varchar('source_id', { length: 255 }),
    authorName: varchar('author_name', { length: 255 }),
    content: text('content').notNull(),
    rating: double('rating'),
    visitDate: varchar('visit_date', { length: 10 }),
    sentiment: varchar('sentiment', { length: 20 }),
    crawledAt: timestamp('crawled_at', { mode: 'date' }).notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('poi_reviews_poi_idx').on(t.poiId),
    index('poi_reviews_rating_idx').on(t.rating),
  ],
);

// ── POI Source Mappings ────────────────────────────────
export const poiSourceMappings = mysqlTable(
  'poi_source_mappings',
  {
    id: id(),
    normalizedPoiId: fk('normalized_poi_id').notNull(),
    sourcePlatform: varchar('source_platform', { length: 100 }).notNull(),
    sourceExternalId: varchar('source_external_id', { length: 255 }).notNull(),
    rawRecordId: fk('raw_record_id'),
    createdAt: createdAt(),
  },
  t => [
    index('poi_src_map_norm_idx').on(t.normalizedPoiId),
    index('poi_src_map_source_idx').on(t.sourcePlatform, t.sourceExternalId),
  ],
);

// ── Normalized POIs ────────────────────────────────────
export const normalizedPois = mysqlTable(
  'normalized_pois',
  {
    id: id(),
    name: varchar('name', { length: 500 }).notNull(),
    nameEn: varchar('name_en', { length: 500 }),
    category: varchar('category', { length: 50 }).notNull(),
    latitude: double('latitude').notNull(),
    longitude: double('longitude').notNull(),
    address: text('address'),
    normalizedData: json('normalized_data'),
    confidence: double('confidence').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('norm_pois_category_idx').on(t.category),
    index('norm_pois_confidence_idx').on(t.confidence),
    index('norm_pois_cat_conf_idx').on(t.category, t.confidence),
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
    tags: json('tags'),
    imageUrls: json('image_urls'),
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
    imageUrls: json('image_urls'),
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

// ── Answer Votes ───────────────────────────────────────
export const answerVotes = mysqlTable(
  'answer_votes',
  {
    id: id(),
    answerId: fk('answer_id').notNull(),
    userId: fk('user_id').notNull(),
    voteType: varchar('vote_type', { length: 10 }).notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('answer_votes_answer_idx').on(t.answerId),
    index('answer_votes_user_idx').on(t.userId),
    index('answer_votes_pair_idx').on(t.answerId, t.userId),
  ],
);

// ── Answer Comments ────────────────────────────────────
export const answerComments = mysqlTable(
  'answer_comments',
  {
    id: id(),
    answerId: fk('answer_id').notNull(),
    userId: fk('user_id').notNull(),
    content: text('content').notNull(),
    parentId: fk('parent_id'),
    likesCount: int('likes_count').notNull().default(0),
    isEdited: boolean('is_edited').notNull().default(false),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('answer_comments_answer_idx').on(t.answerId),
    index('answer_comments_user_idx').on(t.userId),
    index('answer_comments_parent_idx').on(t.parentId),
    index('answer_comments_answer_created_idx').on(t.answerId, t.createdAt),
  ],
);

// ── Question Followers ─────────────────────────────────
export const questionFollowers = mysqlTable(
  'question_followers',
  {
    id: id(),
    questionId: fk('question_id').notNull(),
    userId: fk('user_id').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('q_followers_question_idx').on(t.questionId),
    index('q_followers_user_idx').on(t.userId),
    index('q_followers_pair_idx').on(t.questionId, t.userId),
  ],
);

// ── Question Reports ───────────────────────────────────
export const questionReports = mysqlTable(
  'question_reports',
  {
    id: id(),
    questionId: fk('question_id').notNull(),
    userId: fk('user_id').notNull(),
    reason: varchar('reason', { length: 50 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: createdAt(),
  },
  t => [
    index('q_reports_question_idx').on(t.questionId),
    index('q_reports_user_idx').on(t.userId),
    index('q_reports_status_idx').on(t.status),
    index('q_reports_pair_idx').on(t.questionId, t.userId),
  ],
);

// ── Answer Reports ─────────────────────────────────────
export const answerReports = mysqlTable(
  'answer_reports',
  {
    id: id(),
    answerId: fk('answer_id').notNull(),
    userId: fk('user_id').notNull(),
    reason: varchar('reason', { length: 50 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: createdAt(),
  },
  t => [
    index('a_reports_answer_idx').on(t.answerId),
    index('a_reports_user_idx').on(t.userId),
    index('a_reports_status_idx').on(t.status),
    index('a_reports_pair_idx').on(t.answerId, t.userId),
  ],
);

// ── POI Question Votes ─────────────────────────────────
export const poiQuestionVotes = mysqlTable(
  'poi_question_votes',
  {
    id: id(),
    questionId: fk('question_id').notNull(),
    userId: fk('user_id').notNull(),
    voteType: varchar('vote_type', { length: 10 }).notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('poi_q_votes_question_idx').on(t.questionId),
    index('poi_q_votes_user_idx').on(t.userId),
    index('poi_q_votes_pair_idx').on(t.questionId, t.userId),
  ],
);

// ── POI Answer Votes ───────────────────────────────────
export const poiAnswerVotes = mysqlTable(
  'poi_answer_votes',
  {
    id: id(),
    answerId: fk('answer_id').notNull(),
    userId: fk('user_id').notNull(),
    voteType: varchar('vote_type', { length: 10 }).notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('poi_a_votes_answer_idx').on(t.answerId),
    index('poi_a_votes_user_idx').on(t.userId),
    index('poi_a_votes_pair_idx').on(t.answerId, t.userId),
  ],
);

// ── POI QA Reports ─────────────────────────────────────
export const poiQaReports = mysqlTable(
  'poi_qa_reports',
  {
    id: id(),
    targetType: varchar('target_type', { length: 20 }).notNull(),
    targetId: fk('target_id').notNull(),
    userId: fk('user_id').notNull(),
    reason: varchar('reason', { length: 50 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: createdAt(),
  },
  t => [
    index('poi_qa_reports_target_idx').on(t.targetType, t.targetId),
    index('poi_qa_reports_user_idx').on(t.userId),
    index('poi_qa_reports_status_idx').on(t.status),
    index('poi_qa_reports_created_idx').on(t.createdAt),
  ],
);

// ── POI Photos ─────────────────────────────────────────
export const poiPhotos = mysqlTable(
  'poi_photos',
  {
    id: id(),
    poiId: fk('poi_id').notNull(),
    userId: fk('user_id').notNull(),
    userName: varchar('user_name', { length: 255 }),
    userAvatarUrl: text('user_avatar_url'),
    imageUrl: text('image_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    caption: text('caption'),
    width: int('width'),
    height: int('height'),
    category: varchar('category', { length: 20 }),
    takenAt: timestamp('taken_at', { mode: 'date' }),
    location: json('location'),
    likesCount: int('likes_count').notNull().default(0),
    viewsCount: int('views_count').notNull().default(0),
    isFeatured: boolean('is_featured').notNull().default(false),
    featuredAt: timestamp('featured_at', { mode: 'date' }),
    featuredBy: fk('featured_by'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    moderatorNotes: text('moderator_notes'),
    reviewedBy: fk('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { mode: 'date' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('poi_photos_poi_idx').on(t.poiId),
    index('poi_photos_user_idx').on(t.userId),
    index('poi_photos_poi_status_idx').on(t.poiId, t.status),
    index('poi_photos_poi_featured_idx').on(t.poiId, t.isFeatured),
    index('poi_photos_poi_category_idx').on(t.poiId, t.category),
    index('poi_photos_status_idx').on(t.status),
    index('poi_photos_featured_idx').on(t.isFeatured),
    index('poi_photos_created_idx').on(t.createdAt),
    index('poi_photos_poi_created_idx').on(t.poiId, t.createdAt),
    index('poi_photos_user_created_idx').on(t.userId, t.createdAt),
  ],
);

// ── POI Photo Likes ────────────────────────────────────
export const poiPhotoLikes = mysqlTable(
  'poi_photo_likes',
  {
    id: id(),
    photoId: fk('photo_id').notNull(),
    userId: fk('user_id').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('poi_photo_likes_photo_idx').on(t.photoId),
    index('poi_photo_likes_user_idx').on(t.userId),
    index('poi_photo_likes_pair_idx').on(t.photoId, t.userId),
  ],
);

// ── Food Reviews ───────────────────────────────────────
export const foodReviews = mysqlTable(
  'food_reviews',
  {
    id: id(),
    restaurantId: fk('restaurant_id').notNull(),
    userId: fk('user_id').notNull(),
    rating: double('rating').notNull(),
    title: varchar('title', { length: 500 }),
    content: text('content'),
    dishesOrdered: json('dishes_ordered'),
    recommendedDishes: json('recommended_dishes'),
    pricePerPerson: double('price_per_person'),
    visitDate: varchar('visit_date', { length: 10 }),
    imageUrls: json('image_urls'),
    tags: json('tags'),
    wouldRecommend: boolean('would_recommend').notNull(),
    helpfulCount: int('helpful_count').default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('food_reviews_restaurant_idx').on(t.restaurantId),
    index('food_reviews_rest_user_idx').on(t.restaurantId, t.userId),
    index('food_reviews_user_idx').on(t.userId),
  ],
);

// ── Food Review Helpful ────────────────────────────────
export const foodReviewHelpful = mysqlTable(
  'food_review_helpful',
  {
    id: id(),
    reviewId: fk('review_id').notNull(),
    userId: fk('user_id').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('food_review_help_review_idx').on(t.reviewId),
    index('food_review_help_pair_idx').on(t.reviewId, t.userId),
    index('food_review_help_user_idx').on(t.userId),
  ],
);

// ── Food Favorites ─────────────────────────────────────
export const foodFavorites = mysqlTable(
  'food_favorites',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    restaurantId: fk('restaurant_id').notNull(),
    collectionId: fk('collection_id'),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  t => [
    index('food_favs_user_idx').on(t.userId),
    index('food_favs_pair_idx').on(t.userId, t.restaurantId),
    index('food_favs_collection_idx').on(t.collectionId),
  ],
);

// ── Food Collections ───────────────────────────────────
export const foodCollections = mysqlTable(
  'food_collections',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    coverImageUrl: text('cover_image_url'),
    isPublic: boolean('is_public').notNull().default(false),
    itemCount: int('item_count').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('food_collections_user_idx').on(t.userId),
    index('food_collections_public_idx').on(t.isPublic),
  ],
);
