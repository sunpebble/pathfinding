import type { NextRequest } from 'next/server';
import { api } from '@pathfinding/convex-client/api';
import { ConvexHttpClient } from 'convex/browser';
import { NextResponse } from 'next/server';

const CONVEX_URL = process.env.CONVEX_URL || 'https://convex.kunish.org';
const client = new ConvexHttpClient(CONVEX_URL);

/**
 * GET /api/crawler/guides/[id]
 * 获取单个游记详情，合并 AI 数据
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    // 获取 guide + 最新 AI 数据
    const result = await client.query(
      api.travelGuideAiData.getGuideWithAiData,
      {
        // eslint-disable-next-line ts/no-explicit-any
        guideId: id as any,
      },
    );

    if (!result || !result.guide) {
      // fallback: 直接查 guide
      const guide = await client.query(api.travelGuides.getById, {
        // eslint-disable-next-line ts/no-explicit-any
        id: id as any,
      });
      if (!guide) {
        return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
      }
      return NextResponse.json({
        data: transformGuide(guide, null),
      });
    }

    return NextResponse.json({
      data: transformGuide(result.guide, result.aiData),
    });
  }
  catch (error) {
    console.error('Error fetching guide:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 },
    );
  }
}

/**
 * 转换 guide 数据为 snake_case API 格式，合并 AI 数据
 */

function transformGuide(
  // eslint-disable-next-line ts/no-explicit-any
  guide: Record<string, any>,
  // eslint-disable-next-line ts/no-explicit-any
  aiData: Record<string, any> | null,
) {
  return {
    id: guide._id,
    _id: guide._id,
    source_platform: guide.sourcePlatform,
    source_external_id: guide.sourceExternalId,
    source_url: guide.sourceUrl,
    title: guide.title || '无标题攻略',
    content: guide.content,
    content_html: guide.contentHtml,
    content_markdown: guide.contentMarkdown,
    author_name: guide.authorName || '匿名用户',
    author_id: guide.authorId,
    destinations: guide.destinations || [],
    tags: guide.tags || [],
    likes_count: guide.likesCount ?? 0,
    saves_count: guide.savesCount ?? 0,
    comments_count: guide.commentsCount ?? 0,
    views_count: guide.viewsCount ?? 0,
    cover_image_url: guide.coverImageUrl || guide.imageUrls?.[0],
    image_urls: guide.imageUrls || [],
    published_at: guide.publishedAt,
    crawled_at: guide.crawledAt,
    quality_score: guide.qualityScore ?? 0,
    completeness_level: guide.completenessLevel,
    content_truncated: guide.contentTruncated,
    created_at: guide._creationTime,
    updated_at: guide._creationTime,
    // AI 数据（从独立表或 guide 本身）
    ai_summary: aiData?.aiSummary ?? guide.aiSummary,
    ai_tips: aiData?.aiTips ?? guide.aiTips,
    ai_best_time: aiData?.aiBestTime ?? guide.aiBestTime,
    ai_duration: aiData?.aiDuration ?? guide.aiDuration,
    ai_budget: aiData?.aiBudget ?? guide.aiBudget,
    ai_days: aiData?.aiDays ?? guide.aiDays,
    ai_processed_at: aiData?.processedAt ?? guide.aiProcessedAt,
    ai_version: aiData?.version,
    ai_model: aiData?.modelVersion,
    // 地理编码指标
    geocoding_metrics: aiData?.geocodingMetrics
      ? {
          total_pois: aiData.geocodingMetrics.totalPois,
          average_confidence: aiData.geocodingMetrics.averageConfidence,
          low_confidence_count: aiData.geocodingMetrics.lowConfidenceCount,
          manually_verified_count:
            aiData.geocodingMetrics.manuallyVerifiedCount,
        }
      : guide.geocodingMetrics
        ? {
            total_pois: guide.geocodingMetrics.totalPois,
            average_confidence: guide.geocodingMetrics.averageConfidence,
            low_confidence_count: guide.geocodingMetrics.lowConfidenceCount,
            manually_verified_count:
              guide.geocodingMetrics.manuallyVerifiedCount,
          }
        : undefined,
  };
}
