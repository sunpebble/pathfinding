/**
 * 马蜂窝游记存储事件处理
 * 监听 crawler.mafengwo.detail.completed 事件，将数据存储到 TiDB
 */

import type { MafengwoRawGuide } from '../lib/mafengwo-converter.js';
import { createDb, travelGuides } from '@pathfinding/database';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  convertToConvexFormat,
} from '../lib/mafengwo-converter.js';

const eventDataSchema = z.object({
  url: z.string(),
  guide: z.object({
    title: z.string(),
    content: z.string(),
    contentHtml: z.string().optional(),
    author: z.string().optional(),
    views: z.string().optional(),
    likes: z.string().optional(),
    coverImage: z.string().optional(),
    images: z.array(z.string()),
    publishedAt: z.string().optional(),
  }),
});

export const config = {
  type: 'event',
  name: 'MafengwoSaveGuide',
  description: '保存马蜂窝游记到 TiDB',
  subscribes: ['crawler.mafengwo.detail.completed'],
  emits: ['crawler.mafengwo.saved'],
  flows: ['crawler'],
};

interface HandlerContext {
  emit: (event: { topic: string; data: unknown }) => Promise<void>;
  logger: {
    info: (msg: string, data?: unknown) => void;
    error: (msg: string, data?: unknown) => void;
  };
}

/**
 * 获取数据库连接
 */
function getDb() {
  return createDb();
}

/**
 * Upsert 游记到 TiDB
 */
async function upsertGuide(
  data: ReturnType<typeof convertToConvexFormat>,
  contentHtml?: string,
) {
  const db = getDb();

  // 检查是否已存在
  const existing = await db
    .select({ id: travelGuides.id })
    .from(travelGuides)
    .where(
      and(
        eq(travelGuides.platform, data.sourcePlatform),
        eq(travelGuides.externalId, data.sourceExternalId),
      ),
    )
    .limit(1);

  const guideData = {
    platform: data.sourcePlatform,
    externalId: data.sourceExternalId,
    title: data.title ?? data.sourceExternalId,
    content: contentHtml ?? data.content,
    authorName: data.authorName ?? null,
    sourceUrl: data.sourceUrl,
    coverImageUrl: data.coverImageUrl ?? null,
    imageUrls: data.imageUrls,
    destinations: data.destinations,
    tags: data.tags,
    viewCount: data.viewsCount,
    likeCount: data.likesCount,
    commentCount: data.commentsCount,
    qualityScore: data.qualityScore,
    crawledAt: new Date(),
    lastUpdatedAt: new Date(),
  };

  if (existing.length > 0) {
    await db
      .update(travelGuides)
      .set(guideData)
      .where(eq(travelGuides.id, existing[0]!.id));
    return existing[0]!.id;
  }
  else {
    const [result] = await db
      .insert(travelGuides)
      .values(guideData)
      .$returningId();
    return result!.id;
  }
}

export async function handler(
  event: { data?: unknown },
  { emit, logger }: HandlerContext,
) {
  // 验证事件数据
  const parseResult = eventDataSchema.safeParse(event.data);
  if (!parseResult.success) {
    logger.error('Invalid event data', { error: parseResult.error.message });
    return;
  }

  const { url, guide } = parseResult.data;

  try {
    logger.info('Saving guide to TiDB', { url });

    // 转换格式
    const guideData = convertToConvexFormat(url, guide as MafengwoRawGuide);

    // Upsert 到 TiDB
    const guideId = await upsertGuide(guideData, guide.contentHtml);

    logger.info('Guide saved successfully', {
      sourceExternalId: guideData.sourceExternalId,
      guideId,
    });

    // 发送保存完成事件
    await emit({
      topic: 'crawler.mafengwo.saved',
      data: {
        sourceExternalId: guideData.sourceExternalId,
        success: true,
        guideId,
      },
    });
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Save failed';
    logger.error('Failed to save guide', { error: message, url });

    // 发送失败事件
    await emit({
      topic: 'crawler.mafengwo.saved',
      data: {
        sourceExternalId: url,
        success: false,
        error: message,
      },
    });
  }
}

/**
 * 批量保存游记
 */
export async function saveBatch(
  guides: Array<{ url: string; guide: MafengwoRawGuide }>,
  logger: HandlerContext['logger'],
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const { url, guide } of guides) {
    try {
      const guideData = convertToConvexFormat(url, guide);
      await upsertGuide(guideData);

      success++;
      logger.info('Batch: saved guide', { sourceExternalId: guideData.sourceExternalId });
    }
    catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : 'Save failed';
      logger.error('Batch: failed to save guide', { url, error: message });
    }
  }

  return { success, failed };
}
