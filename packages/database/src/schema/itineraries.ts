/**
 * Itineraries schema - itineraries, days, items, collaborators, comments, likes, etc.
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
import { createdAt, fk, id, updatedAt } from './columns.js';

// ── Itineraries ────────────────────────────────────────
export const itineraries = mysqlTable(
  'itineraries',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    cityId: fk('city_id').notNull(),
    startDate: varchar('start_date', { length: 10 }).notNull(),
    endDate: varchar('end_date', { length: 10 }).notNull(),
    visibility: varchar('visibility', { length: 20 }).notNull().default('private'),
    coverImageUrl: text('cover_image_url'),
    copiedFromId: fk('copied_from_id'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('itineraries_user_idx').on(t.userId),
    index('itineraries_visibility_idx').on(t.visibility),
    index('itineraries_city_idx').on(t.cityId),
    index('itineraries_visibility_city_idx').on(t.visibility, t.cityId),
    index('itineraries_user_visibility_idx').on(t.userId, t.visibility),
  ],
);

// ── Itinerary Days ─────────────────────────────────────
export const itineraryDays = mysqlTable(
  'itinerary_days',
  {
    id: id(),
    itineraryId: fk('itinerary_id').notNull(),
    dayNumber: int('day_number').notNull(),
    date: varchar('date', { length: 10 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [index('itinerary_days_itinerary_idx').on(t.itineraryId)],
);

// ── Itinerary Items ────────────────────────────────────
export const itineraryItems = mysqlTable(
  'itinerary_items',
  {
    id: id(),
    dayId: fk('day_id').notNull(),
    poiId: fk('poi_id').notNull(),
    orderIndex: int('order_index').notNull(),
    startTime: varchar('start_time', { length: 5 }),
    endTime: varchar('end_time', { length: 5 }),
    transportMode: varchar('transport_mode', { length: 20 }).notNull(),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [index('itinerary_items_day_idx').on(t.dayId)],
);

// ── Itinerary Collaborators ────────────────────────────
export const itineraryCollaborators = mysqlTable(
  'itinerary_collaborators',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    itineraryId: fk('itinerary_id').notNull(),
    role: varchar('role', { length: 20 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('itinerary_collabs_itinerary_idx').on(t.itineraryId),
    index('itinerary_collabs_user_idx').on(t.userId),
    index('itinerary_collabs_pair_idx').on(t.itineraryId, t.userId),
  ],
);

// ── Collaborator Presence ──────────────────────────────
export const collaboratorPresence = mysqlTable(
  'collaborator_presence',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    itineraryId: fk('itinerary_id').notNull(),
    displayName: varchar('display_name', { length: 255 }),
    avatarUrl: text('avatar_url'),
    color: varchar('color', { length: 20 }).notNull(),
    lastActiveAt: timestamp('last_active_at', { mode: 'date' }).notNull(),
    isOnline: boolean('is_online').notNull().default(false),
    currentDayId: fk('current_day_id'),
    currentItemId: fk('current_item_id'),
    cursorPosition: json('cursor_position'),
    selectedElements: json('selected_elements'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('collab_presence_itinerary_idx').on(t.itineraryId),
    index('collab_presence_user_idx').on(t.userId),
    index('collab_presence_pair_idx').on(t.itineraryId, t.userId),
    index('collab_presence_online_idx').on(t.itineraryId, t.isOnline),
  ],
);

// ── Edit Operations ────────────────────────────────────
export const editOperations = mysqlTable(
  'edit_operations',
  {
    id: id(),
    itineraryId: fk('itinerary_id').notNull(),
    userId: fk('user_id').notNull(),
    operationType: varchar('operation_type', { length: 20 }).notNull(),
    targetType: varchar('target_type', { length: 20 }).notNull(),
    targetId: fk('target_id').notNull(),
    changes: json('changes'),
    timestamp: timestamp('timestamp', { mode: 'date' }).notNull(),
    version: int('version').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    conflictResolution: json('conflict_resolution'),
    createdAt: createdAt(),
  },
  t => [
    index('edit_ops_itinerary_idx').on(t.itineraryId),
    index('edit_ops_itinerary_ts_idx').on(t.itineraryId, t.timestamp),
    index('edit_ops_itinerary_status_idx').on(t.itineraryId, t.status),
  ],
);

// ── Itinerary Copy History ─────────────────────────────
export const itineraryCopyHistory = mysqlTable(
  'itinerary_copy_history',
  {
    id: id(),
    originalItineraryId: fk('original_itinerary_id').notNull(),
    copiedItineraryId: fk('copied_itinerary_id').notNull(),
    userId: fk('user_id').notNull(),
    copyType: varchar('copy_type', { length: 20 }).notNull(),
    selectedDays: json('selected_days'),
    originalStartDate: varchar('original_start_date', { length: 10 }).notNull(),
    newStartDate: varchar('new_start_date', { length: 10 }).notNull(),
    dateOffset: int('date_offset').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('copy_hist_user_idx').on(t.userId),
    index('copy_hist_original_idx').on(t.originalItineraryId),
    index('copy_hist_copied_idx').on(t.copiedItineraryId),
    index('copy_hist_user_created_idx').on(t.userId, t.createdAt),
  ],
);

// ── Itinerary Comments ─────────────────────────────────
export const itineraryComments = mysqlTable(
  'itinerary_comments',
  {
    id: id(),
    itineraryId: fk('itinerary_id').notNull(),
    userId: fk('user_id').notNull(),
    parentId: fk('parent_id'),
    content: text('content').notNull(),
    likesCount: int('likes_count').notNull().default(0),
    repliesCount: int('replies_count').notNull().default(0),
    isEdited: boolean('is_edited').notNull().default(false),
    isDeleted: boolean('is_deleted').notNull().default(false),
    reportCount: int('report_count').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('itin_comments_itinerary_idx').on(t.itineraryId),
    index('itin_comments_user_idx').on(t.userId),
    index('itin_comments_parent_idx').on(t.parentId),
    index('itin_comments_itinerary_created_idx').on(t.itineraryId, t.createdAt),
  ],
);

// ── Comment Likes ──────────────────────────────────────
export const commentLikes = mysqlTable(
  'comment_likes',
  {
    id: id(),
    commentId: fk('comment_id').notNull(),
    userId: fk('user_id').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('comment_likes_comment_idx').on(t.commentId),
    index('comment_likes_user_idx').on(t.userId),
    index('comment_likes_pair_idx').on(t.commentId, t.userId),
  ],
);

// ── Comment Reports ────────────────────────────────────
export const commentReports = mysqlTable(
  'comment_reports',
  {
    id: id(),
    commentId: fk('comment_id').notNull(),
    userId: fk('user_id').notNull(),
    reason: varchar('reason', { length: 50 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: createdAt(),
    reviewedAt: timestamp('reviewed_at', { mode: 'date' }),
    reviewedBy: fk('reviewed_by'),
  },
  t => [
    index('comment_reports_comment_idx').on(t.commentId),
    index('comment_reports_user_idx').on(t.userId),
    index('comment_reports_status_idx').on(t.status),
    index('comment_reports_pair_idx').on(t.commentId, t.userId),
  ],
);

// ── Itinerary Likes ────────────────────────────────────
export const itineraryLikes = mysqlTable(
  'itinerary_likes',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    itineraryId: fk('itinerary_id').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('itin_likes_user_idx').on(t.userId),
    index('itin_likes_itinerary_idx').on(t.itineraryId),
    index('itin_likes_pair_idx').on(t.userId, t.itineraryId),
  ],
);

// ── Favorite Collections ───────────────────────────────
export const favoriteCollections = mysqlTable(
  'favorite_collections',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    coverImageUrl: text('cover_image_url'),
    isDefault: boolean('is_default').notNull().default(false),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('fav_collections_user_idx').on(t.userId),
    index('fav_collections_user_default_idx').on(t.userId, t.isDefault),
    index('fav_collections_user_sort_idx').on(t.userId, t.sortOrder),
  ],
);

// ── Itinerary Favorites ────────────────────────────────
export const itineraryFavorites = mysqlTable(
  'itinerary_favorites',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    itineraryId: fk('itinerary_id').notNull(),
    collectionId: fk('collection_id'),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  t => [
    index('itin_favs_user_idx').on(t.userId),
    index('itin_favs_itinerary_idx').on(t.itineraryId),
    index('itin_favs_collection_idx').on(t.collectionId),
    index('itin_favs_pair_idx').on(t.userId, t.itineraryId),
    index('itin_favs_user_collection_idx').on(t.userId, t.collectionId),
  ],
);

// ── Reminders ──────────────────────────────────────────
export const reminders = mysqlTable(
  'reminders',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    itineraryId: fk('itinerary_id').notNull(),
    itemId: fk('item_id'),
    reminderTime: timestamp('reminder_time', { mode: 'date' }).notNull(),
    message: text('message').notNull(),
    isTriggered: boolean('is_triggered').notNull().default(false),
    triggeredAt: timestamp('triggered_at', { mode: 'date' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('reminders_user_idx').on(t.userId),
    index('reminders_itinerary_idx').on(t.itineraryId),
    index('reminders_time_idx').on(t.reminderTime),
  ],
);

// ── Itinerary Drafts ───────────────────────────────────
export const itineraryDrafts = mysqlTable(
  'itinerary_drafts',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    itineraryId: fk('itinerary_id'),
    title: varchar('title', { length: 500 }).notNull(),
    cityId: fk('city_id'),
    startDate: varchar('start_date', { length: 10 }),
    endDate: varchar('end_date', { length: 10 }),
    visibility: varchar('visibility', { length: 20 }),
    coverImageUrl: text('cover_image_url'),
    days: json('days'),
    lastModifiedAt: timestamp('last_modified_at', { mode: 'date' }).notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    deviceId: varchar('device_id', { length: 255 }),
    syncVersion: int('sync_version').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('itin_drafts_user_idx').on(t.userId),
    index('itin_drafts_user_itin_idx').on(t.userId, t.itineraryId),
    index('itin_drafts_expires_idx').on(t.expiresAt),
    index('itin_drafts_user_modified_idx').on(t.userId, t.lastModifiedAt),
  ],
);

// ── Itinerary Versions ─────────────────────────────────
export const itineraryVersions = mysqlTable(
  'itinerary_versions',
  {
    id: id(),
    itineraryId: fk('itinerary_id').notNull(),
    userId: fk('user_id').notNull(),
    versionNumber: int('version_number').notNull(),
    versionNote: text('version_note'),
    snapshot: json('snapshot').notNull(),
    changesSummary: text('changes_summary'),
    changesCount: json('changes_count'),
    createdAt: createdAt(),
  },
  t => [
    index('itin_versions_itinerary_idx').on(t.itineraryId),
    index('itin_versions_itin_ver_idx').on(t.itineraryId, t.versionNumber),
    index('itin_versions_user_idx').on(t.userId),
    index('itin_versions_created_idx').on(t.createdAt),
  ],
);

// ── Itinerary Templates ────────────────────────────────
export const itineraryTemplates = mysqlTable(
  'itinerary_templates',
  {
    id: id(),
    creatorId: fk('creator_id').notNull(),
    categoryId: fk('category_id'),
    templateType: varchar('template_type', { length: 30 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    coverImageUrl: text('cover_image_url'),
    cityId: fk('city_id'),
    days: json('days'),
    tags: json('tags'),
    visibility: varchar('visibility', { length: 20 }).notNull().default('public'),
    isPublished: boolean('is_published').notNull().default(false),
    useCount: int('use_count').notNull().default(0),
    likeCount: int('like_count').notNull().default(0),
    ratingAvg: double('rating_avg'),
    ratingCount: int('rating_count').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('itin_templates_category_idx').on(t.categoryId),
    index('itin_templates_type_idx').on(t.templateType),
    index('itin_templates_creator_idx').on(t.creatorId),
    index('itin_templates_visibility_idx').on(t.visibility),
    index('itin_templates_published_idx').on(t.isPublished),
    index('itin_templates_use_count_idx').on(t.useCount),
    index('itin_templates_like_count_idx').on(t.likeCount),
    index('itin_templates_created_idx').on(t.createdAt),
  ],
);

// ── Template Likes ─────────────────────────────────────
export const templateLikes = mysqlTable(
  'template_likes',
  {
    id: id(),
    templateId: fk('template_id').notNull(),
    userId: fk('user_id').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('template_likes_template_idx').on(t.templateId),
    index('template_likes_user_idx').on(t.userId),
    index('template_likes_pair_idx').on(t.templateId, t.userId),
  ],
);

// ── Template Saves ─────────────────────────────────────
export const templateSaves = mysqlTable(
  'template_saves',
  {
    id: id(),
    templateId: fk('template_id').notNull(),
    userId: fk('user_id').notNull(),
    createdAt: createdAt(),
  },
  t => [
    index('template_saves_template_idx').on(t.templateId),
    index('template_saves_user_idx').on(t.userId),
    index('template_saves_pair_idx').on(t.templateId, t.userId),
  ],
);

// ── Itinerary Budgets ──────────────────────────────────
export const itineraryBudgets = mysqlTable(
  'itinerary_budgets',
  {
    id: id(),
    itineraryId: fk('itinerary_id').notNull(),
    userId: fk('user_id').notNull(),
    totalBudget: double('total_budget'),
    currency: varchar('currency', { length: 10 }).notNull().default('CNY'),
    categoryBudgets: json('category_budgets'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('itin_budgets_itinerary_idx').on(t.itineraryId),
    index('itin_budgets_user_idx').on(t.userId),
  ],
);

// ── Expenses ───────────────────────────────────────────
export const expenses = mysqlTable(
  'expenses',
  {
    id: id(),
    itineraryId: fk('itinerary_id').notNull(),
    userId: fk('user_id').notNull(),
    categoryId: fk('category_id'),
    amount: double('amount').notNull(),
    currency: varchar('currency', { length: 10 }).notNull().default('CNY'),
    description: text('description'),
    date: varchar('date', { length: 10 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('expenses_itinerary_idx').on(t.itineraryId),
    index('expenses_user_idx').on(t.userId),
    index('expenses_category_idx').on(t.categoryId),
    index('expenses_itin_category_idx').on(t.itineraryId, t.categoryId),
    index('expenses_date_idx').on(t.date),
  ],
);

// ── Calendar Syncs ─────────────────────────────────────
export const calendarSyncs = mysqlTable(
  'calendar_syncs',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    itineraryId: fk('itinerary_id'),
    savedItineraryLocalId: varchar('saved_itinerary_local_id', { length: 255 }),
    calendarProvider: varchar('calendar_provider', { length: 20 }).notNull(),
    calendarId: varchar('calendar_id', { length: 255 }),
    calendarEventIds: json('calendar_event_ids'),
    syncStatus: varchar('sync_status', { length: 20 }).notNull().default('pending'),
    lastSyncedAt: timestamp('last_synced_at', { mode: 'date' }),
    syncError: text('sync_error'),
    enableReminders: boolean('enable_reminders').notNull().default(true),
    reminderMinutesBefore: int('reminder_minutes_before'),
    syncAllDays: boolean('sync_all_days').notNull().default(true),
    syncedDayNumbers: json('synced_day_numbers'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('cal_syncs_user_idx').on(t.userId),
    index('cal_syncs_itinerary_idx').on(t.itineraryId),
    index('cal_syncs_local_itin_idx').on(t.savedItineraryLocalId),
    index('cal_syncs_user_itin_idx').on(t.userId, t.itineraryId),
    index('cal_syncs_status_idx').on(t.syncStatus),
  ],
);
