import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_POI_SEARCH_RADIUS_KM,
  DEFAULT_REMINDER_TIMES,
  MAX_DAYS_PER_ITINERARY,
  MAX_ITEMS_PER_DAY,
  MAX_PAGE_SIZE,
  MAX_POI_SEARCH_RADIUS_KM,
  VISIBILITY_LEVELS,
} from './defaults';

describe('vISIBILITY_LEVELS', () => {
  it('should contain all visibility levels', () => {
    expect(VISIBILITY_LEVELS).toHaveProperty('private');
    expect(VISIBILITY_LEVELS).toHaveProperty('team');
    expect(VISIBILITY_LEVELS).toHaveProperty('public');
  });

  it('should have label, labelEn, description, and descriptionEn for each level', () => {
    Object.values(VISIBILITY_LEVELS).forEach((level) => {
      expect(level).toHaveProperty('label');
      expect(level).toHaveProperty('labelEn');
      expect(level).toHaveProperty('description');
      expect(level).toHaveProperty('descriptionEn');
      expect(typeof level.label).toBe('string');
      expect(typeof level.labelEn).toBe('string');
      expect(typeof level.description).toBe('string');
      expect(typeof level.descriptionEn).toBe('string');
    });
  });

  it('should have correct Chinese labels', () => {
    expect(VISIBILITY_LEVELS.private.label).toBe('私密');
    expect(VISIBILITY_LEVELS.team.label).toBe('团队');
    expect(VISIBILITY_LEVELS.public.label).toBe('公开');
  });

  it('should have correct English labels', () => {
    expect(VISIBILITY_LEVELS.private.labelEn).toBe('Private');
    expect(VISIBILITY_LEVELS.team.labelEn).toBe('Team');
    expect(VISIBILITY_LEVELS.public.labelEn).toBe('Public');
  });

  it('should have meaningful descriptions', () => {
    expect(VISIBILITY_LEVELS.private.description).toContain('自己');
    expect(VISIBILITY_LEVELS.team.description).toContain('团队');
    expect(VISIBILITY_LEVELS.public.description).toContain('所有人');
  });
});

describe('dEFAULT_REMINDER_TIMES', () => {
  it('should be an array of numbers', () => {
    expect(Array.isArray(DEFAULT_REMINDER_TIMES)).toBe(true);
    DEFAULT_REMINDER_TIMES.forEach((time) => {
      expect(typeof time).toBe('number');
    });
  });

  it('should contain expected reminder times in minutes', () => {
    expect(DEFAULT_REMINDER_TIMES).toContain(15); // 15 minutes
    expect(DEFAULT_REMINDER_TIMES).toContain(30); // 30 minutes
    expect(DEFAULT_REMINDER_TIMES).toContain(60); // 1 hour
    expect(DEFAULT_REMINDER_TIMES).toContain(120); // 2 hours
    expect(DEFAULT_REMINDER_TIMES).toContain(1440); // 1 day
  });

  it('should be sorted in ascending order', () => {
    const sorted = [...DEFAULT_REMINDER_TIMES].sort((a, b) => a - b);
    expect(DEFAULT_REMINDER_TIMES).toEqual(sorted);
  });

  it('should have 5 reminder options', () => {
    expect(DEFAULT_REMINDER_TIMES).toHaveLength(5);
  });
});

describe('mAX_ITEMS_PER_DAY', () => {
  it('should be a positive number', () => {
    expect(typeof MAX_ITEMS_PER_DAY).toBe('number');
    expect(MAX_ITEMS_PER_DAY).toBeGreaterThan(0);
  });

  it('should be 20', () => {
    expect(MAX_ITEMS_PER_DAY).toBe(20);
  });

  it('should be a reasonable limit', () => {
    expect(MAX_ITEMS_PER_DAY).toBeGreaterThanOrEqual(10);
    expect(MAX_ITEMS_PER_DAY).toBeLessThanOrEqual(50);
  });
});

