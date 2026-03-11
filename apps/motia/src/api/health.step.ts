export const config = {
  type: 'api',
  name: 'HealthCheck',
  description: '健康检查 API',
  path: '/health',
  method: 'GET',
  emits: [],
  flows: ['system'],
};

export async function handler(_req: unknown, { logger }: { logger: { info: (msg: string, data?: unknown) => void } }) {
  const ollamaConfigured = !!process.env.OLLAMA_BASE_URL;
  const tidbConfigured = !!process.env.DATABASE_URL;
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

  let apiReachable = false;
  try {
    const response = await fetch(`${apiBaseUrl}/health`);
    apiReachable = response.ok;
  }
  catch {
    apiReachable = false;
  }

  logger.info('Health check', {
    ollamaConfigured,
    tidbConfigured,
    apiBaseUrl,
    apiReachable,
  });

  const ready = tidbConfigured && apiReachable;

  return {
    status: ready ? 200 : 503,
    body: {
      status: ready ? 'healthy' : 'unhealthy',
      service: 'motia-backend',
      timestamp: new Date().toISOString(),
      checks: {
        tidb: tidbConfigured ? 'configured' : 'missing configuration',
        api: apiReachable ? 'reachable' : 'unreachable',
        ollama: ollamaConfigured ? 'configured' : 'not configured',
      },
    },
  };
}
