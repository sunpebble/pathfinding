import type { AuthVariables } from '../middleware/auth.js';
import { createDb, expenses } from '@pathfinding/database';
import { desc, eq } from 'drizzle-orm';
/**
 * Expenses routes.
 * Mirrors the Convex /api/expenses HTTP endpoints.
 */
import { Hono } from 'hono';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { ApiError } from '../middleware/error-handler.js';

const app = new Hono<{ Variables: AuthVariables }>();

function getDb() {
  return createDb();
}

// ── GET / — Get expenses for an itinerary ──────────────
app.get('/', async (c) => {
  const itineraryId = c.req.query('itineraryId');

  if (!itineraryId) {
    throw new ApiError(400, '缺少itineraryId参数');
  }

  const db = getDb();
  const iid = Number(itineraryId);

  const items = await db
    .select()
    .from(expenses)
    .where(eq(expenses.itineraryId, iid))
    .orderBy(desc(expenses.createdAt));

  return c.json(convertKeysToSnakeCase(items));
});

// ── POST / — Add an expense ───────────────────────────
app.post('/', async (c) => {
  const body = await c.req.json();
  const { itineraryId, amount, category, description, date, currency } = body;

  if (!itineraryId || amount === undefined || !category) {
    throw new ApiError(400, '缺少必要参数');
  }

  const db = getDb();

  const result = await db.insert(expenses).values({
    itineraryId: Number(itineraryId),
    userId: 0, // Will be set from auth in production
    categoryId: Number(category),
    amount,
    description: description ?? '',
    date: date ?? new Date().toISOString().split('T')[0]!,
    currency: currency ?? 'CNY',
  });

  return c.json({ id: Number(result[0].insertId) }, 201);
});

export default app;
