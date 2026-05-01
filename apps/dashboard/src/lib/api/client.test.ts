import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, AUTH_TOKEN_STORAGE_KEY, createApiClient } from './client';

describe('createApiClient', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('adds Authorization header when token exists', async () => {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'stored-token');

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient('/api');
    await client.get('/auth/me');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer stored-token',
        }),
      }),
    );
  });

  it('sends FormData bodies without JSON stringifying them for post', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient('/api');
    const formData = new FormData();
    formData.set('file', new Blob(['hello'], { type: 'text/plain' }), 'hello.txt');

    await client.post('/upload', formData);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/upload',
      expect.objectContaining({
        method: 'POST',
        body: formData,
        headers: expect.not.objectContaining({
          'Content-Type': expect.any(String),
        }),
      }),
    );
  });

  it('sends FormData bodies without JSON stringifying them for patch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient('/api');
    const formData = new FormData();
    formData.set('file', new Blob(['hello'], { type: 'text/plain' }), 'hello.txt');

    await client.patch('/upload', formData);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/upload',
      expect.objectContaining({
        method: 'PATCH',
        body: formData,
        headers: expect.not.objectContaining({
          'Content-Type': expect.any(String),
        }),
      }),
    );
  });

  it('jSON stringifies plain objects for post requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient('/api');

    await client.post('/auth/signin', { email: 'owner@example.com' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/signin',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'owner@example.com' }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('throws ApiError with friendly message when response is non-JSON 500', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient('/api');

    try {
      await client.get('/auth/me');
      expect.unreachable('Should have thrown');
    }
    catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(500);
      expect((err as ApiError).message).toBe('服务暂时不可用，请稍后重试');
      expect((err as ApiError).data).toBe('Internal Server Error');
    }
  });

  it('throws ApiError with friendly message when fetch fails (network error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const client = createApiClient('/api');

    try {
      await client.get('/auth/me');
      expect.unreachable('Should have thrown');
    }
    catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(0);
      expect((err as ApiError).message).toBe('服务暂时不可用，请稍后重试');
    }
  });

  it('returns undefined for 204 No Content', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient('/api');

    const result = await client.delete('/auth/signout');
    expect(result).toBeUndefined();
  });

  it('throws ApiError with error field from JSON error response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: '该邮箱已注册' }), {
        status: 409,
        statusText: 'Conflict',
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient('/api');

    await expect(client.post('/auth/signin', { email: 'test@test.com' })).rejects.toThrow('该邮箱已注册');
  });
});
