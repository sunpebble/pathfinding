import type { NextRequest } from 'next/server';
import { proxyBackendApiResponse } from '@/lib/api/proxy';

interface ImportGuidesResponse {
  data: {
    imported: number;
    failed: number;
    skipped: number;
    results: Array<{ url: string; success: boolean; message: string; guideId?: number }>;
  };
}

export async function POST(request: NextRequest) {
  return proxyBackendApiResponse<ImportGuidesResponse>(
    request,
    {
      endpoint: '/api/crawl-jobs/import-guides',
      method: 'POST',
      body: async () => request.json(),
      fallbackError: 'Failed to import guides',
    },
  );
}
