import type { NextRequest } from 'next/server';
import { proxyBackendApiResponse } from '@/lib/api/proxy';

interface DiscoverGuidesResponse {
  data: {
    platform: string;
    city: string;
    totalFound: number;
    newGuides: Array<{ url: string; title?: string }>;
    existingCount: number;
  };
}

export async function POST(request: NextRequest) {
  return proxyBackendApiResponse<DiscoverGuidesResponse>(
    request,
    {
      endpoint: '/api/crawl-jobs/discover-guides',
      method: 'POST',
      body: async () => request.json(),
      fallbackError: 'Failed to discover guides',
    },
  );
}
