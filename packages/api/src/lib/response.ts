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

/** Shape of a paginated list response. */
interface ListResponse<T> {
  data: T[];
  pagination: Pagination & { total: number };
}

/** Shape of a single-resource response. */
interface DataResponse<T> {
  data: T;
}

/** Shape of a success-only response (typically for mutations). */
interface OkResponse {
  success: true;
}

/**
 * Return a paginated list response.
 *
 * @param c      - Hono context
 * @param data   - Array of items to return
 * @param pagination - Pagination parameters used in the query
 * @param total  - Total number of matching rows (from COUNT query)
 * @param status - HTTP status code (defaults to 200)
 *
 * @example
 * ```ts
 * const { limit, offset } = parsePagination(...)
 * const [items, countResult] = await Promise.all([
 *   db.select().from(table).limit(limit).offset(offset),
 *   db.select({ count: sql<number>`count(*)` }).from(table),
 * ])
 * return jsonList(c, items, { limit, offset }, countResult[0]?.count ?? 0)
 * ```
 */
export function jsonList<T>(
  c: Context,
  data: T[],
  pagination: Pagination,
  total: number,
  status: ContentfulStatusCode = 200,
) {
  return c.json(
    { data, pagination: { ...pagination, total } } satisfies ListResponse<T>,
    status,
  );
}

/**
 * Return a single-resource response.
 *
 * @param c      - Hono context
 * @param data   - The resource to return
 * @param status - HTTP status code (defaults to 200)
 *
 * @example
 * ```ts
 * const user = await db.select().from(users).where(eq(users.id, id))
 * return jsonData(c, user)
 * ```
 */
export function jsonData<T>(
  c: Context,
  data: T,
  status: ContentfulStatusCode = 200,
) {
  return c.json({ data } satisfies DataResponse<T>, status);
}

/**
 * Return a success response (typically for mutations like DELETE).
 *
 * @param c - Hono context
 *
 * @example
 * ```ts
 * await db.delete(items).where(eq(items.id, id))
 * return jsonOk(c)
 * ```
 */
export function jsonOk(c: Context) {
  return c.json({ success: true } satisfies OkResponse);
}
