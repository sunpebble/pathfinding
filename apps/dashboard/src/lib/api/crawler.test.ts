import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_TOKEN_STORAGE_KEY } from './client';
import { getCrawlJobs } from './crawler';

describe('crawler API client', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('attaches the stored auth token to crawler proxy requests', async () => {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'stored-token');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [],
          pagination: { total: 0, limit: 5, offset: 0 },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await getCrawlJobs({ limit: 5 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/crawler/crawl-jobs?limit=5',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer stored-token',
        }),
      }),
    );
  });
});
