/**
 * Global error handler middleware.
 * Returns consistent JSON error responses across all routes.
 */
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { createLogger } from '@pathfinding/logger';

const log = createLogger('error-handler');

/** Structured API error with HTTP status code. */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Create a consistent error response body. */
function errorBody(message: string, details?: unknown) {
  return {
    error: message,
    ...(details !== undefined ? { details } : {}),
  };
}

function normalizeStatusCode(statusCode: number): ContentfulStatusCode {
  if (
    Number.isInteger(statusCode)
    && statusCode >= 100
    && statusCode <= 599
  ) {
    return statusCode as ContentfulStatusCode;
  }

  return 500;
}

/**
 * Hono error handler — attach via `app.onError(errorHandler)`.
 */
export function errorHandler(err: Error, c: Context) {
  if (err instanceof ApiError) {
    const statusCode = normalizeStatusCode(err.statusCode);

    if (statusCode >= 500) {
      log.error({ err, statusCode }, err.message);
    }
    else {
      log.warn({ statusCode }, err.message);
    }

    return c.json(errorBody(err.message, err.details), statusCode);
  }

  // Unexpected errors
  log.error({ err }, 'Unhandled error');
  return c.json(errorBody('Internal server error'), 500);
}
