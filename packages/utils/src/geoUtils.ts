/**
 * Geographic utilities for distance and coordinate calculations
 */

/**
 * Earth radius in kilometers
 */
const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a
    = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(toRadians(lat1))
      * Math.cos(toRadians(lat2))
      * Math.sin(dLon / 2)
      * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Format distance for display
 */
export function formatDistance(
  distanceKm: number,
  locale: 'zh' | 'en' = 'zh',
): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return locale === 'zh' ? `${meters}米` : `${meters}m`;
  }
  const formatted = distanceKm.toFixed(1);
  return locale === 'zh' ? `${formatted}公里` : `${formatted}km`;
}

/**
 * Calculate bounding box for a center point and radius
 */
export function getBoundingBox(
  centerLat: number,
  centerLon: number,
  radiusKm: number,
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  // Approximate degrees per km
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos(toRadians(centerLat)));

  return {
    minLat: centerLat - latDelta,
    maxLat: centerLat + latDelta,
    minLon: centerLon - lonDelta,
    maxLon: centerLon + lonDelta,
  };
}

/**
 * Check if a point is within radius of a center point
 */
export function isWithinRadius(
  pointLat: number,
  pointLon: number,
  centerLat: number,
  centerLon: number,
  radiusKm: number,
): boolean {
  const distance = calculateDistance(centerLat, centerLon, pointLat, pointLon);
  return distance <= radiusKm;
}

/**
 * Calculate center point of multiple coordinates
 */
export function calculateCenter(
  coordinates: Array<{ lat: number; lon: number }>,
): {
  lat: number;
  lon: number;
} {
  if (coordinates.length === 0) {
    throw new Error('Cannot calculate center of empty coordinates array');
  }

  if (coordinates.length === 1) {
    const coord = coordinates[0];
    if (!coord) {
      throw new Error('Invalid coordinate at index 0');
    }
    return { lat: coord.lat, lon: coord.lon };
  }

  let x = 0;
  let y = 0;
  let z = 0;

  for (const coord of coordinates) {
    const latRad = toRadians(coord.lat);
    const lonRad = toRadians(coord.lon);

    x += Math.cos(latRad) * Math.cos(lonRad);
    y += Math.cos(latRad) * Math.sin(lonRad);
    z += Math.sin(latRad);
  }

  const total = coordinates.length;
  x /= total;
  y /= total;
  z /= total;

  const lon = Math.atan2(y, x);
  const hyp = Math.sqrt(x * x + y * y);
  const lat = Math.atan2(z, hyp);

  return {
    lat: lat * (180 / Math.PI),
    lon: lon * (180 / Math.PI),
  };
}

/**
 * Sort coordinates by distance from a reference point
 */
export function sortByDistance<
  T extends { latitude: number; longitude: number },
>(items: T[], refLat: number, refLon: number): T[] {
  return [...items].sort((a, b) => {
    const distA = calculateDistance(refLat, refLon, a.latitude, a.longitude);
    const distB = calculateDistance(refLat, refLon, b.latitude, b.longitude);
    return distA - distB;
  });
}

/**
 * Filter items within radius
 */
export function filterByRadius<
  T extends { latitude: number; longitude: number },
>(items: T[], centerLat: number, centerLon: number, radiusKm: number): T[] {
  return items.filter(item =>
    isWithinRadius(
      item.latitude,
      item.longitude,
      centerLat,
      centerLon,
      radiusKm,
    ),
  );
}
