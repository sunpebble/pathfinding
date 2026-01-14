/**
 * Route Optimizer Service
 * Implements TSP (Traveling Salesman Problem) algorithm for itinerary optimization
 * with support for time window constraints and transport mode considerations
 */

import { createLogger } from '../lib/logger.js';

const logger = createLogger('RouteOptimizer');

// ============================================================================
// Types
// ============================================================================

export interface Poi {
  name: string;
  type: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  duration?: string; // e.g., "1-2小时"
  openingHours?: string; // e.g., "09:00-18:00"
  priceInfo?: string;
  tips?: string;
  rating?: number;
  highlights?: string[];
  transportToNext?: TransportInfo;
}

export interface TransportInfo {
  mode?: TransportMode;
  duration?: string;
  distance?: string;
  notes?: string;
}

export type TransportMode = 'walking' | 'driving' | 'transit' | 'taxi' | 'cycling';

export interface DayItinerary {
  dayNumber: number;
  theme?: string;
  pois: Poi[];
}

export interface TimeWindow {
  open: number; // Minutes from midnight (e.g., 9:00 = 540)
  close: number; // Minutes from midnight (e.g., 18:00 = 1080)
}

export interface OptimizationOptions {
  preferredTransportMode?: TransportMode;
  startTime?: number; // Minutes from midnight (default: 9:00 = 540)
  endTime?: number; // Minutes from midnight (default: 21:00 = 1260)
  considerTimeWindows?: boolean;
  returnToStart?: boolean;
  maxWalkingDistanceKm?: number;
}

export interface OptimizedRoute {
  originalOrder: Poi[];
  optimizedOrder: Poi[];
  totalDistance: number; // in km
  totalDuration: number; // in minutes (travel time only)
  savings: {
    distanceKm: number;
    distancePercent: number;
    durationMinutes: number;
    durationPercent: number;
  };
  segments: RouteSegment[];
  feasibilityIssues: string[];
}

export interface RouteSegment {
  from: string;
  to: string;
  transportMode: TransportMode;
  distanceKm: number;
  durationMinutes: number;
  departureTime?: string;
  arrivalTime?: string;
}

// ============================================================================
// Constants
// ============================================================================

const EARTH_RADIUS_KM = 6371;

// Average speeds in km/h for different transport modes
const TRANSPORT_SPEEDS: Record<TransportMode, number> = {
  walking: 5,
  cycling: 15,
  transit: 25,
  taxi: 35,
  driving: 40,
};

// Minimum overhead time in minutes for each transport mode
const TRANSPORT_OVERHEAD: Record<TransportMode, number> = {
  walking: 0,
  cycling: 3,
  transit: 10,
  taxi: 5,
  driving: 5,
};

// Default POI visit duration in minutes by type
const DEFAULT_DURATIONS: Record<string, number> = {
  attraction: 90,
  restaurant: 60,
  hotel: 30,
  shopping: 60,
  entertainment: 120,
  cafe: 45,
  museum: 120,
  historic: 60,
  park: 60,
  transportation: 15,
  default: 60,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate distance between two points using Haversine formula
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate travel time between two points
 */
function calculateTravelTime(
  distanceKm: number,
  mode: TransportMode
): number {
  const speed = TRANSPORT_SPEEDS[mode] || TRANSPORT_SPEEDS.walking;
  const overhead = TRANSPORT_OVERHEAD[mode] || 0;
  const timeHours = distanceKm / speed;
  return Math.ceil(timeHours * 60) + overhead;
}

/**
 * Get suggested transport mode based on distance
 */
function suggestTransportMode(
  distanceKm: number,
  maxWalkingKm: number = 1.5
): TransportMode {
  if (distanceKm <= maxWalkingKm) {
    return 'walking';
  } else if (distanceKm <= 5) {
    return 'cycling';
  } else if (distanceKm <= 15) {
    return 'transit';
  } else {
    return 'taxi';
  }
}

/**
 * Parse opening hours string to TimeWindow
 * Supports formats like "09:00-18:00", "9:00-21:00", "全天开放"
 */
function parseOpeningHours(hoursStr?: string): TimeWindow | null {
  if (!hoursStr) return null;

  // Check for 24-hour operation
  if (hoursStr.includes('全天') || hoursStr.includes('24小时')) {
    return { open: 0, close: 1440 };
  }

  // Parse "HH:MM-HH:MM" format
  const match = hoursStr.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (match) {
    const openHour = parseInt(match[1], 10);
    const openMin = parseInt(match[2], 10);
    const closeHour = parseInt(match[3], 10);
    const closeMin = parseInt(match[4], 10);

    return {
      open: openHour * 60 + openMin,
      close: closeHour * 60 + closeMin,
    };
  }

  return null;
}

/**
 * Parse duration string to minutes
 * Supports formats like "1-2小时", "30分钟", "半天"
 */
function parseDuration(durationStr?: string): number | null {
  if (!durationStr) return null;

  // Handle "半天" (half day)
  if (durationStr.includes('半天')) {
    return 240;
  }

  // Handle "全天" (full day)
  if (durationStr.includes('全天')) {
    return 480;
  }

  // Parse hours (e.g., "1-2小时", "2小时")
  const hourMatch = durationStr.match(/(\d+)(?:\s*[-–]\s*\d+)?\s*小时/);
  if (hourMatch) {
    return parseInt(hourMatch[1], 10) * 60;
  }

  // Parse minutes (e.g., "30分钟", "45分钟")
  const minMatch = durationStr.match(/(\d+)\s*分钟/);
  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }

  return null;
}

