import type { Env, Vars } from '../env.js';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dbMiddleware } from './db.js';

const { sentinelDb, createDbMock } = vi.hoisted(() => ({
  sentinelDb: { __sentinel: true },
  createDbMock: vi.fn(),
}));

vi.mock('@pathfinding/database', async () => {
  const actual = await vi.importActual<typeof import('@pathfinding/database')>('@pathfinding/database');
  return {
    ...actual,
    createDb: createDbMock,
  };
});

function createTestApp(onProbe?: (db: unknown) => void) {
  const app = new Hono<{ Bindings: Env; Variables: Vars }>();
  app.use('*', dbMiddleware);
  app.get('/probe', (c) => {
    onProbe?.(c.get('db'));
    return c.json({ ok: true });
  });
  return app;
}

describe('dbMiddleware', () => {
  beforeEach(() => {
    createDbMock.mockReset();
    createDbMock.mockReturnValue(sentinelDb);
  });

  it('injects createDb(c.env.DB) product into c.var.db', async () => {
    const fakeD1 = { __d1: true } as unknown as Env['DB'];
    let captured: unknown = null;
    const app = createTestApp((db) => {
      captured = db;
    });

    await app.request('/probe', {}, { DB: fakeD1, JWT_SECRET: 'x' } as unknown as Env);

    expect(createDbMock).toHaveBeenCalledTimes(1);
    expect(createDbMock).toHaveBeenCalledWith(fakeD1);
    expect(captured).toBe(sentinelDb);
  });

  it('calls next() so downstream handlers run', async () => {
    const app = createTestApp();
    const response = await app.request('/probe', {}, { JWT_SECRET: 'x' } as unknown as Env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('rebuilds db per request (no caching across requests)', async () => {
    const app = createTestApp();
    await app.request('/probe', {}, { JWT_SECRET: 'x' } as unknown as Env);
    await app.request('/probe', {}, { JWT_SECRET: 'x' } as unknown as Env);
    expect(createDbMock).toHaveBeenCalledTimes(2);
  });
});
