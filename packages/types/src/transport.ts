/**
 * Transport Types
 * Types for multi-modal transportation planning
 */

/**
 * Supported transport modes
 */
export type TransportMode
  = | 'walking'
    | 'cycling'
    | 'driving'
    | 'taxi'
    | 'bus'
    | 'subway'
    | 'transit'; // Combined public transit

/**
 * Transport mode display information
 */
export interface TransportModeInfo {
  mode: TransportMode;
  name: string;
  nameZh: string;
  icon: string;
  color: string;
}

/**
 * Geographic coordinate
 */
export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Transport route request
 */
export interface TransportRouteRequest {
  origin: Coordinate;
  destination: Coordinate;
  originName?: string;
  destinationName?: string;
  city?: string;
  modes?: TransportMode[];
}

/**
 * Single step in a transit route (e.g., walk to station, take bus, etc.)
 */
export interface TransitStep {
  mode: TransportMode;
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  polyline?: string; // encoded polyline
  // For transit steps
  lineName?: string; // e.g., "Line 1", "Bus 123"
  lineColor?: string;
  departureStop?: string;
  arrivalStop?: string;
  stopCount?: number;
  departureTime?: string;
  arrivalTime?: string;
}

/**
 * A complete route option for a single transport mode
 */
export interface TransportRoute {
  mode: TransportMode;
  distance: number; // meters
  duration: number; // seconds
  cost?: number; // estimated cost in CNY
  costRange?: { min: number; max: number };
  steps?: TransitStep[];
  polyline?: string; // encoded polyline for the entire route
  trafficCondition?: 'smooth' | 'slow' | 'congested';
  // For transit routes
  walkingDistance?: number; // total walking distance in meters
  transfers?: number; // number of transfers
}

/**
 * Comparison of multiple transport options
 */
export interface TransportComparison {
  origin: Coordinate;
  destination: Coordinate;
  originName?: string;
  destinationName?: string;
  routes: TransportRoute[];
  recommended?: TransportMode;
  recommendationReason?: string;
  calculatedAt: string;
}

/**
 * Transit pass/card recommendation
 */
export interface TransitPassRecommendation {
  name: string;
  nameZh: string;
  type: 'day_pass' | 'multi_day_pass' | 'stored_value' | 'tourist_card';
  price: number;
  currency: string;
  validDays?: number;
  coverage: string[];
  benefits: string[];
  purchaseLocations: string[];
  recommended: boolean;
  recommendationReason?: string;
}

/**
 * City transit information
 */
export interface CityTransitInfo {
  city: string;
  cityZh: string;
  hasSubway: boolean;
  hasBus: boolean;
  hasBike: boolean;
  subwayLines?: number;
  operatingHours?: {
    subway?: { start: string; end: string };
    bus?: { start: string; end: string };
  };
  passes: TransitPassRecommendation[];
  tips: string[];
}

/**
 * Transport planning result for an itinerary
 */
export interface ItineraryTransportPlan {
  itineraryId: string;
  segments: TransportSegment[];
  totalDistance: number; // meters
  totalDuration: number; // seconds
  totalCost: { min: number; max: number };
  recommendedPasses: TransitPassRecommendation[];
  tips: string[];
}

/**
 * Transport segment between two POIs
 */
export interface TransportSegment {
  fromPoiId: string;
  fromPoiName: string;
  toPoiId: string;
  toPoiName: string;
  comparison: TransportComparison;
  selectedMode?: TransportMode;
}

/**
 * Transport mode metadata — ordered list for UI iteration.
 *
 * For a keyed lookup table with speed/label data, use
 * `TRANSPORT_MODES` from `@pathfinding/constants` instead.
 */
export const TRANSPORT_MODE_LIST: TransportModeInfo[] = [
  {
    mode: 'walking',
    name: 'Walking',
    nameZh: '步行',
    icon: 'figure.walk',
    color: '#34C759',
  },
  {
    mode: 'cycling',
    name: 'Cycling',
    nameZh: '骑行',
    icon: 'bicycle',
    color: '#5AC8FA',
  },
  {
    mode: 'bus',
    name: 'Bus',
    nameZh: '公交',
    icon: 'bus.fill',
    color: '#FF9500',
  },
  {
    mode: 'subway',
    name: 'Subway',
    nameZh: '地铁',
    icon: 'tram.fill',
    color: '#007AFF',
  },
  {
    mode: 'transit',
    name: 'Transit',
    nameZh: '公共交通',
    icon: 'tram.fill',
    color: '#5856D6',
  },
  {
    mode: 'taxi',
    name: 'Taxi',
    nameZh: '出租车',
    icon: 'car.fill',
    color: '#FF3B30',
  },
  {
    mode: 'driving',
    name: 'Driving',
    nameZh: '自驾',
    icon: 'car.fill',
    color: '#8E8E93',
  },
];

/**
 * Get transport mode info by mode
 */
export function getTransportModeInfo(
  mode: TransportMode,
): TransportModeInfo | undefined {
  return TRANSPORT_MODE_LIST.find((m: TransportModeInfo) => m.mode === mode);
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}小时`;
  }
  return `${hours}小时${remainingMinutes}分钟`;
}

/**
 * Format distance in meters to human-readable string
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}米`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)}公里`;
}

/**
 * Format cost range
 */
export function formatCost(cost?: number, costRange?: { min: number; max: number }): string {
  if (cost !== undefined) {
    if (cost === 0)
      return '免费';
    return `¥${cost.toFixed(0)}`;
  }
  if (costRange) {
    if (costRange.min === costRange.max) {
      if (costRange.min === 0)
        return '免费';
      return `¥${costRange.min.toFixed(0)}`;
    }
    return `¥${costRange.min.toFixed(0)}-${costRange.max.toFixed(0)}`;
  }
  return '-';
}
