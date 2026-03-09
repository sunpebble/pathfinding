import type { InferSelectModel } from 'drizzle-orm';
import type { AuthVariables } from '../middleware/auth.js';
import { zValidator } from '@hono/zod-validator';
import { getDb, travelGuides } from '@pathfinding/database';
import { and, desc, eq, gte, like, sql } from 'drizzle-orm';
/**
 * Guides routes — list, get by ID, search, destinations, stats.
 * Mirrors the Convex /api/guides/* HTTP endpoints.
 */
import { Hono } from 'hono';
import { z } from 'zod';

type Guide = InferSelectModel<typeof travelGuides>;

const app = new Hono<{ Variables: AuthVariables }>();

/**
 * Convert a DB guide row to the iOS-compatible response format.
 * The iOS BlogPost model expects specific field names that differ from the DB schema.
 */
function toClientGuide(guide: Guide): Record<string, unknown> {
  return {
    id: String(guide.id),
    title: guide.title,
    author_name: guide.authorName,
    content: guide.content,
    content_html: null,
    content_markdown: null,
    summary: null,
    cover_image_url: guide.coverImageUrl,
    image_urls: guide.imageUrls,
    source_platform: guide.platform,
    quality_score: guide.qualityScore,
    views_count: guide.viewCount,
    likes_count: guide.likeCount,
    saves_count: 0,
    created_at: guide.createdAt?.toISOString() ?? null,
    destinations: guide.destinations,
    // AI fields from enrichedData
    ai_summary:
      (guide.enrichedData as Record<string, unknown> | null)?.summary ?? null,
    ai_tips:
      (guide.enrichedData as Record<string, unknown> | null)?.tips ?? null,
    ai_best_time:
      (guide.enrichedData as Record<string, unknown> | null)?.bestTime ?? null,
    ai_duration:
      (guide.enrichedData as Record<string, unknown> | null)?.duration ?? null,
    ai_budget:
      (guide.enrichedData as Record<string, unknown> | null)?.budget ?? null,
    ai_days: (guide.dayItineraries as unknown[]) ?? null,
    ai_processed_at: null,
  };
}

// ── GET / — List guides with pagination ────────────────
app.get('/', async (c) => {
  const platform = c.req.query('platform');
  const parsedMinQuality = Number.parseFloat(c.req.query('min_quality') ?? '0');
  const minQuality
    = Number.isFinite(parsedMinQuality) && parsedMinQuality >= 0
      ? parsedMinQuality
      : 0;
  const parsedLimit = Number.parseInt(c.req.query('limit') ?? '20', 10);
  const limit
    = Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 20;
  const parsedOffset = Number.parseInt(c.req.query('offset') ?? '0', 10);
  const offset
    = Number.isInteger(parsedOffset) && parsedOffset >= 0
      ? parsedOffset
      : 0;

  const db = getDb();

  const query = db
    .select()
    .from(travelGuides)
    .orderBy(desc(travelGuides.createdAt))
    .limit(limit)
    .offset(offset);

  // Note: dynamic where clauses are appended via $dynamic() in Drizzle,
  // but for simplicity we use conditional raw SQL approach.
  const conditions = [];
  if (platform) {
    conditions.push(eq(travelGuides.platform, platform));
  }
  if (minQuality > 0) {
    conditions.push(gte(travelGuides.qualityScore, minQuality));
  }

  let results: Guide[];
  if (conditions.length > 0) {
    results = await db
      .select()
      .from(travelGuides)
      .where(and(...conditions))
      .orderBy(desc(travelGuides.createdAt))
      .limit(limit)
      .offset(offset);
  }
  else {
    results = await query;
  }

  return c.json({
    data: results.map(toClientGuide),
    pagination: { limit, offset, total: results.length },
  });
});

// ── GET /search — Search guides ────────────────────────
app.get('/search', async (c) => {
  const q = c.req.query('q');
  const destination = c.req.query('destination');
  const parsedLimit = Number.parseInt(c.req.query('limit') ?? '30', 10);
  const limit
    = Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 30;

  const db = getDb();

  let results: Guide[];
  if (q) {
    results = await db
      .select()
      .from(travelGuides)
      .where(like(travelGuides.title, `%${q}%`))
      .orderBy(desc(travelGuides.qualityScore))
      .limit(limit);
  }
  else if (destination) {
    // Search by destination via JSON column
    results = await db
      .select()
      .from(travelGuides)
      .where(
        sql`JSON_CONTAINS(${travelGuides.destinations}, JSON_QUOTE(${destination}))`,
      )
      .orderBy(desc(travelGuides.qualityScore))
      .limit(limit);
  }
  else {
    results = await db
      .select()
      .from(travelGuides)
      .orderBy(desc(travelGuides.qualityScore))
      .limit(limit);
  }

  return c.json({
    data: results.map(toClientGuide),
    pagination: { total: results.length, limit, offset: 0 },
  });
});

