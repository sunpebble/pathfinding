import type { ParseStatus } from '@pathfinding/crawler-types';
import type { Database, GuideDestination } from '@pathfinding/database';
import type { CanonicalGuide, GuideWriteValues, NormalizeResult, RawCrawlAudit } from './guide-normalize.js';
import { guideDestinations, rawCrawlRecords, travelGuides } from '@pathfinding/database';
import { aiDayNumber, aiDaysToDayItineraries, isRecord, recordFromJson } from '@pathfinding/guide-shape';
import { and, eq } from 'drizzle-orm';

type GuideRow = typeof travelGuides.$inferSelect;
const UNTITLED = '未命名';
const CONTENT_DERIVED_KEYS = ['contentFormatVersion', 'contentHtml', 'contentMarkdown'];

export interface PersistResult {
  success: boolean;
  guideId?: number;
  action: 'inserted' | 'updated' | 'rejected';
  message: string;
  warnings: string[];
}

// ── D9 destination mirror (moved verbatim) ──────────────
export async function syncGuideDestinations(db: Database, guideId: number, destinationNames: string[]): Promise<void> {
  if (destinationNames.length === 0) {
    return;
  }
  const existingRows = await db
    .select({ destination: guideDestinations.destination })
    .from(guideDestinations)
    .where(eq(guideDestinations.guideId, guideId));
  const existingSet = new Set(existingRows.map(row => row.destination));
  const missing = destinationNames.filter(name => !existingSet.has(name));
  if (missing.length === 0) {
    return;
  }
  await db.insert(guideDestinations).values(missing.map(destination => ({ guideId, destination })));
}

// ── D6 audit ────────────────────────────────────────────
async function recordRawCrawl(db: Database, audit: RawCrawlAudit, parseStatus: ParseStatus, error: string | null, url: string): Promise<void> {
  await db.insert(rawCrawlRecords).values({
    jobId: audit.jobId,
    url,
    rawData: audit.rawData,
    contentHash: audit.contentHash,
    parseStatus,
    error,
  });
}

// ── D7 helpers (pure) ───────────────────────────────────
function mergeEnrichedData(existing: Record<string, unknown> | null, incoming: Record<string, unknown>, includeContentKeys: boolean): Record<string, unknown> {
  const next = includeContentKeys
    ? incoming
    : Object.fromEntries(Object.entries(incoming).filter(([key]) => !CONTENT_DERIVED_KEYS.includes(key)));
  return { ...(existing ?? {}), ...next };
}

function isEmptyShell(row: GuideRow): boolean {
  return (!row.content || row.content.trim() === '') && row.title === UNTITLED;
}

/** Pure (canonical, existing) -> sparse update map per D7. */
function computeRefreshUpdates(existing: GuideRow, guide: CanonicalGuide): GuideWriteValues {
  if (isEmptyShell(existing)) {
    return {
      ...guide.values,
      externalId: existing.externalId ?? guide.externalId ?? null,
      enrichedData: mergeEnrichedData(existing.enrichedData, guide.enrichedNew, true),
    };
  }
  const contentImproved = guide.cleanedContent.length > (existing.content?.length ?? 0);
  const updates: GuideWriteValues = {
    crawledAt: guide.values.crawledAt,
    lastUpdatedAt: guide.values.lastUpdatedAt,
    qualityScore: guide.values.qualityScore,
    completenessLevel: guide.values.completenessLevel,
    enrichedData: mergeEnrichedData(existing.enrichedData, guide.enrichedNew, contentImproved),
  };
  if (guide.views !== null) {
    updates.viewCount = guide.views;
  }
  if (guide.likes !== null) {
    updates.likeCount = guide.likes;
  }
  if (guide.commentCount !== null) {
    updates.commentCount = guide.commentCount;
  }
  if (contentImproved) {
    updates.content = guide.cleanedContent;
  }
  if (guide.values.coverImageUrl) {
    updates.coverImageUrl = guide.values.coverImageUrl;
  }
  if ((guide.values.imageUrls?.length ?? 0) > 0) {
    updates.imageUrls = guide.values.imageUrls;
  }
  if ((guide.values.tags?.length ?? 0) > 0) {
    updates.tags = guide.values.tags;
  }
  if (guide.values.publishedAt) {
    updates.publishedAt = guide.values.publishedAt;
  }
  if (guide.values.authorName) {
    updates.authorName = guide.values.authorName;
  }
  if (!existing.externalId && guide.externalId) {
    updates.externalId = guide.externalId;
  }
  const existingDestinations: GuideDestination[] = existing.destinations ?? [];
  const existingNames = new Set(existingDestinations.map(d => d.name));
  const newNames = guide.destinationNames.filter(name => !existingNames.has(name));
  if (newNames.length > 0) {
    updates.destinations = [...existingDestinations, ...newNames.map(name => ({ name }))];
  }
  return updates;
}

async function findExistingGuide(db: Database, platform: string, externalId: string | undefined, sourceUrl: string): Promise<GuideRow | null> {
  if (externalId) {
    const [byExternalId] = await db
      .select()
      .from(travelGuides)
      .where(and(eq(travelGuides.platform, platform), eq(travelGuides.externalId, externalId)))
      .limit(1);
    if (byExternalId) {
      return byExternalId;
    }
  }
  const [byUrl] = await db.select().from(travelGuides).where(eq(travelGuides.sourceUrl, sourceUrl)).limit(1);
  return byUrl ?? null;
}

