/**
 * 马蜂窝数据保存事件处理器
 * 监听各类爬取完成事件，将数据存储到 Convex
 */

import { ConvexHttpClient } from 'convex/browser';
import { z } from 'zod';
import { api } from '../../../../convex/_generated/api.js';

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
  description: '保存马蜂窝爬取数据到 Convex',
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
 * 获取 Convex client
 */
function getConvexClient(): ConvexHttpClient {
  const url = process.env.CONVEX_URL;
  if (!url) {
    throw new Error('CONVEX_URL environment variable is not set');
  }
  return new ConvexHttpClient(url);
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
    const client = getConvexClient();
    let savedId: string | undefined;
    let dataType: string = '';

    switch (topic) {
      case 'crawler.mafengwo.destination.completed': {
        const parsed = z.object({ destination: destinationDataSchema }).safeParse(data);
        if (!parsed.success) {
          logger.error('Invalid destination data', { error: parsed.error.message });
          return;
        }

        const dest = parsed.data.destination;
        savedId = await client.mutation(api.mafengwo.upsertDestination, {
          mddId: dest.mddId,
          sourceUrl: dest.sourceUrl,
          name: dest.name,
          nameEn: dest.nameEn,
          country: dest.country,
          province: dest.province,
          description: dest.description,
          coverImageUrl: dest.coverImage,
          imageUrls: dest.images,
          bestTravelTime: dest.bestTravelTime,
          avgStayDays: dest.avgStayDays,
          climate: dest.climate,
          travelNotesCount: dest.travelNotesCount,
          poisCount: dest.poisCount,
          questionsCount: dest.questionsCount,
        });
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

        savedId = await client.mutation(api.mafengwo.upsertPoi, {
          poiId: poi.poiId,
          sourceUrl: parsed.data.sourceUrl,
          name: poi.name,
          nameEn: poi.nameEn,
          category: poi.category as 'attraction' | 'restaurant' | 'hotel' | 'shopping' | 'entertainment' | 'transport',
          address: poi.address,
          latitude: poi.latitude,
          longitude: poi.longitude,
          rating: poi.rating,
          ratingCount: poi.ratingCount,
          priceRange: poi.priceRange,
          ticketPrice: poi.ticketPrice,
          openingHours: poi.openingHours,
          phone: poi.phone,
          description: poi.description,
          tips: poi.tips,
          highlights: poi.highlights,
          coverImageUrl: poi.coverImage,
          imageUrls: poi.images,
          reviewsCount: poi.reviewsCount,
          savesCount: poi.savesCount,
          tags: poi.tags,
          cuisineType: poi.cuisineType,
          signatureDishes: poi.signatureDishes,
          starRating: poi.starRating,
          amenities: poi.amenities,
          qualityScore,
        });
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

        savedId = await client.mutation(api.mafengwo.upsertGuide, {
          guideId: guide.guideId,
          sourceUrl: parsed.data.sourceUrl,
          title: guide.title,
          destinationName: guide.destinationName,
          authorName: guide.authorName,
          authorId: guide.authorId,
          summary: guide.summary,
          content: guide.content,
          contentHtml: guide.contentHtml,
          sections: guide.sections,
          coverImageUrl: guide.coverImage,
          imageUrls: guide.images,
          viewsCount: guide.viewsCount,
          likesCount: guide.likesCount,
          savesCount: guide.savesCount,
          commentsCount: guide.commentsCount,
          tags: guide.tags,
          qualityScore,
        });
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
        savedId = await client.mutation(api.mafengwo.upsertQa, {
          questionId: qa.questionId,
          sourceUrl: parsed.data.sourceUrl,
          title: qa.title,
          content: qa.content,
          destinationName: qa.destinationName,
          authorName: qa.authorName,
          authorId: qa.authorId,
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
            : undefined,
        });
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
        savedId = await client.mutation(api.mafengwo.upsertRanking, {
          rankingId: ranking.rankingId,
          sourceUrl: parsed.data.sourceUrl,
          rankingType: ranking.rankingType as 'must_visit' | 'food' | 'hotel' | 'shopping' | 'hidden_gem',
          title: ranking.title,
          destinationId: ranking.destinationId,
          destinationName: ranking.destinationName,
          description: ranking.description,
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
        });
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
