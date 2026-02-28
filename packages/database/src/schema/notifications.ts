/**
 * Notifications schema - notifications, push tokens, settings, scheduled notifications.
 */
import {
  boolean,
  index,
  json,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns.js';

// ── Notifications ──────────────────────────────────────
export const notifications = mysqlTable(
  'notifications',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 500 }),
    body: text('body'),
    data: json('data'),
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at', { mode: 'date' }),
    isPushPending: boolean('is_push_pending').notNull().default(false),
    pushSentAt: timestamp('push_sent_at', { mode: 'date' }),
    createdAt: createdAt(),
  },
  t => [
    index('notifications_user_idx').on(t.userId),
    index('notifications_user_read_idx').on(t.userId, t.isRead),
    index('notifications_user_created_idx').on(t.userId, t.createdAt),
    index('notifications_type_idx').on(t.type),
    index('notifications_push_pending_idx').on(t.isPushPending),
  ],
);

// ── Push Tokens ────────────────────────────────────────
export const pushTokens = mysqlTable(
  'push_tokens',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    platform: varchar('platform', { length: 20 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('push_tokens_user_idx').on(t.userId),
    index('push_tokens_token_idx').on(t.token),
    index('push_tokens_user_active_idx').on(t.userId, t.isActive),
  ],
);

// ── Notification Settings ──────────────────────────────
export const notificationSettings = mysqlTable(
  'notification_settings',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    pushEnabled: boolean('push_enabled').notNull().default(true),
    emailEnabled: boolean('email_enabled').notNull().default(false),
    quietHoursStart: varchar('quiet_hours_start', { length: 5 }),
    quietHoursEnd: varchar('quiet_hours_end', { length: 5 }),
    categories: json('categories'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [index('notification_settings_user_idx').on(t.userId)],
);

// ── Scheduled Notifications ────────────────────────────
export const scheduledNotifications = mysqlTable(
  'scheduled_notifications',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 500 }),
    body: text('body'),
    data: json('data'),
    scheduledFor: timestamp('scheduled_for', { mode: 'date' }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    sentAt: timestamp('sent_at', { mode: 'date' }),
    createdAt: createdAt(),
  },
  t => [
    index('sched_notif_user_idx').on(t.userId),
    index('sched_notif_status_idx').on(t.status),
    index('sched_notif_scheduled_idx').on(t.scheduledFor),
    index('sched_notif_status_sched_idx').on(t.status, t.scheduledFor),
  ],
);
