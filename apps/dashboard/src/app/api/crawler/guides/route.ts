import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchBackendApi, normalizeTravelGuide } from '@/lib/api';

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

function getValidPlatform(platform: string | null): Platform | undefined {
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

  if (platform && validPlatforms.includes(platform as Platform)) {
    return platform as Platform;
  }

  return undefined;
}

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
    const backendParams = new URLSearchParams();
    const validPlatform = getValidPlatform(platform);
    if (validPlatform) {
      backendParams.set('platform', validPlatform);
    }
    backendParams.set('limit', String(limit));

    const response = await fetchBackendApi<{ data: Array<Record<string, unknown>> }>(
      `/api/guides?${backendParams.toString()}`,
      { method: 'GET' },
    );

    const normalizedGuides = response.data.map(normalizeTravelGuide);
    const sortedGuides = [...normalizedGuides];

    if (sort === 'quality_score') {
      sortedGuides.sort((a, b) => {
        const aScore = typeof a.quality_score === 'number' ? a.quality_score : 0;
        const bScore = typeof b.quality_score === 'number' ? b.quality_score : 0;
        return order === 'asc' ? aScore - bScore : bScore - aScore;
      });
    }

    let filteredGuides = sortedGuides;
    if (minQuality !== undefined) {
      filteredGuides = filteredGuides.filter(
        guide => (typeof guide.quality_score === 'number' ? guide.quality_score : 0) >= minQuality,
      );
    }
    if (maxQuality !== undefined) {
      filteredGuides = filteredGuides.filter(
        guide => (typeof guide.quality_score === 'number' ? guide.quality_score : 0) <= maxQuality,
      );
    }

    return NextResponse.json({
      data: filteredGuides.slice(0, limit),
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
