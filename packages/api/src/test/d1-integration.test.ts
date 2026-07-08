import type { Env, Vars } from '../env.js';
import { env } from 'cloudflare:workers';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dbMiddleware } from '../middleware/db.js';
import agentRoutes from '../routes/agent.js';
import { buildAuthToken, testEnv } from './helpers.js';

const db = env.TEST_DB;

/**
 * A bare Hono app mounting only the agent routes + db middleware — NOT the
 * full `createApp()`. Importing the full app (which wires up `@flue/runtime`)
 * segfaults the miniflare/workerd sandbox this D1 test project runs in; the
 * agent routes alone import cleanly and are all this suite needs to drive
 * the real request/handler flow against a real D1 binding.
 */
function createAgentTestApp() {
  const app = new Hono<{ Bindings: Env; Variables: Vars }>();
  app.use('*', dbMiddleware);
  app.route('/api/agent', agentRoutes);
  return app;
}

async function requestAsUser(path: string, userId: string, init: RequestInit = {}, env: Partial<Env> = {}) {
  const token = await buildAuthToken({ userId });
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return createAgentTestApp().request(path, { ...init, headers }, testEnv({ DB: db, ...env }));
}

/** Stub global fetch so DeepSeek "returns" the given plan JSON as its completion. */
function stubDeepSeek(planContent: string) {
  vi.stubGlobal('fetch', vi.fn(async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: planContent } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })));
}

