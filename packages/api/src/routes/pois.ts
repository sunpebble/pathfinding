import type { Database } from '@pathfinding/database';
import type { AppContext } from '../env.js';
import { zValidator } from '@hono/zod-validator';
import { cities, pois } from '@pathfinding/database';
import { and, eq, gte, inArray, like, or, sql } from 'drizzle-orm';
/**
 * POI routes — list, get by ID, search, nearby.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { escapeLikePattern, parsePagination, parsePositiveInt } from '../lib/params.js';
import { jsonData, jsonList } from '../lib/response.js';

const app = new Hono<AppContext>();

/** D13 list parameters — q/cityId/city/category/min_quality validated via Zod. */
const listPoisQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  cityId: z.coerce.number().int().positive().optional(),
  city: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  min_quality: z.coerce.number().min(0).max(5).optional(),
});

/**
 * Resolve a city name (Chinese or English) to city IDs. An unknown name
 * yields an empty list — callers must return an empty result instead of
 * silently dropping the filter.
 */
async function findCityIdsByName(db: Database, cityName: string): Promise<number[]> {
  const rows = await db
    .select({ id: cities.id })
    .from(cities)
    .where(or(eq(cities.name, cityName), eq(cities.nameEn, cityName)));

  return rows.map(row => row.id);
}

// ── GET / — Search/list POIs ───────────────────────────
app.get('/', zValidator('query', listPoisQuerySchema), async (c) => {
  const { q, cityId, city, category, min_quality: minQuality } = c.req.valid('query');
  const { limit, offset } = parsePagination(
    c.req.query('limit'),
    c.req.query('offset'),
  );

  const db = c.get('db');

  const conditions = [];
  if (q) {
    conditions.push(like(pois.name, `%${escapeLikePattern(q)}%`));
  }
  if (cityId !== undefined) {
    conditions.push(eq(pois.cityId, cityId));
  }
  if (city) {
    const cityIds = await findCityIdsByName(db, city);
    if (cityIds.length === 0) {
      return jsonList(c, [], { limit, offset }, 0);
    }
    conditions.push(inArray(pois.cityId, cityIds));
  }
  if (category) {
    conditions.push(eq(pois.category, category));
  }
  if (minQuality !== undefined && minQuality > 0) {
    conditions.push(gte(pois.rating, minQuality));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [results, countResult] = await Promise.all([
    db
      .select()
      .from(pois)
      .where(where)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(pois)
      .where(where),
  ]);

  return jsonList(c, convertKeysToSnakeCase(results) as typeof results, { limit, offset }, countResult[0]?.count ?? 0);
});

// ── GET /nearby — Find nearby POIs ─────────────────────
app.get('/nearby', async (c) => {
  const lat = Number.parseFloat(c.req.query('lat') ?? '0');
  const lng = Number.parseFloat(c.req.query('lng') ?? '0');
  const radius = Number.parseFloat(c.req.query('radius') ?? '5'); // km
  const limit = Number.parseInt(c.req.query('limit') ?? '20', 10);
  const category = c.req.query('category');

  if (lat === 0 && lng === 0) {
    return c.json({ error: '缺少lat/lng参数' }, 400);
  }

  const db = c.get('db');

  // Haversine-based distance calculation (approximate)
  const distanceSql = sql`(
    6371 * acos(
      cos(radians(${lat}))
      * cos(radians(${pois.latitude}))
      * cos(radians(${pois.longitude}) - radians(${lng}))
      + sin(radians(${lat}))
      * sin(radians(${pois.latitude}))
    )
  )`;

  const conditions = [sql`${distanceSql} < ${radius}`];
  if (category) {
    conditions.push(eq(pois.category, category));
  }

  const results = await db
    .select({
      poi: pois,
      distance: distanceSql.as('distance'),
    })
    .from(pois)
    .where(and(...conditions))
    .orderBy(sql`distance`)
    .limit(limit);

  return c.json({
    data: results.map(r => ({
      ...convertKeysToSnakeCase(r.poi) as Record<string, unknown>,
      distance_km: r.distance,
    })),
  });
});

// ── GET /:id — Get POI by ID ───────────────────────────
app.get('/:id', async (c) => {
  const id = parsePositiveInt(c.req.param('id'));
  if (!id)
    return c.json({ error: 'Invalid ID' }, 400);
  const db = c.get('db');

  const result = await db
    .select()
    .from(pois)
    .where(eq(pois.id, id))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: '兴趣点不存在' }, 404);
  }

  return jsonData(c, convertKeysToSnakeCase(result[0]));
});

export default app;
