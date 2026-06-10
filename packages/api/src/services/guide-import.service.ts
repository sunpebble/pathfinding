import type { ParseStatus } from '@pathfinding/crawler-types';
/**
 * Guide import service — the ONLY writer of `travel_guides` (D2).
 *
 * Ingest pipeline (D5): cleanContent → validateGuideEnhanced →
 * calculateQualityScoreUnified. Error-level validation rejects the row and
 * records it in `raw_crawl_records` with parseStatus 'rejected'; warnings are
 * imported and recorded in `enrichedData.ingestWarnings`.
 *
 * Every successful crawl leaves a raw record (D6), counts are parsed via the
 * shared parseChineseNumber fallback (D4), existing rows are refreshed via
 * upsert semantics (D7), and destinations are mirrored into the
 * `guide_destinations` auxiliary table (D9).
 */
import type { Database, GuideDestination } from '@pathfinding/database';
import { createHash } from 'node:crypto';
import {
  calculateCompletenessLevel,
  calculateQualityScoreUnified,
  cleanContent,
  parseChineseNumber,
  validateGuideEnhanced,
} from '@pathfinding/crawler-types';
import {
  getDb,
  guideDestinations,
  mafengwoDestinations,
  mafengwoGuides,
  rawCrawlRecords,
  travelGuides,
} from '@pathfinding/database';
import { and, eq } from 'drizzle-orm';
import { buildStructuredGuideContent } from './guide-content.js';

export interface ExecutorConfig {
  goServerUrl: string;
  fetchImpl: typeof fetch;
}

const defaultConfig: ExecutorConfig = {
  goServerUrl: process.env.GO_SERVER_URL || 'http://localhost:3001',
  fetchImpl: globalThis.fetch,
};

/**
 * raw_crawl_records.job_id is NOT NULL; imports triggered outside a crawl job
 * (admin manual import) use this sentinel instead of inventing a fake job.
 */
const NO_JOB_ID = 0;

/** Fallback title for rows without a usable title (also the empty-shell marker, D7). */
const UNTITLED = '未命名';

/** enrichedData keys derived from `content` — only refreshed together with it (D7). */
const CONTENT_DERIVED_KEYS = ['contentFormatVersion', 'contentHtml', 'contentMarkdown'];

interface GuideUrlItem {
  url: string;
  title?: string;
}

export interface PlatformDiscoveryResult {
  platform: string;
  city: string;
  totalFound: number;
  newGuides: GuideUrlItem[];
  existingCount: number;
  /**
   * Whether the upstream list crawl was genuinely scoped to the requested
   * city (D10). Responses without the flag are treated as NOT city-scoped, so
   * importGuide never attributes the request city to them.
   */
  cityScoped: boolean;
}

interface MafengwoListResponse {
  success: boolean;
  data?: {
    city: string;
    urls: string[];
    total: number;
    /** Set by Go when the list URL was actually city-scoped (WS-B2). */
    cityScoped?: boolean;
  };
  error?: string;
}

/** POST /api/crawler/mafengwo/detail success payload (WS-B1 contract). */
interface MafengwoDetailData {
  url: string;
  externalId: string;
  title: string;
  content: string;
  contentHtml?: string;
  contentMarkdown?: string;
  contentTruncated?: boolean;
  author: string;
  /** Parsed by Go; legacy responses may still carry strings — handled at runtime. */
  views?: number;
  likes?: number;
  viewsRaw?: string;
  likesRaw?: string;
  coverImage: string;
  images: string[];
  /** Original page date string, may be ''. */
  publishedAt?: string;
  /** Go-side reference score (0–1). NOT persisted — TS unified score is the truth (D5). */
  qualityScore?: number;
  saved?: boolean;
  saveError?: string;
}

interface MafengwoDetailResponse {
  success: boolean;
  data?: MafengwoDetailData;
  error?: string;
}

