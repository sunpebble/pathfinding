import { describe, expect, it } from 'vitest';
import { escapeLikePattern, parsePagination, parsePositiveInt } from './params.js';

describe('parsePositiveInt', () => {
  it('parses valid positive integers', () => {
    expect(parsePositiveInt('1')).toBe(1);
    expect(parsePositiveInt('42')).toBe(42);
    expect(parsePositiveInt('100')).toBe(100);
  });

  it('returns null for undefined', () => {
    expect(parsePositiveInt(undefined)).toBe(null);
  });

  it('returns null for zero', () => {
    expect(parsePositiveInt('0')).toBe(null);
  });

  it('returns null for negative numbers', () => {
    expect(parsePositiveInt('-1')).toBe(null);
    expect(parsePositiveInt('-100')).toBe(null);
  });

  it('returns null for non-numeric strings', () => {
    expect(parsePositiveInt('abc')).toBe(null);
    expect(parsePositiveInt('')).toBe(null);
  });

  it('truncates floats via parseInt', () => {
    expect(parsePositiveInt('1.5')).toBe(1);
  });
});

describe('parsePagination', () => {
  it('uses defaults when no params are given', () => {
    expect(parsePagination(undefined, undefined)).toEqual({
      limit: 20,
      offset: 0,
    });
  });

  it('parses valid limit and offset', () => {
    expect(parsePagination('10', '5')).toEqual({
      limit: 10,
      offset: 5,
    });
  });

  it('clamps limit to MAX_PAGE_SIZE (100)', () => {
    expect(parsePagination('200', '0')).toEqual({
      limit: 100,
      offset: 0,
    });
  });

  it('falls back to default limit for invalid values', () => {
    expect(parsePagination('abc', '0')).toEqual({
      limit: 20,
      offset: 0,
    });
    expect(parsePagination('0', '0')).toEqual({
      limit: 20,
      offset: 0,
    });
    expect(parsePagination('-5', '0')).toEqual({
      limit: 20,
      offset: 0,
    });
  });

  it('falls back to 0 for invalid offset', () => {
    expect(parsePagination('10', 'abc')).toEqual({
      limit: 10,
      offset: 0,
    });
    expect(parsePagination('10', '-5')).toEqual({
      limit: 10,
      offset: 0,
    });
  });

  it('accepts a custom default limit', () => {
    expect(parsePagination(undefined, undefined, 50)).toEqual({
      limit: 50,
      offset: 0,
    });
  });

  it('allows offset of 0', () => {
    expect(parsePagination('10', '0')).toEqual({
      limit: 10,
      offset: 0,
    });
  });
});

describe('escapeLikePattern', () => {
  it('escapes percent signs', () => {
    expect(escapeLikePattern('100% off')).toBe('100\\% off');
  });

  it('escapes underscores', () => {
    expect(escapeLikePattern('user_name')).toBe('user\\_name');
  });

  it('escapes backslashes', () => {
    expect(escapeLikePattern('path\\to\\file')).toBe('path\\\\to\\\\file');
  });

  it('escapes multiple special characters', () => {
    expect(escapeLikePattern('50%_off')).toBe('50\\%\\_off');
  });

  it('returns plain strings unchanged', () => {
    expect(escapeLikePattern('hello world')).toBe('hello world');
    expect(escapeLikePattern('Alice')).toBe('Alice');
  });

  it('handles empty string', () => {
    expect(escapeLikePattern('')).toBe('');
  });
});
