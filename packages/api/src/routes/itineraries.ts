import type { Database } from '@pathfinding/database';
import type { AppContext } from '../env.js';
import { zValidator } from '@hono/zod-validator';
import {
  itineraries,
  itineraryDays,
  itineraryItems,
} from '@pathfinding/database';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
/**
 * Itineraries routes — CRUD for itineraries, days, and items.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { parsePagination, parsePositiveInt } from '../lib/params.js';
import { jsonData, jsonList, jsonOk } from '../lib/response.js';
import { authOptional, authRequired } from '../middleware/auth.js';
import { ApiError } from '../middleware/error-handler.js';
import {
  findAccessible,
  findEditable,
  findScopedDay,
  findScopedItem,
  findScopedItems,
} from '../services/itinerary-access.service.js';

const app = new Hono<AppContext>();
type ItineraryRow = typeof itineraries.$inferSelect;

async function getItineraryDto(db: Database, itineraryId: number) {
  const result = await db
    .select()
    .from(itineraries)
    .where(eq(itineraries.id, itineraryId))
    .limit(1);

  if (!result[0]) {
    return null;
  }

  const days = await db
    .select()
    .from(itineraryDays)
    .where(eq(itineraryDays.itineraryId, itineraryId))
    .orderBy(itineraryDays.dayNumber);

  const dayIds = days.map(day => day.id);
  const items = dayIds.length > 0
    ? await db
        .select()
        .from(itineraryItems)
        .where(inArray(itineraryItems.dayId, dayIds))
        .orderBy(itineraryItems.orderIndex)
    : [];

  return convertKeysToSnakeCase({
    ...result[0],
    days: days.map(day => ({
      ...day,
      items: items.filter(item => item.dayId === day.id),
    })),
  });
}

// ── GET / — List itineraries ───────────────────────────
app.get('/', authOptional(), async (c) => {
  const userId = c.req.query('userId');
  const visibility = c.req.query('visibility');
  const { limit, offset } = parsePagination(
    c.req.query('limit'),
    c.req.query('offset'),
  );
  const authUserId = c.get('userId');

  const db = c.get('db');

  let whereClause;
  if (userId) {
    if (!authUserId || authUserId !== userId) {
      return c.json({ error: '行程访问被拒绝' }, 403);
    }

    whereClause = visibility && visibility !== 'all'
      ? and(
          eq(itineraries.userId, Number(userId)),
          eq(itineraries.visibility, visibility),
        )
      : eq(itineraries.userId, Number(userId));
  }
  else {
    whereClause = eq(itineraries.visibility, 'public');
  }

  const [results, countResult] = await Promise.all([
    db
      .select()
      .from(itineraries)
      .where(whereClause)
      .orderBy(desc(itineraries.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(itineraries)
      .where(whereClause),
  ]);

  return jsonList(c, convertKeysToSnakeCase(results) as ItineraryRow[], { limit, offset }, countResult[0]?.count ?? 0);
});

// ── GET /:id — Get itinerary by ID ─────────────────────
app.get('/:id', authOptional(), async (c) => {
  const itineraryId = parsePositiveInt(c.req.param('id'));
  if (!itineraryId) {
    return c.json({ error: 'Invalid ID' }, 400);
  }
  const db = c.get('db');
  const authUserId = c.get('userId');

  const result = await db
    .select()
    .from(itineraries)
    .where(eq(itineraries.id, itineraryId))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: '行程不存在' }, 404);
  }

  const itinerary = result[0]!;
  if (itinerary.visibility !== 'public') {
    if (!authUserId) {
      throw new ApiError(401, '需要授权令牌');
    }

    const access = await findAccessible(db, itinerary.id, Number.parseInt(authUserId, 10));
    if (!access) {
      return c.json({ error: '行程不存在或无权访问' }, 403);
    }
  }

  const dto = await getItineraryDto(db, itineraryId);
  return jsonData(c, dto);
});

// ── POST / — Create itinerary ──────────────────────────
const createItinerarySchema = z.object({
  title: z.string(),
  cityId: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  visibility: z.enum(['private', 'public', 'friends']).default('private'),
  coverImageUrl: z.string().optional(),
});

app.post('/', authRequired(), zValidator('json', createItinerarySchema), async (c) => {
  const body = c.req.valid('json');
  const userId = Number(c.get('userId'));
  const db = c.get('db');

  const [result] = await db
    .insert(itineraries)
    .values({
      userId,
      title: body.title,
      cityId: body.cityId,
      startDate: body.startDate,
      endDate: body.endDate,
      visibility: body.visibility,
      coverImageUrl: body.coverImageUrl ?? null,
    })
    .returning({ id: itineraries.id });

  return jsonData(c, { id: result!.id }, 201);
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
    const authUserId = parsePositiveInt(c.get('userId'));
    const body = c.req.valid('json');
    const db = c.get('db');

    if (!authUserId) {
      return c.json({ error: '无效的认证用户' }, 401);
    }

    const itineraryId = parsePositiveInt(c.req.param('id'));
    if (!itineraryId) {
      return c.json({ error: 'Invalid ID' }, 400);
    }

    const ownedItinerary = await db
      .select({ id: itineraries.id })
      .from(itineraries)
      .where(
        and(
          eq(itineraries.id, itineraryId),
          eq(itineraries.userId, authUserId),
        ),
      )
      .limit(1);

    if (!ownedItinerary[0]) {
      return c.json({ error: '行程不存在或无权访问' }, 403);
    }

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
      return c.json({ error: '没有需要更新的字段' }, 400);
    }

    await db
      .update(itineraries)
      .set(updates)
      .where(eq(itineraries.id, itineraryId));

    return jsonOk(c);
  },
);

// ── DELETE /:id — Delete itinerary ─────────────────────
app.delete('/:id', authRequired(), async (c) => {
  const authUserId = parsePositiveInt(c.get('userId'));
  const db = c.get('db');

  if (!authUserId) {
    return c.json({ error: '无效的认证用户' }, 401);
  }

  const itineraryId = parsePositiveInt(c.req.param('id'));
  if (!itineraryId) {
    return c.json({ error: 'Invalid ID' }, 400);
  }

  const ownedItinerary = await db
    .select({ id: itineraries.id })
    .from(itineraries)
    .where(
      and(
        eq(itineraries.id, itineraryId),
        eq(itineraries.userId, authUserId),
      ),
    )
    .limit(1);

  if (!ownedItinerary[0]) {
    return c.json({ error: '行程不存在或无权访问' }, 403);
  }

  const days = await db
    .select({ id: itineraryDays.id })
    .from(itineraryDays)
    .where(eq(itineraryDays.itineraryId, itineraryId));

  const dayIds = days.map(d => d.id);
  await db.transaction(async (tx) => {
    if (dayIds.length > 0) {
      await tx
        .delete(itineraryItems)
        .where(inArray(itineraryItems.dayId, dayIds));
    }
    await tx
      .delete(itineraryDays)
      .where(eq(itineraryDays.itineraryId, itineraryId));
    await tx.delete(itineraries).where(eq(itineraries.id, itineraryId));
  });

  return jsonOk(c);
});

// ── POST /:id/days — Add a day to itinerary ────────────
const createDaySchema = z.object({
  dayNumber: z.number(),
  date: z.string(),
});

app.post('/:id/days', authRequired(), zValidator('json', createDaySchema), async (c) => {
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const authUserId = parsePositiveInt(c.get('userId'));
  const db = c.get('db');

  if (!authUserId) {
    return c.json({ error: '无效的认证用户' }, 401);
  }

  const itineraryId = parsePositiveInt(id);
  if (!itineraryId) {
    return c.json({ error: '无效的行程ID' }, 400);
  }

  const editableItinerary = await findEditable(db, itineraryId, authUserId);
  if (!editableItinerary) {
    return c.json({ error: '行程不存在或无权访问' }, 403);
  }

  const [result] = await db
    .insert(itineraryDays)
    .values({
      itineraryId,
      dayNumber: body.dayNumber,
      date: body.date,
    })
    .returning({ id: itineraryDays.id });

  return jsonData(c, { id: result!.id }, 201);
});

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
  authRequired(),
  zValidator('json', createItemSchema),
  async (c) => {
    const itineraryId = parsePositiveInt(c.req.param('id'));
    const dayId = parsePositiveInt(c.req.param('dayId'));
    const authUserId = parsePositiveInt(c.get('userId'));
    const body = c.req.valid('json');
    const db = c.get('db');

    if (!authUserId) {
      return c.json({ error: '无效的认证用户' }, 401);
    }

    if (!itineraryId || !dayId) {
      return c.json({ error: '无效的行程项目路径' }, 400);
    }

    const editableItinerary = await findEditable(db, itineraryId, authUserId);
    if (!editableItinerary) {
      return c.json({ error: '行程不存在或无权访问' }, 403);
    }

    const scopedDay = await findScopedDay(db, itineraryId, dayId);
    if (!scopedDay) {
      return c.json({ error: '行程日不存在' }, 404);
    }

    const [result] = await db
      .insert(itineraryItems)
      .values({
        dayId,
        poiId: body.poiId,
        orderIndex: body.orderIndex,
        startTime: body.startTime ?? null,
        endTime: body.endTime ?? null,
        transportMode: body.transportMode,
        notes: body.notes ?? null,
      })
      .returning({ id: itineraryItems.id });

    return jsonData(c, { id: result!.id }, 201);
  },
);

const updateItemSchema = z.object({
  poiId: z.number().optional(),
  orderIndex: z.number().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  transportMode: z.string().optional(),
  notes: z.string().nullable().optional(),
});

const reorderItemsSchema = z.object({
  itemIds: z.array(z.number().int().positive()).min(1),
});

app.patch(
  '/:id/days/:dayId/items/reorder',
  authRequired(),
  zValidator('json', reorderItemsSchema),
  async (c) => {
    const itineraryId = parsePositiveInt(c.req.param('id'));
    const dayId = parsePositiveInt(c.req.param('dayId'));
    const authUserId = parsePositiveInt(c.get('userId'));
    const body = c.req.valid('json');
    const db = c.get('db');

    if (!authUserId) {
      return c.json({ error: '无效的认证用户' }, 401);
    }

    if (!itineraryId || !dayId) {
      return c.json({ error: '无效的行程项目路径' }, 400);
    }

    const editableItinerary = await findEditable(db, itineraryId, authUserId);
    if (!editableItinerary) {
      return c.json({ error: '行程不存在或无权访问' }, 403);
    }

    const scopedDay = await findScopedDay(db, itineraryId, dayId);
    if (!scopedDay) {
      return c.json({ error: '行程日不存在' }, 404);
    }

    const scopedItems = await findScopedItems(db, dayId, body.itemIds);
    if (scopedItems.length !== body.itemIds.length) {
      return c.json({ error: '一个或多个行程项目未找到' }, 404);
    }

    await db.transaction(async (tx) => {
      await Promise.all(
        body.itemIds.map((itemId, orderIndex) => tx
          .update(itineraryItems)
          .set({ orderIndex })
          .where(eq(itineraryItems.id, itemId))),
      );
    });

    const itinerary = await getItineraryDto(db, itineraryId);
    return jsonData(c, itinerary);
  },
);

app.patch(
  '/:id/days/:dayId/items/:itemId',
  authRequired(),
  zValidator('json', updateItemSchema),
  async (c) => {
    const itineraryId = parsePositiveInt(c.req.param('id'));
    const dayId = parsePositiveInt(c.req.param('dayId'));
    const itemId = parsePositiveInt(c.req.param('itemId'));
    const authUserId = parsePositiveInt(c.get('userId'));
    const body = c.req.valid('json');
    const db = c.get('db');

    if (!authUserId) {
      return c.json({ error: '无效的认证用户' }, 401);
    }

    if (!itineraryId || !dayId || !itemId) {
      return c.json({ error: '无效的行程项目路径' }, 400);
    }

    const editableItinerary = await findEditable(db, itineraryId, authUserId);
    if (!editableItinerary) {
      return c.json({ error: '行程不存在或无权访问' }, 403);
    }

    const scopedDay = await findScopedDay(db, itineraryId, dayId);
    if (!scopedDay) {
      return c.json({ error: '行程日不存在' }, 404);
    }

    const scopedItem = await findScopedItem(db, dayId, itemId);
    if (!scopedItem) {
      return c.json({ error: '行程项目不存在' }, 404);
    }

    const updates: Record<string, unknown> = {};
    if (body.poiId !== undefined)
      updates.poiId = body.poiId;
    if (body.orderIndex !== undefined)
      updates.orderIndex = body.orderIndex;
    if (body.startTime !== undefined)
      updates.startTime = body.startTime;
    if (body.endTime !== undefined)
      updates.endTime = body.endTime;
    if (body.transportMode !== undefined)
      updates.transportMode = body.transportMode;
    if (body.notes !== undefined)
      updates.notes = body.notes;

    if (Object.keys(updates).length === 0) {
      return c.json({ error: '没有需要更新的字段' }, 400);
    }

    await db
      .update(itineraryItems)
      .set(updates)
      .where(eq(itineraryItems.id, itemId));

    const itinerary = await getItineraryDto(db, itineraryId);
    return jsonData(c, itinerary);
  },
);

app.delete('/:id/days/:dayId/items/:itemId', authRequired(), async (c) => {
  const itineraryId = parsePositiveInt(c.req.param('id'));
  const dayId = parsePositiveInt(c.req.param('dayId'));
  const itemId = parsePositiveInt(c.req.param('itemId'));
  const authUserId = parsePositiveInt(c.get('userId'));
  const db = c.get('db');

  if (!authUserId) {
    return c.json({ error: '无效的认证用户' }, 401);
  }

  if (!itineraryId || !dayId || !itemId) {
    return c.json({ error: '无效的行程项目路径' }, 400);
  }

  const editableItinerary = await findEditable(db, itineraryId, authUserId);
  if (!editableItinerary) {
    return c.json({ error: '行程不存在或无权访问' }, 403);
  }

  const scopedDay = await findScopedDay(db, itineraryId, dayId);
  if (!scopedDay) {
    return c.json({ error: '行程日不存在' }, 404);
  }

  const scopedItem = await findScopedItem(db, dayId, itemId);
  if (!scopedItem) {
    return c.json({ error: '行程项目不存在' }, 404);
  }

  await db.delete(itineraryItems).where(eq(itineraryItems.id, itemId));

  const itinerary = await getItineraryDto(db, itineraryId);
  return c.json({ success: true, data: itinerary });
});

app.delete('/:id/days/:dayId', authRequired(), async (c) => {
  const itineraryId = parsePositiveInt(c.req.param('id'));
  const dayId = parsePositiveInt(c.req.param('dayId'));
  const authUserId = parsePositiveInt(c.get('userId'));
  const db = c.get('db');

  if (!authUserId) {
    return c.json({ error: '无效的认证用户' }, 401);
  }

  if (!itineraryId || !dayId) {
    return c.json({ error: '无效的行程日路径' }, 400);
  }

  const editableItinerary = await findEditable(db, itineraryId, authUserId);
  if (!editableItinerary) {
    return c.json({ error: '行程不存在或无权访问' }, 403);
  }

  const scopedDay = await findScopedDay(db, itineraryId, dayId);
  if (!scopedDay) {
    return c.json({ error: '行程日不存在' }, 404);
  }

  await db.transaction(async (tx) => {
    await tx.delete(itineraryItems).where(eq(itineraryItems.dayId, dayId));
    await tx.delete(itineraryDays).where(eq(itineraryDays.id, dayId));
  });

  const itinerary = await getItineraryDto(db, itineraryId);
  return c.json({ success: true, data: itinerary });
});

export default app;
