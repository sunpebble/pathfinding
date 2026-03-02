import { describe, expect, it } from 'vitest';
import {
  combineDateAndTime,
  formatDate,
  formatDateRange,
  formatLocalizedDate,
  formatTime,
  getDateRange,
  getDaysBetween,
  getRelativeTime,
  isDateInRange,
  parseTime,
  toTimezone,
} from './dateUtils';

describe('toTimezone', () => {
  it('should convert date string to timezone', () => {
    // Note: JS Date.toLocaleString with timeZone returns localized string, we're just checking it runs
    const date = new Date('2024-01-15T10:30:00Z');
    const result = toTimezone(date, 'America/New_York');
    expect(result).toBeInstanceOf(Date);
  });

  it('should handle Date object input', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const result = toTimezone(date, 'Asia/Tokyo');
    expect(result).toBeInstanceOf(Date);
  });
});

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

describe('combineDateAndTime', () => {
  it('should combine date string and time string', () => {
    const result = combineDateAndTime('2024-01-15', '14:30');
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
  });

  it('should combine Date object and time string', () => {
    const date = new Date('2024-01-15');
    const result = combineDateAndTime(date, '09:05');
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(5);
  });

  it('should adjust for timezone if provided', () => {
    const result = combineDateAndTime('2024-01-15', '14:30', 'America/New_York');
    expect(result).toBeInstanceOf(Date);
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

describe('getRelativeTime', () => {
  const setupMockDate = (minutesAgo: number) => {
    const now = new Date();
    return new Date(now.getTime() - minutesAgo * 60 * 1000);
  };

  describe('chinese locale', () => {
    it('should return just now', () => {
      const date = setupMockDate(0);
      expect(getRelativeTime(date, 'zh')).toBe('刚刚');
    });

    it('should return minutes ago', () => {
      const date = setupMockDate(30);
      expect(getRelativeTime(date, 'zh')).toBe('30分钟前');
    });

    it('should return hours ago', () => {
      const date = setupMockDate(60 * 2);
      expect(getRelativeTime(date, 'zh')).toBe('2小时前');
    });

    it('should return days ago', () => {
      const date = setupMockDate(60 * 24 * 2);
      expect(getRelativeTime(date, 'zh')).toBe('2天前');
    });

    it('should return weeks ago', () => {
      const date = setupMockDate(60 * 24 * 14);
      expect(getRelativeTime(date, 'zh')).toBe('2周前');
    });

    it('should return months ago', () => {
      const date = setupMockDate(60 * 24 * 60);
      expect(getRelativeTime(date, 'zh')).toBe('2个月前');
    });

    it('should return years ago', () => {
      const date = setupMockDate(60 * 24 * 400);
      expect(getRelativeTime(date, 'zh')).toBe('1年前');
    });
  });

  describe('english locale', () => {
    it('should return just now', () => {
      const date = setupMockDate(0);
      expect(getRelativeTime(date, 'en')).toBe('just now');
    });

    it('should return minutes ago', () => {
      const date = setupMockDate(30);
      expect(getRelativeTime(date, 'en')).toBe('30 min ago');
    });

    it('should return hours ago', () => {
      const date = setupMockDate(60 * 2);
      expect(getRelativeTime(date, 'en')).toBe('2h ago');
    });

    it('should return days ago', () => {
      const date = setupMockDate(60 * 24 * 2);
      expect(getRelativeTime(date, 'en')).toBe('2d ago');
    });

    it('should return weeks ago', () => {
      const date = setupMockDate(60 * 24 * 14);
      expect(getRelativeTime(date, 'en')).toBe('2w ago');
    });

    it('should return months ago', () => {
      const date = setupMockDate(60 * 24 * 60);
      expect(getRelativeTime(date, 'en')).toBe('2mo ago');
    });

    it('should return years ago', () => {
      const date = setupMockDate(60 * 24 * 400);
      expect(getRelativeTime(date, 'en')).toBe('1y ago');
    });
  });

  it('should handle string dates', () => {
    const dateStr = setupMockDate(30).toISOString();
    expect(getRelativeTime(dateStr, 'en')).toBe('30 min ago');
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

  it('should format date with options', () => {
    const result = formatLocalizedDate('2024-01-15', 'en', { year: '2-digit' });
    expect(result).toContain('24');
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

  it('should handle chinese locale for ranges', () => {
    const result = formatDateRange('2024-01-15', '2024-01-20', 'zh');
    expect(result).toContain('-');
    expect(result).toContain('2024');
  });
});
