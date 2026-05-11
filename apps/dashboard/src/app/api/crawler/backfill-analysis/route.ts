import type { NextRequest } from 'next/server';
import { proxyBackendApiResponse } from '@/lib/api/proxy';

interface BackfillAnalysisResponse {
  data: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  return proxyBackendApiResponse<BackfillAnalysisResponse>(
    request,
    {
      endpoint: '/api/crawl-jobs/backfill-analysis',
      method: 'POST',
      fallbackError: 'Failed to run backfill analysis',
    },
  );
}