// ── GET /destinations — Popular destinations ───────────
app.get('/destinations', async (c) => {
  const parsedLimit = Number.parseInt(c.req.query('limit') ?? '10', 10);
  const limit
    = Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 10;
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

  return c.json({ data: topDestinations });
});

// ── GET /by-id — Get guide by ID ───────────────────────
app.get('/by-id', async (c) => {
  const id = c.req.query('id');
  if (!id)
    return c.json({ error: 'Missing id parameter' }, 400);

  const db = getDb();
  const result = await db
    .select()
    .from(travelGuides)
    .where(eq(travelGuides.id, Number(id)))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: 'Guide not found' }, 404);
  }

  return c.json(toClientGuide(result[0]!));
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

// ── GET /:id — Get guide by ID (path param) ────────────
app.get('/:id', async (c) => {
  const { id } = c.req.param();
  const db = getDb();

  const result = await db
    .select()
    .from(travelGuides)
    .where(eq(travelGuides.id, Number(id)))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: 'Guide not found' }, 404);
  }

  return c.json({ data: toClientGuide(result[0]!) });
});

// ── POST / — Create a guide ───────────────────────────
const createGuideSchema = z.object({
  platform: z.string(),
  title: z.string(),
  content: z.string().optional(),
  authorName: z.string().optional(),
  sourceUrl: z.string().optional(),
  destinations: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
});

app.post('/', zValidator('json', createGuideSchema), async (c) => {
  const body = c.req.valid('json');
  const db = getDb();

  const [result] = await db
    .insert(travelGuides)
    .values({
      platform: body.platform,
      title: body.title,
      content: body.content ?? null,
      authorName: body.authorName ?? null,
      sourceUrl: body.sourceUrl ?? null,
      destinations: body.destinations ?? null,
      tags: body.tags ?? null,
      category: body.category ?? null,
    })
    .$returningId();

  return c.json({ data: { id: result!.id } }, 201);
});

// ── PATCH /:id — Update a guide ────────────────────────
const updateGuideSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  category: z.string().optional(),
  destinations: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

const updateGuidePoiCoordinatesSchema = z.object({
  dayNumber: z.number().int().positive(),
  poiIndex: z.number().int().min(0),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  verifiedBy: z.string().optional(),
});

app.patch('/:id', zValidator('json', updateGuideSchema), async (c) => {
  const { id } = c.req.param();
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
    return c.json({ error: 'No fields to update' }, 400);
  }

  await db
    .update(travelGuides)
    .set(updates)
    .where(eq(travelGuides.id, Number(id)));

  return c.json({ success: true });
});

app.patch('/:id/poi-coordinates', zValidator('json', updateGuidePoiCoordinatesSchema), async (c) => {
  const { id } = c.req.param();
  const body = c.req.valid('json');
  const guideId = Number.parseInt(id, 10);

  if (!Number.isInteger(guideId) || guideId <= 0) {
    return c.json({ error: 'Invalid guide ID' }, 400);
  }

  const db = getDb();
  const result = await db
    .select()
    .from(travelGuides)
    .where(eq(travelGuides.id, guideId))
    .limit(1);

  const guide = result[0];
  if (!guide) {
    return c.json({ error: 'Guide not found' }, 404);
  }

  const dayItineraries = Array.isArray(guide.dayItineraries) ? structuredClone(guide.dayItineraries) as Array<Record<string, unknown>> : [];
  const dayIndex = dayItineraries.findIndex(day => Number(day.dayNumber) === body.dayNumber);
  if (dayIndex === -1) {
    return c.json({ error: 'Guide day not found' }, 404);
  }

  const pois = Array.isArray(dayItineraries[dayIndex]?.pois) ? [...(dayItineraries[dayIndex]!.pois as Array<Record<string, unknown>>)] : [];
  if (!pois[body.poiIndex]) {
    return c.json({ error: 'Guide POI not found' }, 404);
  }

  pois[body.poiIndex] = {
    ...pois[body.poiIndex],
    latitude: body.latitude,
    longitude: body.longitude,
    isManuallyVerified: true,
    verifiedAt: Date.now(),
    verifiedBy: body.verifiedBy ?? null,
  };

  dayItineraries[dayIndex] = {
    ...dayItineraries[dayIndex],
    pois,
  };

  await db
    .update(travelGuides)
    .set({ dayItineraries })
    .where(eq(travelGuides.id, guideId));

  return c.json({ success: true });
});

export default app;
