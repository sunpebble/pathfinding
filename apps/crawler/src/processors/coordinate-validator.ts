/**
 * Coordinate Validator
 * Validates and transforms coordinates between coordinate systems
 */

import type { Coordinates } from '../lib/geo.js';

/**
 * China bounding box (rough)
 */
const CHINA_BOUNDS = {
  minLat: 18.0,
  maxLat: 54.0,
  minLng: 73.0,
  maxLng: 135.0,
};

/**
 * City center coordinates with approximate radius
 */
const CITY_BOUNDS: Record<
  string,
  { lat: number; lng: number; radius: number }
> = {
  北京: { lat: 39.9042, lng: 116.4074, radius: 80 },
  上海: { lat: 31.2304, lng: 121.4737, radius: 60 },
  广州: { lat: 23.1291, lng: 113.2644, radius: 50 },
  深圳: { lat: 22.5431, lng: 114.0579, radius: 40 },
  杭州: { lat: 30.2741, lng: 120.1551, radius: 50 },
  成都: { lat: 30.5728, lng: 104.0668, radius: 60 },
  西安: { lat: 34.3416, lng: 108.9398, radius: 50 },
  南京: { lat: 32.0603, lng: 118.7969, radius: 50 },
  武汉: { lat: 30.5928, lng: 114.3055, radius: 60 },
  重庆: { lat: 29.4316, lng: 106.9123, radius: 80 },
};

// GCJ-02 to WGS-84 transformation constants
const PI = Math.PI;
const A = 6378245.0;
// Using string to avoid precision loss in linting
const EE = 0.006_693_421_622_965_943;

/**
 * Check if coordinates are within China bounds
 */
export function isInChina(lat: number, lng: number): boolean {
  return (
    lat >= CHINA_BOUNDS.minLat &&
    lat <= CHINA_BOUNDS.maxLat &&
    lng >= CHINA_BOUNDS.minLng &&
    lng <= CHINA_BOUNDS.maxLng
  );
}

/**
 * Validate coordinates are within a city's bounds
 */
export function validateCoordinates(
  lat: number,
  lng: number,
  city?: string
): {
  valid: boolean;
  reason?: string;
} {
  // Basic validation
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { valid: false, reason: 'Invalid coordinate range' };
  }

  // Check if in China
  if (!isInChina(lat, lng)) {
    return { valid: false, reason: 'Outside China bounds' };
  }

  // Check city bounds if provided
  if (city && CITY_BOUNDS[city]) {
    const cityInfo = CITY_BOUNDS[city];
    const distance = haversineDistance(lat, lng, cityInfo.lat, cityInfo.lng);
    if (distance > cityInfo.radius) {
      return {
        valid: false,
        reason: `Outside ${city} bounds (${distance.toFixed(1)}km away)`,
      };
    }
  }

  return { valid: true };
}

/**
 * Simple haversine distance in km
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * PI) / 180;
  const dLng = ((lng2 - lng1) * PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * PI) / 180) *
      Math.cos((lat2 * PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Transform latitude for GCJ-02
 */
function transformLat(x: number, y: number): number {
  let ret =
    -100.0 +
    2.0 * x +
    3.0 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0;
  ret +=
    ((160.0 * Math.sin((y / 12.0) * PI) + 320 * Math.sin((y * PI) / 30.0)) *
      2.0) /
    3.0;
  return ret;
}

/**
 * Transform longitude for GCJ-02
 */
function transformLng(x: number, y: number): number {
  let ret =
    300.0 +
    x +
    2.0 * y +
    0.1 * x * x +
    0.1 * x * y +
    0.1 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0;
  ret +=
    ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) *
      2.0) /
    3.0;
  return ret;
}

/**
 * Convert GCJ-02 (Amap) to WGS-84 (GPS/OSM)
 */
export function gcj02ToWgs84(lat: number, lng: number): Coordinates {
  if (!isInChina(lat, lng)) {
    return { latitude: lat, longitude: lng };
  }

  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
  dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI);

  return {
    latitude: lat - dLat,
    longitude: lng - dLng,
  };
}

/**
 * Convert WGS-84 (GPS/OSM) to GCJ-02 (Amap)
 */
export function wgs84ToGcj02(lat: number, lng: number): Coordinates {
  if (!isInChina(lat, lng)) {
    return { latitude: lat, longitude: lng };
  }

  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
  dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI);

  return {
    latitude: lat + dLat,
    longitude: lng + dLng,
  };
}

/**
 * Detect coordinate system by comparing with known reference points
 * Returns 'gcj02' for Amap coordinates, 'wgs84' for OSM/GPS
 */
export function detectCoordinateSystem(
  lat: number,
  lng: number,
  platform: string
): 'gcj02' | 'wgs84' {
  // Amap uses GCJ-02
  if (platform === 'amap') return 'gcj02';
  // OSM uses WGS-84
  if (platform === 'osm') return 'wgs84';
  // Default to WGS-84
  return 'wgs84';
}

/**
 * Normalize coordinates to WGS-84
 */
export function normalizeToWgs84(
  lat: number,
  lng: number,
  platform: string
): Coordinates {
  const system = detectCoordinateSystem(lat, lng, platform);
  if (system === 'gcj02') {
    return gcj02ToWgs84(lat, lng);
  }
  return { latitude: lat, longitude: lng };
}
