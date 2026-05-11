import type { DayItinerary } from '@pathfinding/database/schema';
import type { TravelGuideResponseDto } from '@pathfinding/types';
import type { InferSelectModel } from 'drizzle-orm';
import type { AuthVariables } from '../middleware/auth.js';
import { zValidator } from '@hono/zod-validator';
import { getDb, travelGuides } from '@pathfinding/database';
import { and, asc, desc, eq, gte, like, sql } from 'drizzle-orm';
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

type Guide = InferSelectModel<typeof travelGuides>;

const app = new Hono<{ Variables: AuthVariables }>();

function recordFromJson(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function stringFromRecord(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return null;
}

function stringArrayFromRecord(record: Record<string, unknown>, keys: string[]): string[] | null {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      const strings = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
      if (strings.length > 0)
        return strings;
    }
  }
  return null;
}

function dateString(value: Date | string | null | undefined): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return null;
}

function numberFromGuide(guide: Guide, key: keyof Guide, fallback = 0): number {
  const value = guide[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
}

function parseGuideOrder(value: string | undefined): 'asc' | 'desc' {
  return value === 'asc' ? 'asc' : 'desc';
}

function destinationsFromGuide(value: Guide['destinations']): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((destination) => {
      if (typeof destination === 'string') {
        return destination;
      }
      if (destination && typeof destination === 'object' && typeof destination.name === 'string') {
        return destination.name;
      }
      return null;
    })
    .filter((destination): destination is string => Boolean(destination));
}

function arrayFromRecord(record: Record<string, unknown>, keys: string[]): unknown[] | null {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return null;
}

function geocodingMetricsFromRecord(record: Record<string, unknown>): TravelGuideResponseDto['geocoding_metrics'] {
  const value = record.geocodingMetrics ?? record.geocoding_metrics;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const metrics = value as Record<string, unknown>;
  const totalPois = metrics.total_pois;
  const averageConfidence = metrics.average_confidence;
  const lowConfidenceCount = metrics.low_confidence_count;

  if (
    typeof totalPois === 'number'
    && typeof averageConfidence === 'number'
    && typeof lowConfidenceCount === 'number'
  ) {
    return {
      total_pois: totalPois,
      average_confidence: averageConfidence,
      low_confidence_count: lowConfidenceCount,
    };
  }

  return null;
}

function normalizeAiDays(value: unknown): TravelGuideResponseDto['ai_days'] {
  if (!Array.isArray(value)) {
    return null;
  }

  interface NormalizedAiDay {
    day_number: number;
    theme?: string;
    title?: string;
    pois: Array<Record<string, unknown>>;
  }

  const days = value
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, unknown>;
      const dayNumber = record.day_number ?? record.dayNumber ?? record.day;
      if (typeof dayNumber !== 'number' || !Number.isFinite(dayNumber)) {
        return null;
      }

      return {
        day_number: dayNumber,
        ...(typeof record.theme === 'string' ? { theme: record.theme } : {}),
        ...(typeof record.title === 'string' ? { title: record.title } : {}),
        pois: Array.isArray(record.pois) ? record.pois as Array<Record<string, unknown>> : [],
      };
    })
    .filter((day): day is NormalizedAiDay => day !== null);

  return days.length > 0 ? days : null;
}

/**
 * Convert a DB guide row to the iOS-compatible response format.
 * The iOS BlogPost model expects specific field names that differ from the DB schema.
 */
