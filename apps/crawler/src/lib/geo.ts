/**
 * Geographic Utilities
 * Distance calculations and geo-spatial helpers using geolib
 */

import {
  getBounds,
  getCenter,
  getCompassDirection,
  getDistance,
  isPointWithinRadius,
} from 'geolib';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Calculate distance between two points in meters
 * @param point1 - First coordinate
 * @param point2 - Second coordinate
 * @returns Distance in meters
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  return getDistance(
    { latitude: point1.latitude, longitude: point1.longitude },
    { latitude: point2.latitude, longitude: point2.longitude }
  );
}

/**
 * Check if a point is within a specified radius of another point
 * @param point - Point to check
 * @param center - Center point
 * @param radiusMeters - Radius in meters
 * @returns True if point is within radius
 */
export function isWithinRadius(
  point: Coordinates,
  center: Coordinates,
  radiusMeters: number
): boolean {
  return isPointWithinRadius(
    { latitude: point.latitude, longitude: point.longitude },
    { latitude: center.latitude, longitude: center.longitude },
    radiusMeters
  );
}

/**
 * Get the center point of multiple coordinates
 * @param points - Array of coordinates
 * @returns Center coordinate or null if empty
 */
export function getCenterPoint(points: Coordinates[]): Coordinates | null {
  if (points.length === 0) {
    return null;
  }
  const center = getCenter(
    points.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))
  );
  if (!center) {
    return null;
  }
  return { latitude: center.latitude, longitude: center.longitude };
}

/**
 * Get bounding box for a set of points
 * @param points - Array of coordinates
 * @returns Bounding box
 */
export function getBoundingBox(points: Coordinates[]): BoundingBox | null {
  if (points.length === 0) {
    return null;
  }
  const bounds = getBounds(
    points.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))
  );
  return {
    minLat: bounds.minLat,
    maxLat: bounds.maxLat,
    minLng: bounds.minLng,
    maxLng: bounds.maxLng,
  };
}

/**
 * Get compass direction from one point to another
 * @param from - Starting point
 * @param to - Ending point
 * @returns Compass direction (N, NE, E, SE, S, SW, W, NW)
 */
export function getDirection(from: Coordinates, to: Coordinates): string {
  return getCompassDirection(
    { latitude: from.latitude, longitude: from.longitude },
    { latitude: to.latitude, longitude: to.longitude }
  );
}

/**
 * Expand bounding box by a percentage
 * @param bbox - Original bounding box
 * @param percentage - Expansion percentage (e.g., 0.1 for 10%)
 * @returns Expanded bounding box
 */
export function expandBoundingBox(
  bbox: BoundingBox,
  percentage: number
): BoundingBox {
  const latDiff = (bbox.maxLat - bbox.minLat) * percentage;
  const lngDiff = (bbox.maxLng - bbox.minLng) * percentage;
  return {
    minLat: bbox.minLat - latDiff,
    maxLat: bbox.maxLat + latDiff,
    minLng: bbox.minLng - lngDiff,
    maxLng: bbox.maxLng + lngDiff,
  };
}

/**
 * Check if a point is within a bounding box
 * @param point - Point to check
 * @param bbox - Bounding box
 * @returns True if point is within the box
 */
export function isWithinBoundingBox(
  point: Coordinates,
  bbox: BoundingBox
): boolean {
  return (
    point.latitude >= bbox.minLat &&
    point.latitude <= bbox.maxLat &&
    point.longitude >= bbox.minLng &&
    point.longitude <= bbox.maxLng
  );
}

/**
 * Calculate approximate meters per degree at a given latitude
 * Useful for converting distance thresholds to coordinate differences
 * @param latitude - Reference latitude
 * @returns Object with metersPerDegreeLat and metersPerDegreeLng
 */
export function getMetersPerDegree(latitude: number): {
  lat: number;
  lng: number;
} {
  const latRad = (latitude * Math.PI) / 180;
  return {
    lat:
      111132.92 - 559.82 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad),
    lng: 111412.84 * Math.cos(latRad) - 93.5 * Math.cos(3 * latRad),
  };
}

/**
 * Convert meters to approximate degrees at a given latitude
 * @param meters - Distance in meters
 * @param latitude - Reference latitude
 * @returns Object with lat and lng degree values
 */
export function metersToDegrees(
  meters: number,
  latitude: number
): { lat: number; lng: number } {
  const mPerDeg = getMetersPerDegree(latitude);
  return {
    lat: meters / mPerDeg.lat,
    lng: meters / mPerDeg.lng,
  };
}

/**
 * Similarity score for POI deduplication based on distance
 * @param distance - Distance in meters
 * @param maxDistance - Maximum distance for consideration (default: 100m)
 * @returns Score between 0 and 1 (1 = same location, 0 = too far)
 */
export function locationSimilarity(
  distance: number,
  maxDistance: number = 100
): number {
  if (distance >= maxDistance) {
    return 0;
  }
  return 1 - distance / maxDistance;
}
