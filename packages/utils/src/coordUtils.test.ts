import { describe, expect, it } from 'vitest';
import { gcj02ToWgs84, isOutOfChina, wgs84ToGcj02 } from './coordUtils';

/**
 * Known coordinate pairs from the reference implementation test suite
 * (googollee/eviltransform): [wgsLat, wgsLng, gcjLat, gcjLng].
 */
const KNOWN_PAIRS = [
  { name: 'shanghai', wgsLat: 31.1774276, wgsLng: 121.5272106, gcjLat: 31.17530398364597, gcjLng: 121.531541859215 },
  { name: 'shenzhen', wgsLat: 22.543847, wgsLng: 113.912316, gcjLat: 22.540796131694766, gcjLng: 113.9171764808363 },
  { name: 'beijing', wgsLat: 39.911954, wgsLng: 116.377817, gcjLat: 39.91334545536069, gcjLng: 116.38404722455657 },
];

describe('coordUtils', () => {
  describe('wgs84ToGcj02', () => {
    it.each(KNOWN_PAIRS)('converts known WGS-84 pair ($name)', ({ wgsLat, wgsLng, gcjLat, gcjLng }) => {
      const result = wgs84ToGcj02(wgsLat, wgsLng);

      expect(result.lat).toBeCloseTo(gcjLat, 5);
      expect(result.lng).toBeCloseTo(gcjLng, 5);
    });

    it('returns coordinates outside China unchanged', () => {
      const paris = wgs84ToGcj02(48.8566, 2.3522);

      expect(paris).toEqual({ lat: 48.8566, lng: 2.3522 });
    });

    it('throws RangeError on invalid latitude', () => {
      expect(() => wgs84ToGcj02(91, 116.4)).toThrow(RangeError);
      expect(() => wgs84ToGcj02(Number.NaN, 116.4)).toThrow(RangeError);
    });

    it('throws RangeError on invalid longitude', () => {
      expect(() => wgs84ToGcj02(39.9, 181)).toThrow(RangeError);
      expect(() => wgs84ToGcj02(39.9, Number.POSITIVE_INFINITY)).toThrow(RangeError);
    });
  });

  describe('gcj02ToWgs84', () => {
    it.each(KNOWN_PAIRS)('converts known GCJ-02 pair ($name)', ({ wgsLat, wgsLng, gcjLat, gcjLng }) => {
      const result = gcj02ToWgs84(gcjLat, gcjLng);

      expect(result.lat).toBeCloseTo(wgsLat, 5);
      expect(result.lng).toBeCloseTo(wgsLng, 5);
    });

    it('round-trips wgs → gcj → wgs within 1e-6 degrees', () => {
      for (const { wgsLat, wgsLng } of KNOWN_PAIRS) {
        const gcj = wgs84ToGcj02(wgsLat, wgsLng);
        const back = gcj02ToWgs84(gcj.lat, gcj.lng);

        expect(Math.abs(back.lat - wgsLat)).toBeLessThan(1e-6);
        expect(Math.abs(back.lng - wgsLng)).toBeLessThan(1e-6);
      }
    });

    it('returns coordinates outside China unchanged', () => {
      const tokyo = gcj02ToWgs84(35.6762, 139.6503);

      expect(tokyo).toEqual({ lat: 35.6762, lng: 139.6503 });
    });

    it('throws RangeError on invalid input', () => {
      expect(() => gcj02ToWgs84(-91, 116.4)).toThrow(RangeError);
    });
  });

  describe('isOutOfChina', () => {
    it('reports mainland China coordinates as inside', () => {
      expect(isOutOfChina(39.9087, 116.3975)).toBe(false);
      expect(isOutOfChina(22.5438, 113.9123)).toBe(false);
    });

    it('reports foreign coordinates as outside', () => {
      expect(isOutOfChina(48.8566, 2.3522)).toBe(true);
      expect(isOutOfChina(-33.8688, 151.2093)).toBe(true);
    });

    it('throws RangeError on invalid input', () => {
      expect(() => isOutOfChina(120, 0)).toThrow(RangeError);
    });
  });
});
