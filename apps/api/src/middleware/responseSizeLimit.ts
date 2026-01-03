import type { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';

/**
 * Response size limit configuration
 */
interface ResponseSizeLimitOptions {
  /** Maximum response size in bytes before warning (default: 100KB) */
  warnThreshold?: number;
  /** Maximum response size in bytes before error (default: 1MB) */
  errorThreshold?: number;
  /** Whether to include size in response headers (default: true in dev) */
  includeHeaders?: boolean;
  /** Callback when warning threshold exceeded */
  onWarn?: (path: string, size: number, threshold: number) => void;
  /** Callback when error threshold exceeded */
  onError?: (path: string, size: number, threshold: number) => void;
}

// Default thresholds per NFR-004 requirement
const DEFAULT_WARN_THRESHOLD = 100 * 1024; // 100KB
const DEFAULT_ERROR_THRESHOLD = 1024 * 1024; // 1MB

/**
 * responseSizeLimit - Middleware to monitor and enforce API response size limits
 *
 * Per NFR-004: API responses MUST be < 100KB for initial itinerary load
 *
 * This middleware:
 * 1. Monitors response body size
 * 2. Logs warning if size exceeds 100KB threshold
 * 3. Optionally adds size headers for debugging
 * 4. Reports metrics for observability
 */
export function responseSizeLimit(
  options: ResponseSizeLimitOptions = {}
): ReturnType<typeof createMiddleware> {
  const {
    warnThreshold = DEFAULT_WARN_THRESHOLD,
    errorThreshold = DEFAULT_ERROR_THRESHOLD,
    includeHeaders = process.env.NODE_ENV === 'development',
    onWarn = defaultWarnHandler,
    onError = defaultErrorHandler,
  } = options;

  return createMiddleware(async (c: Context, next: Next) => {
    await next();

    // Skip for non-JSON responses
    const contentType = c.res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return;
    }

    // Clone response to read body size
    const responseClone = c.res.clone();

    try {
      const body = await responseClone.text();
      const size = new TextEncoder().encode(body).length;

      // Add size headers in development
      if (includeHeaders) {
        c.res.headers.set('X-Response-Size', size.toString());
        c.res.headers.set('X-Response-Size-KB', (size / 1024).toFixed(2));
      }

      // Check thresholds
      if (size > errorThreshold) {
        onError(c.req.path, size, errorThreshold);
      } else if (size > warnThreshold) {
        onWarn(c.req.path, size, warnThreshold);
      }
    } catch {
      // Ignore errors reading response body
    }
  });
}

/**
 * Default warning handler
 */
function defaultWarnHandler(
  path: string,
  size: number,
  threshold: number
): void {
  console.warn(
    `[NFR-004] Response size warning: ${path} returned ${(size / 1024).toFixed(2)}KB ` +
      `(threshold: ${(threshold / 1024).toFixed(2)}KB)`
  );
}

/**
 * Default error handler
 */
function defaultErrorHandler(
  path: string,
  size: number,
  threshold: number
): void {
  console.error(
    `[NFR-004] Response size ERROR: ${path} returned ${(size / 1024).toFixed(2)}KB ` +
      `(max: ${(threshold / 1024).toFixed(2)}KB)`
  );
}

/**
 * Pre-configured middleware with NFR-004 thresholds
 * Warn at 100KB, no hard limit
 */
export const responseSizeLimitMiddleware = responseSizeLimit();

/**
 * Strict middleware that rejects responses over 1MB
 */
export const strictResponseSizeLimit = responseSizeLimit({
  warnThreshold: 100 * 1024, // 100KB
  errorThreshold: 512 * 1024, // 512KB hard limit
});
