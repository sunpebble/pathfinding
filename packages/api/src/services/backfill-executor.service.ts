import { crawlJobs, getDb, mafengwoDestinations, mafengwoGuides, travelGuides } from '@pathfinding/database';
import { eq, inArray } from 'drizzle-orm';

export interface ExecutorConfig {
  goServerUrl: string;
  fetchImpl: typeof fetch;
}

const defaultConfig: ExecutorConfig = {
  goServerUrl: process.env.GO_SERVER_URL || 'http://localhost:3001',
  fetchImpl: globalThis.fetch,
};

interface CrawlerFetchResponse {
  success: boolean;
  data?: {
    url: string;
    title: string;
    content: string;
  };
  error?: string;
}

async function fetchUrlContent(
  url: string,
  cfg: ExecutorConfig,
): Promise<CrawlerFetchResponse> {
  const response = await cfg.fetchImpl(`${cfg.goServerUrl}/api/crawler/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return response.json() as Promise<CrawlerFetchResponse>;
}

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

  const updates: Record<string, unknown> = {};

  if (!guide.content || guide.content.trim().length === 0) {
    updates.content = mafengwoGuide.content;
  }
  if (!guide.coverImageUrl || guide.coverImageUrl.trim().length === 0) {
    updates.coverImageUrl = mafengwoGuide.coverImageUrl;
  }
  if (!guide.imageUrls || guide.imageUrls.length === 0) {
    updates.imageUrls = mafengwoGuide.imageUrls;
  }
  if (!guide.destinations || guide.destinations.length === 0) {
    if (mafengwoGuide.destinationName) {
      updates.destinations = [{ name: mafengwoGuide.destinationName }];
    }
  }
  if (!guide.tags || guide.tags.length === 0) {
    updates.tags = mafengwoGuide.tags;
  }
  if (!guide.authorName || guide.authorName.trim().length === 0) {
    updates.authorName = mafengwoGuide.authorName;
  }

  if (Object.keys(updates).length > 0) {
    await db.update(travelGuides).set(updates).where(eq(travelGuides.id, guideId));
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
  const result = await fetchUrlContent(sourceUrl, cfg);

  if (!result.success || !result.data)
    return false;

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
    await db.update(travelGuides).set(updates).where(eq(travelGuides.id, guideId));
    return true;
  }
  return false;
}

export interface BackfillExecutionResult {
  success: boolean;
  processed: number;
  failed: number;
  message: string;
}

export async function executeBackfillJob(
  jobId: number,
  overrideConfig?: Partial<ExecutorConfig>,
): Promise<BackfillExecutionResult> {
  const cfg = { ...defaultConfig, ...overrideConfig };
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

  let processed = 0;
  let failed = 0;
  const config = (job.config ?? {}) as Record<string, unknown>;

  try {
    if (job.jobType === 'field_backfill') {
      const guideIds = (config.targetGuideIds ?? []) as number[];
      const guides = await db
        .select()
        .from(travelGuides)
        .where(inArray(travelGuides.id, guideIds));

      for (const guide of guides) {
        try {
          let updated = false;

          if (guide.platform === 'mafengwo' && guide.externalId) {
            updated = await syncFromMafengwoGuide(guide.id, guide.externalId);
          }

          if (!updated && guide.sourceUrl) {
            updated = await fetchAndUpdateGuide(guide.id, guide.sourceUrl, cfg);
          }

          if (updated)
            processed++;
        }
        catch (err) {
          failed++;
          console.error(`补齐游记 ${guide.id} 失败：`, err);
        }
      }
    }
    else if (job.jobType === 'destination_fill') {
      const destinations = (config.targetDestinations ?? []) as string[];

      for (const cityName of destinations) {
        try {
          const [_dest] = await db
            .select()
            .from(mafengwoDestinations)
            .where(eq(mafengwoDestinations.name, cityName))
            .limit(1);

          const response = await cfg.fetchImpl(
            `${cfg.goServerUrl}/api/crawler/mafengwo/list`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ city: cityName, scrollCount: 5 }),
            },
          );

          if (response.ok)
            processed++;
          else
            failed++;
        }
        catch (err) {
          failed++;
          console.error(`填充目的地 ${cityName} 失败：`, err);
        }
      }
    }

    await db
      .update(crawlJobs)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
        progress: { processed, failed },
      })
      .where(eq(crawlJobs.id, jobId));

    return {
      success: true,
      processed,
      failed,
      message: `已处理 ${processed} 条，失败 ${failed} 条`,
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
        progress: { processed, failed },
      })
      .where(eq(crawlJobs.id, jobId));

    return {
      success: false,
      processed,
      failed,
      message,
    };
  }
}

export async function executeAllPendingBackfillJobs(
  overrideConfig?: Partial<ExecutorConfig>,
): Promise<{ executed: number; totalProcessed: number; totalFailed: number }> {
  const db = getDb();

  const pendingJobs = await db
    .select()
    .from(crawlJobs)
    .where(eq(crawlJobs.status, 'pending'))
    .orderBy(crawlJobs.createdAt);

  let totalProcessed = 0;
  let totalFailed = 0;
  let executed = 0;

  for (const job of pendingJobs) {
    if (job.jobType === 'field_backfill' || job.jobType === 'destination_fill') {
      const result = await executeBackfillJob(job.id, overrideConfig);
      totalProcessed += result.processed;
      totalFailed += result.failed;
      executed++;
    }
  }

  return { executed, totalProcessed, totalFailed };
}
