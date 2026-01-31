import type { NextRequest } from 'next/server';
import { api } from '@pathfinding/convex/api';
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
    | 'mafengwo';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = Number.parseInt(searchParams.get('limit') || '20');
  const platform
    = searchParams.get('platforms') || searchParams.get('platform');
  const sort = searchParams.get('sort');
  const order = searchParams.get('order');

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
    ];
    const validPlatform
      = platform && validPlatforms.includes(platform as Platform)
        ? (platform as Platform)
        : undefined;

    const guides = await client.query(api.travelGuides.list, {
      platform: validPlatform,
      limit,
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

    // Transform camelCase to snake_case for frontend compatibility
    const transformedGuides = sortedGuides.map(guide => ({
      id: guide._id,
      source_platform: guide.sourcePlatform,
      source_external_id: guide.sourceExternalId,
      source_url: guide.sourceUrl,
      title: guide.title,
      content: guide.content,
      content_html: guide.contentHtml,
      author_name: guide.authorName,
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
      created_at: guide._creationTime,
      updated_at: guide._creationTime,
    }));

    return NextResponse.json({
      data: transformedGuides,
      pagination: {
        total: transformedGuides.length,
        limit,
        offset: 0,
      },
    });
  }
  catch (error) {
    console.error('Error fetching guides:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 },
    );
  }
}
