/**
 * Sharing schema - share links, events, event logs.
 */
import {
  boolean,
  index,
  int,
  json,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, fk, id } from './columns.js';

export const shareLinks = mysqlTable(
  'share_links',
  {
    id: id(),
    shareCode: varchar('share_code', { length: 50 }).notNull(),
    resourceType: varchar('resource_type', { length: 30 }).notNull(),
    resourceId: fk('resource_id').notNull(),
    ownerId: fk('owner_id').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    expiresAt: timestamp('expires_at', { mode: 'date' }),
    viewCount: int('view_count').notNull().default(0),
    metadata: json('metadata'),
    createdAt: createdAt(),
  },
  t => [
    index('share_links_code_idx').on(t.shareCode),
    index('share_links_resource_idx').on(t.resourceType, t.resourceId),
    index('share_links_owner_idx').on(t.ownerId),
    index('share_links_owner_resource_idx').on(t.ownerId, t.resourceType, t.resourceId),
    index('share_links_active_idx').on(t.isActive),
    index('share_links_expires_idx').on(t.expiresAt),
  ],
);

export const shareEvents = mysqlTable(
  'share_events',
  {
    id: id(),
    resourceType: varchar('resource_type', { length: 30 }).notNull(),
    resourceId: fk('resource_id').notNull(),
    sharerId: fk('sharer_id').notNull(),
    platform: varchar('platform', { length: 30 }),
    eventType: varchar('event_type', { length: 20 }).notNull(),
    shareLinkId: fk('share_link_id'),
    createdAt: createdAt(),
  },
  t => [
    index('share_events_resource_idx').on(t.resourceType, t.resourceId),
    index('share_events_sharer_idx').on(t.sharerId),
    index('share_events_platform_idx').on(t.platform),
    index('share_events_type_idx').on(t.eventType),
    index('share_events_created_idx').on(t.createdAt),
    index('share_events_link_idx').on(t.shareLinkId),
  ],
);

export const shareEventLogs = mysqlTable(
  'share_event_logs',
  {
    id: id(),
    shareLinkId: fk('share_link_id').notNull(),
    resourceType: varchar('resource_type', { length: 30 }).notNull(),
    resourceId: fk('resource_id').notNull(),
    eventType: varchar('event_type', { length: 20 }).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    referrer: text('referrer'),
    createdAt: createdAt(),
  },
  t => [
    index('share_logs_link_idx').on(t.shareLinkId),
    index('share_logs_resource_idx').on(t.resourceType, t.resourceId),
    index('share_logs_created_idx').on(t.createdAt),
    index('share_logs_type_idx').on(t.eventType),
  ],
);
