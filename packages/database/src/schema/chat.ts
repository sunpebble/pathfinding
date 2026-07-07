/**
 * Chat schema - AI chat sessions and messages.
 */
import {
  index,
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import { createdAt, fk, id, updatedAt } from './columns';

// ── Chat Sessions ──────────────────────────────────────
export const chatSessions = sqliteTable(
  'chat_sessions',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    title: text('title'),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    lastMessageAt: integer('last_message_at', { mode: 'timestamp' }),
    itineraryId: fk('itinerary_id'),
    metadata: text('metadata', { mode: 'json' }),
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
export const chatMessages = sqliteTable(
  'chat_messages',
  {
    id: id(),
    sessionId: fk('session_id').notNull(),
    role: text('role').notNull(),
    content: text('content').notNull(),
    metadata: text('metadata', { mode: 'json' }),
    createdAt: createdAt(),
  },
  t => [
    index('chat_messages_session_idx').on(t.sessionId),
    index('chat_messages_session_created_idx').on(t.sessionId, t.createdAt),
  ],
);
