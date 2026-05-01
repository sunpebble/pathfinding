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
    const body = await request.json();

    const response = await fetchBackendApi<{
      data: { jobsCreated: number };
    }>('/api/crawl-jobs/backfill-jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fieldGapGuideIds: body.fieldGapGuideIds,
        destinationGapCities: body.destinationGapCities,
      }),
    });

    return NextResponse.json(response, { status: 201 });
  }
  catch (error) {
    console.error('Error creating backfill jobs:', error);
    return NextResponse.json(
      { error: 'Failed to create backfill jobs' },
      { status: 500 },
    );
  }
}
