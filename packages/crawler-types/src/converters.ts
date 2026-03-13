/**
 * Type Converters
 * Bidirectional conversion between snake_case (database/API) and camelCase (TypeScript).
 * Provides both compile-time type utilities and runtime conversion functions.
 */

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Convert snake_case string to camelCase
 */
type SnakeToCamel<S extends string> = S extends `${infer T}_${infer U}`
  ? `${Lowercase<T>}${Capitalize<SnakeToCamel<U>>}`
  : Lowercase<S>;

/**
 * Convert camelCase string to snake_case
 */
type CamelToSnake<S extends string> = S extends `${infer T}${infer U}`
  ? T extends Uppercase<T>
    ? `_${Lowercase<T>}${CamelToSnake<U>}`
    : `${T}${CamelToSnake<U>}`
  : S;

/**
 * Recursively convert object keys from snake_case to camelCase
 */
export type SnakeToCamelObject<T> = T extends Array<infer U>
  ? Array<SnakeToCamelObject<U>>
  : T extends object
    ? {
        [K in keyof T as K extends string ? SnakeToCamel<K> : K]: SnakeToCamelObject<T[K]>;
      }
    : T;

/**
 * Recursively convert object keys from camelCase to snake_case
 */
export type CamelToSnakeObject<T> = T extends Array<infer U>
  ? Array<CamelToSnakeObject<U>>
  : T extends object
    ? {
        [K in keyof T as K extends string ? CamelToSnake<K> : K]: CamelToSnakeObject<T[K]>;
      }
    : T;

// ============================================================================
// Runtime Conversion Functions
// ============================================================================

/**
 * Convert a snake_case string to camelCase at runtime.
 * @param str - The snake_case string to convert
 * @returns The camelCase equivalent
 * @example snakeToCamel('source_platform') // => 'sourcePlatform'
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert a camelCase string to snake_case at runtime.
 * @param str - The camelCase string to convert
 * @returns The snake_case equivalent
 * @example camelToSnake('sourcePlatform') // => 'source_platform'
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Check if a value is a plain object (not null, array, Date, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && !(value instanceof Date)
    && !(value instanceof RegExp)
  );
}

/**
 * Recursively convert all keys in an object from snake_case to camelCase.
 * Handles nested objects and arrays. Leaves Date, RegExp, and primitives untouched.
 *
 * @param obj - Input object with snake_case keys
 * @returns New object with camelCase keys (type-level transformation via {@link SnakeToCamelObject})
 *
 * @example
 * toCamelCase({ source_platform: 'xiaohongshu', source_external_id: '123' })
 * // => { sourcePlatform: 'xiaohongshu', sourceExternalId: '123' }
 *
 * @example Nested objects
 * toCamelCase({ ai_days: [{ day_number: 1, pois: [...] }] })
 * // => { aiDays: [{ dayNumber: 1, pois: [...] }] }
 */
export function toCamelCase<T>(obj: T): SnakeToCamelObject<T> {
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item)) as SnakeToCamelObject<T>;
  }

  if (isPlainObject(obj)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = snakeToCamel(key);
      result[camelKey] = toCamelCase(value);
    }
    return result as SnakeToCamelObject<T>;
  }

  return obj as SnakeToCamelObject<T>;
}

/**
 * Recursively convert all keys in an object from camelCase to snake_case.
 * Handles nested objects and arrays. Leaves Date, RegExp, and primitives untouched.
 *
 * @param obj - Input object with camelCase keys
 * @returns New object with snake_case keys (type-level transformation via {@link CamelToSnakeObject})
 *
 * @example
 * toSnakeCase({ sourcePlatform: 'xiaohongshu', sourceExternalId: '123' })
 * // => { source_platform: 'xiaohongshu', source_external_id: '123' }
 *
 * @example Nested objects
 * toSnakeCase({ aiDays: [{ dayNumber: 1, pois: [...] }] })
 * // => { ai_days: [{ day_number: 1, pois: [...] }] }
 */
export function toSnakeCase<T>(obj: T): CamelToSnakeObject<T> {
  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item)) as CamelToSnakeObject<T>;
  }

  if (isPlainObject(obj)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = toSnakeCase(value);
    }
    return result as CamelToSnakeObject<T>;
  }

  return obj as CamelToSnakeObject<T>;
}
