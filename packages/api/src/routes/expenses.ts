import type { AppContext } from '../env.js';
import { zValidator } from '@hono/zod-validator';
import { expenses, itineraries } from '@pathfinding/database';
import { and, desc, eq } from 'drizzle-orm';
/**
 * Expenses routes.
 * Mirrors the Convex /api/expenses HTTP endpoints.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { authRequired } from '../middleware/auth.js';
import { ApiError } from '../middleware/error-handler.js';
import { findEditable } from '../services/itinerary-access.service.js';

const app = new Hono<AppContext>();

// ── GET / — Get expenses for an itinerary ──────────────
app.get('/', authRequired(), async (c) => {
  const itineraryId = c.req.query('itineraryId');
  const userId = Number(c.get('userId'));

  if (!itineraryId) {
    throw new ApiError(400, '缺少itineraryId参数');
  }

  const db = c.get('db');
  const iid = Number(itineraryId);

  // Verify the user owns or has access to this itinerary
  const itinerary = await db
    .select({ id: itineraries.id })
    .from(itineraries)
    .where(
      and(
        eq(itineraries.id, iid),
        eq(itineraries.userId, userId),
      ),
    )
    .limit(1);

  if (!itinerary[0]) {
    throw new ApiError(403, '行程不存在或无权访问');
  }

  const items = await db
    .select()
    .from(expenses)
    .where(eq(expenses.itineraryId, iid))
    .orderBy(desc(expenses.createdAt));

  return c.json(convertKeysToSnakeCase(items));
});

// ── POST / — Add an expense ───────────────────────────
const createExpenseSchema = z.object({
  itineraryId: z.number(),
  amount: z.number(),
  category: z.number(),
  description: z.string().optional(),
  date: z.string().optional(),
  currency: z.string().optional(),
});

app.post('/', authRequired(), zValidator('json', createExpenseSchema), async (c) => {
  const { itineraryId, amount, category, description, date, currency } = c.req.valid('json');
  const userId = Number(c.get('userId'));

  const db = c.get('db');
  const editableItinerary = await findEditable(db, Number(itineraryId), userId);

  if (!editableItinerary) {
    throw new ApiError(403, '行程不存在或无权编辑');
  }

  const [result] = await db.insert(expenses).values({
    itineraryId: Number(itineraryId),
    userId,
    categoryId: Number(category),
    amount,
    description: description ?? '',
    date: date ?? new Date().toISOString().split('T')[0]!,
    currency: currency ?? 'CNY',
  }).returning({ id: expenses.id });

  return c.json({ id: result!.id }, 201);
});

export default app;
