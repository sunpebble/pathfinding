import type { TransportMode } from '@pathfinding/types';

/**
 * Coordinate type for route calculation
 */
interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Route calculation result
 */
interface RouteResult {
  distance: number; // in meters
  duration: number; // in minutes
  mode: TransportMode;
}

/**
 * Transport service for route calculations
 */
export const transportService = {
  /**
   * Calculate estimated route between two points
   * In production, this would call external APIs like Google Maps, Amap, etc.
   */
  async calculateRoute(
    origin: Coordinate,
    destination: Coordinate,
    mode: TransportMode
  ): Promise<RouteResult> {
    // Calculate straight-line distance using Haversine formula
    const distance = calculateHaversineDistance(origin, destination);

    // Estimate duration based on mode
    // These are rough estimates; real implementation would use routing APIs
    const speeds: Record<TransportMode, number> = {
      walking: 5, // km/h
      cycling: 15, // km/h
      transit: 25, // km/h average including waiting
      driving: 35, // km/h in city
      taxi: 30, // km/h in city traffic
    };

    const speedKmh = speeds[mode];
    const distanceKm = distance / 1000;
    const durationHours = distanceKm / speedKmh;
    const durationMinutes = Math.round(durationHours * 60);

    // Apply multiplier for non-straight routes
    const routeMultipliers: Record<TransportMode, number> = {
      walking: 1.3, // Pedestrian paths
      cycling: 1.4, // Bike routes
      transit: 1.8, // Transit routes with stops
      driving: 1.5, // Road network
      taxi: 1.5, // Same as driving
    };

    const adjustedDuration = Math.round(
      durationMinutes * routeMultipliers[mode]
    );
    const adjustedDistance = Math.round(distance * routeMultipliers[mode]);

    // Add buffer times
    const bufferMinutes: Record<TransportMode, number> = {
      walking: 2,
      cycling: 3,
      transit: 10, // Waiting for transit
      driving: 5, // Parking
      taxi: 5, // Waiting for pickup
    };

    return {
      distance: adjustedDistance,
      duration: Math.max(5, adjustedDuration + bufferMinutes[mode]),
      mode,
    };
  },

  /**
   * Calculate routes for all transport modes
   */
  async calculateAllRoutes(
    origin: Coordinate,
    destination: Coordinate
  ): Promise<RouteResult[]> {
    const modes: TransportMode[] = [
      'walking',
      'cycling',
      'transit',
      'driving',
      'taxi',
    ];

    const results = await Promise.all(
      modes.map((mode) => this.calculateRoute(origin, destination, mode))
    );

    // Sort by duration
    return results.sort((a, b) => a.duration - b.duration);
  },

  /**
   * Get recommended transport mode based on distance
   */
  recommendMode(distanceMeters: number): TransportMode {
    if (distanceMeters < 1000) {
      return 'walking';
    } else if (distanceMeters < 3000) {
      return 'cycling';
    } else if (distanceMeters < 10000) {
      return 'transit';
    } else {
      return 'driving';
    }
  },
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
function calculateHaversineDistance(
  origin: Coordinate,
  destination: Coordinate
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(destination.latitude - origin.latitude);
  const dLon = toRad(destination.longitude - origin.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(origin.latitude)) *
      Math.cos(toRad(destination.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export default transportService;
