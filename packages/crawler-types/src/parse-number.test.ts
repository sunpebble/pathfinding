import { describe, expect, it } from 'vitest';
import { parseChineseNumber } from './parse-number.js';

describe('parseChineseNumber', () => {
  describe('万 / 亿 suffixes', () => {
    it('should parse decimal 万 values', () => {
      expect(parseChineseNumber('1.2万')).toBe(12_000);
    });

    it('should parse integer 万 values', () => {
      expect(parseChineseNumber('12万')).toBe(120_000);
    });

    it('should parse 亿 values', () => {
      expect(parseChineseNumber('1.5亿')).toBe(150_000_000);
    });

    it('should round floating point unit artifacts to integers', () => {
      // 1.1 * 10000 is not exactly 11000 in IEEE 754
      expect(parseChineseNumber('1.1万')).toBe(11_000);
    });
  });

  describe('latin suffixes (w/k)', () => {
    it('should parse k values case-insensitively', () => {
      expect(parseChineseNumber('2.3k')).toBe(2_300);
      expect(parseChineseNumber('2K')).toBe(2_000);
    });

    it('should parse w as 万', () => {
      expect(parseChineseNumber('1.2w')).toBe(12_000);
      expect(parseChineseNumber('3W')).toBe(30_000);
    });
  });

  describe('comma-grouped numbers', () => {
    it('should parse strict thousands grouping', () => {
      expect(parseChineseNumber('3,456')).toBe(3_456);
      expect(parseChineseNumber('1,234,567')).toBe(1_234_567);
    });

    it('should reject malformed grouping instead of guessing', () => {
      expect(parseChineseNumber('12,34')).toBeNull();
      expect(parseChineseNumber('1,,234')).toBeNull();
      expect(parseChineseNumber(',123')).toBeNull();
      expect(parseChineseNumber('123,')).toBeNull();
    });
  });

  describe('plain numbers', () => {
    it('should parse plain integers', () => {
      expect(parseChineseNumber('12345')).toBe(12_345);
    });

    it('should parse a literal zero', () => {
      expect(parseChineseNumber('0')).toBe(0);
    });

    it('should parse plain decimals', () => {
      expect(parseChineseNumber('3.5')).toBe(3.5);
    });
  });

  describe('whitespace tolerance', () => {
    it('should trim surrounding whitespace', () => {
      expect(parseChineseNumber('  1.2万  ')).toBe(12_000);
      expect(parseChineseNumber('\t3,456\n')).toBe(3_456);
    });
  });

  describe('failure returns null (never 0)', () => {
    it('should return null for empty / whitespace-only input', () => {
      expect(parseChineseNumber('')).toBeNull();
      expect(parseChineseNumber('   ')).toBeNull();
    });

    it('should return null for non-numeric text', () => {
      expect(parseChineseNumber('abc')).toBeNull();
      expect(parseChineseNumber('暂无数据')).toBeNull();
    });

    it('should return null for trailing garbage', () => {
      expect(parseChineseNumber('1.2万次浏览')).toBeNull();
      expect(parseChineseNumber('约12万')).toBeNull();
    });

    it('should return null for negative numbers', () => {
      expect(parseChineseNumber('-5')).toBeNull();
    });

    it('should return null for malformed decimals', () => {
      expect(parseChineseNumber('1.2.3')).toBeNull();
      expect(parseChineseNumber('.5万')).toBeNull();
    });

    it('should return null for unit without a number', () => {
      expect(parseChineseNumber('万')).toBeNull();
      expect(parseChineseNumber('k')).toBeNull();
    });
  });
});
