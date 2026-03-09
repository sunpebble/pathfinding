import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchBackendApi, normalizeCrawlJob } from '@/lib/api/backend';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
  const limit
    = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, 100)
      : 50;

  try {
    const backendParams = new URLSearchParams();
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');

    if (status) {
      backendParams.set('status', status);
    }
    if (platform) {
      backendParams.set('platform', platform);
    }
    backendParams.set('limit', String(limit));

    const response = await fetchBackendApi<{ data: Array<Record<string, unknown>> }>(
      `/api/crawl-jobs?${backendParams.toString()}`,
      { method: 'GET' },
    );

    const jobs = response.data.map(normalizeCrawlJob);

    return NextResponse.json({
      data: jobs,
      pagination: {
        total: jobs.length,
        limit,
        offset: 0,
      },
    });
  }
  catch (error) {
    console.error('Error fetching crawl jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetchBackendApi<{ data: Record<string, unknown> }>(
      '/api/crawl-jobs',
      {
        method: 'POST',
        body: JSON.stringify({
          name: body.name,
          platform: body.platform,
          jobType: body.job_type || 'full',
          config: body.config || {},
          scheduleCron: body.schedule_cron,
        }),
      },
    );

    return NextResponse.json(
      { data: normalizeCrawlJob(response.data) },
      { status: 201 },
    );
  }
  catch (error) {
    console.error('Error creating crawl job:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 },
    );
  }
}
