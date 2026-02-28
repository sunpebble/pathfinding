import type { AuthVariables } from '../middleware/auth.js';
import { zValidator } from '@hono/zod-validator';
import {
  createDb,
  itineraries,
  itineraryDays,
  itineraryItems,
} from '@pathfinding/database';
import { and, desc, eq } from 'drizzle-orm';
/**
 * Itineraries routes — CRUD for itineraries, days, and items.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { authRequired } from '../middleware/auth.js';

const app = new Hono<{ Variables: AuthVariables }>();

function getDb() {
  return createDb();
}

// ── GET / — List itineraries ───────────────────────────
app.get('/', async (c) => {
  const userId = c.req.query('userId');
  const visibility = c.req.query('visibility') ?? 'public';
  const limit = Number.parseInt(c.req.query('limit') ?? '20', 10);
  const offset = Number.parseInt(c.req.query('offset') ?? '0', 10);

  const db = getDb();

  let results;
  if (userId) {
    results = await db
      .select()
      .from(itineraries)
      .where(
        and(
          eq(itineraries.userId, Number(userId)),
          eq(itineraries.visibility, visibility),
        ),
      )
      .orderBy(desc(itineraries.createdAt))
      .limit(limit)
      .offset(offset);
  }
  else {
    results = await db
      .select()
      .from(itineraries)
      .where(eq(itineraries.visibility, 'public'))
      .orderBy(desc(itineraries.createdAt))
      .limit(limit)
      .offset(offset);
  }

  return c.json({
    data: convertKeysToSnakeCase(results),
    pagination: { limit, offset, total: results.length },
  });
});

// ── GET /:id — Get itinerary by ID ─────────────────────
app.get('/:id', async (c) => {
  const { id } = c.req.param();
  const db = getDb();

  const result = await db
    .select()
    .from(itineraries)
    .where(eq(itineraries.id, Number(id)))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: 'Itinerary not found' }, 404);
  }

  // Fetch days and items
  const days = await db
    .select()
    .from(itineraryDays)
    .where(eq(itineraryDays.itineraryId, Number(id)))
    .orderBy(itineraryDays.dayNumber);

  const dayIds = days.map(d => d.id);
  let items: (typeof itineraryItems.$inferSelect)[] = [];
  if (dayIds.length > 0) {
    // Fetch all items for all days
    for (const dayId of dayIds) {
      const dayItems = await db
        .select()
        .from(itineraryItems)
        .where(eq(itineraryItems.dayId, dayId))
        .orderBy(itineraryItems.orderIndex);
      items = items.concat(dayItems);
    }
  }

  return c.json({
    data: {
      ...convertKeysToSnakeCase(result[0]) as Record<string, unknown>,
      days: convertKeysToSnakeCase(
        days.map(day => ({
          ...day,
          items: items.filter(item => item.dayId === day.id),
        })),
      ),
    },
  });
});

// ── POST / — Create itinerary ──────────────────────────
const createItinerarySchema = z.object({
  userId: z.number(),
  title: z.string(),
  cityId: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  visibility: z.enum(['private', 'public', 'friends']).default('private'),
  coverImageUrl: z.string().optional(),
});

app.post('/', zValidator('json', createItinerarySchema), async (c) => {
  const body = c.req.valid('json');
  const db = getDb();

  const [result] = await db
    .insert(itineraries)
    .values({
      userId: body.userId,
      title: body.title,
      cityId: body.cityId,
      startDate: body.startDate,
      endDate: body.endDate,
      visibility: body.visibility,
      coverImageUrl: body.coverImageUrl ?? null,
    })
    .$returningId();

  return c.json({ data: { id: result!.id } }, 201);
});

// ── PATCH /:id — Update itinerary ──────────────────────
const updateItinerarySchema = z.object({
  title: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  visibility: z.enum(['private', 'public', 'friends']).optional(),
  coverImageUrl: z.string().optional(),
});

app.patch(
  '/:id',
  authRequired(),
  zValidator('json', updateItinerarySchema),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid('json');
    const db = getDb();

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined)
      updates.title = body.title;
    if (body.startDate !== undefined)
      updates.startDate = body.startDate;
    if (body.endDate !== undefined)
      updates.endDate = body.endDate;
    if (body.visibility !== undefined)
      updates.visibility = body.visibility;
    if (body.coverImageUrl !== undefined)
      updates.coverImageUrl = body.coverImageUrl;

    if (Object.keys(updates).length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    await db
      .update(itineraries)
      .set(updates)
      .where(eq(itineraries.id, Number(id)));

    return c.json({ success: true });
  },
);

// ── DELETE /:id — Delete itinerary ─────────────────────
app.delete('/:id', authRequired(), async (c) => {
  const { id } = c.req.param();
  const db = getDb();

  // Delete items first, then days, then itinerary
  const days = await db
    .select({ id: itineraryDays.id })
    .from(itineraryDays)
    .where(eq(itineraryDays.itineraryId, Number(id)));

  for (const day of days) {
    await db.delete(itineraryItems).where(eq(itineraryItems.dayId, day.id));
  }

  await db.delete(itineraryDays).where(eq(itineraryDays.itineraryId, Number(id)));
  await db.delete(itineraries).where(eq(itineraries.id, Number(id)));

  return c.json({ success: true });
});

// ── POST /:id/days — Add a day to itinerary ────────────
const createDaySchema = z.object({
  dayNumber: z.number(),
  date: z.string(),
});

app.post(
  '/:id/days',
  zValidator('json', createDaySchema),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid('json');
    const db = getDb();

    const [result] = await db
      .insert(itineraryDays)
      .values({
        itineraryId: Number(id),
        dayNumber: body.dayNumber,
        date: body.date,
      })
      .$returningId();

    return c.json({ data: { id: result!.id } }, 201);
  },
);

// ── POST /:id/days/:dayId/items — Add item to day ──────
const createItemSchema = z.object({
  poiId: z.number(),
  orderIndex: z.number(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  transportMode: z.string().default('walking'),
  notes: z.string().optional(),
});

app.post(
  '/:id/days/:dayId/items',
  zValidator('json', createItemSchema),
  async (c) => {
    const { dayId } = c.req.param();
    const body = c.req.valid('json');
    const db = getDb();

    const [result] = await db
      .insert(itineraryItems)
      .values({
        dayId: Number(dayId),
        poiId: body.poiId,
        orderIndex: body.orderIndex,
        startTime: body.startTime ?? null,
        endTime: body.endTime ?? null,
        transportMode: body.transportMode,
        notes: body.notes ?? null,
      })
      .$returningId();

    return c.json({ data: { id: result!.id } }, 201);
  },
);

export default app;
