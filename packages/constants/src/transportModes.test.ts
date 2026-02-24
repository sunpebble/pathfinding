import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TRANSPORT_MODE,
  estimateTravelTime,
  getTransportIcon,
  getTransportLabel,
  TRANSPORT_MODE_VALUES,
  TRANSPORT_MODES,
} from './transportModes';

describe('tRANSPORT_MODES', () => {
  it('should contain all expected transport modes', () => {
    expect(TRANSPORT_MODES).toHaveProperty('walking');
    expect(TRANSPORT_MODES).toHaveProperty('driving');
    expect(TRANSPORT_MODES).toHaveProperty('transit');
    expect(TRANSPORT_MODES).toHaveProperty('cycling');
    expect(TRANSPORT_MODES).toHaveProperty('taxi');
    expect(TRANSPORT_MODES).toHaveProperty('bus');
    expect(TRANSPORT_MODES).toHaveProperty('subway');
  });

  it('should have label, labelEn, icon, and defaultSpeed for each mode', () => {
    Object.values(TRANSPORT_MODES).forEach((mode) => {
      expect(mode).toHaveProperty('label');
      expect(mode).toHaveProperty('labelEn');
      expect(mode).toHaveProperty('icon');
      expect(mode).toHaveProperty('defaultSpeed');
      expect(typeof mode.label).toBe('string');
      expect(typeof mode.labelEn).toBe('string');
      expect(typeof mode.icon).toBe('string');
      expect(typeof mode.defaultSpeed).toBe('number');
      expect(mode.defaultSpeed).toBeGreaterThan(0);
    });
  });

  it('should have correct default speeds', () => {
    expect(TRANSPORT_MODES.walking?.defaultSpeed).toBe(5);
    expect(TRANSPORT_MODES.driving?.defaultSpeed).toBe(40);
    expect(TRANSPORT_MODES.transit?.defaultSpeed).toBe(25);
    expect(TRANSPORT_MODES.cycling?.defaultSpeed).toBe(15);
    expect(TRANSPORT_MODES.taxi?.defaultSpeed).toBe(35);
    expect(TRANSPORT_MODES.bus?.defaultSpeed).toBe(20);
    expect(TRANSPORT_MODES.subway?.defaultSpeed).toBe(35);
  });

  it('should have walking as slowest mode', () => {
    const speeds = Object.values(TRANSPORT_MODES).map(m => m.defaultSpeed);
    expect(Math.min(...speeds)).toBe(TRANSPORT_MODES.walking?.defaultSpeed);
  });
});

describe('tRANSPORT_MODE_VALUES', () => {
  it('should be an array of all transport mode keys', () => {
    expect(Array.isArray(TRANSPORT_MODE_VALUES)).toBe(true);
    expect(TRANSPORT_MODE_VALUES).toHaveLength(7);
  });

  it('should contain all transport mode keys', () => {
    expect(TRANSPORT_MODE_VALUES).toContain('walking');
    expect(TRANSPORT_MODE_VALUES).toContain('driving');
    expect(TRANSPORT_MODE_VALUES).toContain('transit');
    expect(TRANSPORT_MODE_VALUES).toContain('cycling');
    expect(TRANSPORT_MODE_VALUES).toContain('taxi');
    expect(TRANSPORT_MODE_VALUES).toContain('bus');
    expect(TRANSPORT_MODE_VALUES).toContain('subway');
  });
});

describe('dEFAULT_TRANSPORT_MODE', () => {
  it('should be walking', () => {
    expect(DEFAULT_TRANSPORT_MODE).toBe('walking');
  });

  it('should be a valid transport mode', () => {
    expect(TRANSPORT_MODE_VALUES).toContain(DEFAULT_TRANSPORT_MODE);
  });
});

describe('getTransportLabel', () => {
  it('should return Chinese label by default', () => {
    const result = getTransportLabel('walking');
    expect(result).toBe('步行');
  });

  it('should return Chinese label when locale is zh', () => {
    const result = getTransportLabel('driving', 'zh');
    expect(result).toBe('驾车');
  });

  it('should return English label when locale is en', () => {
    const result = getTransportLabel('walking', 'en');
    expect(result).toBe('Walking');
  });

  it('should work for all transport modes', () => {
    TRANSPORT_MODE_VALUES.forEach((mode) => {
      const zhLabel = getTransportLabel(mode, 'zh');
      const enLabel = getTransportLabel(mode, 'en');
      expect(typeof zhLabel).toBe('string');
      expect(typeof enLabel).toBe('string');
      expect(zhLabel.length).toBeGreaterThan(0);
      expect(enLabel.length).toBeGreaterThan(0);
    });
  });
});

describe('getTransportIcon', () => {
  it('should return icon name for transport mode', () => {
    const result = getTransportIcon('walking');
    expect(result).toBe('walk');
  });

  it('should return correct icons for all modes', () => {
    expect(getTransportIcon('walking')).toBe('walk');
    expect(getTransportIcon('driving')).toBe('car');
    expect(getTransportIcon('transit')).toBe('bus');
    expect(getTransportIcon('cycling')).toBe('bike');
    expect(getTransportIcon('taxi')).toBe('car-taxi');
    expect(getTransportIcon('bus')).toBe('bus');
    expect(getTransportIcon('subway')).toBe('subway');
  });

  it('should return non-empty string for all modes', () => {
    TRANSPORT_MODE_VALUES.forEach((mode) => {
      const icon = getTransportIcon(mode);
      expect(typeof icon).toBe('string');
      expect(icon.length).toBeGreaterThan(0);
    });
  });
});

describe('estimateTravelTime', () => {
  it('should calculate travel time for walking', () => {
    // 5 km at 5 km/h = 60 minutes
    const result = estimateTravelTime(5, 'walking');
    expect(result).toBe(60);
  });

  it('should calculate travel time for driving', () => {
    // 40 km at 40 km/h = 60 minutes
    const result = estimateTravelTime(40, 'driving');
    expect(result).toBe(60);
  });

  it('should round up to nearest minute', () => {
    // 1 km at 5 km/h = 12 minutes (0.2 hours)
    const result = estimateTravelTime(1, 'walking');
    expect(result).toBe(12);
  });

  it('should handle fractional distances', () => {
    // 0.5 km at 5 km/h = 6 minutes (0.1 hours)
    const result = estimateTravelTime(0.5, 'walking');
    expect(result).toBe(6);
  });

  it('should return at least 1 minute for very short distances', () => {
    // 0.01 km at 5 km/h = 0.12 minutes, rounds up to 1
    const result = estimateTravelTime(0.01, 'walking');
    expect(result).toBeGreaterThanOrEqual(1);
  });

  it('should work for all transport modes', () => {
    TRANSPORT_MODE_VALUES.forEach((mode) => {
      const time = estimateTravelTime(10, mode);
      expect(typeof time).toBe('number');
      expect(time).toBeGreaterThan(0);
    });
  });

  it('should return faster times for faster modes', () => {
    const distance = 10;
    const walkingTime = estimateTravelTime(distance, 'walking');
    const drivingTime = estimateTravelTime(distance, 'driving');
    expect(walkingTime).toBeGreaterThan(drivingTime);
  });

  it('should handle zero distance', () => {
    const result = estimateTravelTime(0, 'walking');
    expect(result).toBe(0);
  });
});
