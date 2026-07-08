import type { Database } from '@pathfinding/database';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { AppContext } from '../env.js';
import type { DeepSeekMessage } from '../lib/deepseek.js';
import { aiPlanDrafts } from '@pathfinding/database';
import { and, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  deepSeekCompletion,
  DeepSeekConfigError,

} from '../lib/deepseek.js';
import { authRequired } from '../middleware/auth.js';

interface AIPlanDraft {
  sessionId?: string;
  title: string;
  summary: string;
  days: AIPlanDay[];
  estimatedBudget?: string;
  packingList?: string[];
  tips?: string[];
}

interface AIPlanDay {
  dayNumber: number;
  theme?: string;
  activities: AIPlanActivity[];
}

interface AIPlanActivity {
  time: string;
  name: string;
  type: string;
  duration?: string;
  description?: string;
  tips?: string;
  transportToNext?: AIPlanTransport;
}

interface AIPlanTransport {
  mode: string;
  note?: string;
}

const app = new Hono<AppContext>();

/**
 * Load a plan draft, scoped to the owning user. Plans are keyed by
 * `sessionId`, but session IDs are client-supplied (see `createSessionId`
 * / `planStartSchema.sessionId`) so every read/write MUST also filter by
 * `userId` — otherwise user A could read or overwrite user B's plan by
 * guessing/reusing their sessionId.
 */
async function loadPlan(db: Database, sessionId: string, userId: number): Promise<AIPlanDraft | undefined> {
  const rows = await db
    .select({ draft: aiPlanDrafts.draft })
    .from(aiPlanDrafts)
    .where(and(eq(aiPlanDrafts.sessionId, sessionId), eq(aiPlanDrafts.userId, userId)))
    .limit(1);

  return rows[0]?.draft as AIPlanDraft | undefined;
}

/**
 * Upsert a plan draft for (sessionId, userId) — see `loadPlan` for the
 * ownership rationale. Single-query upsert against the
 * `ai_plan_drafts_session_user_uniq` index: no check-then-act race (an iOS
 * double-submit can't double-insert), and updatedAt is refreshed on write
 * (the table has no AFTER UPDATE trigger, so we set it explicitly).
 */
async function savePlan(db: Database, sessionId: string, userId: number, plan: AIPlanDraft): Promise<void> {
  await db
    .insert(aiPlanDrafts)
    .values({ sessionId, userId, draft: plan })
    .onConflictDoUpdate({
      target: [aiPlanDrafts.sessionId, aiPlanDrafts.userId],
      set: { draft: plan, updatedAt: sql`(unixepoch())` },
    });
}

// All routes below proxy to DeepSeek and burn paid quota — require auth.
app.use('*', authRequired());

const chatRequestSchema = z.object({
  sessionId: z.string().optional(),
  message: z.string().trim().min(1),
  context: z.unknown().optional(),
});

const planStartSchema = z.object({
  sessionId: z.string().trim().optional(),
  message: z.string().trim().min(1),
  userId: z.string().optional(),
});

const planFeedbackSchema = z.object({
  feedback: z.string().trim().min(1),
});

async function readJSON(c: Context) {
  try {
    return await c.req.json();
  }
  catch {
    return undefined;
  }
}

function rawError(c: Context, status: ContentfulStatusCode, error: string) {
  return c.json({ success: false, error }, status);
}

function handleAIError(c: Context, err: unknown) {
  if (err instanceof DeepSeekConfigError) {
    return rawError(c, 503, 'DeepSeek API key not configured');
  }

  return rawError(c, 503, 'AI service unavailable');
}

function stringifyContext(context: unknown) {
  if (typeof context === 'string') {
    return context.trim();
  }

  if (context === undefined || context === null) {
    return '';
  }

  try {
    return JSON.stringify(context);
  }
  catch {
    return '';
  }
}

function chatMessages(message: string, context: unknown): DeepSeekMessage[] {
  let systemPrompt = '你是 Sunpebble Trips 的旅行规划助手。回答要简洁、实用，优先帮助用户做可执行的行程决策。';
  const contextText = stringifyContext(context);
  if (contextText) {
    systemPrompt += `\n\n上下文信息：${contextText}`;
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message },
  ];
}

