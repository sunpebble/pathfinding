/**
 * Health Check API Route
 * Returns the health status of the Dashboard and its dependent services
 */

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:3001";

export async function GET() {
  const checks: Record<string, { status: string; latency?: number }> = {};

  // Check AI Service health
  try {
    const start = Date.now();
    const response = await fetch(`${AI_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;

    if (response.ok) {
      checks.aiService = { status: "ok", latency };
    } else {
      checks.aiService = { status: "error" };
    }
  } catch {
    checks.aiService = { status: "error" };
  }

  // Overall status is ok if AI Service is healthy
  const overallStatus = checks.aiService?.status === "ok" ? "ok" : "degraded";

  return Response.json({
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
  });
}
