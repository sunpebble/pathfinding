import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { proxyBackendApiResponse } from '@/lib/api/proxy';

/**
 * PATCH /api/crawler/guides/:id/poi-coordinates
 *
 * Proxies manual POI coordinate corrections to the Hono backend. Before this
 * route existed the dashboard PATCHed `/api/guides/...` directly, which has
 * neither a route handler nor a rewrite — corrections never reached the
 * backend (D13 read/write loop fix).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  }
  catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  return proxyBackendApiResponse<{ success: boolean }>(
    request,
    {
      endpoint: `/api/guides/${encodeURIComponent(id)}/poi-coordinates`,
      method: 'PATCH',
      body,
      fallbackError: 'Internal server error',
    },
  );
}