/**
 * Format minutes to HH:MM string
 */
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Get POI visit duration in minutes
 */
function getPoiDuration(poi: Poi): number {
  // Try to parse from duration string first
  const parsed = parseDuration(poi.duration);
  if (parsed !== null) {
    return parsed;
  }

  // Fall back to default by type
  const typeKey = poi.type?.toLowerCase() || 'default';
  return DEFAULT_DURATIONS[typeKey] || DEFAULT_DURATIONS.default;
}

// ============================================================================
// Distance Matrix
// ============================================================================

/**
 * Build distance matrix for all POIs
 */
function buildDistanceMatrix(pois: Poi[]): number[][] {
  const n = pois.length;
  const matrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(Infinity));

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 0;
    const poi1 = pois[i];
    if (!poi1.latitude || !poi1.longitude) continue;

    for (let j = i + 1; j < n; j++) {
      const poi2 = pois[j];
      if (!poi2.latitude || !poi2.longitude) continue;

      const distance = haversineDistance(
        poi1.latitude,
        poi1.longitude,
        poi2.latitude,
        poi2.longitude
      );

      matrix[i][j] = distance;
      matrix[j][i] = distance;
    }
  }

  return matrix;
}

// ============================================================================
// TSP Algorithms
// ============================================================================

/**
 * Nearest Neighbor heuristic for TSP
 * Fast O(n^2) algorithm that produces reasonably good solutions
 */
function nearestNeighborTSP(
  distanceMatrix: number[][],
  startIndex: number = 0
): number[] {
  const n = distanceMatrix.length;
  if (n <= 2) {
    return Array.from({ length: n }, (_, i) => i);
  }

  const visited = new Set<number>();
  const tour: number[] = [startIndex];
  visited.add(startIndex);

  while (tour.length < n) {
    const current = tour[tour.length - 1];
    let nearestDist = Infinity;
    let nearestIdx = -1;

    for (let i = 0; i < n; i++) {
      if (!visited.has(i) && distanceMatrix[current][i] < nearestDist) {
        nearestDist = distanceMatrix[current][i];
        nearestIdx = i;
      }
    }

    if (nearestIdx !== -1) {
      tour.push(nearestIdx);
      visited.add(nearestIdx);
    } else {
      // If no reachable node found (all remaining have Infinity distance)
      // Just add any unvisited node
      for (let i = 0; i < n; i++) {
        if (!visited.has(i)) {
          tour.push(i);
          visited.add(i);
          break;
        }
      }
    }
  }

  return tour;
}

/**
 * 2-opt improvement for TSP
 * Iteratively improves the tour by reversing segments
 */
