import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('fetchBackendApi', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.example.com');
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('throws a typed backend error with status and parsed body', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse({ error: 'Invalid input' }, { status: 400 }))
      .mockResolvedValueOnce(createJsonResponse({ error: 'Invalid input' }, { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);

    const { BackendApiError, fetchBackendApi } = await import('./backend');

    await expect(fetchBackendApi('/api/guides')).rejects.toBeInstanceOf(BackendApiError);
    await expect(fetchBackendApi('/api/guides')).rejects.toMatchObject({
      message: 'Invalid input',
      status: 400,
      data: { error: 'Invalid input' },
    });
  });
});
