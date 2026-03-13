import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateRange,
  formatLocalizedDate,
  formatTime,
  getDateRange,
  getDaysBetween,
  getRelativeTime,
  isDateInRange,
  parseTime,
} from './dateUtils';

describe('formatDate', () => {
  it('should format Date object as YYYY-MM-DD', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const result = formatDate(date);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result).toContain('2024');
  });

  it('should format date string as YYYY-MM-DD', () => {
    const result = formatDate('2024-06-20');
    expect(result).toBe('2024-06-20');
  });

  it('should pad single digit months and days', () => {
    const date = new Date(2024, 0, 5); // Jan 5, 2024
    const result = formatDate(date);
    expect(result).toBe('2024-01-05');
  });
});

describe('formatTime', () => {
  it('should format Date as HH:mm', () => {
    const date = new Date('2024-01-15T14:30:00');
    const result = formatTime(date);
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('should pad single digit hours and minutes', () => {
    const date = new Date();
    date.setHours(9, 5, 0, 0);
    const result = formatTime(date);
    expect(result).toBe('09:05');
  });
});

describe('parseTime', () => {
  it('should parse valid time string', () => {
    const result = parseTime('14:30');
    expect(result).toEqual({ hours: 14, minutes: 30 });
  });

  it('should parse single digit hour with two digit minutes', () => {
    const result = parseTime('9:05');
    expect(result).toEqual({ hours: 9, minutes: 5 });
  });

  it('should return null for completely invalid input', () => {
    expect(parseTime('invalid')).toBeNull();
  });

  it('should return null for malformed time string (single digit minutes)', () => {
    expect(parseTime('9:5')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseTime('')).toBeNull();
  });

  it('should return null for out-of-range hours', () => {
    expect(parseTime('25:00')).toBeNull();
  });

  it('should return null for out-of-range minutes', () => {
    expect(parseTime('12:60')).toBeNull();
  });

  it('should return null for negative-like input', () => {
    expect(parseTime('-1:30')).toBeNull();
  });

  it('should parse midnight correctly', () => {
    expect(parseTime('00:00')).toEqual({ hours: 0, minutes: 0 });
  });

  it('should parse end-of-day correctly', () => {
    expect(parseTime('23:59')).toEqual({ hours: 23, minutes: 59 });
  });
});

describe('getDaysBetween', () => {
  it('should return 1 for same day', () => {
    const result = getDaysBetween('2024-01-15', '2024-01-15');
    expect(result).toBe(1);
  });

  it('should return correct count for date range', () => {
    const result = getDaysBetween('2024-01-15', '2024-01-17');
    expect(result).toBe(3); // 15, 16, 17 (inclusive)
  });

  it('should work with Date objects', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-10');
    const result = getDaysBetween(start, end);
    expect(result).toBe(10);
  });
});

describe('getDateRange', () => {
  it('should return array of dates between start and end', () => {
    const result = getDateRange('2024-01-15', '2024-01-17');
    expect(result).toHaveLength(3);
  });

  it('should return single date when start equals end', () => {
    const result = getDateRange('2024-01-15', '2024-01-15');
    expect(result).toHaveLength(1);
  });

  it('should return empty array when start is after end', () => {
    const result = getDateRange('2024-01-20', '2024-01-15');
    expect(result).toEqual([]);
  });
});

describe('isDateInRange', () => {
  it('should return true for date within range', () => {
    const result = isDateInRange('2024-01-15', '2024-01-10', '2024-01-20');
    expect(result).toBe(true);
  });

  it('should return true for date at start of range', () => {
    const result = isDateInRange('2024-01-10', '2024-01-10', '2024-01-20');
    expect(result).toBe(true);
  });

  it('should return true for date at end of range', () => {
    const result = isDateInRange('2024-01-20', '2024-01-10', '2024-01-20');
    expect(result).toBe(true);
  });

  it('should return false for date outside range', () => {
    const result = isDateInRange('2024-01-25', '2024-01-10', '2024-01-20');
    expect(result).toBe(false);
  });
});

describe('formatLocalizedDate', () => {
  it('should format date with English locale', () => {
    const result = formatLocalizedDate('2024-01-15', 'en');
    expect(result).toContain('2024');
    expect(result).toContain('January');
  });

  it('should format date with Chinese locale', () => {
    const result = formatLocalizedDate('2024-01-15', 'zh');
    expect(result).toContain('2024');
  });

  it('should handle invalid date gracefully', () => {
    const result = formatLocalizedDate('invalid-date', 'en');
    expect(result).toBe('invalid-date');
  });
});

describe('formatDateRange', () => {
  it('should format single date when start equals end', () => {
    const result = formatDateRange('2024-01-15', '2024-01-15', 'en');
    expect(result).toContain('2024');
  });

  it('should format date range with different dates', () => {
    const result = formatDateRange('2024-01-15', '2024-01-20', 'en');
    expect(result).toContain('-');
    expect(result).toContain('2024');
  });
});

describe('getRelativeTime', () => {
  it('should return "just now" for recent dates', () => {
    const now = new Date('2024-06-15T12:00:00');
    const date = new Date('2024-06-15T11:59:45');
    expect(getRelativeTime(date, 'en', now)).toBe('just now');
  });

  it('should return minutes ago', () => {
    const now = new Date('2024-06-15T12:00:00');
    const date = new Date('2024-06-15T11:45:00');
    expect(getRelativeTime(date, 'en', now)).toBe('15 min ago');
  });

  it('should return hours ago', () => {
    const now = new Date('2024-06-15T12:00:00');
    const date = new Date('2024-06-15T09:00:00');
    expect(getRelativeTime(date, 'en', now)).toBe('3h ago');
  });

  it('should return days ago', () => {
    const now = new Date('2024-06-15T12:00:00');
    const date = new Date('2024-06-13T12:00:00');
    expect(getRelativeTime(date, 'en', now)).toBe('2d ago');
  });

  it('should return "upcoming" for future dates', () => {
    const now = new Date('2024-06-15T12:00:00');
    const date = new Date('2024-06-16T12:00:00');
    expect(getRelativeTime(date, 'en', now)).toBe('upcoming');
  });

  it('should work with Chinese locale', () => {
    const now = new Date('2024-06-15T12:00:00');
    const date = new Date('2024-06-15T11:59:45');
    expect(getRelativeTime(date, 'zh', now)).toBe('刚刚');
  });
});
