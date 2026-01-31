/**
 * Transport/Route Optimization API Routes
 * Endpoints for route optimization using TSP algorithms and 高德地图 (Amap) API
 */

import { Hono } from 'hono';
import { loggers } from '../lib/logger.js';

export const transportRouter = new Hono();

const AMAP_KEY = process.env.AMAP_API_KEY || '';
const AMAP_BASE_URL = 'https://restapi.amap.com/v3';

type TransportMode = 'walking' | 'driving' | 'transit';

interface POI {
  name: string;
  latitude: number;
  longitude: number;
}

interface OptimizeRequest {
  pois: POI[];
  transportMode: TransportMode;
  considerTimeWindows?: boolean;
}

interface RouteSegment {
  from: string;
  to: string;
  distance: number;
  duration: number;
  distanceText: string;
  durationText: string;
}

interface OptimizeResponse {
  optimizedOrder: number[];
  originalOrder: number[];
  segments: RouteSegment[];
  savings: {
    distanceKm: number;
    distancePercent: number;
    durationMinutes: number;
    durationPercent: number;
  };
  feasibilityIssues: string[];
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

/**
 * Get distance matrix from Amap API
 */
async function getDistanceMatrix(
  pois: POI[],
  mode: TransportMode,
): Promise<number[][]> {
  const n = pois.length;
  const matrix: number[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => 0));

  if (!AMAP_KEY) {
    // Fallback: use straight-line distance with speed estimates
    const speeds: Record<TransportMode, number> = {
      walking: 5,
      driving: 40,
      transit: 25,
    };

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 0;
        }
        else {
          const distance = calculateDistance(
            pois[i].latitude,
            pois[i].longitude,
            pois[j].latitude,
            pois[j].longitude,
          );
          // Convert to duration in minutes
          matrix[i][j] = (distance / speeds[mode]) * 60;
        }
      }
    }
    return matrix;
  }

  // Use Amap API for accurate distances
  const apiMode
    = mode === 'walking' ? 'walking' : mode === 'driving' ? 'driving' : 'transit';

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 0;
        continue;
      }

      const origin = `${pois[i].longitude},${pois[i].latitude}`;
      const destination = `${pois[j].longitude},${pois[j].latitude}`;
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

        if (path && path.duration) {
          // Duration in seconds, convert to minutes
          matrix[i][j] = Number.parseInt(path.duration, 10) / 60;
        }
        else {
          // Fallback to estimation
          const distance = calculateDistance(
            pois[i].latitude,
            pois[i].longitude,
            pois[j].latitude,
            pois[j].longitude,
          );
          const speeds: Record<TransportMode, number> = {
            walking: 5,
            driving: 40,
            transit: 25,
          };
          matrix[i][j] = (distance / speeds[mode]) * 60;
        }
      }
      catch {
        // Fallback to estimation
        const distance = calculateDistance(
          pois[i].latitude,
          pois[i].longitude,
          pois[j].latitude,
          pois[j].longitude,
        );
        const speeds: Record<TransportMode, number> = {
          walking: 5,
          driving: 40,
          transit: 25,
        };
        matrix[i][j] = (distance / speeds[mode]) * 60;
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return matrix;
}

/**
 * Nearest Neighbor TSP heuristic
 */
function nearestNeighborTSP(distanceMatrix: number[][]): number[] {
  const n = distanceMatrix.length;
  if (n === 0)
    return [];
  if (n === 1)
    return [0];

  const visited = new Set<number>();
  const route: number[] = [];
  let current = 0; // Start from first POI

  route.push(current);
  visited.add(current);

  while (visited.size < n) {
    let nearest = -1;
    let minDistance = Infinity;

    for (let i = 0; i < n; i++) {
      if (!visited.has(i) && distanceMatrix[current][i] < minDistance) {
        minDistance = distanceMatrix[current][i];
        nearest = i;
      }
    }

    if (nearest === -1)
      break;

    route.push(nearest);
    visited.add(nearest);
    current = nearest;
  }

  return route;
}

/**
 * Calculate total distance for a route
 */
function calculateRouteDistance(
  route: number[],
  distanceMatrix: number[][],
): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += distanceMatrix[route[i]][route[i + 1]];
  }
  return total;
}

/**
 * Get detailed route segment information
 */