function planJSON(title: string) {
  return JSON.stringify({
    title,
    summary: '概要',
    days: [{ dayNumber: 1, activities: [{ time: '09:00', name: '清水寺', type: 'attraction' }] }],
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('d1 integration', () => {
  beforeEach(async () => {
    await db.exec('DELETE FROM users;');
  });
  afterEach(async () => {
    await db.exec('DELETE FROM users;');
  });

  describe('updated_at AFTER UPDATE trigger', () => {
    it('refreshes updated_at on UPDATE (0001 migration trigger)', async () => {
      await db
        .prepare('INSERT INTO users (name, email) VALUES (?, ?)')
        .bind('alice', 'alice@example.com')
        .run();
      const before = await db
        .prepare('SELECT updated_at FROM users WHERE email = ?')
        .bind('alice@example.com')
        .first<{ updated_at: number }>();

      expect(before).not.toBeNull();
      // Wait > 1s so the second-level unixepoch() tick must differ.
      await sleep(1100);

      await db
        .prepare('UPDATE users SET name = ? WHERE email = ?')
        .bind('alice-renamed', 'alice@example.com')
        .run();

      const after = await db
        .prepare('SELECT updated_at, name FROM users WHERE email = ?')
        .bind('alice@example.com')
        .first<{ updated_at: number; name: string }>();

      expect(after).not.toBeNull();
      expect(after!.name).toBe('alice-renamed');
      expect(after!.updated_at).toBeGreaterThan(before!.updated_at);
    });

    it('preserves an explicitly-set updated_at (trigger WHERE clause)', async () => {
      await db
        .prepare('INSERT INTO users (name, email) VALUES (?, ?)')
        .bind('bob', 'bob@example.com')
        .run();

      const pinned = 1_000_000_000;
      await db
        .prepare('UPDATE users SET updated_at = ? WHERE email = ?')
        .bind(pinned, 'bob@example.com')
        .run();

      const row = await db
        .prepare('SELECT updated_at FROM users WHERE email = ?')
        .bind('bob@example.com')
        .first<{ updated_at: number }>();

      expect(row).not.toBeNull();
      expect(row!.updated_at).toBe(pinned);
    });

    it('the 0001 migration installed a trigger for users', async () => {
      const trigger = await db
        .prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?')
        .bind('trigger', 'users_updated_at')
        .first<{ name: string }>();
      expect(trigger).not.toBeNull();
      expect(trigger!.name).toBe('users_updated_at');
    });
  });

  describe('rETURNING clause', () => {
    it('returns the auto-generated id on INSERT', async () => {
      const result = await db
        .prepare('INSERT INTO users (name, email) VALUES (?, ?) RETURNING id')
        .bind('carol', 'carol@example.com')
        .first<{ id: number }>();

      expect(result).not.toBeNull();
      expect(typeof result!.id).toBe('number');
      expect(result!.id).toBeGreaterThan(0);
    });

    it('returns multiple rows when several are inserted', async () => {
      const stmt = await db
        .prepare('INSERT INTO users (name, email) VALUES (?, ?), (?, ?) RETURNING id')
        .bind('d1', 'd1@example.com', 'd2', 'd2@example.com')
        .all<{ id: number }>();

      expect(stmt.results).toHaveLength(2);
      expect(stmt.results[0]!.id).not.toBe(stmt.results[1]!.id);
    });
  });

  describe('json column round-trip', () => {
    // The production schema stores JSON in TEXT columns (e.g. image_urls,
    // destinations). Drizzle's `text({ mode: 'json' })` serializes the JS
    // object to a TEXT value on write and parses it back on read. D1 only
    // sees TEXT; we verify the round-trip behaves as the app expects.
    beforeEach(async () => {
      await db.exec(
        'CREATE TABLE IF NOT EXISTS test_json (id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT NOT NULL);',
      );
    });
    afterEach(async () => {
      await db.exec('DROP TABLE IF EXISTS test_json;');
    });

    it('round-trips a JSON object stored in a TEXT column', async () => {
      const payload = { city: 'Tokyo', days: 5, stops: ['Senso-ji', 'Shibuya'] };
      await db
        .prepare('INSERT INTO test_json (payload) VALUES (?)')
        .bind(JSON.stringify(payload))
        .run();

      const row = await db
        .prepare('SELECT payload FROM test_json WHERE id = (SELECT MAX(id) FROM test_json)')
        .first<{ payload: string }>();

      expect(row).not.toBeNull();
      const parsed = JSON.parse(row!.payload);
      expect(parsed).toEqual(payload);
    });

    it('round-trips a JSON array', async () => {
      const tags = ['food', 'culture', 'hiking'];
      await db
        .prepare('INSERT INTO test_json (payload) VALUES (?)')
        .bind(JSON.stringify(tags))
        .run();

      const row = await db
        .prepare('SELECT payload FROM test_json ORDER BY id DESC LIMIT 1')
        .first<{ payload: string }>();

      expect(row).not.toBeNull();
      expect(JSON.parse(row!.payload)).toEqual(tags);
    });
  });

  describe('ai_plan_drafts (agent plan persistence, was a module-level Map)', () => {
    beforeEach(async () => {
      await db.exec('DELETE FROM ai_plan_drafts;');
    });
    afterEach(async () => {
      vi.unstubAllGlobals();
      await db.exec('DELETE FROM ai_plan_drafts;');
    });

    it('round-trips a plan draft insert/select through the real table', async () => {
      const draft = { title: 'Kyoto', summary: 's', days: [{ dayNumber: 1, activities: [] }] };
      await db
        .prepare('INSERT INTO ai_plan_drafts (session_id, user_id, draft) VALUES (?, ?, ?)')
        .bind('sess-1', 1, JSON.stringify(draft))
        .run();

      const row = await db
        .prepare('SELECT session_id, user_id, draft FROM ai_plan_drafts WHERE session_id = ?')
        .bind('sess-1')
        .first<{ session_id: string; user_id: number; draft: string }>();

      expect(row).not.toBeNull();
      expect(row!.user_id).toBe(1);
      expect(JSON.parse(row!.draft)).toEqual(draft);
    });

    it('gET /plan/:sessionId/status finds a plan written outside the request (proves D1, not isolate memory)', async () => {
      // Inserted directly, simulating a prior /plan/start handled by a
      // different isolate. If agent.ts still used a module-level Map, this
      // separately-constructed app.request() call would find nothing.
      const draft = {
        sessionId: 'sess-owned',
        title: '京都三日旅行',
        summary: '概要',
        days: [{ dayNumber: 1, activities: [{ time: '09:00', name: '清水寺', type: 'attraction' }] }],
      };
      await db
        .prepare('INSERT INTO ai_plan_drafts (session_id, user_id, draft) VALUES (?, ?, ?)')
        .bind('sess-owned', 1, JSON.stringify(draft))
        .run();

      const statusResponse = await requestAsUser('/api/agent/plan/sess-owned/status', '1');
      expect(statusResponse.status).toBe(200);
      const statusBody = await statusResponse.json() as { hasFinalPlan: boolean; destination: string };
      expect(statusBody.hasFinalPlan).toBe(true);
      expect(statusBody.destination).toBe('京都三日旅行');

      const resultResponse = await requestAsUser('/api/agent/plan/sess-owned/result', '1');
      expect(resultResponse.status).toBe(200);
      const resultBody = await resultResponse.json() as { plan: { title: string } };
      expect(resultBody.plan.title).toBe('京都三日旅行');
    });

    it('rejects a different user reading someone else\'s plan draft (ownership)', async () => {
      await db
        .prepare('INSERT INTO ai_plan_drafts (session_id, user_id, draft) VALUES (?, ?, ?)')
        .bind('sess-owned-2', 1, JSON.stringify({ title: 'x', summary: 'y', days: [] }))
        .run();

      const statusResponse = await requestAsUser('/api/agent/plan/sess-owned-2/status', '2');
      expect(statusResponse.status).toBe(404);

      const resultResponse = await requestAsUser('/api/agent/plan/sess-owned-2/result', '2');
      expect(resultResponse.status).toBe(404);
    });

    it('start then feedback upserts one row: updates draft + refreshes updated_at (no duplicate)', async () => {
      // start → savePlan inserts the initial draft. sessionId comes from the body.
      stubDeepSeek(planJSON('初版行程'));
      const startRes = await requestAsUser(
        '/api/agent/plan/start',
        '7',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: 'sess-upsert', message: '京都三天' }),
        },
        { DEEPSEEK_API_KEY: 'test-key' },
      );
      expect(startRes.status).toBe(200);

      const before = await db
        .prepare('SELECT updated_at, draft FROM ai_plan_drafts WHERE session_id = ? AND user_id = ?')
        .bind('sess-upsert', 7)
        .first<{ updated_at: number; draft: string }>();
      expect(before).not.toBeNull();
      expect(JSON.parse(before!.draft).title).toBe('初版行程');

      // Second-level unixepoch() must tick so a refreshed updated_at is observable.
      await sleep(1100);

      // feedback → savePlan hits the onConflictDoUpdate branch for the same (session, user).
      stubDeepSeek(planJSON('修订版行程'));
      const feedbackRes = await requestAsUser(
        '/api/agent/plan/sess-upsert/feedback',
        '7',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedback: '把第二天改成美食' }),
        },
        { DEEPSEEK_API_KEY: 'test-key' },
      );
      expect(feedbackRes.status).toBe(200);

      const rows = await db
        .prepare('SELECT updated_at, draft FROM ai_plan_drafts WHERE session_id = ? AND user_id = ?')
        .bind('sess-upsert', 7)
        .all<{ updated_at: number; draft: string }>();

      // Upsert, not a second insert.
      expect(rows.results).toHaveLength(1);
      const after = rows.results[0]!;
      expect(JSON.parse(after.draft).title).toBe('修订版行程');
      expect(after.updated_at).toBeGreaterThan(before!.updated_at);
    });
  });
});
