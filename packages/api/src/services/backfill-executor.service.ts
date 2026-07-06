import type { ExecutorConfig } from './guide-import.service.js';
import { crawlJobs, getDb, mafengwoGuides, travelGuides } from '@pathfinding/database';
import { eq, inArray } from 'drizzle-orm';
import { fetchCrawlerContent } from './crawler-fetch.service.js';
import { MAFENGWO_CRAWLER_DISABLED_MESSAGE } from './guide-import.service.js';
import { syncGuideDestinations, updateUserGuide } from './guide-writer.js';

const defaultConfig: ExecutorConfig = {
  fetchImpl: globalThis.fetch,
};

/**
 * Sync a travel_guides row from the mafengwo_guides staging table (D2: the
 * staging → application sync runs on the TS side).
 *
 * Refresh policy follows D7:
 * - engagement counts always track the latest staging values;
 * - content is covered only when the staging content is longer;
 * - cover/image/tags/author only when the staging value is non-empty;
 * - destinations are merged (never replaced) and mirrored into
 *   guide_destinations (D9); publishedAt fills only when missing.
 */
async function syncFromMafengwoGuide(
  guideId: number,
  externalId: string,
): Promise<boolean> {
  const db = getDb();
  const [mafengwoGuide] = await db
    .select()
    .from(mafengwoGuides)
    .where(eq(mafengwoGuides.guideId, externalId))
    .limit(1);

  if (!mafengwoGuide)
    return false;

  const [guide] = await db
    .select()
    .from(travelGuides)
    .where(eq(travelGuides.id, guideId))
    .limit(1);

  if (!guide)
    return false;

  const updates: Partial<typeof travelGuides.$inferInsert> = {};

  const stagingContent = mafengwoGuide.content ?? '';
  if (stagingContent.length > (guide.content?.length ?? 0)) {
    updates.content = stagingContent;
  }
  if (mafengwoGuide.title && (!guide.title || guide.title === '未命名')) {
    updates.title = mafengwoGuide.title;
  }
  if (mafengwoGuide.coverImageUrl) {
    updates.coverImageUrl = mafengwoGuide.coverImageUrl;
  }
  const stagingImages = Array.isArray(mafengwoGuide.imageUrls)
    ? mafengwoGuide.imageUrls.filter((u): u is string => typeof u === 'string')
    : [];
  if (stagingImages.length > 0) {
    updates.imageUrls = stagingImages;
  }
  const stagingTags = Array.isArray(mafengwoGuide.tags)
    ? mafengwoGuide.tags.filter((t): t is string => typeof t === 'string')
    : [];
  if (stagingTags.length > 0) {
    updates.tags = stagingTags;
  }
  if (mafengwoGuide.authorName) {
    updates.authorName = mafengwoGuide.authorName;
  }
  if (mafengwoGuide.publishedAt && !guide.publishedAt) {
    updates.publishedAt = mafengwoGuide.publishedAt;
  }

  // D7: counts always track the latest staging values.
  if (typeof mafengwoGuide.viewsCount === 'number' && mafengwoGuide.viewsCount !== guide.viewCount) {
    updates.viewCount = mafengwoGuide.viewsCount;
  }
  if (typeof mafengwoGuide.likesCount === 'number' && mafengwoGuide.likesCount !== guide.likeCount) {
    updates.likeCount = mafengwoGuide.likesCount;
  }
  if (typeof mafengwoGuide.commentsCount === 'number' && mafengwoGuide.commentsCount !== guide.commentCount) {
    updates.commentCount = mafengwoGuide.commentsCount;
  }

  // Destinations: merge staging destination into JSON column + auxiliary table (D9).
  const destinationName = mafengwoGuide.destinationName?.trim();
  if (destinationName) {
    const existingDestinations = guide.destinations ?? [];
    if (!existingDestinations.some(d => d.name === destinationName)) {
      updates.destinations = [...existingDestinations, { name: destinationName }];
    }
    await syncGuideDestinations(db, guideId, [destinationName]);
  }

  if (Object.keys(updates).length > 0) {
    await updateUserGuide(db, guideId, updates);
    return true;
  }
  return false;
}

async function fetchAndUpdateGuide(
  guideId: number,
  sourceUrl: string,
  cfg: ExecutorConfig,
): Promise<boolean> {
  const db = getDb();
  const result = await fetchCrawlerContent(sourceUrl, cfg.fetchImpl);

  // Crawler-reported failure is a real failure — surface it to the caller
  // instead of silently counting the guide as "not updated".
  if (!result.success || !result.data) {
    throw new Error(result.error || '内容抓取未返回数据');
  }

  const [guide] = await db
    .select()
    .from(travelGuides)
    .where(eq(travelGuides.id, guideId))
    .limit(1);

  if (!guide)
    return false;

  const updates: Record<string, unknown> = {};

  if (!guide.content || guide.content.trim().length === 0) {
    updates.content = result.data.content;
  }
  if (!guide.title || guide.title.trim().length === 0) {
    updates.title = result.data.title;
  }

  if (Object.keys(updates).length > 0) {
    await updateUserGuide(db, guideId, updates);
    return true;
  }
  return false;
}