// ── Crawl writer (the D2 sole insert/refresh for crawl-origin) ──
export async function persistIngestedGuide(db: Database, result: NormalizeResult): Promise<PersistResult> {
  if (result.status === 'rejected') {
    await recordRawCrawl(db, result.audit, 'rejected', result.reason, String(result.audit.rawData.requestUrl ?? ''));
    return { success: false, action: 'rejected', message: `校验失败，拒绝入库：${result.reason}`, warnings: result.warnings };
  }
  const { guide, warnings, audit } = result;
  const url = guide.values.sourceUrl ?? String(audit.rawData.requestUrl ?? '');
  const existing = await findExistingGuide(db, guide.platform, guide.externalId, url);
  try {
    let outcome: PersistResult;
    if (existing) {
      await db.update(travelGuides).set(computeRefreshUpdates(existing, guide)).where(eq(travelGuides.id, existing.id));
      await syncGuideDestinations(db, existing.id, guide.destinationNames);
      outcome = { success: true, guideId: existing.id, action: 'updated', message: '游记已刷新', warnings };
    }
    else {
      const insertResult = await db.insert(travelGuides).values({
        platform: guide.platform,
        externalId: guide.externalId ?? null,
        ...guide.values,
        title: guide.values.title ?? UNTITLED,
        enrichedData: guide.enrichedNew,
      });
      const guideId = Number(insertResult[0].insertId);
      await syncGuideDestinations(db, guideId, guide.destinationNames);
      outcome = { success: true, guideId, action: 'inserted', message: '游记导入成功', warnings };
    }
    await recordRawCrawl(db, audit, 'success', null, url);
    return outcome;
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordRawCrawl(db, audit, 'failed', `入库失败：${message}`, url);
    throw error;
  }
}

// ── User CRUD writers ───────────────────────────────────
export type UserGuideInsert = typeof travelGuides.$inferInsert;
export type UserGuidePatch = Partial<typeof travelGuides.$inferInsert>;

export async function createUserGuide(db: Database, input: UserGuideInsert): Promise<number> {
  const [result] = await db.insert(travelGuides).values(input).$returningId();
  return result!.id;
}

export async function updateUserGuide(db: Database, id: number, patch: UserGuidePatch): Promise<void> {
  await db.update(travelGuides).set(patch).where(eq(travelGuides.id, id));
}

// ── Coordinate edit writer (derives via guide-shape) ────
export interface PoiCoordinateFix {
  dayNumber: number;
  poiIndex: number;
  latitude: number;
  longitude: number;
  verifiedBy?: string;
  verifiedAt?: number;
}

export async function applyPoiCoordinateFix(db: Database, id: number, fix: PoiCoordinateFix): Promise<'updated' | 'not-found'> {
  const [guide] = await db.select().from(travelGuides).where(eq(travelGuides.id, id)).limit(1);
  if (!guide) {
    return 'not-found';
  }
  const enrichedData = recordFromJson(guide.enrichedData);
  const aiDaysKey = Array.isArray(enrichedData.aiDays) ? 'aiDays' : Array.isArray(enrichedData.ai_days) ? 'ai_days' : null;

  if (aiDaysKey) {
    const aiDays = structuredClone(enrichedData[aiDaysKey] as unknown[]);
    const dayIndex = aiDays.findIndex(day => isRecord(day) && aiDayNumber(day) === fix.dayNumber);
    if (dayIndex === -1) {
      return 'not-found';
    }
    const day = aiDays[dayIndex] as Record<string, unknown>;
    const pois = Array.isArray(day.pois) ? [...day.pois] : [];
    const poi = pois[fix.poiIndex];
    if (!isRecord(poi)) {
      return 'not-found';
    }
    pois[fix.poiIndex] = {
      ...poi,
      latitude: fix.latitude,
      longitude: fix.longitude,
      geocodeConfidence: 1,
      geocodeSource: 'manual',
      isManuallyVerified: true,
      verifiedAt: fix.verifiedAt ?? 0,
      ...(fix.verifiedBy ? { verifiedBy: fix.verifiedBy } : {}),
    };
    aiDays[dayIndex] = { ...day, pois };
    await db.update(travelGuides).set({
      enrichedData: { ...enrichedData, [aiDaysKey]: aiDays },
      dayItineraries: aiDaysToDayItineraries(aiDays),
    }).where(eq(travelGuides.id, id));
    return 'updated';
  }

  const dayItineraries = Array.isArray(guide.dayItineraries) ? structuredClone(guide.dayItineraries) : [];
  const dayIndex = dayItineraries.findIndex(day => Number(day.day) === fix.dayNumber);
  if (dayIndex === -1) {
    return 'not-found';
  }
  const pois = Array.isArray(dayItineraries[dayIndex]?.pois) ? [...dayItineraries[dayIndex]!.pois] : [];
  if (!pois[fix.poiIndex]) {
    return 'not-found';
  }
  pois[fix.poiIndex] = { ...pois[fix.poiIndex], name: pois[fix.poiIndex]!.name, lat: fix.latitude, lng: fix.longitude };
  dayItineraries[dayIndex] = { ...dayItineraries[dayIndex], day: dayItineraries[dayIndex]!.day, pois };
  await db.update(travelGuides).set({ dayItineraries }).where(eq(travelGuides.id, id));
  return 'updated';
}