/** Per-import context passed down from discovery / job execution. */
export interface ImportContext {
  /** Requested city from the discovery step. */
  city?: string;
  /** Only `true` allows attributing `city` to the guide's destinations (D10). */
  cityScoped?: boolean;
  /** Owning crawl_jobs.id for raw record lineage; defaults to NO_JOB_ID. */
  jobId?: number;
}

export type ImportAction = 'inserted' | 'updated' | 'rejected' | 'failed';

export interface ImportGuideResult {
  success: boolean;
  guideId?: number;
  action: ImportAction;
  message: string;
  /** Ingest warnings recorded in enrichedData.ingestWarnings (empty when clean). */
  warnings: string[];
}

// ── Discovery ──────────────────────────────────────────

async function discoverFromMafengwo(
  city: string,
  cfg: ExecutorConfig,
): Promise<PlatformDiscoveryResult> {
  const db = getDb();

  // D10: pass mddId when known so Go takes the precise city travel-note list
  // (/yj/{mddId}/) rather than degrading to the site-wide search page. Mirrors
  // runDestinationFill in backfill-executor — both discovery entries must feed
  // mddId for the city-scoped main path to be exercised.
  const [destination] = await db
    .select()
    .from(mafengwoDestinations)
    .where(eq(mafengwoDestinations.name, city))
    .limit(1);

  const requestBody: Record<string, unknown> = { city, scrollCount: 5 };
  if (destination?.mddId) {
    requestBody.mddId = destination.mddId;
  }

  const response = await cfg.fetchImpl(
    `${cfg.goServerUrl}/api/crawler/mafengwo/list`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    throw new Error(`马蜂窝列表爬取失败：${response.status}`);
  }

  const result = (await response.json()) as MafengwoListResponse;

  if (!result.success || !result.data) {
    throw new Error(result.error || '马蜂窝列表爬取未返回数据');
  }

  const existingUrls = await db
    .select({ sourceUrl: travelGuides.sourceUrl })
    .from(travelGuides)
    .where(eq(travelGuides.platform, 'mafengwo'));

  const existingUrlSet = new Set(
    existingUrls.map(u => u.sourceUrl).filter(Boolean),
  );

  const newGuides: GuideUrlItem[] = [];
  for (const url of result.data.urls) {
    if (!existingUrlSet.has(url)) {
      newGuides.push({ url });
    }
  }

  return {
    platform: 'mafengwo',
    city,
    totalFound: result.data.total,
    newGuides,
    existingCount: result.data.total - newGuides.length,
    cityScoped: result.data.cityScoped === true,
  };
}

export async function discoverNewGuides(
  platform: string,
  city: string,
  overrideConfig?: Partial<ExecutorConfig>,
): Promise<PlatformDiscoveryResult> {
  const cfg = { ...defaultConfig, ...overrideConfig };

  switch (platform) {
    case 'mafengwo':
      return discoverFromMafengwo(city, cfg);
    default:
      throw new Error(`不支持的平台：${platform}`);
  }
}

// ── Ingest helpers ─────────────────────────────────────

/**
 * Resolve a crawled count (D4): prefer the Go-parsed number, fall back to
 * parseChineseNumber on string candidates. Returns `null` on failure — the
 * caller decides (insert → 0, update → keep existing) and the failure is
 * always surfaced as an ingest warning.
 */
function resolveCount(
  field: string,
  parsed: unknown,
  raw: string | undefined,
  warnings: string[],
): number | null {
  if (typeof parsed === 'number' && Number.isFinite(parsed)) {
    return parsed;
  }

  const candidates = [typeof parsed === 'string' ? parsed : undefined, raw];
  for (const candidate of candidates) {
    if (candidate && candidate.trim() !== '') {
      const value = parseChineseNumber(candidate);
      if (value !== null) {
        return value;
      }
    }
  }

  warnings.push(
    `${field} 计数解析失败（parsed=${JSON.stringify(parsed ?? null)}, raw=${JSON.stringify(raw ?? null)}）：新建置 0，更新保留原值`,
  );
  return null;
}

