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
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    if (type)
      backendParams.set('type', type);
    if (status)
      backendParams.set('status', status);
    backendParams.set('limit', String(limit));

    const response = await fetchBackendApi<{ data: Array<Record<string, unknown>>; pagination?: { total: number } }>(
      `/api/training-datasets?${backendParams.toString()}`,
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
    console.error('Error fetching training datasets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
