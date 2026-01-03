/**
 * Calculate estimated transport time between two POIs
 */
export function calculateTransportTime(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: 'walking' | 'driving' | 'transit' | 'cycling' | 'taxi'
): number {
  // Calculate distance using Haversine formula
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  // Estimate travel time based on mode (in minutes)
  // These are rough estimates
  const speeds: Record<string, number> = {
    walking: 5, // 5 km/h
    cycling: 15, // 15 km/h
    driving: 40, // 40 km/h average with traffic
    taxi: 35, // 35 km/h average with traffic
    transit: 25, // 25 km/h average including wait time
  };

  const speed = speeds[mode] || speeds.walking;
  const timeHours = distanceKm / speed;
  const timeMinutes = Math.ceil(timeHours * 60);

  // Add minimum time for getting in/out, waiting, etc.
  const minimumTime: Record<string, number> = {
    walking: 0,
    cycling: 2,
    driving: 5,
    taxi: 5,
    transit: 10,
  };

  return Math.max(timeMinutes, minimumTime[mode] || 0);
}

/**
 * Transport service for route calculations
 */
export const TransportService = {
  /**
   * Calculate transport time between two POIs
   */
  calculateTime: calculateTransportTime,

  /**
   * Get suggested transport mode based on distance
   */
  suggestMode(
    distanceKm: number
  ): 'walking' | 'driving' | 'transit' | 'cycling' | 'taxi' {
    if (distanceKm < 1) {
      return 'walking';
    } else if (distanceKm < 5) {
      return 'cycling';
    } else if (distanceKm < 10) {
      return 'transit';
    } else {
      return 'driving';
    }
  },
};
