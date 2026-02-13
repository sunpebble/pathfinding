/**
 * 马蜂窝游记存储事件处理
 * 监听 crawler.mafengwo.detail.completed 事件，将数据存储到 Convex
 */

import type { MafengwoRawGuide } from '../lib/mafengwo-converter.js';
import { ConvexHttpClient } from 'convex/browser';
import { z } from 'zod';
import { api } from '../../../../convex/_generated/api.js';
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
  description: '保存马蜂窝游记到 Convex',
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
 * 获取 Convex client
 */
function getConvexClient(): ConvexHttpClient {
  const url = process.env.CONVEX_URL;
  if (!url) {
    throw new Error('CONVEX_URL environment variable is not set');
  }
  return new ConvexHttpClient(url);
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
    logger.info('Saving guide to Convex', { url });

    // 转换为 Convex 格式
    const convexData = convertToConvexFormat(url, guide as MafengwoRawGuide);

    // 初始化 Convex client
    const client = getConvexClient();

    // 调用 upsert mutation
    const result = await client.mutation(api.travelGuides.upsert, {
      sourcePlatform: convexData.sourcePlatform,
      sourceExternalId: convexData.sourceExternalId,
      sourceUrl: convexData.sourceUrl,
      title: convexData.title,
      content: convexData.content,
      contentHtml: guide.contentHtml,
      authorName: convexData.authorName,
      destinations: convexData.destinations,
      tags: convexData.tags,
      likesCount: convexData.likesCount,
      savesCount: convexData.savesCount,
      commentsCount: convexData.commentsCount,
      viewsCount: convexData.viewsCount,
      coverImageUrl: convexData.coverImageUrl,
      imageUrls: convexData.imageUrls,
      qualityScore: convexData.qualityScore,
    });

    logger.info('Guide saved successfully', {
      sourceExternalId: convexData.sourceExternalId,
      guideId: result,
    });

    // 发送保存完成事件
    await emit({
      topic: 'crawler.mafengwo.saved',
      data: {
        sourceExternalId: convexData.sourceExternalId,
        success: true,
        guideId: result,
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
  const client = getConvexClient();
  let success = 0;
  let failed = 0;

  for (const { url, guide } of guides) {
    try {
      const convexData = convertToConvexFormat(url, guide);

      await client.mutation(api.travelGuides.upsert, {
        sourcePlatform: convexData.sourcePlatform,
        sourceExternalId: convexData.sourceExternalId,
        sourceUrl: convexData.sourceUrl,
        title: convexData.title,
        content: convexData.content,
        authorName: convexData.authorName,
        destinations: convexData.destinations,
        tags: convexData.tags,
        likesCount: convexData.likesCount,
        savesCount: convexData.savesCount,
        commentsCount: convexData.commentsCount,
        viewsCount: convexData.viewsCount,
        coverImageUrl: convexData.coverImageUrl,
        imageUrls: convexData.imageUrls,
        qualityScore: convexData.qualityScore,
      });

      success++;
      logger.info('Batch: saved guide', { sourceExternalId: convexData.sourceExternalId });
    }
    catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : 'Save failed';
      logger.error('Batch: failed to save guide', { url, error: message });
    }
  }

  return { success, failed };
}
