import { describe, expect, it } from 'vitest';
import {
  convertKeysToSnakeCase,
  toSnakeCase,
} from './case-converter.js';

describe('toSnakeCase', () => {
  it('converts simple camelCase to snake_case', () => {
    expect(toSnakeCase('userId')).toBe('user_id');
    expect(toSnakeCase('firstName')).toBe('first_name');
    expect(toSnakeCase('itineraryId')).toBe('itinerary_id');
  });

  it('handles multiple uppercase letters', () => {
    expect(toSnakeCase('createdAtTime')).toBe('created_at_time');
    expect(toSnakeCase('orderIndex')).toBe('order_index');
  });

  it('returns already snake_case strings unchanged', () => {
    expect(toSnakeCase('user_id')).toBe('user_id');
    expect(toSnakeCase('id')).toBe('id');
  });

  it('handles empty string', () => {
    expect(toSnakeCase('')).toBe('');
  });
});

describe('convertKeysToSnakeCase', () => {
  it('converts a flat object', () => {
    expect(convertKeysToSnakeCase({ userId: 1, firstName: 'Alice' })).toEqual({
      user_id: 1,
      first_name: 'Alice',
    });
  });

  it('converts nested objects', () => {
    expect(
      convertKeysToSnakeCase({
        userId: 1,
        profileData: { firstName: 'Alice', lastName: 'Bob' },
      }),
    ).toEqual({
      user_id: 1,
      profile_data: { first_name: 'Alice', last_name: 'Bob' },
    });
  });

  it('converts arrays', () => {
    expect(
      convertKeysToSnakeCase([
        { userId: 1 },
        { userId: 2 },
      ]),
    ).toEqual([
      { user_id: 1 },
      { user_id: 2 },
    ]);
  });

  it('converts arrays inside objects', () => {
    expect(
      convertKeysToSnakeCase({
        itineraryItems: [
          { dayId: 1, orderIndex: 0 },
          { dayId: 2, orderIndex: 1 },
        ],
      }),
    ).toEqual({
      itinerary_items: [
        { day_id: 1, order_index: 0 },
        { day_id: 2, order_index: 1 },
      ],
    });
  });

  it('handles null and undefined', () => {
    expect(convertKeysToSnakeCase(null)).toBe(null);
    expect(convertKeysToSnakeCase(undefined)).toBe(undefined);
  });

  it('handles primitives', () => {
    expect(convertKeysToSnakeCase('hello')).toBe('hello');
    expect(convertKeysToSnakeCase(42)).toBe(42);
    expect(convertKeysToSnakeCase(true)).toBe(true);
  });

  it('preserves Date objects as-is', () => {
    const date = new Date('2026-01-01');
    expect(convertKeysToSnakeCase(date)).toBe(date);
  });

  it('handles empty objects and arrays', () => {
    expect(convertKeysToSnakeCase({})).toEqual({});
    expect(convertKeysToSnakeCase([])).toEqual([]);
  });
});
