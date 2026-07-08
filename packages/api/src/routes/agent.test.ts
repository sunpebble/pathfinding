import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { requestWithAuth, requestWithEnv } from '../test/helpers.js';

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@pathfinding/database', async () => {
  const actual = await vi.importActual<typeof import('@pathfinding/database')>('@pathfinding/database');
  return {
    ...actual,
    createDb: vi.fn(() => mockDb),
  };
});

// Chain-shaped stubs matching the drizzle call shapes agent.ts makes
// (`db.select(...).from(...).where(...).limit(...)`, `db.insert(...).values(...)`).
// Same pattern as chat.test.ts's mockDb chain helpers.
function createSelectChain(result: unknown) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from };
}

// savePlan() upserts: db.insert(...).values(...).onConflictDoUpdate(...).
function createInsertChain() {
  return { values: vi.fn().mockReturnValue({ onConflictDoUpdate: vi.fn().mockResolvedValue([]) }) };
}

interface DeepSeekRequestBody {
  model?: string;
  messages?: unknown[];
  response_format?: unknown;
}

const planJSON = JSON.stringify({
  title: '京都三日旅行',
  summary: '以寺社、街区和餐饮为主的轻量行程。',
  days: [
    {
      dayNumber: 1,
      theme: '东山散步',
      activities: [
        {
          time: '09:00',
          name: '清水寺',
          type: 'attraction',
          duration: '2小时',
          description: '从清水寺开始，顺路逛二年坂。',
          tips: '早点出发避开拥挤。',
        },
      ],
    },
  ],
  estimatedBudget: '约 60000 日元',
  packingList: ['舒适步行鞋'],
  tips: ['提前预约热门餐厅'],
});

beforeEach(() => {
  mockDb.select.mockReset();
  mockDb.insert.mockReset();
  mockDb.update.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const deepseekEnv = { DEEPSEEK_API_KEY: 'test-key' };

function stubDeepSeek(content: string, onBody?: (body: DeepSeekRequestBody) => void) {
  const fetchMock: typeof fetch = async (_input, init) => {
    const rawBody = typeof init?.body === 'string' ? init.body : '{}';
    onBody?.(JSON.parse(rawBody) as DeepSeekRequestBody);

    return new Response(JSON.stringify({
      choices: [
        {
          message: { content },
        },
      ],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  vi.stubGlobal('fetch', vi.fn(fetchMock));
}

describe('agent compatibility routes', () => {
  it('rejects unauthenticated POST /api/agent/chat/stream with 401', async () => {
    const response = await requestWithEnv(createApp(), '/api/agent/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    }, deepseekEnv);

    expect(response.status).toBe(401);
  });

  it('streams chat output as SSE token events', async () => {
    stubDeepSeek('可以，建议先确定预算和天数。');

    const response = await requestWithAuth(createApp(), '/api/agent/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'chat-test', message: '帮我规划京都' }),
    }, {}, deepseekEnv);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    await expect(response.text()).resolves.toContain('"type":"token"');
  });

  it('generates and stores an AI plan with DeepSeek JSON mode', async () => {
    let requestBody: DeepSeekRequestBody | undefined;
    stubDeepSeek(planJSON, body => requestBody = body);

    // start: savePlan() does a single insert().onConflictDoUpdate() upsert.
    mockDb.insert.mockReturnValueOnce(createInsertChain());

    const response = await requestWithAuth(createApp(), '/api/agent/plan/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'plan-test', message: '京都三天' }),
    }, {}, deepseekEnv);

    expect(response.status).toBe(200);
    const body = await response.json() as {
      success: boolean;
      sessionId: string;
      plan: { sessionId: string; title: string };
      waitingForFeedback: boolean;
    };
    expect(body).toMatchObject({
      success: true,
      sessionId: 'plan-test',
      waitingForFeedback: false,
      plan: {
        sessionId: 'plan-test',
        title: '京都三日旅行',
      },
    });
    expect(requestBody?.response_format).toEqual({ type: 'json_object' });

    const storedDraft = { sessionId: 'plan-test', ...JSON.parse(planJSON) };

    // status/result: loadPlan() does a single select scoped by (sessionId, userId).
    mockDb.select.mockReturnValueOnce(createSelectChain([{ draft: storedDraft }]));
    const statusResponse = await requestWithAuth(createApp(), '/api/agent/plan/plan-test/status');
    expect(statusResponse.status).toBe(200);
    const statusBody = await statusResponse.json() as { hasFinalPlan: boolean; duration: number };
    expect(statusBody.hasFinalPlan).toBe(true);
    expect(statusBody.duration).toBe(1);

    mockDb.select.mockReturnValueOnce(createSelectChain([{ draft: storedDraft }]));
    const resultResponse = await requestWithAuth(createApp(), '/api/agent/plan/plan-test/result');
    expect(resultResponse.status).toBe(200);
    const resultBody = await resultResponse.json() as { completed: boolean; plan: { title: string } };
    expect(resultBody.completed).toBe(true);
    expect(resultBody.plan.title).toBe('京都三日旅行');
  });

  it('returns 404 for a different user\'s plan (ownership scoping)', async () => {
    // No row matches this (sessionId, userId) pair — loadPlan() returns undefined.
    mockDb.select.mockReturnValueOnce(createSelectChain([]));

    const response = await requestWithAuth(
      createApp(),
      '/api/agent/plan/someone-elses-session/status',
      {},
      { userId: '999' },
    );

    expect(response.status).toBe(404);
  });

  it('returns 503 when DeepSeek is not configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await requestWithAuth(createApp(), '/api/agent/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '你好' }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'DeepSeek API key not configured',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
