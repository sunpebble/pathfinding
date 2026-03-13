import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_TOKEN_STORAGE_KEY, createApiClient } from './client';

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
});
