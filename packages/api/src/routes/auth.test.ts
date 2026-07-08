import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { buildAuthToken, requestWithAuth, requestWithEnv } from '../test/helpers.js';

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@pathfinding/database', async () => {
  const actual = await vi.importActual<typeof import('@pathfinding/database')>('@pathfinding/database');

  return {
    ...actual,
    createDb: vi.fn(() => mockDb),
  };
});

/**
 * Chain where `.limit()` is the terminal (resolves when awaited).
 * Matches: db.select().from(x).where(...).limit(1)
 */
function createSelectChain(result: unknown) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where, limit });

  return { from, where, limit };
}

/**
 * Chain where `.returning()` is the terminal.
 * Matches: db.insert(x).values(...).returning(...)
 */
function createInsertChain(result: unknown) {
  const returning = vi.fn().mockResolvedValue(result);
  const values = vi.fn().mockReturnValue({ returning });

  return { values };
}

/**
 * Chain where `.where()` is the terminal (resolves when awaited).
 * Matches: db.delete(x).where(...)
 */
function createDeleteChain(result: unknown = undefined) {
  const where = vi.fn().mockResolvedValue(result);

  return { where };
}

/**
 * `/api/auth/*` is behind the DB-backed rate limiter (see app.ts), which
 * issues its own `db.select()` before any route handler runs. Make that
 * call throw so the middleware's built-in fallback (in-memory limiter)
 * kicks in, keeping the queued select/insert chains below reserved for
 * the actual route/service logic under test.
 */
function queueRateLimitFallback() {
  mockDb.select.mockImplementationOnce(() => {
    throw new Error('rate-limit db unavailable (test)');
  });
}

describe('gET /api/auth/me', () => {
  beforeEach(() => {
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.select.mockReturnValue(createSelectChain([
      {
        id: 1,
        name: 'Owner',
        email: 'owner@example.com',
        image: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]));
  });

  it('returns 200 with a valid bearer token', async () => {
    const response = await requestWithAuth(createApp(), '/api/auth/me');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        id: '1',
        email: 'owner@example.com',
      },
    });
  });
});

describe('pOST /api/auth/refresh', () => {
  beforeEach(() => {
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.delete.mockReset();
  });

  it('re-mints access + refresh tokens for a valid signed refresh token', async () => {
    const app = createApp();

    // Arrange: signup (flow: signUp) to obtain a real refreshToken (a signed JWT).
    queueRateLimitFallback();
    mockDb.select.mockReturnValueOnce(createSelectChain([])); // no existing user with this email
    mockDb.insert
      .mockReturnValueOnce(createInsertChain([{ id: 1 }])) // insert users -> id 1
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) }) // insert authAccounts
      .mockReturnValueOnce(createInsertChain([{ id: 42 }])); // createSession -> authSessions id 42

    const signup = await requestWithEnv(app, '/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'r@e.com', password: 'pw12345678', flow: 'signUp', name: 'R' }),
    });
    const { refreshToken } = await signup.json();
    // refreshToken is now a signed JWT, not the enumerable session id.
    expect(refreshToken).toBeTruthy();
    expect(refreshToken.split('.')).toHaveLength(3);

    // Act: refresh with the signed token. verifyToken decodes it (no DB);
    // then isSessionValid (1 select) + user lookup by sub (1 select), then
    // rotation: createSession (1 insert) + deleteSession of the old sid (1 delete).
    queueRateLimitFallback();
    mockDb.select
      .mockReturnValueOnce(createSelectChain([{ id: 42 }])) // isSessionValid(sid=42)
      .mockReturnValueOnce(createSelectChain([{ id: 1, email: 'r@e.com' }])); // users -> by sub
    mockDb.insert.mockReturnValueOnce(createInsertChain([{ id: 43 }])); // createSession -> new sid 43
    mockDb.delete.mockReturnValueOnce(createDeleteChain()); // deleteSession(old sid=42)

    const res = await requestWithEnv(app, '/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    // Assert
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.refreshToken).toBeTruthy(); // rotated refresh token
    expect(body.refreshToken).not.toBe(refreshToken); // old token is not re-returned
    expect(body.userId).toBe('1');
    // The old session (sid=42) is revoked so the presented token can't be replayed.
    expect(mockDb.delete).toHaveBeenCalledTimes(1);
  });

  it('rejects a refresh token whose session was already rotated/revoked with 401', async () => {
    // After rotation the old `sid` is deleted, so isSessionValid returns false
    // and a replay of the captured refresh token is rejected — the property the
    // rotation fix guarantees.
    const app = createApp();

    queueRateLimitFallback();
    mockDb.select.mockReturnValueOnce(createSelectChain([])); // isSessionValid(sid) -> revoked

    const refreshToken = await buildAuthToken({
      userId: '1',
      extraClaims: { sid: '42', typ: 'refresh' },
    });

    const res = await requestWithEnv(app, '/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    expect(res.status).toBe(401);
    // A revoked session must never trigger a rotation write.
    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(mockDb.delete).not.toHaveBeenCalled();
  });

  it('rejects a forged/malformed refresh token with 401', async () => {
    queueRateLimitFallback();
    const res = await requestWithEnv(createApp(), '/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'forged.jwt.token' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects an access token (typ !== refresh) presented at /refresh with 401', async () => {
    // A validly-signed access token has no `typ: 'refresh'` claim, so it must
    // not be accepted as a refresh token even though its signature verifies.
    const accessToken = await buildAuthToken({ userId: '1' });
    queueRateLimitFallback();
    const res = await requestWithEnv(createApp(), '/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: accessToken }),
    });
    expect(res.status).toBe(401);
  });
});
