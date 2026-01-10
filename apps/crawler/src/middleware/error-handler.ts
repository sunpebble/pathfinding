/**
 * Global Error Handler Middleware
 * Catches and formats errors for consistent API responses
 */

import type { Context, MiddlewareHandler, Next } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import * as Sentry from '@sentry/node';
import { HTTPException } from 'hono/http-exception';

// Initialize Sentry if DSN is provided
const SENTRY_DSN = process.env.SENTRY_DSN;
if (SENTRY_DSN && SENTRY_DSN !== 'your-sentry-dsn-here') {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment:
      process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  });
}

export interface ApiError {
  error: string;
  message: string;
  code?: string;
  details?: unknown;
  stack?: string;
}

/**
 * Create a standardized error response
 */
function createErrorResponse(
  status: number,
  error: string,
  message: string,
  code?: string,
  details?: unknown,
  includeStack?: string
): ApiError {
  const response: ApiError = {
    error,
    message,
  };

  if (code) {
    response.code = code;
  }

  if (details) {
    response.details = details;
  }

  // Only include stack trace in development
  if (includeStack && process.env.NODE_ENV === 'development') {
    response.stack = includeStack;
  }

  return response;
}

/**
 * Error handler middleware factory
 */
export function errorHandler(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (err) {
      // Log error
      console.error('[Error]', err);

      // Report to Sentry
      if (SENTRY_DSN && SENTRY_DSN !== 'your-sentry-dsn-here') {
        Sentry.captureException(err, {
          extra: {
            method: c.req.method,
            path: c.req.path,
            query: c.req.query(),
          },
        });
      }

      // Handle HTTP exceptions
      if (err instanceof HTTPException) {
        const httpErr = err as HTTPException;
        const response = createErrorResponse(
          httpErr.status,
          httpErr.message,
          httpErr.message,
          `HTTP_${httpErr.status}`,
          undefined,
          httpErr.stack
        );
        return c.json(response, httpErr.status);
      }

      // Handle validation errors (Zod)
      if (err instanceof Error && err.name === 'ZodError') {
        const zodError = err as Error & { errors?: unknown[] };
        const response = createErrorResponse(
          400,
          'Validation Error',
          'Request validation failed',
          'VALIDATION_ERROR',
          zodError.errors,
          err.stack
        );
        return c.json(response, 400);
      }

      // Handle database errors
      if (err instanceof Error && 'code' in err) {
        const dbError = err as Error & { code: string; details?: string };

        // PostgreSQL error codes
        if (dbError.code === '23505') {
          const response = createErrorResponse(
            409,
            'Conflict',
            'Resource already exists',
            'DUPLICATE_KEY',
            dbError.details,
            err.stack
          );
          return c.json(response, 409);
        }

        if (dbError.code === '23503') {
          const response = createErrorResponse(
            400,
            'Bad Request',
            'Referenced resource not found',
            'FOREIGN_KEY_VIOLATION',
            dbError.details,
            err.stack
          );
          return c.json(response, 400);
        }
      }

      // Handle generic errors
      if (err instanceof Error) {
        const response = createErrorResponse(
          500,
          'Internal Server Error',
          process.env.NODE_ENV === 'development'
            ? err.message
            : 'An unexpected error occurred',
          'INTERNAL_ERROR',
          undefined,
          err.stack
        );
        return c.json(response, 500);
      }

      // Unknown error type
      const response = createErrorResponse(
        500,
        'Internal Server Error',
        'An unexpected error occurred',
        'UNKNOWN_ERROR'
      );
      return c.json(response, 500);
    }
  };
}

/**
 * Create an HTTP exception with a custom message
 */
export function createHttpError(
  status: ContentfulStatusCode,
  message: string
): HTTPException {
  return new HTTPException(status, { message });
}

/**
 * Common error factories
 */
export const Errors = {
  notFound: (resource: string) => createHttpError(404, `${resource} not found`),

  badRequest: (message: string) => createHttpError(400, message),

  unauthorized: (message: string = 'Unauthorized') =>
    createHttpError(401, message),

  forbidden: (message: string = 'Forbidden') => createHttpError(403, message),

  conflict: (message: string) => createHttpError(409, message),

  internal: (message: string = 'Internal server error') =>
    createHttpError(500, message),
};
