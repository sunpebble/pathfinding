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
    const request = new NextRequest('http://localhost/api/crawler/guides?platforms=weibo&limit=1', {
      headers: { Authorization: 'Bearer test-token' },
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.com/api/guides?platform=weibo&limit=1',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
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

  it('forwards q/destinations/offset/platform to the guides backend (D13)', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({ data: [], pagination: { total: 0, limit: 10, offset: 20 } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('./guides/route');
    const request = new NextRequest(
      'http://localhost/api/crawler/guides?platforms=mafengwo&q=%E4%B8%8A%E6%B5%B7&destinations=%E4%B8%8A%E6%B5%B7,%E6%9D%AD%E5%B7%9E&limit=10&offset=20',
      { headers: { Authorization: 'Bearer test-token' } },
    );

    // Act
    const response = await GET(request);

    // Assert
    expect(response.status).toBe(200);
    const calledUrl = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(calledUrl.pathname).toBe('/api/guides');
    expect(calledUrl.searchParams.get('platform')).toBe('mafengwo');
    expect(calledUrl.searchParams.get('q')).toBe('上海');
    expect(calledUrl.searchParams.get('destinations')).toBe('上海,杭州');
    expect(calledUrl.searchParams.get('limit')).toBe('10');
    expect(calledUrl.searchParams.get('offset')).toBe('20');
  });

  it('forwards q/category/city/min_quality/limit/offset to the pois backend (D13)', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({ data: [], pagination: { total: 0, limit: 12, offset: 24 } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('./pois/route');
    const request = new NextRequest(
      'http://localhost/api/crawler/pois?q=%E5%A4%96%E6%BB%A9&category=attraction&city=%E4%B8%8A%E6%B5%B7&min_quality=4&limit=12&offset=24',
      { headers: { Authorization: 'Bearer test-token' } },
    );

    // Act
    const response = await GET(request);
    const payload = await response.json();

    // Assert
    expect(response.status).toBe(200);
    const calledUrl = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(calledUrl.pathname).toBe('/api/pois');
    expect(calledUrl.searchParams.get('q')).toBe('外滩');
    expect(calledUrl.searchParams.get('category')).toBe('attraction');
    expect(calledUrl.searchParams.get('city')).toBe('上海');
    expect(calledUrl.searchParams.get('min_quality')).toBe('4');
    expect(calledUrl.searchParams.get('limit')).toBe('12');
    expect(calledUrl.searchParams.get('offset')).toBe('24');
    expect(payload.pagination).toEqual({ total: 0, limit: 12, offset: 24 });
  });

  it('rejects pois requests without auth before reaching the backend', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('./pois/route');
    const response = await GET(new NextRequest('http://localhost/api/crawler/pois'));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });

  it('proxies manual poi coordinate corrections to the backend PATCH endpoint', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ success: true }));
    vi.stubGlobal('fetch', fetchMock);

    const { PATCH } = await import('./guides/[id]/poi-coordinates/route');
    const body = {
      dayNumber: 1,
      poiIndex: 0,
      latitude: 30.6624,
      longitude: 104.0633,
      verifiedBy: 'admin',
    };
    const request = new NextRequest('http://localhost/api/crawler/guides/42/poi-coordinates', {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
    });

    // Act
    const response = await PATCH(request, { params: Promise.resolve({ id: '42' }) });
    const payload = await response.json();

    // Assert
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.com/api/guides/42/poi-coordinates',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
  });

  it('rejects poi coordinate corrections without auth', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { PATCH } = await import('./guides/[id]/poi-coordinates/route');
    const request = new NextRequest('http://localhost/api/crawler/guides/42/poi-coordinates', {
      method: 'PATCH',
      body: JSON.stringify({ dayNumber: 1, poiIndex: 0, latitude: 1, longitude: 1 }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '42' }) });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
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

    const response = await GET(new NextRequest('http://localhost/api/crawler/guides/42', {
      headers: { Authorization: 'Bearer test-token' },
    }), {
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
    const request = new NextRequest('http://localhost/api/crawler/crawl-jobs?status=running&limit=5', {
      headers: { Authorization: 'Bearer test-token' },
    });

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

  it('rejects protected crawler routes before reaching the backend when auth is missing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { GET } = await import('./crawl-jobs/route');
    const response = await GET(new NextRequest('http://localhost/api/crawler/crawl-jobs'));
    const payload = await response.json();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: 'Unauthorized' });
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
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
      headers: { Authorization: 'Bearer test-token' },
    }), {
      params: Promise.resolve({ slug: ['12', 'start'] }),
    });
    const payload = await response.json();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.com/api/crawl-jobs/start',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ id: 12 }),
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

  it('cancels crawl jobs through the API action endpoint with a numeric id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({ success: true }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('./crawl-jobs/[...slug]/route');
    const response = await POST(new NextRequest('http://localhost/api/crawler/crawl-jobs/12/cancel', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
    }), {
      params: Promise.resolve({ slug: ['12', 'cancel'] }),
    });
    const payload = await response.json();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.example.com/api/crawl-jobs',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ id: 12 }),
      }),
    );
    expect(response.status).toBe(200);
    expect(payload).toEqual({
      data: expect.objectContaining({
        id: '12',
        status: 'cancelled',
      }),
    });
  });

  it('rejects invalid crawl job action ids before reaching the backend', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('./crawl-jobs/[...slug]/route');
    const response = await POST(new NextRequest('http://localhost/api/crawler/crawl-jobs/not-a-number/start', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
    }), {
      params: Promise.resolve({ slug: ['not-a-number', 'start'] }),
    });
    const payload = await response.json();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: 'Invalid job id' });
  });
});
