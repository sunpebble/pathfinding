import type { NextRequest } from 'next/server';
import { api } from '@pathfinding/convex-client/api';
import { ConvexHttpClient } from 'convex/browser';
import { NextResponse } from 'next/server';

const CONVEX_URL = process.env.CONVEX_URL || 'https://convex.kunish.org';
const client = new ConvexHttpClient(CONVEX_URL);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
  const limit
    = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, 100)
      : 50;
  const status = searchParams.get('status');

  try {
    const jobs = await client.query(api.crawlJobs.list, {
      limit,
    });

    // Filter by status if provided
    let filteredJobs = jobs;
    if (status) {
      filteredJobs = jobs.filter(job => job.status === status);
    }

    // Transform to snake_case for frontend compatibility
    const transformedJobs = filteredJobs.map(job => ({
      id: job._id,
      name: job.name,
      platform: job.platform,
      job_type: job.jobType,
      status: job.status,
      config: job.config,
      statistics: job.statistics,
      schedule_cron: job.scheduleCron,
      started_at: job.startedAt
        ? new Date(job.startedAt).toISOString()
        : undefined,
      completed_at: job.completedAt
        ? new Date(job.completedAt).toISOString()
        : undefined,
      next_run_at: job.nextRunAt
        ? new Date(job.nextRunAt).toISOString()
        : undefined,
      created_at: new Date(job._creationTime).toISOString(),
      updated_at: new Date(job._creationTime).toISOString(),
    }));

    return NextResponse.json({
      data: transformedJobs,
      pagination: {
        total: transformedJobs.length,
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

    const jobId = await client.mutation(api.crawlJobs.create, {
      name: body.name,
      platform: body.platform,
      jobType: body.job_type || 'full',
      config: body.config || {},
      scheduleCron: body.schedule_cron,
    });

    return NextResponse.json({ id: jobId }, { status: 201 });
  }
  catch (error) {
    console.error('Error creating crawl job:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 },
    );
  }
}
