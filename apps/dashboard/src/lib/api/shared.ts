/**
 * Shared internal utilities for API modules.
 *
 * These helpers are used by both client-side and server-side API modules.
 * Do NOT export from the public `index.ts` — they are implementation details.
 *
 * @module
 */

/**
 * Normalize any `HeadersInit` variant into a plain `Record<string, string>`.
 *
 * Handles `Headers` instances, `[string, string][]` tuples, and plain objects.
 */
export function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    const normalized: Record<string, string> = {};
    headers.forEach((value, key) => {
      normalized[key] = value;
    });
    return normalized;
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return { ...headers };
}

/**
 * Extract a human-readable error message from a parsed error response body.
 *
 * Checks `message` then `error` fields on objects; falls back to
 * `"HTTP error <status>"`.
 */
export function parseErrorMessage(error: unknown, status: number): string {
  if (error && typeof error === 'object') {
    const message = 'message' in error ? error.message : undefined;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }

    const fallback = 'error' in error ? error.error : undefined;
    if (typeof fallback === 'string' && fallback.length > 0) {
      return fallback;
    }
  }

  return `HTTP error ${status}`;
}

/**
 * Safely parse a JSON response body, returning `undefined` for empty bodies.
 */
export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
