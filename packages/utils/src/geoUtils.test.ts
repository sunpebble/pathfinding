import { describe, expect, it } from 'vitest';
import {
  calculateCenter,
  calculateDistance,
  filterByRadius,
  formatDistance,
  getBoundingBox,
  isWithinRadius,
  sortByDistance,
} from './geoUtils';

describe('calculateDistance', () => {
  it('should return 0 for same coordinates', () => {
    const result = calculateDistance(39.9042, 116.4074, 39.9042, 116.4074);
    expect(result).toBe(0);
  });

  it('should calculate distance between Beijing and Shanghai', () => {
    // Beijing: 39.9042, 116.4074
    // Shanghai: 31.2304, 121.4737
    const result = calculateDistance(39.9042, 116.4074, 31.2304, 121.4737);
    // Approximate distance is ~1068 km
    expect(result).toBeGreaterThan(1000);
    expect(result).toBeLessThan(1200);
  });

  it('should calculate short distances accurately', () => {
    // Two points ~1km apart
    const result = calculateDistance(39.9042, 116.4074, 39.9132, 116.4074);
    expect(result).toBeGreaterThan(0.5);
    expect(result).toBeLessThan(2);
  });
});

describe('formatDistance', () => {
  it('should format meters for distances < 1km (zh)', () => {
    const result = formatDistance(0.5, 'zh');
    expect(result).toBe('500米');
  });

  it('should format kilometers for distances >= 1km (zh)', () => {
    const result = formatDistance(5.5, 'zh');
    expect(result).toBe('5.5公里');
  });

  it('should format meters for distances < 1km (en)', () => {
    const result = formatDistance(0.5, 'en');
    expect(result).toBe('500m');
  });

  it('should format kilometers for distances >= 1km (en)', () => {
    const result = formatDistance(5.5, 'en');
    expect(result).toBe('5.5km');
  });
});

describe('getBoundingBox', () => {
  it('should return bounding box around center point', () => {
    const result = getBoundingBox(39.9042, 116.4074, 10);

    expect(result.minLat).toBeLessThan(39.9042);
    expect(result.maxLat).toBeGreaterThan(39.9042);
    expect(result.minLon).toBeLessThan(116.4074);
    expect(result.maxLon).toBeGreaterThan(116.4074);
  });

  it('should create larger box for larger radius', () => {
    const small = getBoundingBox(39.9042, 116.4074, 1);
    const large = getBoundingBox(39.9042, 116.4074, 10);

    expect(large.maxLat - large.minLat).toBeGreaterThan(
      small.maxLat - small.minLat
    );
  });
});

describe('isWithinRadius', () => {
  it('should return true for point at center', () => {
    const result = isWithinRadius(39.9042, 116.4074, 39.9042, 116.4074, 1);
    expect(result).toBe(true);
  });

  it('should return true for point within radius', () => {
    // Point ~0.5km away
    const result = isWithinRadius(39.9042, 116.4074, 39.9082, 116.4074, 10);
    expect(result).toBe(true);
  });

  it('should return false for point outside radius', () => {
    // Shanghai is ~1000km from Beijing
    const result = isWithinRadius(31.2304, 121.4737, 39.9042, 116.4074, 100);
    expect(result).toBe(false);
  });
});

describe('calculateCenter', () => {
  it('should return same point for single coordinate', () => {
    const result = calculateCenter([{ lat: 39.9042, lon: 116.4074 }]);
    expect(result.lat).toBeCloseTo(39.9042, 2);
    expect(result.lon).toBeCloseTo(116.4074, 2);
  });

  it('should calculate center of two points', () => {
    const result = calculateCenter([
      { lat: 40.0, lon: 116.0 },
      { lat: 40.0, lon: 117.0 },
    ]);
    expect(result.lon).toBeCloseTo(116.5, 1);
  });

  it('should throw for empty array', () => {
    expect(() => calculateCenter([])).toThrow();
  });
});

describe('sortByDistance', () => {
  it('should sort items by distance from reference point', () => {
    const items = [
      { name: 'far', latitude: 31.2304, longitude: 121.4737 }, // Shanghai
      { name: 'near', latitude: 39.9142, longitude: 116.4174 }, // Close to Beijing
      { name: 'medium', latitude: 34.0, longitude: 118.0 },
    ];

    const result = sortByDistance(items, 39.9042, 116.4074);

    expect(result[0]?.name).toBe('near');
    expect(result[2]?.name).toBe('far');
  });
});

describe('filterByRadius', () => {
  it('should filter items within radius', () => {
    const items = [
      { name: 'near', latitude: 39.9142, longitude: 116.4174 },
      { name: 'far', latitude: 31.2304, longitude: 121.4737 },
    ];

    const result = filterByRadius(items, 39.9042, 116.4074, 10);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('near');
  });

  it('should return empty array if no items in radius', () => {
    const items = [{ name: 'far', latitude: 31.2304, longitude: 121.4737 }];

    const result = filterByRadius(items, 39.9042, 116.4074, 10);

    expect(result).toHaveLength(0);
  });
});