const CHINESE_DATE_PATTERN = /(\d{4})[年.\-/](\d{1,2})[月.\-/](\d{1,2})/;

/** Parse the page-original publish date string; failure → null + warning, never a fake date. */
function parsePublishedAt(raw: string | undefined, warnings: string[]): Date | null {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }

  const match = CHINESE_DATE_PATTERN.exec(trimmed);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const fallback = new Date(trimmed);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }

  warnings.push(`publishedAt 解析失败：${trimmed}`);
  return null;
}

/** City attribution (D10): only cityScoped discoveries may claim the request city. */
function resolveDestinationNames(
  context: ImportContext | undefined,
  stagingDestination: string | null | undefined,
): string[] {
  const names = new Set<string>();
  if (context?.cityScoped === true && context.city?.trim()) {
    names.add(context.city.trim());
  }
  if (stagingDestination?.trim()) {
    names.add(stagingDestination.trim());
  }
  return [...names];
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function sha256Hex(payload: string): string {
  return createHash('sha256').update(payload).digest('hex');
}

interface RawCrawlInput {
  jobId: number;
  url: string;
  rawData: Record<string, unknown>;
  contentHash: string;
  parseStatus: ParseStatus;
  error: string | null;
}

/** D6: persist the original crawl payload for audit/replay. */
async function recordRawCrawl(db: Database, input: RawCrawlInput): Promise<void> {
  await db.insert(rawCrawlRecords).values({
    jobId: input.jobId,
    url: input.url,
    rawData: input.rawData,
    contentHash: input.contentHash,
    parseStatus: input.parseStatus,
    error: input.error,
  });
}

/**
 * D9: mirror destination names into the guide_destinations auxiliary table.
 * Idempotent — only missing rows are inserted.
 */
export async function syncGuideDestinations(
  db: Database,
  guideId: number,
  destinationNames: string[],
): Promise<void> {
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

  await db
    .insert(guideDestinations)
    .values(missing.map(destination => ({ guideId, destination })));
}

type TravelGuideRow = typeof travelGuides.$inferSelect;
type TravelGuideUpdate = Partial<typeof travelGuides.$inferInsert>;

/** D7: locate the existing row by (platform, externalId) first, sourceUrl as fallback. */
async function findExistingGuide(
  db: Database,
  platform: string,
  externalId: string | undefined,
  sourceUrl: string,
): Promise<TravelGuideRow | null> {
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

  const [byUrl] = await db
    .select()
    .from(travelGuides)
    .where(eq(travelGuides.sourceUrl, sourceUrl))
    .limit(1);
  return byUrl ?? null;
}

/**
 * Merge enrichedData by key (D7): AI output and manual fixes on the existing
 * row are NEVER dropped; content-derived keys only refresh alongside content.
 */
function mergeEnrichedData(
  existing: Record<string, unknown> | null,
  incoming: Record<string, unknown>,
  includeContentKeys: boolean,
): Record<string, unknown> {
  const next = includeContentKeys
    ? incoming
    : Object.fromEntries(
        Object.entries(incoming).filter(([key]) => !CONTENT_DERIVED_KEYS.includes(key)),
      );
  return { ...(existing ?? {}), ...next };
}

function isEmptyShell(row: TravelGuideRow): boolean {
  return (!row.content || row.content.trim() === '') && row.title === UNTITLED;
}

// ── Import (single guide) ──────────────────────────────

interface PreparedGuide {
  values: TravelGuideUpdate;
  destinationNames: string[];
  views: number | null;
  likes: number | null;
  commentCount: number | null;
  cleanedContent: string;
  enrichedNew: Record<string, unknown>;
  warnings: string[];
}

async function importMafengwoGuide(
  url: string,
  cfg: ExecutorConfig,
  context: ImportContext | undefined,
): Promise<ImportGuideResult> {
  const db = getDb();

  const response = await cfg.fetchImpl(
    `${cfg.goServerUrl}/api/crawler/mafengwo/detail`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    },
  );

  if (!response.ok) {
    return {
      success: false,
      action: 'failed',
      message: `获取游记详情失败：${response.status}`,
      warnings: [],
    };
  }

  const result = (await response.json()) as MafengwoDetailResponse;
  if (!result.success || !result.data) {
    return {
      success: false,
      action: 'failed',
      message: result.error || '解析游记详情失败',
      warnings: [],
    };
  }

  const data = result.data;
  const jobId = context?.jobId ?? NO_JOB_ID;
  const rawData: Record<string, unknown> = {
    platform: 'mafengwo',
    requestUrl: url,
    response: data,
  };
  const contentHash = sha256Hex(JSON.stringify(rawData));
  const warnings: string[] = [];

  if (data.saveError) {
    warnings.push(`Go 暂存层保存失败：${data.saveError}`);
  }

  // D5 step 1: clean content (raw original stays in raw_crawl_records).
  const cleaning = cleanContent(data.content ?? '');
  const cleanedContent = cleaning.content;
  const meaningfulRemovals = cleaning.removedTypes.filter(type => type !== 'whitespace');
  if (meaningfulRemovals.length > 0) {
    warnings.push(
      `清洗移除类目：${meaningfulRemovals.join(', ')}（${cleaning.originalLength}→${cleaning.cleanedLength} 字符）`,
    );
  }

  // Staging supplement: Go /detail also persists to mafengwo_guides — pick up
  // destinations/tags/publishedAt/counts the detail response does not carry.
  const externalId = data.externalId?.trim() || undefined;
  let staging: typeof mafengwoGuides.$inferSelect | null = null;
  if (externalId) {
    const [stagingRow] = await db
      .select()
      .from(mafengwoGuides)
      .where(eq(mafengwoGuides.guideId, externalId))
      .limit(1);
    staging = stagingRow ?? null;
  }

  const destinationNames = resolveDestinationNames(context, staging?.destinationName);
  const tags = asStringArray(staging?.tags);
  const views = resolveCount('views', data.views, data.viewsRaw, warnings);
  const likes = resolveCount('likes', data.likes, data.likesRaw, warnings);
  const commentCount = staging ? staging.commentsCount : null;
  const savesCount = staging ? staging.savesCount : undefined;
  const publishedAt = staging?.publishedAt ?? parsePublishedAt(data.publishedAt, warnings);

  // D5 step 2: enhanced validation. Error level rejects the import.
  const validation = validateGuideEnhanced({
    sourcePlatform: 'mafengwo',
    sourceExternalId: externalId,
    content: cleanedContent,
    destinations: destinationNames,
    title: data.title,
    coverImageUrl: data.coverImage,
    imageUrls: data.images,
    authorName: data.author,
    viewsCount: views ?? undefined,
    likesCount: likes ?? undefined,
    commentsCount: commentCount ?? undefined,
    savesCount,
  });

  if (!validation.valid) {
    const reasons = validation.errors
      .map(issue => `${issue.field}: ${issue.message}`)
      .join('; ');
    await recordRawCrawl(db, {
      jobId,
      url,
      rawData,
      contentHash,
      parseStatus: 'rejected',
      error: `error 级校验拒绝：${reasons}`,
    });
    return {
      success: false,
      action: 'rejected',
      message: `校验失败，拒绝入库：${reasons}`,
      warnings,
    };
  }

  for (const warning of validation.warnings) {
    warnings.push(`${warning.field}: ${warning.message}`);
  }

  // D5 step 3: unified quality score — single source of truth (Go score is reference only).
  const quality = calculateQualityScoreUnified({
    title: validation.normalizedData.title,
    content: cleanedContent,
    authorName: validation.normalizedData.authorName,
    images: validation.normalizedData.imageUrls,
    coverImage: validation.normalizedData.coverImageUrl,
    views: views ?? undefined,
    likes: likes ?? undefined,
    saves: savesCount,
    comments: commentCount ?? undefined,
    destinations: destinationNames,
    tags,
  });

  const contentTruncated
    = data.contentTruncated === true || validation.normalizedData.contentTruncated === true;
  const completenessLevel = calculateCompletenessLevel({
    title: validation.normalizedData.title,
    content: cleanedContent,
    coverImageUrl: validation.normalizedData.coverImageUrl,
    imageUrls: validation.normalizedData.imageUrls,
    authorName: validation.normalizedData.authorName,
    destinations: destinationNames,
    contentTruncated,
    viewsCount: views ?? undefined,
    likesCount: likes ?? undefined,
    commentsCount: commentCount ?? undefined,
    savesCount,
    qualityScore: quality.score,
  });

  const enrichedNew: Record<string, unknown> = {
    ...buildStructuredGuideContent({
      title: data.title,
      content: cleanedContent,
      contentHtml: data.contentHtml,
      contentMarkdown: data.contentMarkdown,
      imageUrls: validation.normalizedData.imageUrls,
    }),
    ingestWarnings: warnings,
  };

  const prepared: PreparedGuide = {
    values: {
      title: validation.normalizedData.title ?? UNTITLED,
      content: cleanedContent,
      authorName: validation.normalizedData.authorName ?? null,
      sourceUrl: url,
      coverImageUrl: validation.normalizedData.coverImageUrl ?? null,
      imageUrls: validation.normalizedData.imageUrls ?? [],
      destinations: destinationNames.map(name => ({ name })),
      tags,
      publishedAt,
      viewCount: views ?? 0,
      likeCount: likes ?? 0,
      commentCount: commentCount ?? 0,
      qualityScore: quality.score,
      completenessLevel,
      crawledAt: new Date(),
    },
    destinationNames,
    views,
    likes,
    commentCount,
    cleanedContent,
    enrichedNew,
    warnings,
  };

  const existing = await findExistingGuide(db, 'mafengwo', externalId, url);

  try {
    const outcome = existing
      ? await refreshExistingGuide(db, existing, externalId, prepared)
      : await insertNewGuide(db, externalId, prepared);

    await recordRawCrawl(db, {
      jobId,
      url,
      rawData,
      contentHash,
      parseStatus: 'success',
      error: null,
    });
    return outcome;
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordRawCrawl(db, {
      jobId,
      url,
      rawData,
      contentHash,
      parseStatus: 'failed',
      error: `入库失败：${message}`,
    });
    throw error;
  }
}

