/**
 * AI plan drafts schema — persists the agent's plan lifecycle
 * (start → feedback → result) in D1 so state survives across Workers
 * isolates. Replaces the previous module-level `Map` in `agent.ts`,
 * which is unreliable in production (a request may land on a
 * different isolate than the one holding the Map).
 */
import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createdAt, fk, id, updatedAt } from './columns';

export const aiPlanDrafts = sqliteTable(
  'ai_plan_drafts',
  {
    id: id(),
    sessionId: text('session_id').notNull(),
    userId: fk('user_id').notNull(),
    draft: text('draft', { mode: 'json' }).$type<unknown>().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    // One draft per (session, user) — lets savePlan use a single-query
    // onConflictDoUpdate upsert (no check-then-act race) and refresh
    // updatedAt on write. Also serves the (sessionId, userId) lookups in
    // loadPlan/savePlan via its leading column.
    uniqueIndex('ai_plan_drafts_session_user_uniq').on(t.sessionId, t.userId),
    index('ai_plan_drafts_user_idx').on(t.userId),
  ],
);
