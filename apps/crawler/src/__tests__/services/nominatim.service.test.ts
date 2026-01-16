import type {NominatimResult} from '../../services/nominatim.service.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  
  NominatimService
} from '../../services/nominatim.service.js';

// Mock geo-constants module
vi.mock('../../services/geo-constants.js', () => ({
  CITY_CENTERS: {
    北京: { lat: 39.9042, lng: 116.4074 },
    上海: { lat: 31.2304, lng: 121.4737 },
  },
  isInChinaBounds: vi.fn((lat: number, lng: number) => {
    // Simple bounds check for China
    return lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135;
  }),
  isNearCity: vi.fn(() => true),
}));

describe('nominatimService', () => {
  let service: NominatimService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new NominatimService();
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('geocode', () => {
    it('should return coordinates for valid location', async () => {
      const mockResponse: NominatimResult[] = [
        {
          place_id: 123,
          lat: '39.9042',
          lon: '116.4074',
          display_name: 'Tiananmen, Beijing, China',
          type: 'attraction',
          class: 'tourism',
          importance: 0.8,
        },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const geocodePromise = service.geocode('北京天安门', '北京');

      // Advance timers to skip throttle
      await vi.advanceTimersByTimeAsync(1200);

      const result = await geocodePromise;

      expect(result).not.toBeNull();
      expect(result?.latitude).toBeCloseTo(39.9042, 2);
      expect(result?.longitude).toBeCloseTo(116.4074, 2);
      expect(result?.source).toBe('nominatim');
    });

    it('should return null for unknown location', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const geocodePromise = service.geocode('不存在的地方xyz123');

      await vi.advanceTimersByTimeAsync(10000);

      const result = await geocodePromise;
      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      const geocodePromise = service.geocode('北京');

      await vi.advanceTimersByTimeAsync(10000);

      const result = await geocodePromise;
      expect(result).toBeNull();
    });

    it('should return cached result on second call', async () => {
      const mockResponse: NominatimResult[] = [
        {
          place_id: 123,
          lat: '39.9042',
          lon: '116.4074',
          display_name: 'Tiananmen, Beijing, China',
          type: 'attraction',
          class: 'tourism',
          importance: 0.8,
        },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // First call
      const firstPromise = service.geocode('天安门', '北京');
      await vi.advanceTimersByTimeAsync(1200);
      const first = await firstPromise;

      expect(first).not.toBeNull();

      // Second call should hit cache
      const secondPromise = service.geocode('天安门', '北京');
      const second = await secondPromise;

      expect(second?.source).toBe('cache');
      // fetch should only be called once per search query attempt
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  describe('getCityCenter', () => {
    it('should return city center for known city', () => {
      const result = service.getCityCenter('北京');

      expect(result).not.toBeNull();
      expect(result?.latitude).toBeCloseTo(39.9042, 2);
      expect(result?.longitude).toBeCloseTo(116.4074, 2);
      expect(result?.confidence).toBe(0.3);
      expect(result?.placeType).toBe('city_center_fallback');
    });

    it('should return null for unknown city', () => {
      const result = service.getCityCenter('未知城市');
      expect(result).toBeNull();
    });
  });

  describe('validateCoordinates', () => {
    it('should return valid for coordinates in China', () => {
      const result = service.validateCoordinates(39.9042, 116.4074, '北京');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for zero coordinates', () => {
      const result = service.validateCoordinates(0, 0);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Zero coordinates');
    });
  });

  describe('getCacheStats', () => {
    it('should return cache size', () => {
      const stats = service.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(typeof stats.size).toBe('number');
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      const mockResponse: NominatimResult[] = [
        {
          place_id: 123,
          lat: '39.9042',
          lon: '116.4074',
          display_name: 'Test',
          type: 'attraction',
          class: 'tourism',
          importance: 0.8,
        },
      ];

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // Add to cache
      const geocodePromise = service.geocode('测试地点');
      await vi.advanceTimersByTimeAsync(1200);
      await geocodePromise;

      expect(service.getCacheStats().size).toBeGreaterThan(0);

      // Clear cache
      service.clearCache();

      expect(service.getCacheStats().size).toBe(0);
    });
  });
});
