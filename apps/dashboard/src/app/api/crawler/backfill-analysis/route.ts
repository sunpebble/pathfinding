import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchBackendApi } from '@/lib/api/backend';

/** Extract a Bearer token from the Authorization header. */
function getAuthToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function POST(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetchBackendApi<{
      data: Record<string, unknown>;
    }>('/api/crawl-jobs/backfill-analysis', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return NextResponse.json(response);
  }
  catch (error) {
    console.error('Error running backfill analysis:', error);
    return NextResponse.json(
      { error: 'Failed to run backfill analysis' },
      { status: 500 },
    );
  }
}
