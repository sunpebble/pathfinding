/**
 * Health check routes.
 */
import type { AppContext } from '../env.js';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';

const app = new Hono<AppContext>();

/** GET / — basic liveness probe. */
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/** GET /ready — readiness probe with DB connectivity check. */
app.get('/ready', async (c) => {
  try {
    const db = c.get('db');
    await db.execute(sql`SELECT 1`);
  }
  catch {
    return c.json({
      status: 'not_ready',
      reason: 'database_unavailable',
      timestamp: new Date().toISOString(),
    }, 503);
  }

  return c.json({
    status: 'ready',
    version: c.env.APP_VERSION ?? '0.0.1',
    timestamp: new Date().toISOString(),
  });
});

export default app;
