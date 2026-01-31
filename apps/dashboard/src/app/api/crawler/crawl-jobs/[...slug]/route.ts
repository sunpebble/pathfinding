import type { Id } from '@pathfinding/convex/dataModel';
import type { NextRequest } from 'next/server';
import { api } from '@pathfinding/convex/api';
import { ConvexHttpClient } from 'convex/browser';
import { NextResponse } from 'next/server';

const CONVEX_URL = process.env.CONVEX_URL || 'https://convex.kunish.org';
const client = new ConvexHttpClient(CONVEX_URL);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;

  // Parse slug: [id] or [id, action]
  const [id, action] = slug;

  // If action is specified (like 'start' or 'cancel'), skip - those have their own routes
  if (action) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const job = await client.query(api.crawlJobs.getById, {
      id: id as Id<'crawlJobs'>,
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Transform to snake_case
    const transformedJob = {
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
      error_message: job.errorMessage,
      created_at: new Date(job._creationTime).toISOString(),
      updated_at: new Date(job._creationTime).toISOString(),
    };

    return NextResponse.json({ data: transformedJob });
  }
  catch (error) {
    console.error('Error fetching crawl job:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const [id, action] = slug;

  if (!action) {
    return NextResponse.json({ error: 'Action required' }, { status: 400 });
  }

  try {
    if (action === 'start') {
      const job = await client.mutation(api.crawlJobs.start, {
        id: id as Id<'crawlJobs'>,
      });
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json({
        id: job._id,
        status: job.status,
        started_at: job.startedAt
          ? new Date(job.startedAt).toISOString()
          : undefined,
      });
    }
    else if (action === 'cancel') {
      const job = await client.mutation(api.crawlJobs.cancel, {
        id: id as Id<'crawlJobs'>,
      });
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json({
        id: job._id,
        status: job.status,
      });
    }
    else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  }
  catch (error) {
    console.error(`Error ${action} crawl job:`, error);
    return NextResponse.json(
      { error: `Failed to ${action} job`, message: String(error) },
      { status: 500 },
    );
  }
}
