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
  const convexConfigured = !!process.env.CONVEX_URL;

  logger.info('Health check', { ollamaConfigured, convexConfigured });

  return {
    status: convexConfigured ? 200 : 503,
    body: {
      status: convexConfigured ? 'healthy' : 'unhealthy',
      service: 'motia-backend',
      timestamp: new Date().toISOString(),
      checks: {
        database: convexConfigured ? 'connected' : 'disconnected',
        ollama: ollamaConfigured ? 'configured' : 'not configured',
      },
    },
  };
}
