import { describe, expect, it } from 'vitest';
import {
  camelToSnake,
  snakeToCamel,
  toCamelCase,
  toSnakeCase,
} from './converters.js';

describe('snakeToCamel', () => {
  it('should convert snake_case to camelCase', () => {
    expect(snakeToCamel('source_platform')).toBe('sourcePlatform');
    expect(snakeToCamel('source_external_id')).toBe('sourceExternalId');
    expect(snakeToCamel('ai_processed_data')).toBe('aiProcessedData');
  });

  it('should handle single words', () => {
    expect(snakeToCamel('platform')).toBe('platform');
    expect(snakeToCamel('id')).toBe('id');
  });

  it('should handle empty string', () => {
    expect(snakeToCamel('')).toBe('');
  });
});

describe('camelToSnake', () => {
  it('should convert camelCase to snake_case', () => {
    expect(camelToSnake('sourcePlatform')).toBe('source_platform');
    expect(camelToSnake('sourceExternalId')).toBe('source_external_id');
    expect(camelToSnake('aiProcessedData')).toBe('ai_processed_data');
  });

  it('should handle single words', () => {
    expect(camelToSnake('platform')).toBe('platform');
    expect(camelToSnake('id')).toBe('id');
  });

  it('should handle empty string', () => {
    expect(camelToSnake('')).toBe('');
  });
});

describe('toCamelCase', () => {
  it('should convert flat object keys to camelCase', () => {
    const input = {
      source_platform: 'xiaohongshu',
      source_external_id: '123',
      likes_count: 100,
    };
    const expected = {
      sourcePlatform: 'xiaohongshu',
      sourceExternalId: '123',
      likesCount: 100,
    };
    expect(toCamelCase(input)).toEqual(expected);
  });

  it('should handle nested objects', () => {
    const input = {
      ai_days: [
        {
          day_number: 1,
          poi_list: [{ poi_name: 'Test' }],
        },
      ],
    };
    const expected = {
      aiDays: [
        {
          dayNumber: 1,
          poiList: [{ poiName: 'Test' }],
        },
      ],
    };
    expect(toCamelCase(input)).toEqual(expected);
  });

  it('should handle arrays at root level', () => {
    const input = [
      { source_id: '1' },
      { source_id: '2' },
    ];
    const expected = [
      { sourceId: '1' },
      { sourceId: '2' },
    ];
    expect(toCamelCase(input)).toEqual(expected);
  });

  it('should preserve primitive values', () => {
    expect(toCamelCase('string')).toBe('string');
    expect(toCamelCase(123)).toBe(123);
    expect(toCamelCase(null)).toBe(null);
    expect(toCamelCase(undefined)).toBe(undefined);
    expect(toCamelCase(true)).toBe(true);
  });

  it('should preserve Date objects', () => {
    const date = new Date('2024-01-01');
    const input = { created_at: date };
    const result = toCamelCase(input);
    expect(result.createdAt).toBe(date);
  });

  it('should handle deeply nested structures', () => {
    const input = {
      level_one: {
        level_two: {
          level_three: {
            deep_value: 'test',
          },
        },
      },
    };
    const expected = {
      levelOne: {
        levelTwo: {
          levelThree: {
            deepValue: 'test',
          },
        },
      },
    };
    expect(toCamelCase(input)).toEqual(expected);
  });
});

describe('toSnakeCase', () => {
  it('should convert flat object keys to snake_case', () => {
    const input = {
      sourcePlatform: 'xiaohongshu',
      sourceExternalId: '123',
      likesCount: 100,
    };
    const expected = {
      source_platform: 'xiaohongshu',
      source_external_id: '123',
      likes_count: 100,
    };
    expect(toSnakeCase(input)).toEqual(expected);
  });

  it('should handle nested objects', () => {
    const input = {
      aiDays: [
        {
          dayNumber: 1,
          poiList: [{ poiName: 'Test' }],
        },
      ],
    };
    const expected = {
      ai_days: [
        {
          day_number: 1,
          poi_list: [{ poi_name: 'Test' }],
        },
      ],
    };
    expect(toSnakeCase(input)).toEqual(expected);
  });

  it('should handle arrays at root level', () => {
    const input = [
      { sourceId: '1' },
      { sourceId: '2' },
    ];
    const expected = [
      { source_id: '1' },
      { source_id: '2' },
    ];
    expect(toSnakeCase(input)).toEqual(expected);
  });

  it('should preserve primitive values', () => {
    expect(toSnakeCase('string')).toBe('string');
    expect(toSnakeCase(123)).toBe(123);
    expect(toSnakeCase(null)).toBe(null);
    expect(toSnakeCase(undefined)).toBe(undefined);
    expect(toSnakeCase(true)).toBe(true);
  });
});

describe('roundtrip conversion', () => {
  it('should preserve data through snake -> camel -> snake', () => {
    const original = {
      source_platform: 'xiaohongshu',
      source_external_id: '123',
      ai_days: [{ day_number: 1 }],
    };
    const result = toSnakeCase(toCamelCase(original));
    expect(result).toEqual(original);
  });

  it('should preserve data through camel -> snake -> camel', () => {
    const original = {
      sourcePlatform: 'xiaohongshu',
      sourceExternalId: '123',
      aiDays: [{ dayNumber: 1 }],
    };
    const result = toCamelCase(toSnakeCase(original));
    expect(result).toEqual(original);
  });
});
