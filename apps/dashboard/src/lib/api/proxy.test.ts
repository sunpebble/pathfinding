import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('proxyBackendApiResponse', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.example.com');
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns 401 before calling the backend when auth is required', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { proxyBackendApiResponse } = await import('./proxy');
    const response = await proxyBackendApiResponse(
      new NextRequest('http://localhost/api/crawler/guides'),
      { endpoint: '/api/guides' },
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('forwards bearer auth and transforms successful responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({ data: [{ id: 1, title: 'Guide' }] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { proxyBackendApiResponse } = await import('./proxy');
    const response = await proxyBackendApiResponse<
      { data: Array<{ id: number; title: string }> },
      { data: Array<{ id: string; title: string }> }
    >(
      new NextRequest('http://localhost/api/crawler/guides', {
        headers: { Authorization: 'Bearer test-token' },
      }),
      {
        endpoint: '/api/guides',
        transform: payload => ({
          data: payload.data.map(item => ({ ...item, id: String(item.id) })),
        }),
      },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.com/api/guides',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [{ id: '1', title: 'Guide' }] });
  });

  it('preserves backend validation status and message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      createJsonResponse({ error: '至少需要选择一个补齐目标' }, { status: 400 }),
    ));

    const { proxyBackendApiResponse } = await import('./proxy');
    const response = await proxyBackendApiResponse(
      new NextRequest('http://localhost/api/crawler/backfill-jobs', {
        headers: { Authorization: 'Bearer test-token' },
      }),
      {
        endpoint: '/api/crawl-jobs/backfill-jobs',
        method: 'POST',
        fallbackError: 'Failed to create backfill jobs',
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: '至少需要选择一个补齐目标' });
  });

  it('maps async body factory failures to fallback 500 responses', async () => {
    const fetchMock = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', fetchMock);

    const { proxyBackendApiResponse } = await import('./proxy');
    const response = await proxyBackendApiResponse(
      new NextRequest('http://localhost/api/crawler/backfill-jobs', {
        headers: { Authorization: 'Bearer test-token' },
      }),
      {
        endpoint: '/api/crawl-jobs/backfill-jobs',
        method: 'POST',
        body: async () => {
          throw new Error('Invalid JSON');
        },
        fallbackError: 'Failed to parse body',
      },
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith('Failed to parse body', expect.any(Error));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to parse body' });
  });

  it('uses BackendApiError message when backend payload has message and error fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      createJsonResponse({ message: 'Use this', error: 'Not this' }, { status: 400 }),
    ));

    const { proxyBackendApiResponse } = await import('./proxy');
    const response = await proxyBackendApiResponse(
      new NextRequest('http://localhost/api/crawler/backfill-jobs', {
        headers: { Authorization: 'Bearer test-token' },
      }),
      {
        endpoint: '/api/crawl-jobs/backfill-jobs',
        method: 'POST',
        fallbackError: 'Failed to create backfill jobs',
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Use this' });
  });
});
