import type { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { ZodError } from 'zod';

/**
 * Global error handling middleware
 * Catches and formats errors consistently
 */
export const errorHandler = createMiddleware(async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    console.error('Unhandled error:', error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return c.json(
        {
          error: 'Validation error',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        400
      );
    }

    // Handle known error types
    if (error instanceof Error) {
      const statusCode = getStatusCode(error);
      return c.json(
        {
          error: error.message || 'Internal server error',
          ...(Deno.env.get('NODE_ENV') === 'development' && {
            stack: error.stack,
          }),
        },
        statusCode
      );
    }

    // Unknown error
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Map error types to HTTP status codes
 */
function getStatusCode(error: Error): number {
  const errorName = error.name || error.constructor.name;

  switch (errorName) {
    case 'NotFoundError':
      return 404;
    case 'UnauthorizedError':
      return 401;
    case 'ForbiddenError':
      return 403;
    case 'ConflictError':
      return 409;
    case 'ValidationError':
      return 400;
    default:
      return 500;
  }
}

// Custom error classes for consistent error handling
export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends Error {
  constructor(message = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
  }
}
