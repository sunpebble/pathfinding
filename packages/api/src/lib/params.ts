/**
 * Request parameter parsing utilities.
 *
 * Provides a uniform, safe way to extract and validate common parameter
 * patterns (positive integers, pagination, etc.) so that route handlers
 * stay focused on business logic rather than input wrangling.
 */

/** Default page size when none is provided. */
const DEFAULT_PAGE_SIZE = 20;

/** Maximum allowed page size to prevent excessive data loading. */
const MAX_PAGE_SIZE = 100;

/**
 * Parse a string as a positive integer.
 *
 * Returns `null` if the value is `undefined` or not a valid positive
 * integer — callers can decide how to handle the failure (e.g. throw
 * a 400, use a default, etc.).
 *
 * @param value - Raw string to parse (typically from `c.req.param()` or `c.req.query()`)
 * @returns The parsed positive integer, or `null` if invalid
 *
 * @example
 * ```ts
 * const id = parsePositiveInt(c.req.param('id'))
 * if (!id) throw new ApiError(400, 'Invalid id')
 * ```
 */
export function parsePositiveInt(value: string | undefined): number | null {
  if (value === undefined)
    return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Parsed pagination parameters. */
export interface Pagination {
  /** Number of items to return. */
  limit: number;
  /** Number of items to skip. */
  offset: number;
}

/**
 * Extract `limit` and `offset` from query-string values with safe defaults.
 *
 * - `limit` is clamped to `[1, MAX_PAGE_SIZE]` and defaults to {@link DEFAULT_PAGE_SIZE}.
 * - `offset` is clamped to `>= 0` and defaults to `0`.
 *
 * @param rawLimit    - Raw `limit` query parameter
 * @param rawOffset   - Raw `offset` query parameter
 * @param defaultLimit - Override for the default limit (defaults to 20)
 * @returns Validated pagination parameters
 *
 * @example
 * ```ts
 * const { limit, offset } = parsePagination(
 *   c.req.query('limit'),
 *   c.req.query('offset'),
 * )
 * ```
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

/**
 * Escape SQL LIKE pattern wildcards in user input.
 *
 * Replaces `%` and `_` with their escaped equivalents (`\%`, `\_`)
 * so that user-supplied strings are treated as literal characters
 * in SQL LIKE expressions.
 *
 * @param input - Raw user input string
 * @returns Escaped string safe for use in LIKE patterns
 *
 * @example
 * ```ts
 * const safe = escapeLikePattern(userQuery);
 * db.select().from(table).where(like(table.name, `%${safe}%`))
 * ```
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}
