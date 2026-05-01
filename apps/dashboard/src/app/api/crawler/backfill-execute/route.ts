import { NextResponse } from 'next/server';
import { fetchBackendApi } from '@/lib/api/backend';

export async function POST() {
  try {
    const response = await fetchBackendApi<{
      data: {
        executed: number;
        totalProcessed: number;
        totalFailed: number;
      };
    }>('/api/crawl-jobs/backfill-execute', {
      method: 'POST',
    });

    return NextResponse.json(response);
  }
  catch (error) {
    console.error('Error executing backfill jobs:', error);
    return NextResponse.json(
      { error: 'Failed to execute backfill jobs' },
      { status: 500 },
    );
  }
}
