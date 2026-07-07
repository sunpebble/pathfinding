import type { AppContext } from '../env.js';
import { zValidator } from '@hono/zod-validator';
import { itineraries, itineraryBudgets } from '@pathfinding/database';
import { and, eq } from 'drizzle-orm';
/**
 * Budgets & Expenses routes.
 * Mirrors the Convex /api/budgets and /api/expenses HTTP endpoints.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { authRequired } from '../middleware/auth.js';
import { ApiError } from '../middleware/error-handler.js';

const app = new Hono<AppContext>();

// ── GET /budgets — Get budget for an itinerary ─────────
app.get('/', authRequired(), async (c) => {
  const itineraryId = c.req.query('itineraryId');
  const userId = Number(c.get('userId'));

  if (!itineraryId) {
    throw new ApiError(400, '缺少itineraryId参数');
  }

  const db = c.get('db');
  const iid = Number(itineraryId);

  // Verify the user owns this itinerary
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

  const budget = await db
    .select()
    .from(itineraryBudgets)
    .where(eq(itineraryBudgets.itineraryId, iid))
    .limit(1);

  return c.json({ data: budget[0] ? convertKeysToSnakeCase(budget[0]) : null });
});

// ── POST /budgets — Create or update budget ────────────
const createBudgetSchema = z.object({
  itineraryId: z.number(),
  totalBudget: z.number(),
  currency: z.string().optional(),
  categoryBudgets: z.record(z.string(), z.number()).optional(),
});

app.post('/', authRequired(), zValidator('json', createBudgetSchema), async (c) => {
  const { itineraryId, totalBudget, currency, categoryBudgets } = c.req.valid('json');

  const db = c.get('db');
  const iid = Number(itineraryId);
  const uid = Number(c.get('userId'));

  // Verify the user owns this itinerary
  const itinerary = await db
    .select({ id: itineraries.id })
    .from(itineraries)
    .where(
      and(
        eq(itineraries.id, iid),
        eq(itineraries.userId, uid),
      ),
    )
    .limit(1);

  if (!itinerary[0]) {
    throw new ApiError(403, '行程不存在或无权访问');
  }

  // Upsert: check if budget exists
  const existing = await db
    .select()
    .from(itineraryBudgets)
    .where(eq(itineraryBudgets.itineraryId, iid))
    .limit(1);

  let budgetId: number;

  if (existing[0]) {
    await db
      .update(itineraryBudgets)
      .set({
        totalBudget,
        currency: currency ?? 'CNY',
        categoryBudgets: categoryBudgets ?? {},
        updatedAt: new Date(),
      })
      .where(eq(itineraryBudgets.id, existing[0].id));
    budgetId = Number(existing[0].id);
  }
  else {
    const result = await db.insert(itineraryBudgets).values({
      itineraryId: iid,
      userId: uid,
      totalBudget,
      currency: currency ?? 'CNY',
      categoryBudgets: categoryBudgets ?? {},
    });
    budgetId = Number(result[0].insertId);
  }

  return c.json({ id: budgetId }, 201);
});

export default app;
