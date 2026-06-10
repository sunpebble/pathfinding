/**
 * Coordinate system conversion between GCJ-02 (Mars coordinates, used by
 * Chinese map providers such as Amap) and WGS-84 (GPS, the storage standard
 * for this project — see crawler-types normalized-poi.ts).
 *
 * Pure implementation of the public domain GCJ-02 obfuscation algorithm.
 * Outside mainland China GCJ-02 equals WGS-84, so coordinates are returned
 * unchanged.
 */

/** A latitude/longitude pair in degrees. */
export interface LatLng {
  lat: number;
  lng: number;
}

/** Krasovsky 1940 ellipsoid semi-major axis (meters). */
const KRASOVSKY_A = 6378245.0;
/** Krasovsky 1940 ellipsoid eccentricity squared (double-precision value). */
const KRASOVSKY_EE = 0.006693421622965943;

/** Iteration limit / convergence threshold for the GCJ→WGS inverse. */
const INVERSE_MAX_ITERATIONS = 30;
const INVERSE_THRESHOLD = 1e-9;

/** GCJ-02 only applies inside this mainland China bounding box. */
const CHINA_BBOX = {
  minLat: 0.8293,
  maxLat: 55.8271,
  minLng: 72.004,
  maxLng: 137.8347,
} as const;

function assertValidCoordinate(lat: number, lng: number): void {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new RangeError(`Invalid latitude: ${lat}`);
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new RangeError(`Invalid longitude: ${lng}`);
  }
}

/**
 * Whether a coordinate lies outside the mainland China bounding box where
 * the GCJ-02 offset applies. Coarse by design (it is the same heuristic the
 * reference algorithm uses).
 */
export function isOutOfChina(lat: number, lng: number): boolean {
  assertValidCoordinate(lat, lng);
  return (
    lng < CHINA_BBOX.minLng
    || lng > CHINA_BBOX.maxLng
    || lat < CHINA_BBOX.minLat
    || lat > CHINA_BBOX.maxLat
  );
}

function transformLat(x: number, y: number): number {
  let ret
    = -100.0
      + 2.0 * x
      + 3.0 * y
      + 0.2 * y * y
      + 0.1 * x * y
      + 0.2 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((160.0 * Math.sin((y / 12.0) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30.0)) * 2.0) / 3.0;
  return ret;
}

function transformLng(x: number, y: number): number {
  let ret
    = 300.0
      + x
      + 2.0 * y
      + 0.1 * x * x
      + 0.1 * x * y
      + 0.1 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((150.0 * Math.sin((x / 12.0) * Math.PI) + 300.0 * Math.sin((x / 30.0) * Math.PI)) * 2.0) / 3.0;
  return ret;
}

/** WGS-84 → GCJ-02 offset (delta degrees) at the given WGS-84 position. */
function gcjOffset(lat: number, lng: number): LatLng {
  const dLatRaw = transformLat(lng - 105.0, lat - 35.0);
  const dLngRaw = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - KRASOVSKY_EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  const dLat
    = (dLatRaw * 180.0)
      / (((KRASOVSKY_A * (1 - KRASOVSKY_EE)) / (magic * sqrtMagic)) * Math.PI);
  const dLng
    = (dLngRaw * 180.0) / ((KRASOVSKY_A / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return { lat: dLat, lng: dLng };
}

/**
 * Convert WGS-84 (GPS) coordinates to GCJ-02 (Chinese map providers).
 * Coordinates outside mainland China are returned unchanged.
 *
 * @throws RangeError when lat/lng are not finite or out of valid range
 */
export function wgs84ToGcj02(lat: number, lng: number): LatLng {
  if (isOutOfChina(lat, lng)) {
    return { lat, lng };
  }
  const delta = gcjOffset(lat, lng);
  return { lat: lat + delta.lat, lng: lng + delta.lng };
}

/**
 * Convert GCJ-02 (e.g. Amap geocoding results) coordinates to WGS-84 for
 * storage. Uses an iterative inverse of the forward transform, accurate to
 * well below 1e-6 degrees (~0.1m). Coordinates outside mainland China are
 * returned unchanged.
 *
 * @throws RangeError when lat/lng are not finite or out of valid range
 */
export function gcj02ToWgs84(lat: number, lng: number): LatLng {
  if (isOutOfChina(lat, lng)) {
    return { lat, lng };
  }

  let wgsLat = lat;
  let wgsLng = lng;
  for (let i = 0; i < INVERSE_MAX_ITERATIONS; i++) {
    const forward = wgs84ToGcj02(wgsLat, wgsLng);
    const dLat = forward.lat - lat;
    const dLng = forward.lng - lng;
    if (Math.abs(dLat) < INVERSE_THRESHOLD && Math.abs(dLng) < INVERSE_THRESHOLD) {
      break;
    }
    wgsLat -= dLat;
    wgsLng -= dLng;
  }
  return { lat: wgsLat, lng: wgsLng };
}
