/**
 * Shared Geographic Constants
 * Common constants for geocoding services including China bounds,
 * city centers, and utility functions for coordinate validation
 */

/**
 * City center information with coordinates and search radius
 */
export interface CityCenter {
  lat: number;
  lng: number;
  radius: number;
}

/**
 * China bounding box for coordinate validation
 */
export const CHINA_BOUNDS = {
  minLat: 18.0,
  maxLat: 54.0,
  minLng: 73.0,
  maxLng: 135.0,
} as const;

/**
 * City center coordinates for distance-based validation and fallback
 * Includes major Chinese cities with their approximate search radius in km
 */
export const CITY_CENTERS: Record<string, CityCenter> = {
  北京: { lat: 39.9042, lng: 116.4074, radius: 100 },
  上海: { lat: 31.2304, lng: 121.4737, radius: 80 },
  广州: { lat: 23.1291, lng: 113.2644, radius: 70 },
  深圳: { lat: 22.5431, lng: 114.0579, radius: 60 },
  杭州: { lat: 30.2741, lng: 120.1551, radius: 70 },
  成都: { lat: 30.5728, lng: 104.0668, radius: 80 },
  西安: { lat: 34.3416, lng: 108.9398, radius: 70 },
  南京: { lat: 32.0603, lng: 118.7969, radius: 70 },
  武汉: { lat: 30.5928, lng: 114.3055, radius: 80 },
  重庆: { lat: 29.4316, lng: 106.9123, radius: 100 },
  厦门: { lat: 24.4798, lng: 118.0894, radius: 50 },
  青岛: { lat: 36.0671, lng: 120.3826, radius: 60 },
  大连: { lat: 38.914, lng: 121.6147, radius: 60 },
  苏州: { lat: 31.2989, lng: 120.5853, radius: 60 },
  三亚: { lat: 18.2528, lng: 109.5117, radius: 50 },
  丽江: { lat: 26.8721, lng: 100.2336, radius: 40 },
  桂林: { lat: 25.2742, lng: 110.2902, radius: 50 },
  昆明: { lat: 24.8801, lng: 102.8329, radius: 60 },
  拉萨: { lat: 29.65, lng: 91.1, radius: 50 },
  香港: { lat: 22.3193, lng: 114.1694, radius: 40 },
  澳门: { lat: 22.1987, lng: 113.5439, radius: 20 },
  天津: { lat: 39.1256, lng: 117.1909, radius: 70 },
};

/**
 * Calculate haversine distance between two points in km
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Validate if coordinates are within China bounds
 */
export function isInChinaBounds(lat: number, lng: number): boolean {
  return (
    lat >= CHINA_BOUNDS.minLat &&
    lat <= CHINA_BOUNDS.maxLat &&
    lng >= CHINA_BOUNDS.minLng &&
    lng <= CHINA_BOUNDS.maxLng
  );
}

/**
 * Get city center info, handling both with and without "市" suffix
 */
export function getCityCenter(city: string): CityCenter | undefined {
  return CITY_CENTERS[city] || CITY_CENTERS[city.replace('市', '')];
}

/**
 * Validate if coordinates are within reasonable distance from city center
 */
export function isNearCity(lat: number, lng: number, city: string): boolean {
  const cityInfo = getCityCenter(city);
  if (!cityInfo) return true; // Unknown city, allow

  const distance = haversineDistance(lat, lng, cityInfo.lat, cityInfo.lng);
  return distance <= cityInfo.radius;
}
