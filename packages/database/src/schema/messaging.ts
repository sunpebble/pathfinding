/**
 * Messaging schema - conversations, messages, read status.
 */
import {
  index,
  int,
  json,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns.js';

// ── Conversations ──────────────────────────────────────
export const conversations = mysqlTable(
  'conversations',
  {
    id: id(),
    lastMessageAt: timestamp('last_message_at', { mode: 'date' }),
    participantIds: json('participant_ids'),
    metadata: json('metadata'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [index('conversations_last_msg_idx').on(t.lastMessageAt)],
);

// ── Messages ───────────────────────────────────────────
export const messages = mysqlTable(
  'messages',
  {
    id: id(),
    conversationId: fk('conversation_id').notNull(),
    senderId: fk('sender_id').notNull(),
    content: text('content'),
    messageType: varchar('message_type', { length: 20 }).notNull().default('text'),
    metadata: json('metadata'),
    createdAt: createdAt(),
  },
  t => [
    index('messages_conversation_idx').on(t.conversationId),
    index('messages_conv_time_idx').on(t.conversationId, t.createdAt),
    index('messages_sender_idx').on(t.senderId),
  ],
);

// ── Message Read Status ────────────────────────────────
export const messageReadStatus = mysqlTable(
  'message_read_status',
  {
    id: id(),
    conversationId: fk('conversation_id').notNull(),
    userId: fk('user_id').notNull(),
    lastReadAt: timestamp('last_read_at', { mode: 'date' }),
    unreadCount: int('unread_count').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('msg_read_conv_user_idx').on(t.conversationId, t.userId),
    index('msg_read_user_idx').on(t.userId),
  ],
);
