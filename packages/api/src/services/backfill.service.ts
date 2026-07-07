import type { Database } from '@pathfinding/database';
/**
 * Backfill gap analysis (D9) — every aggregate is computed at the database
 * level over the FULL table (no limit(500)/limit(1000) truncation). Only the
 * top-N gap lists are bounded; all totals and the field-missing distribution
 * reflect the whole dataset.
 */
import type { SQL } from 'drizzle-orm';
import { cities, crawlJobs, guideDestinations, travelGuides } from '@pathfinding/database';
import { asc, desc, gte, notExists, sql } from 'drizzle-orm';

const BACKFILLABLE_FIELDS = [
  'content',
  'imageUrls',
  'destinations',
  'dayItineraries',
  'geoData',
  'enrichedData',
  'coverImageUrl',
] as const;

type BackfillableField = (typeof BACKFILLABLE_FIELDS)[number];

/** Upper bound for the destination gap list (totals stay exact). */
const DESTINATION_GAP_LIST_LIMIT = 500;

/** Per-field "is missing" flag expressions (1 = missing), evaluated in SQL. */
const MISSING_FLAGS: Record<BackfillableField, SQL<number>> = {
  content: sql<number>`(CASE WHEN ${travelGuides.content} IS NULL OR TRIM(${travelGuides.content}) = '' THEN 1 ELSE 0 END)`,
  imageUrls: sql<number>`(CASE WHEN ${travelGuides.imageUrls} IS NULL OR JSON_LENGTH(${travelGuides.imageUrls}) = 0 THEN 1 ELSE 0 END)`,
  destinations: sql<number>`(CASE WHEN ${travelGuides.destinations} IS NULL OR JSON_LENGTH(${travelGuides.destinations}) = 0 THEN 1 ELSE 0 END)`,
  dayItineraries: sql<number>`(CASE WHEN ${travelGuides.dayItineraries} IS NULL OR JSON_LENGTH(${travelGuides.dayItineraries}) = 0 THEN 1 ELSE 0 END)`,
  geoData: sql<number>`(CASE WHEN ${travelGuides.geoData} IS NULL OR JSON_EXTRACT(${travelGuides.geoData}, '$.coordinates') IS NULL THEN 1 ELSE 0 END)`,
  enrichedData: sql<number>`(CASE WHEN ${travelGuides.enrichedData} IS NULL OR JSON_LENGTH(${travelGuides.enrichedData}) = 0 THEN 1 ELSE 0 END)`,
  coverImageUrl: sql<number>`(CASE WHEN ${travelGuides.coverImageUrl} IS NULL OR TRIM(${travelGuides.coverImageUrl}) = '' THEN 1 ELSE 0 END)`,
};

const MISSING_COUNT_EXPR = sql<number>`(${sql.join(
  BACKFILLABLE_FIELDS.map(field => MISSING_FLAGS[field]),
  sql` + `,
)})`;

export interface FieldGap {
  guideId: number;
  title: string;
  platform: string;
  missingFields: string[];
  missingCount: number;
}

export interface DestinationGap {
  cityName: string;
  countryCode: string;
  guideCount: number;
}

export interface FieldGapSummary {
  /** Full travel_guides row count. */
  totalGuides: number;
  /** Guides with at least one missing backfillable field (full count). */
  guidesWithGaps: number;
  /** Full-table missing count per backfillable field. */
  missingByField: Record<BackfillableField, number>;
}

export interface BackfillAnalysis {
  fieldGaps: FieldGap[];
  totalFieldGaps: number;
  totalGuides: number;
  fieldMissingDistribution: Record<string, number>;
  destinationGaps: DestinationGap[];
  totalDestinationGaps: number;
}

/**
 * Top-N guides with the most missing fields, filtered and ranked in SQL.
 */
