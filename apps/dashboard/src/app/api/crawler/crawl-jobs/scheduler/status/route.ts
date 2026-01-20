import { NextResponse } from 'next/server';

// Scheduler status is managed by the AI service, not Convex
// Return a mock status for now
export async function GET() {
  return NextResponse.json({
    data: {
      tasks: [],
      workerStatus: {
        running: 0,
        pending: 0,
        activeJobs: [],
        maxConcurrent: 5,
        runningJobs: 0,
      },
    },
  });
}
