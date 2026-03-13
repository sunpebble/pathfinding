import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchBackendApi, normalizeTravelGuide } from '@/lib/api/backend';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const response = await fetchBackendApi<{ data: Record<string, unknown> }>(
      `/api/guides/${id}`,
      { method: 'GET' },
    );

    return NextResponse.json({
      data: normalizeTravelGuide(response.data),
    });
  }
  catch (error) {
    if (error instanceof Error && /Guide not found/i.test(error.message)) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    console.error('Error fetching guide:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
