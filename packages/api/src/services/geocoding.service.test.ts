import type { GeocodeResult, GeocodingProvider } from './geocoding.service.js';
import { wgs84ToGcj02 } from '@pathfinding/utils';
import { describe, expect, it, vi } from 'vitest';
import {
  AmapProvider,
  buildGeocodingMetrics,
  createGeocodingProvider,
  geocodeAiDays,
  isCityConsistent,
} from './geocoding.service.js';

function amapResponse(overrides: Record<string, unknown> = {}) {
  return {
    status: '1',
    info: 'OK',
    geocodes: [
      {
        location: '116.397499,39.908722',
        level: '兴趣点',
        city: '北京市',
        district: '东城区',
        province: '北京市',
        ...overrides,
      },
    ],
  };
}

function mockFetchJson(payload: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(payload),
  }) as unknown as typeof fetch;
}

describe('geocoding.service', () => {
  describe('amapProvider', () => {
    it('returns pending when no API key is configured (never 0,0)', async () => {
      // Arrange
      const provider = new AmapProvider({ apiKey: undefined });

      // Act
      const result = await provider.geocode({ name: '故宫', city: '北京' });

      // Assert
      expect(result.status).toBe('pending');
      expect(result).not.toHaveProperty('latitude');
      expect(result).not.toHaveProperty('longitude');
    });

    it('resolves coordinates and converts GCJ-02 to WGS-84', async () => {
      // Arrange: Amap reports GCJ-02; expected WGS-84 differs by the offset.
      const fetchImpl = mockFetchJson(amapResponse());
      const provider = new AmapProvider({ apiKey: 'test-key', fetchImpl });

      // Act
      const result = await provider.geocode({ name: '故宫', city: '北京' });

      // Assert
      expect(result.status).toBe('ok');
      if (result.status !== 'ok')
        return;
      expect(result.source).toBe('amap');
      expect(result.confidence).toBe(0.9);
      // Round-tripping the stored WGS-84 must reproduce the GCJ-02 input.
      const roundTrip = wgs84ToGcj02(result.latitude, result.longitude);
      expect(roundTrip.lat).toBeCloseTo(39.908722, 6);
      expect(roundTrip.lng).toBeCloseTo(116.397499, 6);
      // The conversion must actually shift the coordinates (Beijing ≈ 500m).
      expect(result.latitude).not.toBeCloseTo(39.908722, 4);
      expect(result.longitude).not.toBeCloseTo(116.397499, 4);
    });

    it('passes city scoping to the Amap request', async () => {
      // Arrange
      const fetchImpl = mockFetchJson(amapResponse());
      const provider = new AmapProvider({ apiKey: 'test-key', fetchImpl });

      // Act
      await provider.geocode({ name: '故宫', city: '北京' });

      // Assert
      const url = vi.mocked(fetchImpl).mock.calls[0]?.[0] as string;
      expect(url).toContain('city=');
      expect(url).toContain(encodeURIComponent('北京'));
    });

    it('fails on non-OK HTTP responses', async () => {
      // Arrange
      const fetchImpl = mockFetchJson({}, false, 502);
      const provider = new AmapProvider({ apiKey: 'test-key', fetchImpl });

      // Act
      const result = await provider.geocode({ name: '故宫' });

      // Assert
      expect(result).toEqual({ status: 'failed', reason: '高德地理编码请求失败：HTTP 502' });
    });

    it('fails when Amap reports an error status', async () => {
      // Arrange
      const fetchImpl = mockFetchJson({ status: '0', info: 'INVALID_USER_KEY' });
      const provider = new AmapProvider({ apiKey: 'bad-key', fetchImpl });

      // Act
      const result = await provider.geocode({ name: '故宫' });

      // Assert
      expect(result.status).toBe('failed');
      if (result.status !== 'failed')
        return;
      expect(result.reason).toContain('INVALID_USER_KEY');
    });

    it('fails when there is no geocode match', async () => {
      // Arrange
      const fetchImpl = mockFetchJson({ status: '1', info: 'OK', geocodes: [] });
      const provider = new AmapProvider({ apiKey: 'test-key', fetchImpl });

      // Act
      const result = await provider.geocode({ name: '不存在的地点XYZ' });

      // Assert
      expect(result.status).toBe('failed');
    });

    it('rejects coordinates outside the valid China range', async () => {
      // Arrange: would-be result far outside the GCJ-02 domain.
      const fetchImpl = mockFetchJson(amapResponse({ location: '2.3522,48.8566' }));
      const provider = new AmapProvider({ apiKey: 'test-key', fetchImpl });

      // Act
      const result = await provider.geocode({ name: '埃菲尔铁塔' });

      // Assert
      expect(result.status).toBe('failed');
      if (result.status !== 'failed')
        return;
      expect(result.reason).toContain('超出合理范围');
    });

    it('rejects city-inconsistent matches', async () => {
      // Arrange: requested 上海 but Amap matched a POI in 北京.
      const fetchImpl = mockFetchJson(amapResponse());
      const provider = new AmapProvider({ apiKey: 'test-key', fetchImpl });

      // Act
      const result = await provider.geocode({ name: '人民广场', city: '上海' });

      // Assert
      expect(result.status).toBe('failed');
      if (result.status !== 'failed')
        return;
      expect(result.reason).toContain('城市不一致');
    });

    it('fails on unparsable location strings', async () => {
      // Arrange
      const fetchImpl = mockFetchJson(amapResponse({ location: 'not-a-location' }));
      const provider = new AmapProvider({ apiKey: 'test-key', fetchImpl });

      // Act
      const result = await provider.geocode({ name: '故宫' });

      // Assert
      expect(result.status).toBe('failed');
    });
  });

  describe('isCityConsistent', () => {
    it('matches across admin suffixes', () => {
      expect(isCityConsistent('北京', ['北京市'])).toBe(true);
      expect(isCityConsistent('苏州市', ['苏州'])).toBe(true);
    });

    it('passes when either side is missing', () => {
      expect(isCityConsistent(undefined, ['北京市'])).toBe(true);
      expect(isCityConsistent('北京', [undefined])).toBe(true);
    });

    it('fails on a real mismatch', () => {
      expect(isCityConsistent('上海', ['北京市', '东城区', '北京市'])).toBe(false);
    });
  });

  describe('createGeocodingProvider', () => {
    it('builds a pending provider when AMAP_API_KEY is absent', async () => {
      // Arrange
      const provider = createGeocodingProvider({});

      // Act
      const result = await provider.geocode({ name: '故宫' });

      // Assert
      expect(result.status).toBe('pending');
    });
  });

  describe('geocodeAiDays', () => {
    function stubProvider(results: Record<string, GeocodeResult>): GeocodingProvider {
      return {
        name: 'stub',
        geocode: vi.fn(async ({ name }): Promise<GeocodeResult> =>
          results[name] ?? { status: 'failed', reason: `no stub for ${name}` },
        ),
      };
    }

    it('writes WGS-84 coordinates, confidence and source onto resolved POIs', async () => {
      // Arrange
      const provider = stubProvider({
        故宫: { status: 'ok', latitude: 39.91, longitude: 116.39, confidence: 0.9, source: 'amap' },
      });
      const days = [{ dayNumber: 1, theme: '古城', pois: [{ name: '故宫', type: 'attraction' }] }];

      // Act
      const { days: result, stats } = await geocodeAiDays(days, '北京', provider);

      // Assert
      expect(result[0]?.pois?.[0]).toEqual({
        name: '故宫',
        type: 'attraction',
        latitude: 39.91,
        longitude: 116.39,
        geocodeConfidence: 0.9,
        geocodeSource: 'amap',
      });
      expect(stats).toEqual({ total: 1, resolved: 1, pending: 0, failed: 0 });
      expect(provider.geocode).toHaveBeenCalledWith({ name: '故宫', city: '北京' });
    });

    it('strips AI-supplied coordinates and marks pending POIs without inventing 0,0', async () => {
      // Arrange: the LLM hallucinated coordinates; provider has no key.
      const provider = stubProvider({
        故宫: { status: 'pending', reason: '未配置' },
      });
      const days = [{ dayNumber: 1, pois: [{ name: '故宫', latitude: 0, longitude: 0 }] }];

      // Act
      const { days: result, stats } = await geocodeAiDays(days, '北京', provider);

      // Assert
      const poi = result[0]?.pois?.[0] as Record<string, unknown>;
      expect(poi).not.toHaveProperty('latitude');
      expect(poi).not.toHaveProperty('longitude');
      expect(poi.geocodeSource).toBe('pending');
      expect(stats).toEqual({ total: 1, resolved: 0, pending: 1, failed: 0 });
    });

    it('marks failed and nameless POIs visibly and keeps counting', async () => {
      // Arrange
      const provider = stubProvider({});
      const days = [{ dayNumber: 1, pois: [{ name: '无名小店' }, { type: 'restaurant' }] }];

      // Act
      const { days: result, stats } = await geocodeAiDays(days, undefined, provider);

      // Assert
      const pois = result[0]?.pois as Array<Record<string, unknown>>;
      expect(pois[0]?.geocodeSource).toBe('failed');
      expect(pois[0]?.geocodeError).toContain('no stub');
      expect(pois[1]?.geocodeSource).toBe('failed');
      expect(pois[1]?.geocodeError).toContain('缺少名称');
      expect(stats).toEqual({ total: 2, resolved: 0, pending: 0, failed: 2 });
    });

    it('does not mutate the input days', async () => {
      // Arrange
      const provider = stubProvider({
        故宫: { status: 'ok', latitude: 39.91, longitude: 116.39, confidence: 0.9, source: 'amap' },
      });
      const days = [{ dayNumber: 1, pois: [{ name: '故宫' }] }];

      // Act
      await geocodeAiDays(days, '北京', provider);

      // Assert
      expect(days[0]?.pois?.[0]).toEqual({ name: '故宫' });
    });
  });

  describe('buildGeocodingMetrics', () => {
    it('aggregates confidence and low-confidence counts', () => {
      // Arrange
      const days = [
        {
          dayNumber: 1,
          pois: [
            { name: 'A', geocodeConfidence: 0.9 },
            { name: 'B', geocodeConfidence: 0.5 },
            { name: 'C', geocodeSource: 'failed' },
          ],
        },
      ];

      // Act
      const metrics = buildGeocodingMetrics(days);

      // Assert
      expect(metrics).toEqual({
        total_pois: 3,
        average_confidence: 0.7,
        low_confidence_count: 2,
      });
    });

    it('returns null when there are no POIs', () => {
      expect(buildGeocodingMetrics([{ dayNumber: 1, pois: [] }])).toBeNull();
      expect(buildGeocodingMetrics([])).toBeNull();
    });
  });
});
