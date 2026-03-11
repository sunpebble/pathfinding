/**
 * Agent schema - LangGraph agent sessions and checkpoint persistence.
 */
import {
  index,
  json,
  mysqlTable,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { fk, id } from './columns';

// ── Agent Sessions ─────────────────────────────────────
export const agentSessions = mysqlTable(
  'agent_sessions',
  {
    id: id(),
    /** Unique session identifier */
    sessionId: varchar('session_id', { length: 255 }).notNull(),
    /** Auth user ID (optional for anonymous) */
    userId: fk('user_id'),
    /** Session type */
    sessionType: varchar('session_type', { length: 30 }).notNull(), // chat | travel_plan | enrichment
    /** Session status */
    status: varchar('status', { length: 20 }).notNull(), // active | paused | completed | expired
    /** Array of message objects (role, content, toolCalls, etc.) */
    messages: json('messages').notNull(),
    /** Custom session metadata (destination, dates, etc.) */
    metadata: json('metadata'),
    /** Current graph node for resume */
    currentNode: varchar('current_node', { length: 255 }),
    /** Data passed to interrupt() */
    interruptData: json('interrupt_data'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow().onUpdateNow(),
    /** Optional session expiry */
    expiresAt: timestamp('expires_at', { mode: 'date' }),
  },
  t => [
    index('agent_sessions_session_idx').on(t.sessionId),
    index('agent_sessions_user_idx').on(t.userId),
    index('agent_sessions_user_type_idx').on(t.userId, t.sessionType),
    index('agent_sessions_status_idx').on(t.status),
    index('agent_sessions_created_idx').on(t.createdAt),
  ],
);

// ── Agent Checkpoints (LangGraph State Persistence) ────
export const agentCheckpoints = mysqlTable(
  'agent_checkpoints',
  {
    id: id(),
    /** Thread identifier (matches sessionId) */
    threadId: varchar('thread_id', { length: 255 }).notNull(),
    /** Checkpoint namespace */
    checkpointNs: varchar('checkpoint_ns', { length: 255 }).notNull(),
    /** Unique checkpoint identifier */
    checkpointId: varchar('checkpoint_id', { length: 255 }).notNull(),
    /** Parent checkpoint for history */
    parentCheckpointId: varchar('parent_checkpoint_id', { length: 255 }),
    /** Serialized channel state */
    channelValues: json('channel_values').notNull(),
    /** Channel version tracking */
    channelVersions: json('channel_versions').notNull(),
    /** Versions seen by each node */
    versionsSeen: json('versions_seen').notNull(),
    /** Pending message sends */
    pendingSends: json('pending_sends'),
    /** Checkpoint metadata */
    metadata: json('metadata'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  t => [
    index('agent_checkpoints_thread_idx').on(t.threadId),
    index('agent_checkpoints_thread_ns_idx').on(t.threadId, t.checkpointNs),
    index('agent_checkpoints_thread_ns_id_idx').on(t.threadId, t.checkpointNs, t.checkpointId),
    index('agent_checkpoints_created_idx').on(t.createdAt),
  ],
);