async function insertNewGuide(
  db: Database,
  externalId: string | undefined,
  prepared: PreparedGuide,
): Promise<ImportGuideResult> {
  const insertResult = await db.insert(travelGuides).values({
    platform: 'mafengwo',
    externalId: externalId ?? null,
    ...prepared.values,
    title: prepared.values.title ?? UNTITLED,
    enrichedData: prepared.enrichedNew,
  });

  const guideId = Number(insertResult[0].insertId);
  await syncGuideDestinations(db, guideId, prepared.destinationNames);

  return {
    success: true,
    guideId,
    action: 'inserted',
    message: '游记导入成功',
    warnings: prepared.warnings,
  };
}

/**
 * D7 refresh policy:
 * - empty shells (no content + untitled) are fully refreshed;
 * - counts/crawledAt/qualityScore/completenessLevel always refresh
 *   (failed count parses keep the existing value — never degrade to 0);
 * - content only when the new validated content is longer;
 * - coverImageUrl/imageUrls/tags only when the new value is non-empty;
 * - enrichedData merges by key, preserving AI output and manual fixes.
 */
async function refreshExistingGuide(
  db: Database,
  existing: TravelGuideRow,
  externalId: string | undefined,
  prepared: PreparedGuide,
): Promise<ImportGuideResult> {
  let updates: TravelGuideUpdate;

  if (isEmptyShell(existing)) {
    updates = {
      ...prepared.values,
      externalId: existing.externalId ?? externalId ?? null,
      enrichedData: mergeEnrichedData(existing.enrichedData, prepared.enrichedNew, true),
    };
  }
  else {
    const contentImproved
      = prepared.cleanedContent.length > (existing.content?.length ?? 0);

    updates = {
      crawledAt: prepared.values.crawledAt,
      qualityScore: prepared.values.qualityScore,
      completenessLevel: prepared.values.completenessLevel,
      enrichedData: mergeEnrichedData(existing.enrichedData, prepared.enrichedNew, contentImproved),
    };

    if (prepared.views !== null) {
      updates.viewCount = prepared.views;
    }
    if (prepared.likes !== null) {
      updates.likeCount = prepared.likes;
    }
    if (prepared.commentCount !== null) {
      updates.commentCount = prepared.commentCount;
    }
    if (contentImproved) {
      updates.content = prepared.cleanedContent;
    }
    if (prepared.values.coverImageUrl) {
      updates.coverImageUrl = prepared.values.coverImageUrl;
    }
    if ((prepared.values.imageUrls?.length ?? 0) > 0) {
      updates.imageUrls = prepared.values.imageUrls;
    }
    if ((prepared.values.tags?.length ?? 0) > 0) {
      updates.tags = prepared.values.tags;
    }
    if (prepared.values.publishedAt) {
      updates.publishedAt = prepared.values.publishedAt;
    }
    if (prepared.values.authorName) {
      updates.authorName = prepared.values.authorName;
    }
    if (!existing.externalId && externalId) {
      updates.externalId = externalId;
    }

    const existingDestinations: GuideDestination[] = existing.destinations ?? [];
    const existingNames = new Set(existingDestinations.map(d => d.name));
    const newNames = prepared.destinationNames.filter(name => !existingNames.has(name));
    if (newNames.length > 0) {
      updates.destinations = [
        ...existingDestinations,
        ...newNames.map(name => ({ name })),
      ];
    }
  }

  await db.update(travelGuides).set(updates).where(eq(travelGuides.id, existing.id));
  await syncGuideDestinations(db, existing.id, prepared.destinationNames);

  return {
    success: true,
    guideId: existing.id,
    action: 'updated',
    message: '游记已刷新',
    warnings: prepared.warnings,
  };
}

