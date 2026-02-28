/**
 * Chat schema - AI chat sessions and messages.
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

// ── Chat Sessions ──────────────────────────────────────
export const chatSessions = mysqlTable(
  'chat_sessions',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    title: varchar('title', { length: 500 }),
    isArchived: boolean('is_archived').notNull().default(false),
    lastMessageAt: timestamp('last_message_at', { mode: 'date' }),
    itineraryId: fk('itinerary_id'),
    metadata: json('metadata'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('chat_sessions_user_idx').on(t.userId),
    index('chat_sessions_user_archived_idx').on(t.userId, t.isArchived),
    index('chat_sessions_user_last_msg_idx').on(t.userId, t.lastMessageAt),
    index('chat_sessions_itinerary_idx').on(t.itineraryId),
  ],
);

// ── Chat Messages ──────────────────────────────────────
export const chatMessages = mysqlTable(
  'chat_messages',
  {
    id: id(),
    sessionId: fk('session_id').notNull(),
    role: varchar('role', { length: 20 }).notNull(),
    content: text('content').notNull(),
    metadata: json('metadata'),
    createdAt: createdAt(),
  },
  t => [
    index('chat_messages_session_idx').on(t.sessionId),
    index('chat_messages_session_created_idx').on(t.sessionId, t.createdAt),
  ],
);
