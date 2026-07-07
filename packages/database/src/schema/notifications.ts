/**
 * Notifications schema - notifications, push tokens, settings, scheduled notifications.
 */
import {
  index,
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import { createdAt, fk, id, updatedAt } from './columns';

// ── Notifications ──────────────────────────────────────
export const notifications = sqliteTable(
  'notifications',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    type: text('type').notNull(),
    title: text('title'),
    body: text('body'),
    data: text('data', { mode: 'json' }),
    isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
    readAt: integer('read_at', { mode: 'timestamp' }),
    isPushPending: integer('is_push_pending', { mode: 'boolean' }).notNull().default(false),
    pushSentAt: integer('push_sent_at', { mode: 'timestamp' }),
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
export const pushTokens = sqliteTable(
  'push_tokens',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    token: text('token').notNull(),
    platform: text('platform'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
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
export const notificationSettings = sqliteTable(
  'notification_settings',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    pushEnabled: integer('push_enabled', { mode: 'boolean' }).notNull().default(true),
    emailEnabled: integer('email_enabled', { mode: 'boolean' }).notNull().default(false),
    quietHoursStart: text('quiet_hours_start'),
    quietHoursEnd: text('quiet_hours_end'),
    categories: text('categories', { mode: 'json' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [index('notification_settings_user_idx').on(t.userId)],
);

// ── Scheduled Notifications ────────────────────────────
export const scheduledNotifications = sqliteTable(
  'scheduled_notifications',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    type: text('type').notNull(),
    title: text('title'),
    body: text('body'),
    data: text('data', { mode: 'json' }),
    scheduledFor: integer('scheduled_for', { mode: 'timestamp' }).notNull(),
    status: text('status').notNull().default('pending'),
    sentAt: integer('sent_at', { mode: 'timestamp' }),
    createdAt: createdAt(),
  },
  t => [
    index('sched_notif_user_idx').on(t.userId),
    index('sched_notif_status_idx').on(t.status),
    index('sched_notif_scheduled_idx').on(t.scheduledFor),
    index('sched_notif_status_sched_idx').on(t.status, t.scheduledFor),
  ],
);