export async function analyzeFieldGaps(db: Database, limit = 100): Promise<FieldGap[]> {
  const rows = await db
    .select({
      guideId: travelGuides.id,
      title: travelGuides.title,
      platform: travelGuides.platform,
      missingCount: MISSING_COUNT_EXPR,
      content: MISSING_FLAGS.content,
      imageUrls: MISSING_FLAGS.imageUrls,
      destinations: MISSING_FLAGS.destinations,
      dayItineraries: MISSING_FLAGS.dayItineraries,
      geoData: MISSING_FLAGS.geoData,
      enrichedData: MISSING_FLAGS.enrichedData,
      coverImageUrl: MISSING_FLAGS.coverImageUrl,
    })
    .from(travelGuides)
    .where(sql`${MISSING_COUNT_EXPR} > 0`)
    .orderBy(desc(MISSING_COUNT_EXPR))
    .limit(limit);

  return rows.map((row) => {
    const missingFields = BACKFILLABLE_FIELDS.filter(field => Number(row[field]) === 1);
    return {
      guideId: row.guideId,
      title: row.title,
      platform: row.platform,
      missingFields,
      missingCount: Number(row.missingCount),
    };
  });
}

/**
 * Full-table field gap aggregation (single COUNT/SUM query, no row fetch).
 */
export async function summarizeFieldGaps(db: Database): Promise<FieldGapSummary> {
  const [row] = await db
    .select({
      totalGuides: sql<number>`COUNT(*)`,
      guidesWithGaps: sql<number>`COALESCE(SUM(CASE WHEN ${MISSING_COUNT_EXPR} > 0 THEN 1 ELSE 0 END), 0)`,
      content: sql<number>`COALESCE(SUM(${MISSING_FLAGS.content}), 0)`,
      imageUrls: sql<number>`COALESCE(SUM(${MISSING_FLAGS.imageUrls}), 0)`,
      destinations: sql<number>`COALESCE(SUM(${MISSING_FLAGS.destinations}), 0)`,
      dayItineraries: sql<number>`COALESCE(SUM(${MISSING_FLAGS.dayItineraries}), 0)`,
      geoData: sql<number>`COALESCE(SUM(${MISSING_FLAGS.geoData}), 0)`,
      enrichedData: sql<number>`COALESCE(SUM(${MISSING_FLAGS.enrichedData}), 0)`,
      coverImageUrl: sql<number>`COALESCE(SUM(${MISSING_FLAGS.coverImageUrl}), 0)`,
    })
    .from(travelGuides);

  if (!row) {
    throw new Error('字段缺口聚合查询未返回结果');
  }

  const missingByField = Object.fromEntries(
    BACKFILLABLE_FIELDS.map(field => [field, Number(row[field])]),
  ) as Record<BackfillableField, number>;

  return {
    totalGuides: Number(row.totalGuides),
    guidesWithGaps: Number(row.guidesWithGaps),
    missingByField,
  };
}

/**
 * Cities with no guide coverage, via a DB-level anti-join against the
 * guide_destinations auxiliary table. The total is exact; the list is
 * bounded by DESTINATION_GAP_LIST_LIMIT.
 */
export async function analyzeDestinationGaps(
  db: Database,
  limit = DESTINATION_GAP_LIST_LIMIT,
): Promise<{ gaps: DestinationGap[]; total: number }> {
  const coveredSubquery = db
    .select({ one: sql`1` })
    .from(guideDestinations)
    .where(sql`LOWER(${guideDestinations.destination}) = LOWER(${cities.name})`);
  const gapCondition = notExists(coveredSubquery);

  const rows = await db
    .select({ cityName: cities.name, countryCode: cities.countryCode })
    .from(cities)
    .where(gapCondition)
    .orderBy(asc(cities.name))
    .limit(limit);

  const [countRow] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(cities)
    .where(gapCondition);

  return {
    gaps: rows.map(row => ({
      cityName: row.cityName,
      countryCode: row.countryCode ?? '',
      guideCount: 0,
    })),
    total: Number(countRow?.total ?? 0),
  };
}