function toClientGuide(guide: Guide): TravelGuideResponseDto {
  const enrichedData = recordFromJson(guide.enrichedData);
  const id = String(guide.id);
  const aiDays = normalizeAiDays(
    arrayFromRecord(enrichedData, ['aiDays', 'ai_days'])
    ?? (Array.isArray(guide.dayItineraries) ? guide.dayItineraries : null),
  );

  return {
    id,
    _id: id,
    title: guide.title,
    summary: stringFromRecord(enrichedData, ['summary', 'aiSummary', 'ai_summary']),
    source_platform: guide.platform,
    source_external_id: guide.externalId ?? null,
    source_url: guide.sourceUrl ?? null,
    author_name: guide.authorName,
    author_id: stringFromRecord(enrichedData, ['authorId', 'author_id']),
    content: guide.content ?? '',
    content_html: stringFromRecord(enrichedData, ['contentHtml', 'content_html']),
    content_markdown: stringFromRecord(enrichedData, ['contentMarkdown', 'content_markdown']),
    cover_image_url: guide.coverImageUrl,
    image_urls: stringArray(guide.imageUrls),
    quality_score: numberFromGuide(guide, 'qualityScore'),
    views_count: numberFromGuide(guide, 'viewCount'),
    likes_count: numberFromGuide(guide, 'likeCount'),
    saves_count: 0,
    comments_count: numberFromGuide(guide, 'commentCount'),
    destinations: destinationsFromGuide(guide.destinations),
    tags: stringArray(guide.tags),
    published_at: dateString(guide.publishedAt),
    crawled_at: dateString(guide.crawledAt),
    created_at: dateString(guide.createdAt),
    updated_at: dateString(guide.updatedAt),
    ai_summary: stringFromRecord(enrichedData, ['aiSummary', 'summary', 'ai_summary']),
    ai_tips: stringArrayFromRecord(enrichedData, ['aiTips', 'tips', 'ai_tips']),
    ai_best_time: stringFromRecord(enrichedData, ['aiBestTime', 'bestTime', 'ai_best_time']),
    ai_duration: stringFromRecord(enrichedData, ['aiDuration', 'duration', 'ai_duration']),
    ai_budget: stringFromRecord(enrichedData, ['aiBudget', 'budget', 'ai_budget']),
    ai_days: aiDays,
    ai_processed_at: null,
    ai_version: stringFromRecord(enrichedData, ['aiVersion', 'version', 'ai_version']),
    ai_model: stringFromRecord(enrichedData, ['aiModel', 'model', 'ai_model']),
    geocoding_metrics: geocodingMetricsFromRecord(enrichedData),
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
  if (minQuality > 0) {
    conditions.push(gte(travelGuides.qualityScore, minQuality));
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

  return jsonList(c, results.map(toClientGuide), { limit, offset }, countResult[0]?.count ?? 0);
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

  return jsonList(c, results.map(toClientGuide), { limit, offset: 0 }, countResult[0]?.count ?? 0);
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

  return result[0] ? toClientGuide(result[0]) : null;
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
    totalGuides: analysis.totalFieldGaps, // approximate; actual total requires separate count
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

  return jsonData(c, { id: result!.id }, 201);
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

  await db
    .update(travelGuides)
    .set(updates)
    .where(eq(travelGuides.id, id));

  return jsonOk(c);
});

app.patch('/:id/poi-coordinates', authRequired(), zValidator('json', updateGuidePoiCoordinatesSchema), async (c) => {
  const guideId = parsePositiveInt(c.req.param('id'));
  const body = c.req.valid('json');

  if (!guideId) {
    return c.json({ error: 'Invalid ID' }, 400);
  }

  const db = getDb();
  const result = await db
    .select()
    .from(travelGuides)
    .where(eq(travelGuides.id, guideId))
    .limit(1);

  const guide = result[0];
  if (!guide) {
    return c.json({ error: '攻略不存在' }, 404);
  }

  const dayItineraries: DayItinerary[] = Array.isArray(guide.dayItineraries) ? structuredClone(guide.dayItineraries) : [];
  const dayIndex = dayItineraries.findIndex(day => Number(day.day) === body.dayNumber);
  if (dayIndex === -1) {
    return c.json({ error: '攻略日程不存在' }, 404);
  }

  const pois = Array.isArray(dayItineraries[dayIndex]?.pois) ? [...dayItineraries[dayIndex]!.pois] : [];
  if (!pois[body.poiIndex]) {
    return c.json({ error: '攻略兴趣点不存在' }, 404);
  }

  pois[body.poiIndex] = {
    ...pois[body.poiIndex],
    name: pois[body.poiIndex]!.name,
    lat: body.latitude,
    lng: body.longitude,
  };

  dayItineraries[dayIndex] = {
    ...dayItineraries[dayIndex],
    day: dayItineraries[dayIndex]!.day,
    pois,
  };

  await db
    .update(travelGuides)
    .set({ dayItineraries })
    .where(eq(travelGuides.id, guideId));

  return jsonOk(c);
});

export default app;
