import type { NextRequest } from 'next/server';
import { api } from '@pathfinding/convex-client/api';
import { ConvexHttpClient } from 'convex/browser';
import { NextResponse } from 'next/server';

const CONVEX_URL = process.env.CONVEX_URL || 'https://convex.kunish.org';
const client = new ConvexHttpClient(CONVEX_URL);

type Platform
  = | 'xiaohongshu'
    | 'weibo'
    | 'ctrip'
    | 'douyin'
    | 'tripadvisor'
    | 'qunar'
    | 'tongcheng'
    | 'mafengwo'
    | 'qyer';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawLimit = Number.parseInt(searchParams.get('limit') || '20', 10);
  const limit
    = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, 100)
      : 20;
  const platform
    = searchParams.get('platforms') || searchParams.get('platform');
  const sort = searchParams.get('sort');
  const order = searchParams.get('order');
  const rawMinQuality = searchParams.get('min_quality');
  const parsedMinQuality
    = rawMinQuality === null ? Number.NaN : Number.parseFloat(rawMinQuality);
  const minQuality
    = Number.isFinite(parsedMinQuality) && parsedMinQuality >= 0
      ? parsedMinQuality
      : undefined;
  const rawMaxQuality = searchParams.get('max_quality');
  const parsedMaxQuality
    = rawMaxQuality === null ? Number.NaN : Number.parseFloat(rawMaxQuality);
  const maxQuality
    = Number.isFinite(parsedMaxQuality) && parsedMaxQuality >= 0
      ? parsedMaxQuality
      : undefined;

  try {
    const validPlatforms: Platform[] = [
      'xiaohongshu',
      'weibo',
      'ctrip',
      'douyin',
      'tripadvisor',
      'qunar',
      'tongcheng',
      'mafengwo',
      'qyer',
    ];
    const validPlatform
      = platform && validPlatforms.includes(platform as Platform)
        ? (platform as Platform)
        : undefined;

    const fetchLimit
      = minQuality !== undefined || maxQuality !== undefined
        ? Math.min(limit * 5, 500)
        : limit;

    const guides = await client.query(api.travelGuides.list, {
      platform: validPlatform,
      limit: fetchLimit,
    });

    // Sort if requested
    const sortedGuides = [...guides];
    if (sort === 'quality_score') {
      sortedGuides.sort((a, b) => {
        const aScore = a.qualityScore || 0;
        const bScore = b.qualityScore || 0;
        return order === 'asc' ? aScore - bScore : bScore - aScore;
      });
    }

    let filteredGuides = sortedGuides;
    if (minQuality !== undefined) {
      filteredGuides = filteredGuides.filter(
        guide => (guide.qualityScore ?? 0) >= minQuality,
      );
    }
    if (maxQuality !== undefined) {
      filteredGuides = filteredGuides.filter(
        guide => (guide.qualityScore ?? 0) <= maxQuality,
      );
    }

    const paginatedGuides = filteredGuides.slice(0, limit);

    // Transform camelCase to snake_case for frontend compatibility
    const transformedGuides = paginatedGuides.map(guide => ({
      id: guide._id,
      source_platform: guide.sourcePlatform,
      source_external_id: guide.sourceExternalId,
      source_url: guide.sourceUrl,
      title: guide.title || '无标题攻略',
      content: guide.content,
      content_html: guide.contentHtml,
      author_name: guide.authorName || '匿名用户',
      author_id: guide.authorId,
      destinations: guide.destinations || [],
      tags: guide.tags || [],
      likes_count: guide.likesCount ?? 0,
      saves_count: guide.savesCount ?? 0,
      comments_count: guide.commentsCount ?? 0,
      views_count: guide.viewsCount ?? 0,
      cover_image_url: guide.coverImageUrl,
      image_urls: guide.imageUrls || [],
      published_at: guide.publishedAt,
      crawled_at: guide.crawledAt,
      quality_score: guide.qualityScore ?? 0,
      // eslint-disable-next-line ts/no-explicit-any
      completeness_level: (guide as any).completenessLevel,
      // eslint-disable-next-line ts/no-explicit-any
      content_truncated: (guide as any).contentTruncated,
      created_at: guide._creationTime,
      updated_at: guide._creationTime,
      // AI fields from guide (backward compat)
      // eslint-disable-next-line ts/no-explicit-any
      ai_summary: (guide as any).aiSummary,
      // eslint-disable-next-line ts/no-explicit-any
      ai_duration: (guide as any).aiDuration,
      // eslint-disable-next-line ts/no-explicit-any
      ai_budget: (guide as any).aiBudget,
      // eslint-disable-next-line ts/no-explicit-any
      ai_best_time: (guide as any).aiBestTime,
      // eslint-disable-next-line ts/no-explicit-any
      ai_processed_at: (guide as any).aiProcessedAt,
    }));

    return NextResponse.json({
      data: transformedGuides,
      pagination: {
        total: filteredGuides.length,
        limit,
        offset: 0,
      },
    });
  }
  catch (error) {
    console.error('Error fetching guides:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
