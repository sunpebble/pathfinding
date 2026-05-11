import type { NextRequest } from 'next/server';
import { normalizeTravelGuide } from '@/lib/api/backend';
import { proxyBackendApiResponse } from '@/lib/api/proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyBackendApiResponse<{ data: Record<string, unknown> }>(
    request,
    {
      endpoint: `/api/guides/${encodeURIComponent(id)}`,
      transform: response => ({ data: normalizeTravelGuide(response.data) }),
      fallbackError: 'Internal server error',
    },
  );
}
