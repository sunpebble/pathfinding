import { NextResponse } from 'next/server';
import { fetchBackendApi } from '@/lib/api/backend';

export async function POST() {
  try {
    const response = await fetchBackendApi<{
      data: {
        analysis: {
          totalFieldGaps: number;
          totalDestinationGaps: number;
        };
        execution: {
          executed: number;
          totalProcessed: number;
          totalFailed: number;
        };
      };
    }>('/api/crawl-jobs/backfill-all', {
      method: 'POST',
    });

    return NextResponse.json(response);
  }
  catch (error) {
    console.error('Error executing full backfill:', error);
    return NextResponse.json(
      { error: 'Failed to execute full backfill' },
      { status: 500 },
    );
  }
}
