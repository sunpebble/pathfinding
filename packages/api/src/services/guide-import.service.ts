/**
 * Guide import service — thin composition over the ingest seams.
 *
 * Pipeline (D5): GoCrawlerPort.fetchDetail → staging lookup → normalizeGuide
 * (pure raw→canonical, the D4/D5/D10 logic) → persistIngestedGuide (the sole
 * D2 writer, D6 audit, D7 refresh, D9 destination mirror).
 *
 * Public API (`discoverNewGuides`, `importGuide`, `batchImportGuides`) is
 * unchanged so callers (crawl-jobs route, backfill-executor) are unaffected;
 * `syncGuideDestinations` is re-exported from `./guide-writer.js` for backfill.
 */
import type { GoCrawlerPort } from './go-crawler-port.js';
import type { ImportContext, StagingSupplement } from './guide-normalize.js';
import { getDb, mafengwoDestinations, mafengwoGuides, travelGuides } from '@pathfinding/database';
import { eq } from 'drizzle-orm';
import { createGoCrawlerPort } from './go-crawler-port.js';
import { normalizeGuide } from './guide-normalize.js';
import { persistIngestedGuide, syncGuideDestinations } from './guide-writer.js';

// Re-exported for back-compat: backfill-executor mirrors a single destination
// into guide_destinations via this writer (kept real through importOriginal).
export { syncGuideDestinations };
// ImportContext lives in guide-normalize now; re-export so existing callers
// importing it from this module keep working.
export type { ImportContext } from './guide-normalize.js';

/**
 * Back-compat config shape. `createGoCrawlerPort` accepts
 * `Partial<{ goServerUrl; fetchImpl }>`, which is structurally compatible with
 * `Partial<ExecutorConfig>` — backfill-executor threads its own ExecutorConfig
 * straight into `importGuide`/`batchImportGuides`.
 */
export interface ExecutorConfig {
  goServerUrl: string;
  fetchImpl: typeof fetch;
}

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
  const cfg: ExecutorConfig = {
    goServerUrl: overrideConfig?.goServerUrl ?? process.env.GO_SERVER_URL ?? 'http://localhost:3001',
    fetchImpl: overrideConfig?.fetchImpl ?? globalThis.fetch,
  };

  switch (platform) {
    case 'mafengwo':
      return discoverFromMafengwo(city, cfg);
    default:
      throw new Error(`不支持的平台：${platform}`);
  }
}

// ── Import (single guide) ──────────────────────────────

async function importMafengwoGuide(
  url: string,
  port: GoCrawlerPort,
  context: ImportContext | undefined,
): Promise<ImportGuideResult> {
  const db = getDb();
  const fetched = await port.fetchDetail(url);
  if (!fetched.ok) {
    return { success: false, action: 'failed', message: fetched.error, warnings: [] };
  }

  // Staging supplement: Go /detail also persists to mafengwo_guides — pick up
  // destinations/tags/publishedAt/counts the detail response does not carry.
  const externalId = fetched.data.externalId?.trim() || undefined;
  let staging: StagingSupplement | null = null;
  if (externalId) {
    const [stagingRow] = await db
      .select()
      .from(mafengwoGuides)
      .where(eq(mafengwoGuides.guideId, externalId))
      .limit(1);
    staging = stagingRow
      ? {
          destinationName: stagingRow.destinationName,
          tags: stagingRow.tags,
          commentsCount: stagingRow.commentsCount,
          savesCount: stagingRow.savesCount,
          publishedAt: stagingRow.publishedAt,
        }
      : null;
  }

  const normalized = normalizeGuide(fetched.data, url, context, staging);
  const persisted = await persistIngestedGuide(db, normalized);
  return {
    success: persisted.success,
    guideId: persisted.guideId,
    action: persisted.action === 'rejected' ? 'rejected' : persisted.action,
    message: persisted.message,
    warnings: persisted.warnings,
  };
}

export async function importGuide(
  platform: string,
  url: string,
  overrideConfig?: Partial<ExecutorConfig>,
  context?: ImportContext,
): Promise<ImportGuideResult> {
  if (platform === 'mafengwo') {
    const port = createGoCrawlerPort(overrideConfig);
    return importMafengwoGuide(url, port, context);
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
