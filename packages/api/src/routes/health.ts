/**
 * Health check routes.
 */
import { getDb } from '@pathfinding/database';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';

const app = new Hono();

/** GET / — basic liveness probe. */
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/** GET /ready — readiness probe with DB connectivity check. */
app.get('/ready', async (c) => {
  const appVersion
    = typeof process !== 'undefined' ? process.env.APP_VERSION : undefined;

  try {
    const db = getDb();
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
    version: appVersion ?? '0.0.1',
    timestamp: new Date().toISOString(),
  });
});

export default app;
