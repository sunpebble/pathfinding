import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchBackendApi, normalizeCrawlJob } from '@/lib/api';

export async function GET(
  _request: NextRequest,
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

  try {
    const response = await fetchBackendApi<{ data: Record<string, unknown> }>(
      `/api/crawl-jobs/job?id=${encodeURIComponent(id)}`,
      { method: 'GET' },
    );

    return NextResponse.json({ data: normalizeCrawlJob(response.data) });
  }
  catch (error) {
    if (error instanceof Error && /任务不存在|Job not found/i.test(error.message)) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    console.error('Error fetching crawl job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(
  _request: NextRequest,
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

  try {
    if (action === 'start') {
      const response = await fetchBackendApi<{ data: Record<string, unknown> }>(
        '/api/crawl-jobs/start',
        {
          method: 'POST',
          body: JSON.stringify({ id }),
        },
      );

      return NextResponse.json({ data: normalizeCrawlJob(response.data) });
    }

    if (action === 'cancel') {
      await fetchBackendApi<{ success: boolean }>('/api/crawl-jobs', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      });

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
  catch (error) {
    console.error(`Error ${action} crawl job:`, error);
    return NextResponse.json(
      { error: `Failed to ${action} job` },
      { status: 500 },
    );
  }
}
