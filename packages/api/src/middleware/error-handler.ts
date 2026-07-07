/**
 * Global error handler middleware.
 *
 * Handles known error types (ApiError, ZodError, HTTPException)
 * and returns consistent JSON error responses across all routes.
 * In production, internal error details are hidden from the client.
 */
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { createLogger } from '../lib/logger.js';

const log = createLogger('error-handler');

// NODE_ENV 在模块加载期解析一次：是否隐藏错误详情是启动期决定，非密钥，
// 不会随请求变化，故保留 process.env 读取（与 lib/logger.ts 同处理）。
const isProduction = process.env.NODE_ENV === 'production';

// ---------------------------------------------------------------------------
// ApiError — structured application error
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a consistent error response body. */
function errorBody(message: string, details?: unknown) {
  return {
    error: message,
    ...(details !== undefined ? { details } : {}),
  };
}

/**
 * Ensure a status code is a valid `ContentfulStatusCode` (100–599).
 * Falls back to 500 for out-of-range values.
 */
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
 * Format Zod validation issues into a human-readable array of strings.
 * In production, only the field path and error code are exposed.
 */
function formatZodIssues(err: ZodError): string[] {
  return err.issues.map((issue) => {
    const path = issue.path.join('.');
    if (isProduction) {
      return path ? `${path}: invalid` : 'validation error';
    }
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------

/**
 * Hono error handler — attach via `app.onError(errorHandler)`.
 *
 * Recognises three error families:
 * - `ApiError`       — application-level errors with explicit status codes
 * - `ZodError`       — request validation failures (→ 422)
 * - `HTTPException`  — errors thrown by Hono internals or middleware
 *
 * Everything else is treated as a 500 Internal Server Error.
 */
export function errorHandler(err: Error, c: Context) {
  // ── ApiError ─────────────────────────────────────────────
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

  // ── ZodError (validation failure) ────────────────────────
  if (err instanceof ZodError) {
    const issues = formatZodIssues(err);
    log.warn({ issues }, 'Validation error');
    return c.json(errorBody('Validation error', issues), 422);
  }

  // ── Hono HTTPException ───────────────────────────────────
  if (err instanceof HTTPException) {
    const statusCode = normalizeStatusCode(err.status);

    if (statusCode >= 500) {
      log.error({ err, statusCode }, err.message);
    }
    else {
      log.warn({ statusCode }, err.message);
    }

    return c.json(
      errorBody(err.message || 'Request error'),
      statusCode,
    );
  }

  // ── Unexpected / unknown errors ──────────────────────────
  log.error({ err }, 'Unhandled error');
  return c.json(
    errorBody(isProduction ? 'Internal server error' : (err.message || 'Internal server error')),
    500,
  );
}
