/**
 * 马蜂窝数据保存事件处理器
 * 监听各类爬取完成事件，将数据存储到 TiDB
 */

import {
  createDb,
  mafengwoDestinations,
  mafengwoGuides,
  mafengwoPois,
  mafengwoQa,
  mafengwoRankings,
} from '@pathfinding/database';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// ============================================
// Schema 定义
// ============================================

const destinationDataSchema = z.object({
  mddId: z.string(),
  sourceUrl: z.string(),
  name: z.string(),
  nameEn: z.string().optional(),
  country: z.string().optional(),
  province: z.string().optional(),
  description: z.string().optional(),
  coverImage: z.string().optional(),
  images: z.array(z.string()),
  bestTravelTime: z.string().optional(),
  avgStayDays: z.string().optional(),
  climate: z.string().optional(),
  travelNotesCount: z.number(),
  poisCount: z.number(),
  questionsCount: z.number(),
});

const poiDetailDataSchema = z.object({
  poiId: z.string(),
  name: z.string(),
  nameEn: z.string().optional(),
  category: z.string(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  rating: z.number().optional(),
  ratingCount: z.number(),
  priceRange: z.string().optional(),
  ticketPrice: z.string().optional(),
  openingHours: z.string().optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
  tips: z.array(z.string()),
  highlights: z.array(z.string()),
  coverImage: z.string().optional(),
  images: z.array(z.string()),
  reviewsCount: z.number(),
  savesCount: z.number(),
  tags: z.array(z.string()),
  cuisineType: z.string().optional(),
  signatureDishes: z.array(z.string()),
  starRating: z.number().optional(),
  amenities: z.array(z.string()),
});

const guideDataSchema = z.object({
  guideId: z.string(),
  title: z.string(),
  destinationName: z.string().optional(),
  authorName: z.string().optional(),
  authorId: z.string().optional(),
  summary: z.string().optional(),
  content: z.string(),
  contentHtml: z.string().optional(),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string(),
    order: z.number(),
  })),
  coverImage: z.string().optional(),
  images: z.array(z.string()),
  viewsCount: z.number(),
  likesCount: z.number(),
  savesCount: z.number(),
  commentsCount: z.number(),
  tags: z.array(z.string()),
  publishedAt: z.string().optional(),
});

const qaDataSchema = z.object({
  questionId: z.string(),
  title: z.string(),
  content: z.string(),
  destinationName: z.string().optional(),
  authorName: z.string().optional(),
  authorId: z.string().optional(),
  answersCount: z.number(),
  viewsCount: z.number(),
  tags: z.array(z.string()),
  createdAt: z.string().optional(),
  bestAnswer: z.object({
    content: z.string(),
    authorName: z.string().optional(),
    authorId: z.string().optional(),
    likesCount: z.number(),
    createdAt: z.string().optional(),
  }).optional(),
});

const rankingDataSchema = z.object({
  rankingId: z.string(),
  rankingType: z.string(),
  title: z.string(),
  destinationId: z.string(),
  destinationName: z.string().optional(),
  description: z.string().optional(),
  items: z.array(z.object({
    rank: z.number(),
    poiId: z.string(),
    name: z.string(),
    category: z.string().optional(),
    rating: z.number().optional(),
    reviewsCount: z.number(),
    coverImage: z.string().optional(),
    reason: z.string().optional(),
  })),
});

// ============================================
// 配置
// ============================================

