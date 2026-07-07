/**
 * camelCase ↔ snake_case conversion utilities.
 * Used for iOS API compatibility — the mobile client expects snake_case keys.
 */

/** Convert a single camelCase string to snake_case. */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Recursively convert all object keys from camelCase to snake_case.
 * Handles arrays, nested objects, and null/undefined gracefully.
 */
export function convertKeysToSnakeCase(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnakeCase);
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const converted: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.hasOwn(obj, key)) {
        const newKey = toSnakeCase(key);
        converted[newKey] = convertKeysToSnakeCase(
          (obj as Record<string, unknown>)[key],
        );
      }
    }
    return converted;
  }
  return obj;
}