export async function importGuide(
  platform: string,
  url: string,
  overrideConfig?: Partial<ExecutorConfig>,
  context?: ImportContext,
): Promise<ImportGuideResult> {
  const cfg = { ...defaultConfig, ...overrideConfig };

  if (platform === 'mafengwo') {
    return importMafengwoGuide(url, cfg, context);
  }

  return {
    success: false,
    action: 'failed',
    message: `不支持的平台：${platform}`,
    warnings: [],
  };
}

// ── Batch import ───────────────────────────────────────

export interface BatchImportResult {
  imported: number;
  updated: number;
  rejected: number;
  failed: number;
  skipped: number;
  results: Array<{
    url: string;
    success: boolean;
    action: ImportAction;
    message: string;
    guideId?: number;
  }>;
}

export async function batchImportGuides(
  platform: string,
  urls: string[],
  overrideConfig?: Partial<ExecutorConfig>,
  context?: ImportContext,
): Promise<BatchImportResult> {
  const results: BatchImportResult['results'] = [];
  let imported = 0;
  let updated = 0;
  let rejected = 0;
  let failed = 0;

  for (const url of urls) {
    try {
      const result = await importGuide(platform, url, overrideConfig, context);
      results.push({
        url,
        success: result.success,
        action: result.action,
        message: result.message,
        guideId: result.guideId,
      });

      switch (result.action) {
        case 'inserted':
          imported++;
          break;
        case 'updated':
          updated++;
          break;
        case 'rejected':
          rejected++;
          break;
        case 'failed':
          failed++;
          break;
      }
    }
    catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ url, success: false, action: 'failed', message });
      failed++;
    }
  }

  return { imported, updated, rejected, failed, skipped: 0, results };
}
