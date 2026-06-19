import type { TravelGuideResponseDto } from '@pathfinding/types';
import type { AuthVariables } from '../middleware/auth.js';
import { zValidator } from '@hono/zod-validator';
import { getDb, guideDestinations, travelGuides } from '@pathfinding/database';
import { toResponseDto } from '@pathfinding/guide-shape';
import { and, asc, desc, eq, gte, inArray, like, lte, sql } from 'drizzle-orm';
/**
 * Guides routes — list, get by ID, search, destinations, stats.
 * Mirrors the Convex /api/guides/* HTTP endpoints.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { escapeLikePattern, parsePagination, parsePositiveInt } from '../lib/params.js';
import { jsonData, jsonList, jsonOk } from '../lib/response.js';
import { authRequired } from '../middleware/auth.js';
import { runFullAnalysis } from '../services/backfill.service.js';
import { applyPoiCoordinateFix, createUserGuide, updateUserGuide } from '../services/guide-writer.js';

const app = new Hono<{ Variables: AuthVariables }>();

function parseGuideOrder(value: string | undefined): 'asc' | 'desc' {
  return value === 'asc' ? 'asc' : 'desc';
}

/**
 * Resolve guide IDs covering any of the given destination names via the
 * guide_destinations auxiliary table (D13, performance rule: fetch IDs from
 * the lightweight table first, then batch-fetch the heavy rows).
 */
async function findGuideIdsByDestinations(names: string[]): Promise<number[]> {
  const db = getDb();
  const rows = await db
    .select({ guideId: guideDestinations.guideId })
    .from(guideDestinations)
    .where(inArray(guideDestinations.destination, names));

  return [...new Set(rows.map(row => row.guideId))];
}

function parseDestinationsParam(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map(name => name.trim())
    .filter(name => name !== '');
}

