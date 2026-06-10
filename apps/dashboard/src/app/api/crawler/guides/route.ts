import type { NextRequest } from 'next/server';
import { normalizeTravelGuide } from '@/lib/api/backend';
import { proxyBackendApiResponse } from '@/lib/api/proxy';

interface GuidesResponse {
  data: Array<Record<string, unknown>>;
  pagination?: { total: number; limit: number; offset: number };
}

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

function getValidPlatform(platform: string | null): Platform | undefined {
  return platform && validPlatforms.includes(platform as Platform)
    ? platform as Platform
    : undefined;
}

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 100) : fallback;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = positiveInt(searchParams.get('limit'), 20);
  const rawOffset = searchParams.get('offset');
  const offset = Math.max(0, Number.parseInt(rawOffset ?? '0', 10) || 0);
  const backendParams = new URLSearchParams();
  const platform = getValidPlatform(searchParams.get('platforms') || searchParams.get('platform'));

  if (platform) {
    backendParams.set('platform', platform);
  }

  // D13: destinations is resolved by the backend via the guide_destinations
  // auxiliary table — dropping it here silently disabled the filter.
  for (const key of ['q', 'destinations', 'min_quality', 'max_quality', 'sort', 'order']) {
    const value = searchParams.get(key);
    if (value) {
      backendParams.set(key, value);
    }
  }

  backendParams.set('limit', String(limit));
  if (rawOffset !== null) {
    backendParams.set('offset', String(offset));
  }

  return proxyBackendApiResponse<GuidesResponse>(
    request,
    {
      endpoint: `/api/guides?${backendParams.toString()}`,
      transform: response => ({
        data: response.data.map(normalizeTravelGuide),
        pagination: response.pagination ?? {
          total: response.data.length,
          limit,
          offset,
        },
      }),
      fallbackError: 'Internal server error',
    },
  );
}
