import type { NextRequest } from 'next/server';
import { proxyBackendApiResponse } from '@/lib/api/proxy';

interface BackfillJobsResponse {
  data: { jobsCreated: number };
}

export async function POST(request: NextRequest) {
  return proxyBackendApiResponse<BackfillJobsResponse>(
    request,
    {
      endpoint: '/api/crawl-jobs/backfill-jobs',
      method: 'POST',
      body: async () => {
        const body = await request.json();
        return {
          fieldGapGuideIds: body.fieldGapGuideIds,
          destinationGapCities: body.destinationGapCities,
        };
      },
      successStatus: 201,
      fallbackError: 'Failed to create backfill jobs',
    },
  );
}
