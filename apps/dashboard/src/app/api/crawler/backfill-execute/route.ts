import type { NextRequest } from 'next/server';
import { proxyBackendApiResponse } from '@/lib/api/proxy';

interface BackfillExecuteResponse {
  data: {
    executed: number;
    totalProcessed: number;
    totalFailed: number;
  };
}

export async function POST(request: NextRequest) {
  return proxyBackendApiResponse<BackfillExecuteResponse>(
    request,
    {
      endpoint: '/api/crawl-jobs/backfill-execute',
      method: 'POST',
      fallbackError: 'Failed to execute backfill jobs',
    },
  );
}
