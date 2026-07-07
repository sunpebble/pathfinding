/**
 * Sharing schema - share links, events, event logs.
 */
import {
  index,
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import { createdAt, fk, id } from './columns';

export const shareLinks = sqliteTable(
  'share_links',
  {
    id: id(),
    shareCode: text('share_code').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: fk('resource_id').notNull(),
    ownerId: fk('owner_id').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
    viewCount: integer('view_count').notNull().default(0),
    metadata: text('metadata', { mode: 'json' }),
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

export const shareEvents = sqliteTable(
  'share_events',
  {
    id: id(),
    resourceType: text('resource_type').notNull(),
    resourceId: fk('resource_id').notNull(),
    sharerId: fk('sharer_id').notNull(),
    platform: text('platform'),
    eventType: text('event_type').notNull(),
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

export const shareEventLogs = sqliteTable(
  'share_event_logs',
  {
    id: id(),
    shareLinkId: fk('share_link_id').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: fk('resource_id').notNull(),
    eventType: text('event_type').notNull(),
    ipAddress: text('ip_address'),
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