function twoOptImprove(
  tour: number[],
  distanceMatrix: number[][]
): number[] {
  const n = tour.length;
  if (n <= 3) return tour;

  let improved = true;
  let bestTour = [...tour];

  while (improved) {
    improved = false;

    for (let i = 0; i < n - 2; i++) {
      for (let j = i + 2; j < n; j++) {
        // Calculate current distance
        const d1 = distanceMatrix[bestTour[i]][bestTour[i + 1]];
        const d2 =
          j === n - 1
            ? 0
            : distanceMatrix[bestTour[j]][bestTour[j + 1] || bestTour[0]];

        // Calculate new distance if we reverse the segment
        const d3 = distanceMatrix[bestTour[i]][bestTour[j]];
        const d4 =
          j === n - 1
            ? 0
            : distanceMatrix[bestTour[i + 1]][bestTour[j + 1] || bestTour[0]];

        if (d1 + d2 > d3 + d4) {
          // Reverse the segment between i+1 and j
          const newTour = [
            ...bestTour.slice(0, i + 1),
            ...bestTour.slice(i + 1, j + 1).reverse(),
            ...bestTour.slice(j + 1),
          ];
          bestTour = newTour;
          improved = true;
        }
      }
    }
  }

  return bestTour;
}

/**
 * Calculate total tour distance
 */
function calculateTourDistance(
  tour: number[],
  distanceMatrix: number[][]
): number {
  let total = 0;
  for (let i = 0; i < tour.length - 1; i++) {
    total += distanceMatrix[tour[i]][tour[i + 1]];
  }
  return total;
}

/**
 * Dynamic programming solution for small instances (n <= 15)
 * Held-Karp algorithm O(n^2 * 2^n)
 */
function heldKarpTSP(
  distanceMatrix: number[][],
  startIndex: number = 0
): number[] {
  const n = distanceMatrix.length;
  if (n <= 2) {
    return Array.from({ length: n }, (_, i) => i);
  }

  // For larger instances, fall back to heuristic
  if (n > 15) {
    const tour = nearestNeighborTSP(distanceMatrix, startIndex);
    return twoOptImprove(tour, distanceMatrix);
  }

  // DP table: dp[mask][i] = min distance to visit all cities in mask, ending at i
  const dp: number[][] = Array(1 << n)
    .fill(null)
    .map(() => Array(n).fill(Infinity));

  // Parent table for path reconstruction
  const parent: number[][] = Array(1 << n)
    .fill(null)
    .map(() => Array(n).fill(-1));

  // Initialize: start from startIndex
  dp[1 << startIndex][startIndex] = 0;

  // Fill DP table
  for (let mask = 0; mask < 1 << n; mask++) {
    for (let last = 0; last < n; last++) {
      if (!(mask & (1 << last))) continue;
      if (dp[mask][last] === Infinity) continue;

      for (let next = 0; next < n; next++) {
        if (mask & (1 << next)) continue;

        const newMask = mask | (1 << next);
        const newDist = dp[mask][last] + distanceMatrix[last][next];

        if (newDist < dp[newMask][next]) {
          dp[newMask][next] = newDist;
          parent[newMask][next] = last;
        }
      }
    }
  }

  // Find the best ending city
  const fullMask = (1 << n) - 1;
  let minDist = Infinity;
  let lastCity = -1;

  for (let i = 0; i < n; i++) {
    if (dp[fullMask][i] < minDist) {
      minDist = dp[fullMask][i];
      lastCity = i;
    }
  }

  // Reconstruct path
  const tour: number[] = [];
  let mask = fullMask;
  let current = lastCity;

  while (current !== -1) {
    tour.push(current);
    const prev = parent[mask][current];
    mask ^= 1 << current;
    current = prev;
  }

  return tour.reverse();
}

// ============================================================================
// Time Window Constraints
// ============================================================================

interface TimeWindowedPoi extends Poi {
  index: number;
  timeWindow: TimeWindow | null;
  visitDuration: number;
}

/**
 * Check if a route is feasible with time windows
 */
