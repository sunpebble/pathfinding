import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { normalizeCrawlJob } from '@/lib/api/backend';
import { proxyBackendApiResponse } from '@/lib/api/proxy';

interface CrawlJobClientResponse {
  data: ReturnType<typeof normalizeCrawlJob>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;

  if (slug.length !== 1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [id, action] = slug;
  if (!id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (action) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return proxyBackendApiResponse<{ data: Record<string, unknown> }, CrawlJobClientResponse>(
    request,
    {
      endpoint: `/api/crawl-jobs/job?id=${encodeURIComponent(id)}`,
      transform: response => ({ data: normalizeCrawlJob(response.data) }),
      fallbackError: 'Internal server error',
    },
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;

  if (slug.length !== 2) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [id, action] = slug;
  if (!id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!action) {
    return NextResponse.json({ error: 'Action required' }, { status: 400 });
  }

  if (action === 'start') {
    return proxyBackendApiResponse<{ data: Record<string, unknown> }, CrawlJobClientResponse>(
      request,
      {
        endpoint: '/api/crawl-jobs/start',
        method: 'POST',
        body: { id },
        transform: response => ({ data: normalizeCrawlJob(response.data) }),
        fallbackError: 'Failed to start job',
      },
    );
  }

  if (action === 'cancel') {
    const response = await proxyBackendApiResponse<{ success: boolean }>(
      request,
      {
        endpoint: '/api/crawl-jobs',
        method: 'DELETE',
        body: { id },
        fallbackError: 'Failed to cancel job',
      },
    );

    if (response.status !== 200) {
      return response;
    }

    const timestamp = new Date().toISOString();
    return NextResponse.json({
      data: normalizeCrawlJob({
        id,
        status: 'cancelled',
        created_at: timestamp,
        updated_at: timestamp,
      }),
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