export const config = {
  type: 'event',
  name: 'MafengwoDataSaver',
  description: '保存马蜂窝爬取数据到 TiDB',
  subscribes: [
    'crawler.mafengwo.destination.completed',
    'crawler.mafengwo.poi.detail.completed',
    'crawler.mafengwo.guide.detail.completed',
    'crawler.mafengwo.qa.detail.completed',
    'crawler.mafengwo.ranking.completed',
  ],
  emits: ['crawler.mafengwo.data.saved'],
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
 * 计算质量分数
 */
function calculateQualityScore(data: {
  title?: string;
  content?: string;
  images?: string[];
  rating?: number;
}): number {
  let score = 0;

  // 标题 (20%)
  if (data.title && data.title.length >= 5) {
    score += 0.2;
  }

  // 内容 (40%)
  const contentLength = data.content?.length || 0;
  if (contentLength >= 500) {
    score += 0.4;
  }
  else if (contentLength >= 200) {
    score += 0.3;
  }
  else if (contentLength >= 100) {
    score += 0.2;
  }

  // 图片 (20%)
  const imageCount = data.images?.length || 0;
  if (imageCount >= 5) {
    score += 0.2;
  }
  else if (imageCount >= 1) {
    score += 0.1;
  }

  // 评分 (20%)
  if (data.rating && data.rating > 0) {
    score += 0.2;
  }

  return Math.min(1, Math.round(score * 100) / 100);
}

export async function handler(
  event: { topic: string; data?: unknown },
  { emit, logger }: HandlerContext,
) {
  const { topic, data } = event;

  logger.info('Processing crawl event', { topic });

  try {
    const db = getDb();
    let savedId: number | undefined;
    let dataType: string = '';

    switch (topic) {
      case 'crawler.mafengwo.destination.completed': {
        const parsed = z.object({ destination: destinationDataSchema }).safeParse(data);
        if (!parsed.success) {
          logger.error('Invalid destination data', { error: parsed.error.message });
          return;
        }

        const dest = parsed.data.destination;
        const now = new Date();

        // Upsert: 检查是否已存在
        const existing = await db
          .select({ id: mafengwoDestinations.id })
          .from(mafengwoDestinations)
          .where(eq(mafengwoDestinations.mddId, dest.mddId))
          .limit(1);

        const destData = {
          mddId: dest.mddId,
          sourceUrl: dest.sourceUrl,
          name: dest.name,
          nameEn: dest.nameEn ?? null,
          country: dest.country ?? null,
          province: dest.province ?? null,
          description: dest.description ?? null,
          coverImageUrl: dest.coverImage ?? null,
          imageUrls: dest.images,
          bestTravelTime: dest.bestTravelTime ?? null,
          avgStayDays: dest.avgStayDays ?? null,
          climate: dest.climate ?? null,
          travelNotesCount: dest.travelNotesCount,
          poisCount: dest.poisCount,
          questionsCount: dest.questionsCount,
          crawledAt: now,
          updatedAt: now,
        };

        if (existing.length > 0) {
          await db.update(mafengwoDestinations).set(destData).where(eq(mafengwoDestinations.id, existing[0]!.id));
          savedId = existing[0]!.id;
        }
        else {
          const [result] = await db.insert(mafengwoDestinations).values(destData).$returningId();
          savedId = result!.id;
        }
        dataType = 'destination';
        break;
      }

      case 'crawler.mafengwo.poi.detail.completed': {
        const parsed = z.object({
          sourceUrl: z.string(),
          poi: poiDetailDataSchema,
        }).safeParse(data);

        if (!parsed.success) {
          logger.error('Invalid POI data', { error: parsed.error.message });
          return;
        }

        const poi = parsed.data.poi;
        const qualityScore = calculateQualityScore({
          title: poi.name,
          content: poi.description,
          images: poi.images,
          rating: poi.rating,
        });
        const now = new Date();

        const existing = await db
          .select({ id: mafengwoPois.id })
          .from(mafengwoPois)
          .where(eq(mafengwoPois.poiId, poi.poiId))
          .limit(1);

        const poiData = {
          poiId: poi.poiId,
          sourceUrl: parsed.data.sourceUrl,
          name: poi.name,
          nameEn: poi.nameEn ?? null,
          category: poi.category,
          address: poi.address ?? null,
          latitude: poi.latitude ?? null,
          longitude: poi.longitude ?? null,
          rating: poi.rating ?? null,
          ratingCount: poi.ratingCount,
          priceRange: poi.priceRange ?? null,
          ticketPrice: poi.ticketPrice ?? null,
          openingHours: poi.openingHours ?? null,
          phone: poi.phone ?? null,
          description: poi.description ?? null,
          tips: poi.tips,
          highlights: poi.highlights,
          coverImageUrl: poi.coverImage ?? null,
          imageUrls: poi.images,
          reviewsCount: poi.reviewsCount,
          savesCount: poi.savesCount,
          tags: poi.tags,
          cuisineType: poi.cuisineType ?? null,
          signatureDishes: poi.signatureDishes,
          starRating: poi.starRating ?? null,
          amenities: poi.amenities,
          qualityScore: Math.round(qualityScore * 100),
          crawledAt: now,
          updatedAt: now,
        };

        if (existing.length > 0) {
          await db.update(mafengwoPois).set(poiData).where(eq(mafengwoPois.id, existing[0]!.id));
          savedId = existing[0]!.id;
        }
        else {
          const [result] = await db.insert(mafengwoPois).values(poiData).$returningId();
          savedId = result!.id;
        }
        dataType = 'poi';
        break;
      }

      case 'crawler.mafengwo.guide.detail.completed': {
        const parsed = z.object({
          sourceUrl: z.string(),
          guide: guideDataSchema,
        }).safeParse(data);

        if (!parsed.success) {
          logger.error('Invalid guide data', { error: parsed.error.message });
          return;
        }

        const guide = parsed.data.guide;
        const qualityScore = calculateQualityScore({
          title: guide.title,
          content: guide.content,
          images: guide.images,
        });
        const now = new Date();

        const existing = await db
          .select({ id: mafengwoGuides.id })
          .from(mafengwoGuides)
          .where(eq(mafengwoGuides.guideId, guide.guideId))
          .limit(1);

        const guideData = {
          guideId: guide.guideId,
          sourceUrl: parsed.data.sourceUrl,
          title: guide.title,
          destinationName: guide.destinationName ?? null,
          authorName: guide.authorName ?? null,
          authorId: guide.authorId ?? null,
          summary: guide.summary ?? null,
          content: guide.content,
          contentHtml: guide.contentHtml ?? null,
          sections: guide.sections,
          coverImageUrl: guide.coverImage ?? null,
          imageUrls: guide.images,
          viewsCount: guide.viewsCount,
          likesCount: guide.likesCount,
          savesCount: guide.savesCount,
          commentsCount: guide.commentsCount,
          tags: guide.tags,
          publishedAt: guide.publishedAt ? new Date(guide.publishedAt) : null,
          qualityScore: Math.round(qualityScore * 100),
          crawledAt: now,
          updatedAt: now,
        };

        if (existing.length > 0) {
          await db.update(mafengwoGuides).set(guideData).where(eq(mafengwoGuides.id, existing[0]!.id));
          savedId = existing[0]!.id;
        }
        else {
          const [result] = await db.insert(mafengwoGuides).values(guideData).$returningId();
          savedId = result!.id;
        }
        dataType = 'guide';
        break;
      }

      case 'crawler.mafengwo.qa.detail.completed': {
        const parsed = z.object({
          sourceUrl: z.string(),
          qa: qaDataSchema,
        }).safeParse(data);

        if (!parsed.success) {
          logger.error('Invalid Q&A data', { error: parsed.error.message });
          return;
        }

        const qa = parsed.data.qa;
        const now = new Date();

        const existing = await db
          .select({ id: mafengwoQa.id })
          .from(mafengwoQa)
          .where(eq(mafengwoQa.questionId, qa.questionId))
          .limit(1);

        const qaData = {
          questionId: qa.questionId,
          sourceUrl: parsed.data.sourceUrl,
          title: qa.title,
          content: qa.content,
          destinationName: qa.destinationName ?? null,
          authorName: qa.authorName ?? null,
          authorId: qa.authorId ?? null,
          answersCount: qa.answersCount,
          viewsCount: qa.viewsCount,
          tags: qa.tags,
          bestAnswer: qa.bestAnswer
            ? {
                content: qa.bestAnswer.content,
                authorName: qa.bestAnswer.authorName,
                authorId: qa.bestAnswer.authorId,
                likesCount: qa.bestAnswer.likesCount,
              }
            : null,
          questionCreatedAt: qa.createdAt ? new Date(qa.createdAt) : null,
          crawledAt: now,
        };

        if (existing.length > 0) {
          await db.update(mafengwoQa).set(qaData).where(eq(mafengwoQa.id, existing[0]!.id));
          savedId = existing[0]!.id;
        }
        else {
          const [result] = await db.insert(mafengwoQa).values(qaData).$returningId();
          savedId = result!.id;
        }
        dataType = 'qa';
        break;
      }

      case 'crawler.mafengwo.ranking.completed': {
        const parsed = z.object({
          sourceUrl: z.string(),
          ranking: rankingDataSchema,
        }).safeParse(data);

        if (!parsed.success) {
          logger.error('Invalid ranking data', { error: parsed.error.message });
          return;
        }

        const ranking = parsed.data.ranking;
        const now = new Date();

        const existing = await db
          .select({ id: mafengwoRankings.id })
          .from(mafengwoRankings)
          .where(eq(mafengwoRankings.rankingId, ranking.rankingId))
          .limit(1);

        const rankingData = {
          rankingId: ranking.rankingId,
          sourceUrl: parsed.data.sourceUrl,
          rankingType: ranking.rankingType,
          title: ranking.title,
          destinationId: ranking.destinationId,
          destinationName: ranking.destinationName ?? null,
          description: ranking.description ?? null,
          items: ranking.items.map(item => ({
            rank: item.rank,
            poiExternalId: item.poiId,
            name: item.name,
            category: item.category,
            rating: item.rating,
            reviewsCount: item.reviewsCount,
            coverImageUrl: item.coverImage,
            reason: item.reason,
          })),
          crawledAt: now,
          updatedAt: now,
        };

        if (existing.length > 0) {
          await db.update(mafengwoRankings).set(rankingData).where(eq(mafengwoRankings.id, existing[0]!.id));
          savedId = existing[0]!.id;
        }
        else {
          const [result] = await db.insert(mafengwoRankings).values(rankingData).$returningId();
          savedId = result!.id;
        }
        dataType = 'ranking';
        break;
      }

      default:
        logger.error('Unknown event topic', { topic });
        return;
    }

    logger.info('Data saved successfully', { dataType, savedId });

    // 发送保存完成事件
    await emit({
      topic: 'crawler.mafengwo.data.saved',
      data: {
        dataType,
        savedId,
        success: true,
      },
    });
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Save failed';
    logger.error('Failed to save data', { error: message, topic });

    await emit({
      topic: 'crawler.mafengwo.data.saved',
      data: {
        topic,
        success: false,
        error: message,
      },
    });
  }
}
