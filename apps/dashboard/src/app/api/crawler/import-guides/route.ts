import { NextResponse } from 'next/server';
import { fetchBackendApi } from '@/lib/api/backend';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetchBackendApi<{
      data: {
        imported: number;
        failed: number;
        skipped: number;
        results: Array<{ url: string; success: boolean; message: string; guideId?: number }>;
      };
    }>('/api/crawl-jobs/import-guides', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return NextResponse.json(response);
  }
  catch (error) {
    console.error('Error importing guides:', error);
    return NextResponse.json(
      { error: 'Failed to import guides' },
      { status: 500 },
    );
  }
}
