import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('crawler route handlers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_API_URL = 'http://api.example.com';
    vi.doMock('convex/browser', () => {
      throw new Error('convex/browser should not be imported by crawler route handlers');
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('lists guides through the API and normalizes the JSON response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        data: [
          {
            id: 'guide-1',
            source_platform: 'weibo',
            title: 'A guide',
            content: 'Body',
            quality_score: 92,
            image_urls: ['https://cdn.example.com/1.jpg'],
            created_at: '2026-03-06T00:00:00.000Z',
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('./guides/route');
    const request = new NextRequest('http://localhost/api/crawler/guides?platforms=weibo&limit=1');

    const response = await GET(request);
    const payload = await response.json();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.com/api/guides?platform=weibo&limit=1',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(response.status).toBe(200);
    expect(payload).toEqual({
      data: [
        expect.objectContaining({
          id: 'guide-1',
          source_platform: 'weibo',
          title: 'A guide',
          quality_score: 92,
          comments_count: 0,
          image_urls: ['https://cdn.example.com/1.jpg'],
        }),
      ],
      pagination: {
        total: 1,
        limit: 1,
        offset: 0,
      },
    });
  });

  it('loads a single guide through the API without importing Convex', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        data: {
          id: '42',
          source_platform: 'xiaohongshu',
          title: 'Guide 42',
          content: 'Long form content',
          content_markdown: '# Guide 42',
          ai_summary: 'Summary',
          ai_days: [{ day_number: 1 }],
          created_at: '2026-03-06T00:00:00.000Z',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('./guides/[id]/route');

    const response = await GET(new NextRequest('http://localhost/api/crawler/guides/42'), {
      params: Promise.resolve({ id: '42' }),
    });
    const payload = await response.json();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.com/api/guides/42',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(response.status).toBe(200);
    expect(payload).toEqual({
      data: expect.objectContaining({
        id: '42',
        _id: '42',
        title: 'Guide 42',
        ai_summary: 'Summary',
        ai_days: [{ day_number: 1 }],
      }),
    });
  });

  it('lists crawl jobs through the API and adds pagination metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        data: [
          {
            id: 7,
            platform: 'mafengwo',
            job_type: 'full',
            status: 'running',
            config: { city: 'Chengdu' },
            created_at: '2026-03-06T00:00:00.000Z',
            updated_at: '2026-03-06T00:00:00.000Z',
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('./crawl-jobs/route');
    const request = new NextRequest('http://localhost/api/crawler/crawl-jobs?status=running&limit=5');

    const response = await GET(request);
    const payload = await response.json();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.com/api/crawl-jobs?status=running&limit=5',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(response.status).toBe(200);
    expect(payload).toEqual({
      data: [
        expect.objectContaining({
          id: '7',
          platform: 'mafengwo',
          status: 'running',
          name: 'mafengwo full',
        }),
      ],
      pagination: {
        total: 1,
        limit: 5,
        offset: 0,
      },
    });
  });

  it('creates crawl jobs through the API with normalized request and response bodies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        data: {
          id: 9,
          platform: 'ctrip',
          job_type: 'incremental',
          status: 'pending',
          config: { keyword: 'museum' },
          created_at: '2026-03-06T00:00:00.000Z',
          updated_at: '2026-03-06T00:00:00.000Z',
        },
      }, { status: 201 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('./crawl-jobs/route');
    const request = new NextRequest('http://localhost/api/crawler/crawl-jobs', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Museum crawl',
        platform: 'ctrip',
        job_type: 'incremental',
        config: { keyword: 'museum' },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.com/api/crawl-jobs',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Museum crawl',
          platform: 'ctrip',
          jobType: 'incremental',
          config: { keyword: 'museum' },
        }),
      }),
    );
    expect(response.status).toBe(201);
    expect(payload).toEqual({
      data: expect.objectContaining({
        id: '9',
        status: 'pending',
        job_type: 'incremental',
      }),
    });
  });

  it('starts crawl jobs through the API action endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        data: {
          id: 12,
          platform: 'qunar',
          job_type: 'full',
          status: 'running',
          started_at: '2026-03-06T01:00:00.000Z',
          created_at: '2026-03-06T00:00:00.000Z',
          updated_at: '2026-03-06T01:00:00.000Z',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('./crawl-jobs/[...slug]/route');
    const response = await POST(new NextRequest('http://localhost/api/crawler/crawl-jobs/12/start', {
      method: 'POST',
    }), {
      params: Promise.resolve({ slug: ['12', 'start'] }),
    });
    const payload = await response.json();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.com/api/crawl-jobs/start',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ id: '12' }),
      }),
    );
    expect(response.status).toBe(200);
    expect(payload).toEqual({
      data: expect.objectContaining({
        id: '12',
        status: 'running',
        started_at: '2026-03-06T01:00:00.000Z',
      }),
    });
  });
});