describe('mAX_DAYS_PER_ITINERARY', () => {
  it('should be a positive number', () => {
    expect(typeof MAX_DAYS_PER_ITINERARY).toBe('number');
    expect(MAX_DAYS_PER_ITINERARY).toBeGreaterThan(0);
  });

  it('should be 30', () => {
    expect(MAX_DAYS_PER_ITINERARY).toBe(30);
  });

  it('should be a reasonable limit', () => {
    expect(MAX_DAYS_PER_ITINERARY).toBeGreaterThanOrEqual(7);
    expect(MAX_DAYS_PER_ITINERARY).toBeLessThanOrEqual(365);
  });
});

describe('dEFAULT_PAGE_SIZE', () => {
  it('should be a positive number', () => {
    expect(typeof DEFAULT_PAGE_SIZE).toBe('number');
    expect(DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
  });

  it('should be 20', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
  });

  it('should be less than or equal to MAX_PAGE_SIZE', () => {
    expect(DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(MAX_PAGE_SIZE);
  });
});

describe('mAX_PAGE_SIZE', () => {
  it('should be a positive number', () => {
    expect(typeof MAX_PAGE_SIZE).toBe('number');
    expect(MAX_PAGE_SIZE).toBeGreaterThan(0);
  });

  it('should be 100', () => {
    expect(MAX_PAGE_SIZE).toBe(100);
  });

  it('should be greater than or equal to DEFAULT_PAGE_SIZE', () => {
    expect(MAX_PAGE_SIZE).toBeGreaterThanOrEqual(DEFAULT_PAGE_SIZE);
  });
});

describe('dEFAULT_POI_SEARCH_RADIUS_KM', () => {
  it('should be a positive number', () => {
    expect(typeof DEFAULT_POI_SEARCH_RADIUS_KM).toBe('number');
    expect(DEFAULT_POI_SEARCH_RADIUS_KM).toBeGreaterThan(0);
  });

  it('should be 5', () => {
    expect(DEFAULT_POI_SEARCH_RADIUS_KM).toBe(5);
  });

  it('should be less than or equal to MAX_POI_SEARCH_RADIUS_KM', () => {
    expect(DEFAULT_POI_SEARCH_RADIUS_KM).toBeLessThanOrEqual(
      MAX_POI_SEARCH_RADIUS_KM,
    );
  });
});

describe('mAX_POI_SEARCH_RADIUS_KM', () => {
  it('should be a positive number', () => {
    expect(typeof MAX_POI_SEARCH_RADIUS_KM).toBe('number');
    expect(MAX_POI_SEARCH_RADIUS_KM).toBeGreaterThan(0);
  });

  it('should be 50', () => {
    expect(MAX_POI_SEARCH_RADIUS_KM).toBe(50);
  });

  it('should be greater than or equal to DEFAULT_POI_SEARCH_RADIUS_KM', () => {
    expect(MAX_POI_SEARCH_RADIUS_KM).toBeGreaterThanOrEqual(
      DEFAULT_POI_SEARCH_RADIUS_KM,
    );
  });
});

describe('constants relationships', () => {
  it('should have consistent page size limits', () => {
    expect(DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(MAX_PAGE_SIZE);
    expect(DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
    expect(MAX_PAGE_SIZE).toBeGreaterThan(0);
  });

  it('should have consistent POI search radius limits', () => {
    expect(DEFAULT_POI_SEARCH_RADIUS_KM).toBeLessThanOrEqual(
      MAX_POI_SEARCH_RADIUS_KM,
    );
    expect(DEFAULT_POI_SEARCH_RADIUS_KM).toBeGreaterThan(0);
    expect(MAX_POI_SEARCH_RADIUS_KM).toBeGreaterThan(0);
  });

  it('should have reasonable itinerary limits', () => {
    expect(MAX_ITEMS_PER_DAY).toBeGreaterThan(0);
    expect(MAX_DAYS_PER_ITINERARY).toBeGreaterThan(0);
    // Total items per itinerary should be reasonable
    const maxTotalItems = MAX_ITEMS_PER_DAY * MAX_DAYS_PER_ITINERARY;
    expect(maxTotalItems).toBeLessThanOrEqual(1000);
  });
});
