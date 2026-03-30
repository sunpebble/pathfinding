import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, errorHandler } from './error-handler.js';

vi.mock('@pathfinding/database', async () => {
  const actual = await vi.importActual<typeof import('@pathfinding/database')>('@pathfinding/database');
  return {
    ...actual,
    createDb: vi.fn(() => ({})),
    getDb: vi.fn(() => ({})),
  };
});

function createTestApp() {
  const app = new Hono();
  app.onError(errorHandler);
  return app;
}

describe('apiError', () => {
  it('has the correct name, status, and message', () => {
    const err = new ApiError(400, 'Bad request');
    expect(err.name).toBe('ApiError');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Bad request');
    expect(err).toBeInstanceOf(Error);
  });

  it('supports optional details', () => {
    const err = new ApiError(422, 'Validation failed', { field: 'email' });
    expect(err.details).toEqual({ field: 'email' });
  });
});

describe('errorHandler', () => {
  it('handles ApiError with correct status code', async () => {
    const app = createTestApp();
    app.get('/test', () => {
      throw new ApiError(400, '缺少参数');
    });

    const response = await app.request('/test');
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: '缺少参数' });
  });

  it('handles ApiError with details', async () => {
    const app = createTestApp();
    app.get('/test', () => {
      throw new ApiError(422, 'Validation failed', ['field is required']);
    });

    const response = await app.request('/test');
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toEqual(['field is required']);
  });

  it('handles ApiError with 500 status', async () => {
    const app = createTestApp();
    app.get('/test', () => {
      throw new ApiError(500, 'Internal error');
    });

    const response = await app.request('/test');
    expect(response.status).toBe(500);
  });

  it('normalizes out-of-range status codes to 500', async () => {
    const app = createTestApp();
    app.get('/test', () => {
      throw new ApiError(999, 'Bad status');
    });

    const response = await app.request('/test');
    expect(response.status).toBe(500);
  });

  it('handles ZodError as 422', async () => {
    const app = createTestApp();
    app.get('/test', () => {
      const schema = z.object({ name: z.string().min(1), age: z.number() });
      schema.parse({ name: '', age: 'not-a-number' });
    });

    const response = await app.request('/test');
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe('Validation error');
    expect(body.details).toBeDefined();
    expect(Array.isArray(body.details)).toBe(true);
  });

  it('handles HTTPException with correct status', async () => {
    const app = createTestApp();
    app.get('/test', () => {
      throw new HTTPException(403, { message: 'Forbidden' });
    });

    const response = await app.request('/test');
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Forbidden');
  });

  it('handles unknown errors as 500', async () => {
    const app = createTestApp();
    app.get('/test', () => {
      throw new Error('Something unexpected');
    });

    const response = await app.request('/test');
    expect(response.status).toBe(500);
    const body = await response.json();
    // In non-production mode, the actual message is exposed
    expect(body.error).toBe('Something unexpected');
  });
});
