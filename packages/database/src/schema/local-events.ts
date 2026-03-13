/**
 * Local Events schema - events, favorites, reminders, reviews, review votes.
 */
import { boolean, double, index, json, mysqlTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns';

export const localEvents = mysqlTable('local_events', {
  id: id(),
  cityId: fk('city_id').notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  eventType: varchar('event_type', { length: 30 }),
  venue: varchar('venue', { length: 500 }),
  address: text('address'),
  latitude: double('latitude'),
  longitude: double('longitude'),
  startDate: timestamp('start_date', { mode: 'date' }).notNull(),
  endDate: timestamp('end_date', { mode: 'date' }),
  startTime: varchar('start_time', { length: 5 }),
  endTime: varchar('end_time', { length: 5 }),
  price: double('price'),
  currency: varchar('currency', { length: 10 }),
  imageUrl: text('image_url'),
  sourceUrl: text('source_url'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  isFeatured: boolean('is_featured').notNull().default(false),
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurrenceRule: json('recurrence_rule'),
  tags: json('tags'),
  metadata: json('metadata'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [
  index('local_events_city_idx').on(t.cityId),
  index('local_events_city_type_idx').on(t.cityId, t.eventType),
  index('local_events_city_status_idx').on(t.cityId, t.status),
  index('local_events_city_dates_idx').on(t.cityId, t.startDate),
  index('local_events_type_idx').on(t.eventType),
  index('local_events_status_idx').on(t.status),
  index('local_events_start_idx').on(t.startDate),
  index('local_events_featured_idx').on(t.isFeatured),
  index('local_events_recurring_idx').on(t.isRecurring),
]);

export const eventFavorites = mysqlTable('event_favorites', {
  id: id(),
  userId: fk('user_id').notNull(),
  eventId: fk('event_id').notNull(),
  createdAt: createdAt(),
}, t => [
  index('event_favs_user_idx').on(t.userId),
  index('event_favs_event_idx').on(t.eventId),
  uniqueIndex('event_favs_uniq').on(t.userId, t.eventId),
  index('event_favs_user_created_idx').on(t.userId, t.createdAt),
]);

export const eventReminders = mysqlTable('event_reminders', {
  id: id(),
  userId: fk('user_id').notNull(),
  eventId: fk('event_id').notNull(),
  reminderTime: timestamp('reminder_time', { mode: 'date' }).notNull(),
  isTriggered: boolean('is_triggered').notNull().default(false),
  triggeredAt: timestamp('triggered_at', { mode: 'date' }),
  createdAt: createdAt(),
}, t => [
  index('event_reminders_user_idx').on(t.userId),
  index('event_reminders_event_idx').on(t.eventId),
  index('event_reminders_pair_idx').on(t.userId, t.eventId),
  index('event_reminders_time_idx').on(t.reminderTime),
  index('event_reminders_triggered_idx').on(t.isTriggered),
  index('event_reminders_user_triggered_idx').on(t.userId, t.isTriggered),
]);

export const eventReviews = mysqlTable('event_reviews', {
  id: id(),
  eventId: fk('event_id').notNull(),
  userId: fk('user_id').notNull(),
  rating: double('rating').notNull(),
  title: varchar('title', { length: 500 }),
  content: text('content'),
  imageUrls: json('image_urls'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, t => [
  index('event_reviews_event_idx').on(t.eventId),
  index('event_reviews_user_idx').on(t.userId),
  index('event_reviews_pair_idx').on(t.eventId, t.userId),
  index('event_reviews_rating_idx').on(t.rating),
  index('event_reviews_event_rating_idx').on(t.eventId, t.rating),
  index('event_reviews_status_idx').on(t.status),
]);

export const eventReviewVotes = mysqlTable('event_review_votes', {
  id: id(),
  reviewId: fk('review_id').notNull(),
  userId: fk('user_id').notNull(),
  isHelpful: boolean('is_helpful').notNull(),
  createdAt: createdAt(),
}, t => [
  index('event_rv_review_idx').on(t.reviewId),
  index('event_rv_user_idx').on(t.userId),
  uniqueIndex('event_rv_uniq').on(t.reviewId, t.userId),
]);