function sseTokenResponse(content: string) {
  return new Response(`data: ${JSON.stringify({ type: 'token', content })}\n\n`, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}

function createSessionId() {
  return `plan-${Date.now()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stripJSONFence(content: string) {
  const trimmed = content.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isActivity(value: unknown): value is AIPlanActivity {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.time === 'string'
    && typeof value.name === 'string'
    && typeof value.type === 'string'
  );
}

function isPlanDay(value: unknown): value is AIPlanDay {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.dayNumber === 'number'
    && Array.isArray(value.activities)
    && value.activities.every(isActivity)
  );
}

function parsePlan(content: string, sessionId: string): AIPlanDraft {
  const payload = JSON.parse(stripJSONFence(content)) as unknown;
  if (!isRecord(payload)) {
    throw new Error('Invalid plan response');
  }

  if (
    typeof payload.title !== 'string'
    || typeof payload.summary !== 'string'
    || !Array.isArray(payload.days)
    || payload.days.length === 0
    || !payload.days.every(isPlanDay)
  ) {
    throw new Error('Invalid plan response');
  }

  const plan: AIPlanDraft = {
    sessionId,
    title: payload.title,
    summary: payload.summary,
    days: payload.days,
  };

  if (typeof payload.estimatedBudget === 'string') {
    plan.estimatedBudget = payload.estimatedBudget;
  }

  if (isStringArray(payload.packingList)) {
    plan.packingList = payload.packingList;
  }

  if (isStringArray(payload.tips)) {
    plan.tips = payload.tips;
  }

  return plan;
}

async function generatePlan(db: Database, userId: number, sessionId: string, prompt: string, apiKey: string) {
  const content = await deepSeekCompletion([
    { role: 'system', content: planSystemPrompt },
    { role: 'user', content: prompt },
  ], { apiKey, jsonMode: true });

  const plan = parsePlan(content, sessionId);
  await savePlan(db, sessionId, userId, plan);

  return {
    plan,
    response: '已生成一份可编辑行程。',
  };
}

app.post('/chat/stream', async (c) => {
  const parsed = chatRequestSchema.safeParse(await readJSON(c));
  if (!parsed.success) {
    return rawError(c, 400, 'Message is required');
  }

  try {
    const content = await deepSeekCompletion(chatMessages(parsed.data.message, parsed.data.context), {
      apiKey: c.env.DEEPSEEK_API_KEY ?? '',
      signal: c.req.raw.signal,
    });
    return sseTokenResponse(content);
  }
  catch (err) {
    return handleAIError(c, err);
  }
});

app.post('/plan/start', async (c) => {
  const parsed = planStartSchema.safeParse(await readJSON(c));
  if (!parsed.success) {
    return rawError(c, 400, 'Message is required');
  }

  const sessionId = parsed.data.sessionId || createSessionId();
  const userId = Number(c.get('userId'));
  const db = c.get('db');

  try {
    const { plan, response } = await generatePlan(db, userId, sessionId, parsed.data.message, c.env.DEEPSEEK_API_KEY ?? '');
    return c.json({
      success: true,
      sessionId,
      response,
      plan,
      waitingForFeedback: false,
    });
  }
  catch (err) {
    return handleAIError(c, err);
  }
});

app.post('/plan/:sessionId/feedback', async (c) => {
  const sessionId = c.req.param('sessionId').trim();
  const parsed = planFeedbackSchema.safeParse(await readJSON(c));
  if (!sessionId || !parsed.success) {
    return rawError(c, 400, 'Feedback is required');
  }

  const userId = Number(c.get('userId'));
  const db = c.get('db');

  let prompt = parsed.data.feedback;
  const currentPlan = await loadPlan(db, sessionId, userId);
  if (currentPlan) {
    prompt = `基于这份现有行程 JSON 修改：\n${JSON.stringify(currentPlan)}\n\n用户反馈：${parsed.data.feedback}`;
  }

  try {
    const { plan, response } = await generatePlan(db, userId, sessionId, prompt, c.env.DEEPSEEK_API_KEY ?? '');
    return c.json({
      success: true,
      sessionId,
      response,
      plan,
      completed: true,
    });
  }
  catch (err) {
    return handleAIError(c, err);
  }
});

app.get('/plan/:sessionId/status', async (c) => {
  const sessionId = c.req.param('sessionId').trim();
  const userId = Number(c.get('userId'));
  const plan = await loadPlan(c.get('db'), sessionId, userId);
  if (!plan) {
    return rawError(c, 404, 'Plan not found');
  }

  return c.json({
    success: true,
    sessionId,
    currentStep: 'completed',
    destination: plan.title,
    duration: plan.days.length,
    hasDraftPlan: true,
    hasFinalPlan: true,
    waitingForFeedback: false,
  });
});

app.get('/plan/:sessionId/result', async (c) => {
  const sessionId = c.req.param('sessionId').trim();
  const userId = Number(c.get('userId'));
  const plan = await loadPlan(c.get('db'), sessionId, userId);
  if (!plan) {
    return rawError(c, 404, 'Plan not found');
  }

  return c.json({
    success: true,
    sessionId,
    plan,
    completed: true,
  });
});

app.post('/ai/chat', async (c) => {
  const parsed = chatRequestSchema.safeParse(await readJSON(c));
  if (!parsed.success) {
    return rawError(c, 400, 'Message is required');
  }

  try {
    const response = await deepSeekCompletion(chatMessages(parsed.data.message, parsed.data.context), {
      apiKey: c.env.DEEPSEEK_API_KEY ?? '',
      signal: c.req.raw.signal,
    });
    return c.json({ success: true, response });
  }
  catch (err) {
    return handleAIError(c, err);
  }
});

const planSystemPrompt = `你是 Sunpebble Trips 的行程规划引擎。只输出 JSON，不要 Markdown。
字段必须是：
{
  "title": "string",
  "summary": "string",
  "days": [
    {
      "dayNumber": 1,
      "theme": "string",
      "activities": [
        {
          "time": "09:00",
          "name": "string",
          "type": "attraction|food|transport|hotel|shopping|other",
          "duration": "string",
          "description": "string",
          "tips": "string",
          "transportToNext": {"mode": "walking|transit|taxi|train|flight|other", "note": "string"}
        }
      ]
    }
  ],
  "estimatedBudget": "string",
  "packingList": ["string"],
  "tips": ["string"]
}`;

export default app;
