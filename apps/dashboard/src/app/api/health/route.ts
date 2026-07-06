/**
 * Health Check API Route
 * Returns the health status of the Dashboard and its dependent services
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.trips.sunpebblelabs.com';

async function checkService(url: string) {
  const start = Date.now();
  const response = await fetch(`${url}/health`, {
    signal: AbortSignal.timeout(2000),
  });

  if (!response.ok) {
    return { status: 'error' };
  }

  return {
    status: 'ok',
    latency: Date.now() - start,
  };
}

export async function GET() {
  const checks: Record<string, { status: string; latency?: number }> = {};

  // Check backend API health
  try {
    checks.api = await checkService(API_URL);
  }
  catch {
    checks.api = { status: 'error' };
  }

  // Overall status is ok if the unified backend API is healthy
  const overallStatus = checks.api?.status === 'ok' ? 'ok' : 'degraded';

  return Response.json(
    {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: overallStatus === 'ok' ? 200 : 503 },
  );
}
