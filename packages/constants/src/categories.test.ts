import { describe, expect, it } from 'vitest';
import {
  getCategoryIcon,
  getCategoryLabel,
  POI_CATEGORIES,
  POI_CATEGORY_VALUES,
} from './categories';

describe('pOI_CATEGORIES', () => {
  it('should contain all expected categories', () => {
    expect(POI_CATEGORIES).toHaveProperty('attraction');
    expect(POI_CATEGORIES).toHaveProperty('restaurant');
    expect(POI_CATEGORIES).toHaveProperty('hotel');
    expect(POI_CATEGORIES).toHaveProperty('shopping');
    expect(POI_CATEGORIES).toHaveProperty('cafe');
    expect(POI_CATEGORIES).toHaveProperty('bar');
    expect(POI_CATEGORIES).toHaveProperty('museum');
    expect(POI_CATEGORIES).toHaveProperty('park');
    expect(POI_CATEGORIES).toHaveProperty('entertainment');
    expect(POI_CATEGORIES).toHaveProperty('transport');
    expect(POI_CATEGORIES).toHaveProperty('other');
  });

  it('should have label, labelEn, and icon for each category', () => {
    Object.values(POI_CATEGORIES).forEach((category) => {
      expect(category).toHaveProperty('label');
      expect(category).toHaveProperty('labelEn');
      expect(category).toHaveProperty('icon');
      expect(typeof category.label).toBe('string');
      expect(typeof category.labelEn).toBe('string');
      expect(typeof category.icon).toBe('string');
    });
  });

  it('should have correct Chinese labels', () => {
    expect(POI_CATEGORIES.attraction?.label).toBe('景点');
    expect(POI_CATEGORIES.restaurant?.label).toBe('餐饮');
    expect(POI_CATEGORIES.hotel?.label).toBe('住宿');
  });

  it('should have correct English labels', () => {
    expect(POI_CATEGORIES.attraction?.labelEn).toBe('Attraction');
    expect(POI_CATEGORIES.restaurant?.labelEn).toBe('Restaurant');
    expect(POI_CATEGORIES.hotel?.labelEn).toBe('Hotel');
  });
});

describe('pOI_CATEGORY_VALUES', () => {
  it('should be an array of all category keys', () => {
    expect(Array.isArray(POI_CATEGORY_VALUES)).toBe(true);
    expect(POI_CATEGORY_VALUES).toHaveLength(11);
  });

  it('should contain all category keys', () => {
    expect(POI_CATEGORY_VALUES).toContain('attraction');
    expect(POI_CATEGORY_VALUES).toContain('restaurant');
    expect(POI_CATEGORY_VALUES).toContain('hotel');
    expect(POI_CATEGORY_VALUES).toContain('shopping');
    expect(POI_CATEGORY_VALUES).toContain('cafe');
    expect(POI_CATEGORY_VALUES).toContain('bar');
    expect(POI_CATEGORY_VALUES).toContain('museum');
    expect(POI_CATEGORY_VALUES).toContain('park');
    expect(POI_CATEGORY_VALUES).toContain('entertainment');
    expect(POI_CATEGORY_VALUES).toContain('transport');
    expect(POI_CATEGORY_VALUES).toContain('other');
  });
});

describe('getCategoryLabel', () => {
  it('should return Chinese label by default', () => {
    const result = getCategoryLabel('attraction');
    expect(result).toBe('景点');
  });

  it('should return Chinese label when locale is zh', () => {
    const result = getCategoryLabel('restaurant', 'zh');
    expect(result).toBe('餐饮');
  });

  it('should return English label when locale is en', () => {
    const result = getCategoryLabel('attraction', 'en');
    expect(result).toBe('Attraction');
  });

  it('should work for all categories', () => {
    POI_CATEGORY_VALUES.forEach((category) => {
      const zhLabel = getCategoryLabel(category, 'zh');
      const enLabel = getCategoryLabel(category, 'en');
      expect(typeof zhLabel).toBe('string');
      expect(typeof enLabel).toBe('string');
      expect(zhLabel.length).toBeGreaterThan(0);
      expect(enLabel.length).toBeGreaterThan(0);
    });
  });
});

describe('getCategoryIcon', () => {
  it('should return icon name for category', () => {
    const result = getCategoryIcon('attraction');
    expect(result).toBe('landmark');
  });

  it('should return correct icons for all categories', () => {
    expect(getCategoryIcon('attraction')).toBe('landmark');
    expect(getCategoryIcon('restaurant')).toBe('utensils');
    expect(getCategoryIcon('hotel')).toBe('bed');
    expect(getCategoryIcon('shopping')).toBe('shopping-bag');
    expect(getCategoryIcon('cafe')).toBe('coffee');
    expect(getCategoryIcon('bar')).toBe('wine');
    expect(getCategoryIcon('museum')).toBe('building-columns');
    expect(getCategoryIcon('park')).toBe('tree');
    expect(getCategoryIcon('entertainment')).toBe('theater-masks');
    expect(getCategoryIcon('transport')).toBe('train');
    expect(getCategoryIcon('other')).toBe('map-pin');
  });

  it('should return non-empty string for all categories', () => {
    POI_CATEGORY_VALUES.forEach((category) => {
      const icon = getCategoryIcon(category);
      expect(typeof icon).toBe('string');
      expect(icon.length).toBeGreaterThan(0);
    });
  });
});
