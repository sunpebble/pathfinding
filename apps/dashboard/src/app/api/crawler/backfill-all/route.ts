import type { NextRequest } from 'next/server';
import { proxyBackendApiResponse } from '@/lib/api/proxy';

interface BackfillAllResponse {
  data: {
    analysis: {
      totalFieldGaps: number;
      totalDestinationGaps: number;
    };
    execution: {
      executed: number;
      totalProcessed: number;
      totalFailed: number;
    };
  };
}

export async function POST(request: NextRequest) {
  return proxyBackendApiResponse<BackfillAllResponse>(
    request,
    {
      endpoint: '/api/crawl-jobs/backfill-all',
      method: 'POST',
      fallbackError: 'Failed to execute full backfill',
    },
  );
}
