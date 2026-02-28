import type { AuthVariables } from '../middleware/auth.js';
import { createDb, favoriteCollections } from '@pathfinding/database';
import { desc, eq } from 'drizzle-orm';
/**
 * Collections routes — user favorite collections.
 * Mirrors the Convex /api/collections HTTP endpoints.
 */
import { Hono } from 'hono';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { ApiError } from '../middleware/error-handler.js';

const app = new Hono<{ Variables: AuthVariables }>();

function getDb() {
  return createDb();
}

// ── GET / — List user's favorite collections ───────────
app.get('/', async (c) => {
  const userId = c.req.query('userId');

  if (!userId) {
    throw new ApiError(400, '缺少userId参数');
  }

  const db = getDb();
  const uid = Number(userId);

  const collections = await db
    .select()
    .from(favoriteCollections)
    .where(eq(favoriteCollections.userId, uid))
    .orderBy(desc(favoriteCollections.sortOrder));

  return c.json(convertKeysToSnakeCase(collections));
});

export default app;
