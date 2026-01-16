/**
 * Unified API Response Utilities
 * Provides consistent response format across all API endpoints
 */

import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

/**
 * Error details for error responses
 */
export interface ApiErrorDetails {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Unified API response interface for success responses
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    [key: string]: unknown;
  };
}

/**
 * Unified API response interface for error responses
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetails;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a success response with data
 */
export function successResponse<T>(
  c: Context,
  data: T,
  status: ContentfulStatusCode = 200
): Response {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };
  return c.json(response, status);
}

/**
 * Create a success response with data and pagination
 */
export function successWithPagination<T>(
  c: Context,
  data: T,
  pagination: PaginationMeta,
  status: ContentfulStatusCode = 200
): Response {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: { pagination },
  };
  return c.json(response, status);
}

/**
 * Create a success response with data and custom metadata
 */
export function successWithMeta<T>(
  c: Context,
  data: T,
  meta: Record<string, unknown>,
  status: ContentfulStatusCode = 200
): Response {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta,
  };
  return c.json(response, status);
}

/**
 * Create an error response
 */
export function errorResponse(
  c: Context,
  code: string,
  message: string,
  status: ContentfulStatusCode = 400,
  details?: unknown
): Response {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };
  if (details !== undefined) {
    response.error.details = details;
  }
  return c.json(response, status);
}

/**
 * Common error response helpers
 */
export const ApiErrors = {
  notFound: (c: Context, resource: string): Response =>
    errorResponse(c, 'NOT_FOUND', `${resource} not found`, 404),

  badRequest: (c: Context, message: string, details?: unknown): Response =>
    errorResponse(c, 'BAD_REQUEST', message, 400, details),

  unauthorized: (c: Context, message = 'Unauthorized'): Response =>
    errorResponse(c, 'UNAUTHORIZED', message, 401),

  forbidden: (c: Context, message = 'Forbidden'): Response =>
    errorResponse(c, 'FORBIDDEN', message, 403),

  conflict: (c: Context, message: string): Response =>
    errorResponse(c, 'CONFLICT', message, 409),

  internal: (c: Context, message = 'Internal server error'): Response =>
    errorResponse(c, 'INTERNAL_ERROR', message, 500),

  serviceUnavailable: (c: Context, service: string): Response =>
    errorResponse(
      c,
      'SERVICE_UNAVAILABLE',
      `${service} service unavailable`,
      503
    ),

  validationError: (c: Context, message: string, details?: unknown): Response =>
    errorResponse(c, 'VALIDATION_ERROR', message, 400, details),
};

/**
 * Message-only success response (for operations without data)
 */
export function messageResponse(
  c: Context,
  message: string,
  status: ContentfulStatusCode = 200
): Response {
  const response: ApiSuccessResponse<{ message: string }> = {
    success: true,
    data: { message },
  };
  return c.json(response, status);
}
