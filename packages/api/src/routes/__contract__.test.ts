import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { requestWithEnv } from '../test/helpers.js';

/**
 * R4 verification gate — endpoint contract test.
 *
 * Locks that every route the dashboard + `scripts/smoke.mjs` depend on stays
 * mounted. Each case sends a request engineered to short-circuit inside
 * auth/validation middleware (401/400/403) *before* any DB query runs — so
 * no D1 binding or query-chain mock is needed, only whether Hono actually
 * dispatches to the route. A genuinely unmounted path always 404s via
 * `app.notFound()` in app.ts, which none of the expected statuses below
 * collide with — so this test regresses the moment a route stops being
 * mounted, without asserting anything about business-logic correctness.
 */
vi.mock('@pathfinding/database', async () => {
  const actual = await vi.importActual<typeof import('@pathfinding/database')>('@pathfinding/database');

  return {
    ...actual,
    createDb: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      transaction: vi.fn(),
    })),
  };
});

/**
 * [method, path, expectedStatus, requestInit?]
 *
 * Every request is unauthenticated (no Authorization header) and every
 * expected status is produced by middleware that runs strictly before the
 * handler's DB access:
 *  - 401 → `authRequired()` rejects a missing Bearer token immediately.
 *  - 400 → `zValidator` rejects the payload/query before the handler runs.
 *  - 403 → itineraries' authOptional() owner-mismatch guard short-circuits
 *          before its DB query.
 */
const MOUNTED: Array<[string, string, number, RequestInit?]> = [
  ['POST', '/api/auth/signin', 400, { body: '{}' }],
  ['POST', '/api/auth/refresh', 400, { body: '{}' }],
  ['PATCH', '/api/users/1', 401, { body: '{}' }],
  ['GET', '/api/itineraries?userId=999', 403],
  ['GET', '/api/pois?min_quality=99', 400],
  ['GET', '/api/expense-splitting/balance', 401],
  ['GET', '/api/budgets', 401],
  ['GET', '/api/expenses', 401],
  ['POST', '/api/agent/chat/stream', 401, { body: '{}' }],
  ['GET', '/api/chat/sessions', 401],
  ['GET', '/api/currency/rates?base=usdollar', 400],
  ['POST', '/api/sharing/link', 401, { body: '{}' }],
];

describe('endpoint contract (R4 gate)', () => {
  it.each(MOUNTED)('%s %s is mounted (status %d, not 404)', async (method, path, expectedStatus, init) => {
    const response = await requestWithEnv(createApp(), path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });

    expect(response.status).toBe(expectedStatus);
  });
});