function checkTimeFeasibility(
  tour: number[],
  pois: TimeWindowedPoi[],
  distanceMatrix: number[][],
  transportMode: TransportMode,
  startTime: number
): { feasible: boolean; issues: string[]; schedule: Map<number, { arrival: number; departure: number }> } {
  const issues: string[] = [];
  const schedule = new Map<number, { arrival: number; departure: number }>();
  let currentTime = startTime;

  for (let i = 0; i < tour.length; i++) {
    const poiIdx = tour[i];
    const poi = pois[poiIdx];

    // Calculate arrival time (for first POI, it's the start time)
    let arrivalTime = currentTime;
    if (i > 0) {
      const prevIdx = tour[i - 1];
      const travelTime = calculateTravelTime(
        distanceMatrix[prevIdx][poiIdx],
        transportMode
      );
      arrivalTime = currentTime + travelTime;
    }

    // Check time window constraints
    if (poi.timeWindow) {
      if (arrivalTime < poi.timeWindow.open) {
        // Need to wait for opening
        const waitTime = poi.timeWindow.open - arrivalTime;
        issues.push(
          `需要在 ${poi.name} 等待 ${waitTime} 分钟（${formatTime(arrivalTime)} 到达，${formatTime(poi.timeWindow.open)} 开门）`
        );
        arrivalTime = poi.timeWindow.open;
      }

      if (arrivalTime > poi.timeWindow.close - poi.visitDuration) {
        issues.push(
          `${poi.name} 可能无法完整游览（${formatTime(arrivalTime)} 到达，${formatTime(poi.timeWindow.close)} 关门）`
        );
      }
    }

    const departureTime = arrivalTime + poi.visitDuration;
    schedule.set(poiIdx, { arrival: arrivalTime, departure: departureTime });
    currentTime = departureTime;
  }

  return {
    feasible: issues.length === 0,
    issues,
    schedule,
  };
}

// ============================================================================
// Main Optimization Function
// ============================================================================

/**
 * Optimize a day's itinerary
 */
export function optimizeDayRoute(
  day: DayItinerary,
  options: OptimizationOptions = {}
): OptimizedRoute {
  const {
    preferredTransportMode,
    startTime = 540, // 9:00
    endTime = 1260, // 21:00
    considerTimeWindows = true,
    returnToStart = false,
    maxWalkingDistanceKm = 1.5,
  } = options;

  logger.info('Starting route optimization', {
    dayNumber: day.dayNumber,
    poiCount: day.pois.length,
  });

  // Filter POIs with valid coordinates
  const validPois = day.pois.filter(
    (poi) =>
      poi.latitude !== undefined &&
      poi.longitude !== undefined &&
      poi.latitude !== 0 &&
      poi.longitude !== 0
  );

  if (validPois.length <= 1) {
    logger.info('Not enough POIs with coordinates for optimization');
    return {
      originalOrder: day.pois,
      optimizedOrder: day.pois,
      totalDistance: 0,
      totalDuration: 0,
      savings: {
        distanceKm: 0,
        distancePercent: 0,
        durationMinutes: 0,
        durationPercent: 0,
      },
      segments: [],
      feasibilityIssues: [],
    };
  }

  // Build distance matrix
  const distanceMatrix = buildDistanceMatrix(validPois);

  // Calculate original route metrics
  const originalOrder = validPois.map((_, idx) => idx);
  const originalDistance = calculateTourDistance(originalOrder, distanceMatrix);

  // Run TSP optimization
  let optimizedTour: number[];
  if (validPois.length <= 15) {
    // Use exact algorithm for small instances
    optimizedTour = heldKarpTSP(distanceMatrix, 0);
  } else {
    // Use heuristic for larger instances
    optimizedTour = nearestNeighborTSP(distanceMatrix, 0);
    optimizedTour = twoOptImprove(optimizedTour, distanceMatrix);
  }

  const optimizedDistance = calculateTourDistance(optimizedTour, distanceMatrix);

  // Prepare time-windowed POIs for feasibility check
  const timeWindowedPois: TimeWindowedPoi[] = validPois.map((poi, idx) => ({
    ...poi,
    index: idx,
    timeWindow: considerTimeWindows ? parseOpeningHours(poi.openingHours) : null,
    visitDuration: getPoiDuration(poi),
  }));

  // Determine transport mode and check feasibility
  const defaultMode = preferredTransportMode || 'transit';
  const feasibility = checkTimeFeasibility(
    optimizedTour,
    timeWindowedPois,
    distanceMatrix,
    defaultMode,
    startTime
  );

  // Build route segments with transport info
  const segments: RouteSegment[] = [];
  let totalTravelDuration = 0;

  for (let i = 0; i < optimizedTour.length - 1; i++) {
    const fromIdx = optimizedTour[i];
    const toIdx = optimizedTour[i + 1];
    const fromPoi = validPois[fromIdx];
    const toPoi = validPois[toIdx];
    const distance = distanceMatrix[fromIdx][toIdx];

    // Suggest transport mode based on distance
    const mode =
      preferredTransportMode || suggestTransportMode(distance, maxWalkingDistanceKm);
    const duration = calculateTravelTime(distance, mode);
    totalTravelDuration += duration;

    const schedule = feasibility.schedule.get(fromIdx);
    const nextSchedule = feasibility.schedule.get(toIdx);

    segments.push({
      from: fromPoi.name,
      to: toPoi.name,
      transportMode: mode,
      distanceKm: Math.round(distance * 100) / 100,
      durationMinutes: duration,
      departureTime: schedule ? formatTime(schedule.departure) : undefined,
      arrivalTime: nextSchedule ? formatTime(nextSchedule.arrival) : undefined,
    });
  }

  // Calculate original travel duration
  let originalTravelDuration = 0;
  for (let i = 0; i < originalOrder.length - 1; i++) {
    const distance = distanceMatrix[originalOrder[i]][originalOrder[i + 1]];
    const mode =
      preferredTransportMode || suggestTransportMode(distance, maxWalkingDistanceKm);
    originalTravelDuration += calculateTravelTime(distance, mode);
  }

  // Build optimized POI list with updated transport info
  const optimizedPois: Poi[] = optimizedTour.map((idx, i) => {
    const poi = { ...validPois[idx] };

    // Update transport info to next POI
    if (i < segments.length) {
      const segment = segments[i];
      poi.transportToNext = {
        mode: segment.transportMode,
        duration: `${segment.durationMinutes}分钟`,
        distance: `${segment.distanceKm}公里`,
      };
    }

    return poi;
  });

  // Include POIs without coordinates at the end
  const poisWithoutCoords = day.pois.filter(
    (poi) =>
      poi.latitude === undefined ||
      poi.longitude === undefined ||
      poi.latitude === 0 ||
      poi.longitude === 0
  );

  const distanceSaved = originalDistance - optimizedDistance;
  const durationSaved = originalTravelDuration - totalTravelDuration;

  logger.info('Route optimization complete', {
    originalDistance: originalDistance.toFixed(2),
    optimizedDistance: optimizedDistance.toFixed(2),
    distanceSaved: distanceSaved.toFixed(2),
    durationSaved,
  });

  return {
    originalOrder: day.pois,
    optimizedOrder: [...optimizedPois, ...poisWithoutCoords],
    totalDistance: Math.round(optimizedDistance * 100) / 100,
    totalDuration: totalTravelDuration,
    savings: {
      distanceKm: Math.round(distanceSaved * 100) / 100,
      distancePercent:
        originalDistance > 0
          ? Math.round((distanceSaved / originalDistance) * 100)
          : 0,
      durationMinutes: durationSaved,
      durationPercent:
        originalTravelDuration > 0
          ? Math.round((durationSaved / originalTravelDuration) * 100)
          : 0,
    },
    segments,
    feasibilityIssues: feasibility.issues,
  };
}

