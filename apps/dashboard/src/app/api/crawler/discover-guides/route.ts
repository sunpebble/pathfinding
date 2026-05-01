import { NextResponse } from 'next/server';
import { fetchBackendApi } from '@/lib/api/backend';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetchBackendApi<{
      data: {
        platform: string;
        city: string;
        totalFound: number;
        newGuides: Array<{ url: string; title?: string }>;
        existingCount: number;
      };
    }>('/api/crawl-jobs/discover-guides', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return NextResponse.json(response);
  }
  catch (error) {
    console.error('Error discovering guides:', error);
    return NextResponse.json(
      { error: 'Failed to discover guides' },
      { status: 500 },
    );
  }
}