// ── GET / — List guides with pagination ────────────────
app.get('/', async (c) => {
  const platform = c.req.query('platform');
  const q = c.req.query('q');
  const destinationNames = parseDestinationsParam(c.req.query('destinations'));
  const parsedMinQuality = Number.parseFloat(c.req.query('min_quality') ?? '0');
  const minQuality
    = Number.isFinite(parsedMinQuality) && parsedMinQuality >= 0
      ? parsedMinQuality
      : 0;
  const maxQualityParam = c.req.query('max_quality');
  const parsedMaxQuality = maxQualityParam === undefined
    ? Number.NaN
    : Number.parseFloat(maxQualityParam);
  const maxQuality = Number.isFinite(parsedMaxQuality) && parsedMaxQuality >= 0
    ? parsedMaxQuality
    : undefined;
  const { limit, offset } = parsePagination(
    c.req.query('limit'),
    c.req.query('offset'),
  );
  const sort = c.req.query('sort');
  const order = parseGuideOrder(c.req.query('order'));
  const guideOrderBy
    = sort === 'quality_score'
      ? order === 'asc' ? asc(travelGuides.qualityScore) : desc(travelGuides.qualityScore)
      : desc(travelGuides.createdAt);

  const db = getDb();

  const conditions = [];
  if (platform) {
    conditions.push(eq(travelGuides.platform, platform));
  }
  if (q) {
    conditions.push(like(travelGuides.title, `%${escapeLikePattern(q)}%`));
  }
  if (minQuality > 0) {
    conditions.push(gte(travelGuides.qualityScore, minQuality));
  }
  if (maxQuality !== undefined) {
    conditions.push(lte(travelGuides.qualityScore, maxQuality));
  }
  if (destinationNames.length > 0) {
    const guideIds = await findGuideIdsByDestinations(destinationNames);
    if (guideIds.length === 0) {
      return jsonList(c, [], { limit, offset }, 0);
    }
    conditions.push(inArray(travelGuides.id, guideIds));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [results, countResult] = await Promise.all([
    db
      .select()
      .from(travelGuides)
      .where(where)
      .orderBy(guideOrderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(travelGuides)
      .where(where),
  ]);

  return jsonList(c, results.map(toResponseDto), { limit, offset }, countResult[0]?.count ?? 0);
});

// ── GET /search — Search guides ────────────────────────
app.get('/search', async (c) => {
  const q = c.req.query('q');
  const destination = c.req.query('destination');
  const { limit } = parsePagination(c.req.query('limit'), undefined, 30);

  const db = getDb();

  let whereClause;
  if (q) {
    whereClause = like(travelGuides.title, `%${escapeLikePattern(q)}%`);
  }
  else if (destination) {
    whereClause = sql`JSON_CONTAINS(${travelGuides.destinations}, JSON_QUOTE(${destination}))`;
  }

  const [results, countResult] = await Promise.all([
    db
      .select()
      .from(travelGuides)
      .where(whereClause)
      .orderBy(desc(travelGuides.qualityScore))
      .limit(limit),
    db
      .select({ count: sql<number>`count(*)` })
      .from(travelGuides)
      .where(whereClause),
  ]);

  return jsonList(c, results.map(toResponseDto), { limit, offset: 0 }, countResult[0]?.count ?? 0);
});

// ── GET /destinations — Popular destinations ───────────
app.get('/destinations', async (c) => {
  const { limit } = parsePagination(c.req.query('limit'), undefined, 10);
  const db = getDb();

  // Use JSON_TABLE or a simpler aggregation depending on MySQL/TiDB version.
  // Fallback: fetch guides and aggregate in JS.
  const guides = await db
    .select({ destinations: travelGuides.destinations })
    .from(travelGuides)
    .limit(500);

  const destCounts: Record<string, number> = {};
  for (const g of guides) {
    const dests = g.destinations as string[] | null;
    if (Array.isArray(dests)) {
      for (const d of dests) {
        if (typeof d === 'string') {
          destCounts[d] = (destCounts[d] ?? 0) + 1;
        }
      }
    }
  }

  const topDestinations = Object.entries(destCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));

  return jsonData(c, topDestinations);
});

/**
 * Fetch a guide by ID and return its client representation.
 * Returns `null` if not found.
 */
async function findGuideById(id: number): Promise<TravelGuideResponseDto | null> {
  const db = getDb();
  const result = await db
    .select()
    .from(travelGuides)
    .where(eq(travelGuides.id, id))
    .limit(1);

  return result[0] ? toResponseDto(result[0]) : null;
}

// ── GET /by-id — Get guide by ID ───────────────────────
app.get('/by-id', async (c) => {
  const id = parsePositiveInt(c.req.query('id'));
  if (!id)
    return c.json({ error: '缺少id参数' }, 400);

  const guide = await findGuideById(id);
  if (!guide) {
    return c.json({ error: '攻略不存在' }, 404);
  }

  return c.json(guide);
});

// ── GET /stats — Guide statistics ──────────────────────
app.get('/stats', async (c) => {
  const db = getDb();

  const countResult = await db
    .select({
      platform: travelGuides.platform,
      count: sql<number>`count(*)`,
    })
    .from(travelGuides)
    .groupBy(travelGuides.platform);

  const byPlatform: Record<string, number> = {};
  let total = 0;
  for (const row of countResult) {
    byPlatform[row.platform] = row.count;
    total += row.count;
  }

  return c.json({ total, by_platform: byPlatform });
});

// ── GET /gap-report — Data gap summary ─────────────────
app.get('/gap-report', async (c) => {
  const analysis = await runFullAnalysis(100);

  return jsonData(c, {
    totalGuides: analysis.totalGuides,
    fieldGapCount: analysis.totalFieldGaps,
    destinationGapCount: analysis.totalDestinationGaps,
    fieldMissingDistribution: analysis.fieldMissingDistribution,
    topFieldGaps: analysis.fieldGaps.slice(0, 10),
    topDestinationGaps: analysis.destinationGaps.slice(0, 10),
  });
});

// ── GET /:id — Get guide by ID (path param) ────────────
app.get('/:id', async (c) => {
  const id = parsePositiveInt(c.req.param('id'));
  if (!id)
    return c.json({ error: 'Invalid ID' }, 400);

  const guide = await findGuideById(id);
  if (!guide) {
    return c.json({ error: '攻略不存在' }, 404);
  }

  return jsonData(c, guide);
});

// ── POST / — Create a guide ───────────────────────────
const destinationSchema = z.object({
  name: z.string(),
  country: z.string().optional(),
  coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

const createGuideSchema = z.object({
  platform: z.string(),
  title: z.string(),
  content: z.string().optional(),
  authorName: z.string().optional(),
  sourceUrl: z.string().optional(),
  destinations: z.array(destinationSchema).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
});

app.post('/', authRequired(), zValidator('json', createGuideSchema), async (c) => {
  const body = c.req.valid('json');
  const db = getDb();

  const id = await createUserGuide(db, {
    platform: body.platform,
    title: body.title,
    content: body.content ?? null,
    authorName: body.authorName ?? null,
    sourceUrl: body.sourceUrl ?? null,
    destinations: body.destinations ?? null,
    tags: body.tags ?? null,
    category: body.category ?? null,
  });

  return jsonData(c, { id }, 201);
});

// ── PATCH /:id — Update a guide ────────────────────────
const updateGuideSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  category: z.string().optional(),
  destinations: z.array(destinationSchema).optional(),
  tags: z.array(z.string()).optional(),
});

const updateGuidePoiCoordinatesSchema = z.object({
  dayNumber: z.number().int().positive(),
  poiIndex: z.number().int().min(0),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  verifiedBy: z.string().optional(),
});

app.patch('/:id', authRequired(), zValidator('json', updateGuideSchema), async (c) => {
  const id = parsePositiveInt(c.req.param('id'));
  if (!id)
    return c.json({ error: 'Invalid ID' }, 400);
  const body = c.req.valid('json');
  const db = getDb();

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined)
    updates.title = body.title;
  if (body.content !== undefined)
    updates.content = body.content;
  if (body.category !== undefined)
    updates.category = body.category;
  if (body.destinations !== undefined)
    updates.destinations = body.destinations;
  if (body.tags !== undefined)
    updates.tags = body.tags;

  if (Object.keys(updates).length === 0) {
    return c.json({ error: '没有需要更新的字段' }, 400);
  }

  await updateUserGuide(db, id, updates);

  return jsonOk(c);
});

app.patch('/:id/poi-coordinates', authRequired(), zValidator('json', updateGuidePoiCoordinatesSchema), async (c) => {
  const guideId = parsePositiveInt(c.req.param('id'));
  const body = c.req.valid('json');
  if (!guideId) {
    return c.json({ error: 'Invalid ID' }, 400);
  }
  const db = getDb();
  const outcome = await applyPoiCoordinateFix(db, guideId, {
    dayNumber: body.dayNumber,
    poiIndex: body.poiIndex,
    latitude: body.latitude,
    longitude: body.longitude,
    verifiedAt: Date.now(),
    ...(body.verifiedBy ? { verifiedBy: body.verifiedBy } : {}),
  });
  if (outcome === 'not-found') {
    return c.json({ error: '攻略或兴趣点不存在' }, 404);
  }
  return jsonOk(c);
});

export default app;
