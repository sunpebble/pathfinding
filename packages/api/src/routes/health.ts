/**
 * Health check routes.
 */
import { Hono } from 'hono';

const app = new Hono();

/** GET / — basic liveness probe. */
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/** GET /ready — readiness probe (could check DB connectivity). */
app.get('/ready', (c) => {
  const appVersion
    = typeof process !== 'undefined' ? process.env.APP_VERSION : undefined;

  return c.json({
    status: 'ready',
    version: appVersion ?? '0.0.1',
    timestamp: new Date().toISOString(),
  });
});

export default app;
