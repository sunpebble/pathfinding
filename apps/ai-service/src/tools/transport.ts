/**
 * Transport/Route Planning Tool
 * LangChain tool for planning routes between locations
 * Uses 高德地图 (Amap) API
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const AMAP_KEY = process.env.AMAP_API_KEY || '';
const AMAP_BASE_URL = 'https://restapi.amap.com/v3';

type TransportMode = 'walking' | 'driving' | 'transit';

interface RouteResult {
  mode: TransportMode;
  distance: string;
  duration: string;
  steps?: string[];
  error?: string;
}

/**
 * Get walking/driving route from Amap
 */
async function getRoute(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number,
  mode: TransportMode,
): Promise<RouteResult> {
  if (!AMAP_KEY) {
    // Fallback: estimate based on straight-line distance
    const distance = calculateDistance(originLat, originLon, destLat, destLon);
    const speeds: Record<TransportMode, number> = {
      walking: 5,
      driving: 40,
      transit: 25,
    };
    const duration = Math.round((distance / speeds[mode]) * 60);

    return {
      mode,
      distance: `约${distance.toFixed(1)}公里`,
      duration: `约${duration}分钟`,
      steps: ['路线估算（未配置高德API）'],
    };
  }

  const origin = `${originLon},${originLat}`;
  const destination = `${destLon},${destLat}`;

  const apiMode
    = mode === 'walking'
      ? 'walking'
      : mode === 'driving'
        ? 'driving'
        : 'transit/integrated';
  const url = `${AMAP_BASE_URL}/direction/${apiMode}?key=${AMAP_KEY}&origin=${origin}&destination=${destination}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Amap API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== '1' || !data.route) {
      throw new Error(data.info || 'Route not found');
    }

    const route = data.route;
    const path = route.paths?.[0] || route.transits?.[0];

    if (!path) {
      throw new Error('No route path found');
    }

    return {
      mode,
      distance: formatDistance(path.distance),
      duration: formatDuration(path.duration),
      steps: extractSteps(path, mode),
    };
  }
  catch (error) {
    // Fallback to estimation
    const distance = calculateDistance(originLat, originLon, destLat, destLon);
    const speeds: Record<TransportMode, number> = {
      walking: 5,
      driving: 40,
      transit: 25,
    };
    const duration = Math.round((distance / speeds[mode]) * 60);

    return {
      mode,
      distance: `约${distance.toFixed(1)}公里`,
      duration: `约${duration}分钟`,
      error: error instanceof Error ? error.message : 'Route API error',
    };
  }
}

/**
 * Calculate straight-line distance between two points (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a
    = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(toRad(lat1))
      * Math.cos(toRad(lat2))
      * Math.sin(dLon / 2)
      * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function formatDistance(meters: number | string): string {
  const m = typeof meters === 'string' ? Number.parseInt(meters, 10) : meters;
  if (m >= 1000) {
    return `${(m / 1000).toFixed(1)}公里`;
  }
  return `${m}米`;
}

function formatDuration(seconds: number | string): string {
  const s = typeof seconds === 'string' ? Number.parseInt(seconds, 10) : seconds;
  const hours = Math.floor(s / 3600);
  const minutes = Math.round((s % 3600) / 60);

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  }
  return `${minutes}分钟`;
}

function extractSteps(path: any, mode: TransportMode): string[] {
  if (mode === 'transit') {
    const segments = path.segments || [];
    return segments.map((seg: any) => {
      if (seg.bus?.buslines?.[0]) {
        const bus = seg.bus.buslines[0];
        return `乘坐 ${bus.name} (${bus.via_num}站)`;
      }
      if (seg.walking) {
        return `步行 ${formatDistance(seg.walking.distance)}`;
      }
      return '换乘';
    });
  }

  const steps = path.steps || [];
  return steps.slice(0, 5).map((step: any) => step.instruction || step.action);
}

/**
 * Route planning tool for LangChain agents
 */
export const routePlannerTool = tool(
  async ({ originLat, originLon, destLat, destLon, mode }) => {
    try {
      const result = await getRoute(
        originLat,
        originLon,
        destLat,
        destLon,
        mode as TransportMode,
      );

      return JSON.stringify({
        success: true,
        ...result,
      });
    }
    catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Route planning failed',
      });
    }
  },
  {
    name: 'route_planner',
    description: '规划两点之间的交通路线，支持步行、驾车、公共交通',
    schema: z.object({
      originLat: z.number().describe('起点纬度'),
      originLon: z.number().describe('起点经度'),
      destLat: z.number().describe('终点纬度'),
      destLon: z.number().describe('终点经度'),
      mode: z
        .enum(['walking', 'driving', 'transit'])
        .describe('交通方式：walking(步行), driving(驾车), transit(公共交通)'),
    }),
  },
);
