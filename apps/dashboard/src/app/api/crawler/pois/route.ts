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

  try {
    const backendParams = new URLSearchParams();
    const query = searchParams.get('query');
    const category = searchParams.get('category');
    const city = searchParams.get('city');
    const minQuality = searchParams.get('min_quality');

    if (query)
      backendParams.set('query', query);
    if (category)
      backendParams.set('category', category);
    if (city)
      backendParams.set('city', city);
    if (minQuality)
      backendParams.set('min_quality', minQuality);
    backendParams.set('limit', String(limit));

    const response = await fetchBackendApi<{ data: Array<Record<string, unknown>>; pagination?: { total: number } }>(
      `/api/pois?${backendParams.toString()}`,
      { method: 'GET' },
    );

    return NextResponse.json({
      data: response.data,
      pagination: response.pagination ?? {
        total: response.data.length,
        limit,
        offset: 0,
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
