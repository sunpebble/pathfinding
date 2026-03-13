import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('dashboard health route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_API_URL = 'http://api.example.com';
    process.env.AI_SERVICE_URL = 'http://ai.example.com';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.AI_SERVICE_URL;
  });

  it('reports ok when the backend API is healthy even if AI service is unavailable', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url === 'http://api.example.com/health') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('./route');
    const response = await GET();
    const payload = await response.json();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.com/health',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(response.status).toBe(200);
    expect(payload).toEqual(
      expect.objectContaining({
        status: 'ok',
        checks: expect.objectContaining({
          api: expect.objectContaining({ status: 'ok' }),
        }),
      }),
    );
  });
});