/**
 * Optimize multiple days of itinerary
 */
export function optimizeItinerary(
  days: DayItinerary[],
  options: OptimizationOptions = {}
): { days: OptimizedRoute[]; summary: ItinerarySummary } {
  const optimizedDays = days.map((day) => optimizeDayRoute(day, options));

  const summary: ItinerarySummary = {
    totalDays: days.length,
    totalPois: days.reduce((sum, day) => sum + day.pois.length, 0),
    totalDistance: optimizedDays.reduce((sum, day) => sum + day.totalDistance, 0),
    totalTravelDuration: optimizedDays.reduce(
      (sum, day) => sum + day.totalDuration,
      0
    ),
    totalSavings: {
      distanceKm: optimizedDays.reduce(
        (sum, day) => sum + day.savings.distanceKm,
        0
      ),
      durationMinutes: optimizedDays.reduce(
        (sum, day) => sum + day.savings.durationMinutes,
        0
      ),
    },
    allFeasible: optimizedDays.every((day) => day.feasibilityIssues.length === 0),
  };

  logger.info('Itinerary optimization complete', summary);

  return { days: optimizedDays, summary };
}

export interface ItinerarySummary {
  totalDays: number;
  totalPois: number;
  totalDistance: number;
  totalTravelDuration: number;
  totalSavings: {
    distanceKm: number;
    durationMinutes: number;
  };
  allFeasible: boolean;
}

// ============================================================================
// Export Service Instance
// ============================================================================

export const RouteOptimizerService = {
  optimizeDayRoute,
  optimizeItinerary,
  haversineDistance,
  calculateTravelTime,
  suggestTransportMode,
  parseOpeningHours,
  parseDuration,
  formatTime,
};

export default RouteOptimizerService;
