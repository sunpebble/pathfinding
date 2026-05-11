import type { NextRequest } from 'next/server';
import { normalizeCrawlJob } from '@/lib/api/backend';
import { proxyBackendApiResponse } from '@/lib/api/proxy';

interface CrawlJobsResponse {
  data: Array<Record<string, unknown>>;
  pagination?: { total: number; limit: number; offset: number };
}

type CrawlJobClient = ReturnType<typeof normalizeCrawlJob>;

interface CrawlJobsClientResponse {
  data: CrawlJobClient[];
  pagination: { total: number; limit: number; offset: number };
}

interface CrawlJobClientResponse {
  data: CrawlJobClient;
}

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 100) : fallback;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = positiveInt(searchParams.get('limit'), 50);
  const backendParams = new URLSearchParams();

  for (const key of ['status', 'platform']) {
    const value = searchParams.get(key);
    if (value) {
      backendParams.set(key, value);
    }
  }
  backendParams.set('limit', String(limit));

  return proxyBackendApiResponse<CrawlJobsResponse, CrawlJobsClientResponse>(
    request,
    {
      endpoint: `/api/crawl-jobs?${backendParams.toString()}`,
      transform: (response) => {
        const jobs = response.data.map(normalizeCrawlJob);
        return {
          data: jobs,
          pagination: response.pagination ?? {
            total: jobs.length,
            limit,
            offset: 0,
          },
        };
      },
      fallbackError: 'Internal server error',
    },
  );
}

export async function POST(request: NextRequest) {
  return proxyBackendApiResponse<{ data: Record<string, unknown> }, CrawlJobClientResponse>(
    request,
    {
      endpoint: '/api/crawl-jobs',
      method: 'POST',
      body: async () => {
        const body = await request.json();
        return {
          name: body.name,
          platform: body.platform,
          jobType: body.job_type || 'full',
          config: body.config || {},
          scheduleCron: body.schedule_cron,
        };
      },
      transform: response => ({ data: normalizeCrawlJob(response.data) }),
      successStatus: 201,
      fallbackError: 'Failed to create job',
    },
  );
}
