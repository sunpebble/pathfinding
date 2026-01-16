import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatTime,
  getDateRange,
  getDaysBetween,
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

  it('should handle single digit values', () => {
    const result = parseTime('9:5');
    expect(result).toEqual({ hours: 9, minutes: 5 });
  });

  it('should return 0 for invalid input', () => {
    const result = parseTime('invalid');
    expect(result).toEqual({ hours: 0, minutes: 0 });
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
