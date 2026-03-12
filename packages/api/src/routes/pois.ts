import { getDb, pois } from '@pathfinding/database';
import { and, eq, like, sql } from 'drizzle-orm';
/**
 * POI routes — list, get by ID, search, nearby.
 */
import { Hono } from 'hono';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { escapeLikePattern, parsePagination, parsePositiveInt } from '../lib/params.js';
import { jsonData, jsonList } from '../lib/response.js';

const app = new Hono();

// ── GET / — Search/list POIs ───────────────────────────
app.get('/', async (c) => {
  const q = c.req.query('q');
  const cityId = c.req.query('cityId');
  const category = c.req.query('category');
  const { limit, offset } = parsePagination(
    c.req.query('limit'),
    c.req.query('offset'),
  );

  const db = getDb();

  const conditions = [];
  if (q) {
    conditions.push(like(pois.name, `%${escapeLikePattern(q)}%`));
  }
  if (cityId) {
    const parsedCityId = parsePositiveInt(cityId);
    if (!parsedCityId)
      return c.json({ error: 'Invalid cityId' }, 400);
    conditions.push(eq(pois.cityId, parsedCityId));
  }
  if (category) {
    conditions.push(eq(pois.category, category));
  }

  let results;
  if (conditions.length > 0) {
    results = await db
      .select()
      .from(pois)
      .where(conditions.length === 1 ? conditions[0]! : and(...conditions))
      .limit(limit)
      .offset(offset);
  }
  else {
    results = await db.select().from(pois).limit(limit).offset(offset);
  }

  // TODO: Replace with a parallel COUNT(*) query for accurate total
  return jsonList(c, convertKeysToSnakeCase(results) as typeof results, { limit, offset }, results.length);
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

  const db = getDb();

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

  let results;
  if (category) {
    results = await db
      .select({
        poi: pois,
        distance: distanceSql.as('distance'),
      })
      .from(pois)
      .where(
        and(
          sql`${distanceSql} < ${radius}`,
          eq(pois.category, category),
        ),
      )
      .orderBy(sql`distance`)
      .limit(limit);
  }
  else {
    results = await db
      .select({
        poi: pois,
        distance: distanceSql.as('distance'),
      })
      .from(pois)
      .where(sql`${distanceSql} < ${radius}`)
      .orderBy(sql`distance`)
      .limit(limit);
  }

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
  const db = getDb();

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
