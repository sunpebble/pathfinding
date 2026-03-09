/**
 * Consistent JSON response helpers.
 *
 * All list endpoints return `{ data, pagination }` and all detail endpoints
 * return `{ data }`.  These helpers enforce that shape and keep route
 * handlers free from repetitive formatting code.
 */
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Pagination } from './params.js';

/**
 * Return a paginated list response.
 *
 * ```json
 * { "data": [...], "pagination": { "limit": 20, "offset": 0, "total": 5 } }
 * ```
 */
export function jsonList<T>(
  c: Context,
  data: T[],
  pagination: Pagination,
  status: ContentfulStatusCode = 200,
) {
  return c.json(
    { data, pagination: { ...pagination, total: data.length } },
    status,
  );
}

/**
 * Return a single-resource response.
 *
 * ```json
 * { "data": { ... } }
 * ```
 */
export function jsonData<T>(
  c: Context,
  data: T,
  status: ContentfulStatusCode = 200,
) {
  return c.json({ data }, status);
}

/**
 * Return a success response (typically for mutations).
 *
 * ```json
 * { "success": true }
 * ```
 */
export function jsonOk(c: Context) {
  return c.json({ success: true });
}