export async function generateBackfillJobs(
  db: Database,
  fieldGapGuideIds?: number[],
  destinationGapCities?: string[],
): Promise<{ jobsCreated: number }> {
  let jobsCreated = 0;

  if (fieldGapGuideIds && fieldGapGuideIds.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < fieldGapGuideIds.length; i += batchSize) {
      const batch = fieldGapGuideIds.slice(i, i + batchSize);
      await db.insert(crawlJobs).values({
        platform: 'multi',
        jobType: 'field_backfill',
        config: {
          backfillType: 'field',
          targetGuideIds: batch,
        },
        status: 'pending',
      });
      jobsCreated++;
    }
  }

  if (destinationGapCities && destinationGapCities.length > 0) {
    const batchSize = 10;
    for (let i = 0; i < destinationGapCities.length; i += batchSize) {
      const batch = destinationGapCities.slice(i, i + batchSize);
      await db.insert(crawlJobs).values({
        platform: 'multi',
        jobType: 'destination_fill',
        config: {
          backfillType: 'destination',
          targetDestinations: batch,
        },
        status: 'pending',
      });
      jobsCreated++;
    }
  }

  return { jobsCreated };
}

export async function runFullAnalysis(db: Database, limit = 100): Promise<BackfillAnalysis> {
  const fieldGaps = await analyzeFieldGaps(db, limit);
  const fieldSummary = await summarizeFieldGaps(db);
  const { gaps: destinationGaps, total: totalDestinationGaps } = await analyzeDestinationGaps(db);

  return {
    fieldGaps,
    totalFieldGaps: fieldSummary.guidesWithGaps,
    totalGuides: fieldSummary.totalGuides,
    fieldMissingDistribution: fieldSummary.missingByField,
    destinationGaps,
    totalDestinationGaps,
  };
}

// ── Ingest stats (D16) ─────────────────────────────────

export interface DailyIngestCount {
  date: string;
  inserted: number;
  updated: number;
}

export interface IngestStats {
  days: number;
  daily: DailyIngestCount[];
  totalGuides: number;
  /** Fill rate (0–1) per backfillable field, null when the table is empty. */
  fieldFillRates: Record<BackfillableField, number | null>;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Daily inserted/updated guide counts over the last N days plus full-table
 * field fill rates (D16). "Inserted" buckets by created_at; "updated" buckets
 * by crawled_at for rows whose crawl day differs from their creation day
 * (i.e. genuine refreshes, not initial imports).
 */
export async function computeIngestStats(db: Database, days: number): Promise<IngestStats> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const createdDayExpr = sql<string>`DATE_FORMAT(${travelGuides.createdAt}, '%Y-%m-%d')`;
  const insertedRows = await db
    .select({ day: createdDayExpr, count: sql<number>`COUNT(*)` })
    .from(travelGuides)
    .where(gte(travelGuides.createdAt, since))
    .groupBy(createdDayExpr);

  const crawledDayExpr = sql<string>`DATE_FORMAT(${travelGuides.crawledAt}, '%Y-%m-%d')`;
  const updatedRows = await db
    .select({ day: crawledDayExpr, count: sql<number>`COUNT(*)` })
    .from(travelGuides)
    .where(sql`${travelGuides.crawledAt} >= ${since} AND DATE(${travelGuides.crawledAt}) <> DATE(${travelGuides.createdAt})`)
    .groupBy(crawledDayExpr);

  const insertedByDay = new Map(insertedRows.map(row => [row.day, Number(row.count)]));
  const updatedByDay = new Map(updatedRows.map(row => [row.day, Number(row.count)]));

  const daily: DailyIngestCount[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(since);
    date.setDate(since.getDate() + i);
    const key = formatLocalDate(date);
    daily.push({
      date: key,
      inserted: insertedByDay.get(key) ?? 0,
      updated: updatedByDay.get(key) ?? 0,
    });
  }

  const summary = await summarizeFieldGaps(db);
  const fieldFillRates = Object.fromEntries(
    BACKFILLABLE_FIELDS.map((field) => {
      if (summary.totalGuides === 0) {
        return [field, null];
      }
      const filled = summary.totalGuides - summary.missingByField[field];
      return [field, Math.round((filled / summary.totalGuides) * 10000) / 10000];
    }),
  ) as Record<BackfillableField, number | null>;

  return {
    days,
    daily,
    totalGuides: summary.totalGuides,
    fieldFillRates,
  };
}
