import type { AuthVariables } from '../middleware/auth.js';
import { favoriteCollections, getDb } from '@pathfinding/database';
import { desc, eq } from 'drizzle-orm';
/**
 * Collections routes — user favorite collections.
 * Mirrors the Convex /api/collections HTTP endpoints.
 */
import { Hono } from 'hono';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { authRequired } from '../middleware/auth.js';

const app = new Hono<{ Variables: AuthVariables }>();

// ── GET / — List user's favorite collections ───────────
app.get('/', authRequired(), async (c) => {
  const db = getDb();
  const uid = Number(c.get('userId'));

  const collections = await db
    .select()
    .from(favoriteCollections)
    .where(eq(favoriteCollections.userId, uid))
    .orderBy(desc(favoriteCollections.sortOrder));

  return c.json(convertKeysToSnakeCase(collections));
});

export default app;
