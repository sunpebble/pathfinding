import type { AuthVariables } from '../middleware/auth.js';
import { zValidator } from '@hono/zod-validator';
import { chatMessages, chatSessions, createDb } from '@pathfinding/database';
import { and, desc, eq } from 'drizzle-orm';
/**
 * Chat routes — sessions and messages.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { authRequired } from '../middleware/auth.js';

const app = new Hono<{ Variables: AuthVariables }>();

function getDb() {
  return createDb();
}

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  max: number,
): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

// ── GET /sessions — List user's chat sessions ──────────
app.get('/sessions', async (c) => {
  const userId = c.req.query('userId');
  const includeArchived = c.req.query('includeArchived') === 'true';
  const limit = parsePositiveInt(c.req.query('limit'), 50, 200);

  if (!userId) {
    return c.json({ error: 'Missing userId parameter' }, 400);
  }

  const parsedUserId = Number.parseInt(userId, 10);
  if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
    return c.json({ error: 'Invalid userId parameter' }, 400);
  }

  const db = getDb();

  const results = includeArchived
    ? await db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.userId, parsedUserId))
        .orderBy(desc(chatSessions.lastMessageAt))
        .limit(limit)
    : await db
        .select()
        .from(chatSessions)
        .where(
          and(
            eq(chatSessions.userId, parsedUserId),
            eq(chatSessions.isArchived, false),
          ),
        )
        .orderBy(desc(chatSessions.lastMessageAt))
        .limit(limit);

  return c.json({ data: convertKeysToSnakeCase(results) });
});

// ── POST /sessions — Create a new chat session ─────────
const createSessionSchema = z.object({
  userId: z.number(),
  title: z.string().default('New Conversation'),
  context: z.any().optional(),
});

app.post('/sessions', zValidator('json', createSessionSchema), async (c) => {
  const body = c.req.valid('json');
  const db = getDb();

  const [result] = await db
    .insert(chatSessions)
    .values({
      userId: body.userId,
      title: body.title,
      metadata: body.context ?? null,
    })
    .$returningId();

  const session = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, result!.id))
    .limit(1);

  return c.json({ data: convertKeysToSnakeCase(session[0]) }, 201);
});

// ── GET /messages — Get messages for a session ─────────
app.get('/messages', async (c) => {
  const sessionId = c.req.query('sessionId');
  const limit = parsePositiveInt(c.req.query('limit'), 50, 200);

  if (!sessionId) {
    return c.json({ error: 'Missing sessionId parameter' }, 400);
  }

  const parsedSessionId = Number.parseInt(sessionId, 10);
  if (!Number.isInteger(parsedSessionId) || parsedSessionId <= 0) {
    return c.json({ error: 'Invalid sessionId parameter' }, 400);
  }

  const db = getDb();

  const results = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, parsedSessionId))
    .orderBy(chatMessages.createdAt)
    .limit(limit);

  return c.json({ data: convertKeysToSnakeCase(results) });
});

// ── POST /messages — Add a message to a session ────────
const createMessageSchema = z.object({
  sessionId: z.number(),
  role: z.string(),
  content: z.string(),
});

app.post('/messages', zValidator('json', createMessageSchema), async (c) => {
  const body = c.req.valid('json');
  const db = getDb();

  const [result] = await db
    .insert(chatMessages)
    .values({
      sessionId: body.sessionId,
      role: body.role,
      content: body.content,
    })
    .$returningId();

  // Update session's lastMessageAt
  await db
    .update(chatSessions)
    .set({ lastMessageAt: new Date() })
    .where(eq(chatSessions.id, body.sessionId));

  return c.json({ id: result!.id }, 201);
});

// ── DELETE /sessions/:id — Archive/delete a session ────
app.delete('/sessions/:id', authRequired(), async (c) => {
  const { id } = c.req.param();
  const db = getDb();

  // Soft-delete by archiving
  await db
    .update(chatSessions)
    .set({ isArchived: true })
    .where(eq(chatSessions.id, Number(id)));

  return c.json({ success: true });
});

export default app;