async function getRouteSegments(
  pois: POI[],
  order: number[],
  mode: TransportMode,
): Promise<RouteSegment[]> {
  const segments: RouteSegment[] = [];

  for (let i = 0; i < order.length - 1; i++) {
    const fromPOI = pois[order[i]];
    const toPOI = pois[order[i + 1]];

    const distance = calculateDistance(
      fromPOI.latitude,
      fromPOI.longitude,
      toPOI.latitude,
      toPOI.longitude,
    );

    const speeds: Record<TransportMode, number> = {
      walking: 5,
      driving: 40,
      transit: 25,
    };
    const duration = (distance / speeds[mode]) * 60;

    segments.push({
      from: fromPOI.name,
      to: toPOI.name,
      distance,
      duration,
      distanceText:
        distance >= 1
          ? `${distance.toFixed(1)}公里`
          : `${Math.round(distance * 1000)}米`,
      durationText:
        duration >= 60
          ? `${Math.floor(duration / 60)}小时${Math.round(duration % 60)}分钟`
          : `${Math.round(duration)}分钟`,
    });
  }

  return segments;
}

/**
 * Validate POI coordinates
 */
function validatePOIs(pois: POI[]): string | null {
  if (!Array.isArray(pois) || pois.length === 0) {
    return 'At least one POI is required';
  }

  for (const poi of pois) {
    if (!poi.name || typeof poi.name !== 'string') {
      return 'All POIs must have a name';
    }
    if (typeof poi.latitude !== 'number' || typeof poi.longitude !== 'number') {
      return 'All POIs must have valid latitude and longitude';
    }
    if (poi.latitude < -90 || poi.latitude > 90) {
      return `Invalid latitude for POI "${poi.name}": must be between -90 and 90`;
    }
    if (poi.longitude < -180 || poi.longitude > 180) {
      return `Invalid longitude for POI "${poi.name}": must be between -180 and 180`;
    }
  }

  return null;
}

/**
 * POST /optimize - Optimize route order
 */
transportRouter.post('/optimize', async (c) => {
  try {
    const body = await c.req.json<OptimizeRequest>();
    const { pois, transportMode, considerTimeWindows = false } = body;

    // Validate input
    const validationError = validatePOIs(pois);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    if (!['walking', 'driving', 'transit'].includes(transportMode)) {
      return c.json(
        {
          error:
            'Invalid transport mode. Must be one of: walking, driving, transit',
        },
        400,
      );
    }

    // Handle single POI case
    if (pois.length === 1) {
      return c.json({
        optimizedOrder: [0],
        originalOrder: [0],
        segments: [],
        savings: {
          distanceKm: 0,
          distancePercent: 0,
          durationMinutes: 0,
          durationPercent: 0,
        },
        feasibilityIssues: [],
      } as OptimizeResponse);
    }

    // Get distance matrix
    const distanceMatrix = await getDistanceMatrix(pois, transportMode);

    // Original order (sequential)
    const originalOrder = Array.from({ length: pois.length }, (_, i) => i);
    const originalDistance = calculateRouteDistance(
      originalOrder,
      distanceMatrix,
    );

    // Optimized order using nearest neighbor
    const optimizedOrder = nearestNeighborTSP(distanceMatrix);
    const optimizedDistance = calculateRouteDistance(
      optimizedOrder,
      distanceMatrix,
    );

    // Get detailed segments
    const segments = await getRouteSegments(
      pois,
      optimizedOrder,
      transportMode,
    );

    // Calculate savings
    const distanceSaved = originalDistance - optimizedDistance;
    const distancePercent
      = originalDistance > 0 ? (distanceSaved / originalDistance) * 100 : 0;

    // Estimate actual distances in km (convert from duration)
    const speeds: Record<TransportMode, number> = {
      walking: 5,
      driving: 40,
      transit: 25,
    };

    // Feasibility issues
    const feasibilityIssues: string[] = [];
    if (considerTimeWindows) {
      feasibilityIssues.push('Time window constraints not yet implemented');
    }

    const response: OptimizeResponse = {
      optimizedOrder,
      originalOrder,
      segments,
      savings: {
        distanceKm: distanceSaved * (speeds[transportMode] / 60),
        distancePercent,
        durationMinutes: distanceSaved,
        durationPercent: distancePercent,
      },
      feasibilityIssues,
    };

    return c.json(response);
  }
  catch (error) {
    loggers.transport.error({ error }, 'Route optimization error');
    const message
      = error instanceof Error ? error.message : 'Route optimization failed';
    return c.json({ error: message }, 500);
  }
});

export default transportRouter;
