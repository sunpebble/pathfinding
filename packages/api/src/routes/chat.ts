import type { Database } from '@pathfinding/database';
import type { AppContext } from '../env.js';
import { zValidator } from '@hono/zod-validator';
import { chatMessages, chatSessions } from '@pathfinding/database';
import { and, desc, eq } from 'drizzle-orm';
/**
 * Chat routes — sessions and messages.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { deepSeekCompletion, DeepSeekConfigError } from '../lib/deepseek.js';
import { parsePagination, parsePositiveInt } from '../lib/params.js';
import { authRequired } from '../middleware/auth.js';
import { ApiError } from '../middleware/error-handler.js';

const app = new Hono<AppContext>();

/**
 * Snake-case a chat row's column names for the iOS client, but keep the
 * `metadata` JSON blob verbatim — it stores the arbitrary caller-supplied
 * `context` object (z.record(z.string(), z.unknown())), whose keys the shared
 * recursive converter would mangle on round-trip (e.g. `USD` → `_u_s_d`).
 */
function toChatDto<T extends { metadata: unknown }>(row: T) {
  const { metadata, ...rest } = row;
  return { ...(convertKeysToSnakeCase(rest) as Record<string, unknown>), metadata };
}

/**
 * Verify that a chat session exists and belongs to the given user.
 * Throws ApiError(403) if not found or owned by someone else.
 */
async function requireOwnedSession(db: Database, sessionId: number, userId: number): Promise<void> {
  const session = await db
    .select({ userId: chatSessions.userId })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (session.length === 0 || session[0]!.userId !== userId) {
    throw new ApiError(403, '会话不存在或无权访问');
  }
}

// ── GET /sessions — List user's chat sessions ──────────
app.get('/sessions', authRequired(), async (c) => {
  const userId = Number(c.get('userId'));
  const includeArchived = c.req.query('includeArchived') === 'true';
  const { limit } = parsePagination(c.req.query('limit'), undefined, 50);

  const db = c.get('db');

  const conditions = [eq(chatSessions.userId, userId)];
  if (!includeArchived) {
    conditions.push(eq(chatSessions.isArchived, false));
  }

  const results = await db
    .select()
    .from(chatSessions)
    .where(and(...conditions))
    .orderBy(desc(chatSessions.lastMessageAt))
    .limit(limit);

  return c.json({ data: results.map(toChatDto) });
});

// ── POST /sessions — Create a new chat session ─────────
const createSessionSchema = z.object({
  title: z.string().default('新对话'),
  context: z.record(z.string(), z.unknown()).optional(),
});

app.post('/sessions', authRequired(), zValidator('json', createSessionSchema), async (c) => {
  const body = c.req.valid('json');
  const db = c.get('db');

  const [result] = await db
    .insert(chatSessions)
    .values({
      userId: Number(c.get('userId')),
      title: body.title,
      metadata: body.context ?? null,
    })
    .returning({ id: chatSessions.id });

  const session = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, result!.id))
    .limit(1);

  return c.json({ data: toChatDto(session[0]!) }, 201);
});

// ── GET /messages — Get messages for a session ─────────
app.get('/messages', authRequired(), async (c) => {
  const userId = Number(c.get('userId'));
  const { limit } = parsePagination(c.req.query('limit'), undefined, 50);

  const parsedSessionId = parsePositiveInt(c.req.query('sessionId'));
  if (!parsedSessionId) {
    return c.json({ error: '缺少或无效的sessionId参数' }, 400);
  }

  await requireOwnedSession(c.get('db'), parsedSessionId, userId);

  const db = c.get('db');
  const results = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, parsedSessionId))
    .orderBy(chatMessages.createdAt)
    .limit(limit);

  return c.json({ data: results.map(toChatDto) });
});

// ── GET /sessions/:id/messages — Messages for a session ──
app.get('/sessions/:id/messages', authRequired(), async (c) => {
  const userId = Number(c.get('userId'));
  const sessionId = parsePositiveInt(c.req.param('id'));
  if (!sessionId) {
    return c.json({ error: '无效的会话ID' }, 400);
  }

  const db = c.get('db');
  await requireOwnedSession(db, sessionId, userId);

  const { limit } = parsePagination(c.req.query('limit'), undefined, 50);
  const results = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.createdAt)
    .limit(limit);

  return c.json({ data: results.map(toChatDto) });
});

// ── POST /messages — Add a message to a session ────────
const createMessageSchema = z.object({
  sessionId: z.number(),
  role: z.string(),
  content: z.string(),
});

const quickChatSchema = z.object({
  message: z.string().trim().min(1),
  context: z.unknown().optional(),
});

function contextText(value: unknown) {
  if (value === undefined || value === null)
    return '';
  if (typeof value === 'string')
    return value;
  try {
    return JSON.stringify(value);
  }
  catch {
    return '';
  }
}

app.post('/messages', authRequired(), zValidator('json', createMessageSchema), async (c) => {
  const body = c.req.valid('json');
  const userId = Number(c.get('userId'));

  await requireOwnedSession(c.get('db'), body.sessionId, userId);

  const db = c.get('db');
  const [result] = await db
    .insert(chatMessages)
    .values({
      sessionId: body.sessionId,
      role: body.role,
      content: body.content,
    })
    .returning({ id: chatMessages.id });

  // Update session's lastMessageAt
  await db
    .update(chatSessions)
    .set({ lastMessageAt: new Date() })
    .where(eq(chatSessions.id, body.sessionId));

  return c.json({ id: result!.id }, 201);
});

app.post('/query', authRequired(), zValidator('json', quickChatSchema), async (c) => {
  const { message, context } = c.req.valid('json');
  const extra = contextText(context);
  const system = `你是 Sunpebble Trips 的旅行助手。回答简洁、具体、可执行。${extra ? `\n上下文：${extra}` : ''}`;

  try {
    const content = await deepSeekCompletion([
      { role: 'system', content: system },
      { role: 'user', content: message },
    ], { apiKey: c.env.DEEPSEEK_API_KEY ?? '', signal: c.req.raw.signal });

    return c.json({
      success: true,
      data: {
        content,
        metadata: null,
      },
    });
  }
  catch (err) {
    const error = err instanceof DeepSeekConfigError
      ? 'DeepSeek API key not configured'
      : 'AI service unavailable';
    return c.json({ success: false, error }, 503);
  }
});

// ── DELETE /sessions/:id — Archive/delete a session ────
app.delete('/sessions/:id', authRequired(), async (c) => {
  const userId = Number(c.get('userId'));

  const parsedId = parsePositiveInt(c.req.param('id'));
  if (!parsedId) {
    return c.json({ error: '无效的会话ID' }, 400);
  }

  await requireOwnedSession(c.get('db'), parsedId, userId);

  // Soft-delete by archiving
  const db = c.get('db');
  await db
    .update(chatSessions)
    .set({ isArchived: true })
    .where(eq(chatSessions.id, parsedId));

  return c.json({ success: true });
});

export default app;