/** Ingest counters recorded in crawl_jobs.progress and API responses (D16). */
export interface BackfillCounters {
  processed: number;
  imported: number;
  updated: number;
  rejected: number;
  skipped: number;
  failed: number;
}

export interface BackfillExecutionResult extends BackfillCounters {
  success: boolean;
  message: string;
}

function emptyCounters(): BackfillCounters {
  return { processed: 0, imported: 0, updated: 0, rejected: 0, skipped: 0, failed: 0 };
}

async function runDestinationFill(
  targetDestinations: string[],
  counters: BackfillCounters,
): Promise<void> {
  for (const cityName of targetDestinations) {
    counters.failed++;
    console.warn(`跳过目的地 ${cityName}：${MAFENGWO_CRAWLER_DISABLED_MESSAGE}`);
  }
}

async function runFieldBackfill(
  targetGuideIds: number[],
  cfg: ExecutorConfig,
  counters: BackfillCounters,
): Promise<void> {
  const db = getDb();
  const guides = await db
    .select()
    .from(travelGuides)
    .where(inArray(travelGuides.id, targetGuideIds));

  for (const guide of guides) {
    try {
      let updated = false;

      if (guide.platform === 'mafengwo' && guide.externalId) {
        updated = await syncFromMafengwoGuide(guide.id, guide.externalId);
      }

      if (!updated && guide.sourceUrl) {
        updated = await fetchAndUpdateGuide(guide.id, guide.sourceUrl, cfg);
      }

      if (updated) {
        counters.processed++;
        counters.updated++;
      }
      else {
        counters.skipped++;
      }
    }
    catch (err) {
      counters.failed++;
      console.error(`补齐游记 ${guide.id} 失败：`, err);
    }
  }
}

export async function executeBackfillJob(
  jobId: number,
  overrideConfig?: Partial<ExecutorConfig>,
): Promise<BackfillExecutionResult> {
  const cfg: ExecutorConfig = {
    fetchImpl: overrideConfig?.fetchImpl ?? defaultConfig.fetchImpl,
  };
  const db = getDb();

  const [job] = await db
    .select()
    .from(crawlJobs)
    .where(eq(crawlJobs.id, jobId))
    .limit(1);

  if (!job) {
    throw new Error('任务不存在');
  }
  if (job.status !== 'pending') {
    throw new Error(`任务状态为 ${job.status}，需要为 pending`);
  }

  await db
    .update(crawlJobs)
    .set({
      status: 'running',
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(crawlJobs.id, jobId));

  const counters = emptyCounters();
  const config = (job.config ?? {}) as Record<string, unknown>;

  try {
    if (job.jobType === 'field_backfill') {
      await runFieldBackfill((config.targetGuideIds ?? []) as number[], cfg, counters);
    }
    else if (job.jobType === 'destination_fill') {
      await runDestinationFill((config.targetDestinations ?? []) as string[], counters);
    }

    await db
      .update(crawlJobs)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
        progress: { ...counters },
      })
      .where(eq(crawlJobs.id, jobId));

    return {
      success: true,
      ...counters,
      message: `已处理 ${counters.processed} 条（新增 ${counters.imported}/刷新 ${counters.updated}/拒绝 ${counters.rejected}/跳过 ${counters.skipped}），失败 ${counters.failed} 条`,
    };
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(crawlJobs)
      .set({
        status: 'failed',
        error: message,
        completedAt: new Date(),
        updatedAt: new Date(),
        progress: { ...counters },
      })
      .where(eq(crawlJobs.id, jobId));

    return {
      success: false,
      ...counters,
      message,
    };
  }
}

export interface BackfillBatchSummary {
  executed: number;
  totalProcessed: number;
  totalImported: number;
  totalUpdated: number;
  totalRejected: number;
  totalSkipped: number;
  totalFailed: number;
}

export async function executeAllPendingBackfillJobs(
  overrideConfig?: Partial<ExecutorConfig>,
): Promise<BackfillBatchSummary> {
  const db = getDb();

  const pendingJobs = await db
    .select()
    .from(crawlJobs)
    .where(eq(crawlJobs.status, 'pending'))
    .orderBy(crawlJobs.createdAt);

  const summary: BackfillBatchSummary = {
    executed: 0,
    totalProcessed: 0,
    totalImported: 0,
    totalUpdated: 0,
    totalRejected: 0,
    totalSkipped: 0,
    totalFailed: 0,
  };

  for (const job of pendingJobs) {
    if (job.jobType === 'field_backfill' || job.jobType === 'destination_fill') {
      const result = await executeBackfillJob(job.id, overrideConfig);
      summary.executed++;
      summary.totalProcessed += result.processed;
      summary.totalImported += result.imported;
      summary.totalUpdated += result.updated;
      summary.totalRejected += result.rejected;
      summary.totalSkipped += result.skipped;
      summary.totalFailed += result.failed;
    }
  }

  return summary;
}
