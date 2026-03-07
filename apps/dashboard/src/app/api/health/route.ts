/**
 * Health Check API Route
 * Returns the health status of the Dashboard and its dependent services
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL;

async function checkService(url: string) {
  const start = Date.now();
  const response = await fetch(`${url}/health`, {
    signal: AbortSignal.timeout(5000),
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

  // Check AI Service health when configured
  if (AI_SERVICE_URL) {
    try {
      checks.aiService = await checkService(AI_SERVICE_URL);
    }
    catch {
      checks.aiService = { status: 'error' };
    }
  }

  // Overall status is ok if the primary backend API is healthy
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
