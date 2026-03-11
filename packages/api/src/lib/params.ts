/**
 * Request parameter parsing utilities.
 *
 * Provides a uniform, safe way to extract and validate common parameter
 * patterns (positive integers, pagination, etc.) so that route handlers
 * stay focused on business logic rather than input wrangling.
 */

/** Default and maximum page sizes. */
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Parse a string as a positive integer. Returns `null` if the value is not
 * a valid positive integer — callers can decide how to handle the failure.
 */
export function parsePositiveInt(value: string | undefined): number | null {
  if (value === undefined)
    return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Parsed pagination result. */
export interface Pagination {
  limit: number;
  offset: number;
}

/**
 * Extract `limit` and `offset` from query-string values with safe defaults.
 *
 * - `limit` is clamped to `[1, MAX_PAGE_SIZE]` and defaults to `defaultLimit`.
 * - `offset` is clamped to `>= 0` and defaults to `0`.
 */
export function parsePagination(
  rawLimit: string | undefined,
  rawOffset: string | undefined,
  defaultLimit: number = DEFAULT_PAGE_SIZE,
): Pagination {
  const parsedLimit = Number.parseInt(rawLimit ?? '', 10);
  const limit
    = Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, MAX_PAGE_SIZE)
      : defaultLimit;

  const parsedOffset = Number.parseInt(rawOffset ?? '', 10);
  const offset
    = Number.isInteger(parsedOffset) && parsedOffset >= 0
      ? parsedOffset
      : 0;

  return { limit, offset };
}
