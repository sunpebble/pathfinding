import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchBackendApi } from '@/lib/api/backend';

/** Extract a Bearer token from the Authorization header. */
function getAuthToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function GET(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const rawLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
  const limit
    = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, 100)
      : 50;
  const rawOffset = Number.parseInt(searchParams.get('offset') || '0', 10);
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0;

  try {
    const backendParams = new URLSearchParams();

    // D13: forward exactly what the Hono pois route reads — q (not query),
    // city (name), category, min_quality — plus pagination including offset.
    for (const key of ['q', 'category', 'city', 'min_quality'] as const) {
      const value = searchParams.get(key);
      if (value)
        backendParams.set(key, value);
    }
    backendParams.set('limit', String(limit));
    backendParams.set('offset', String(offset));

    const response = await fetchBackendApi<{ data: Array<Record<string, unknown>>; pagination?: { total: number } }>(
      `/api/pois?${backendParams.toString()}`,
      { method: 'GET' },
    );

    return NextResponse.json({
      data: response.data,
      pagination: response.pagination ?? {
        total: response.data.length,
        limit,
        offset,
      },
    });
  }
  catch (error) {
    console.error('Error fetching POIs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
