/**
 * Security headers middleware — equivalent to Helmet for Express.
 *
 * Sets recommended HTTP security headers on every response to mitigate
 * common web vulnerabilities (clickjacking, MIME sniffing, XSS, etc.).
 *
 * @see https://owasp.org/www-project-secure-headers/
 */
import type { MiddlewareHandler } from 'hono';
import { createMiddleware } from 'hono/factory';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Create a security headers middleware for Hono.
 *
 * Applied headers:
 * - `X-Content-Type-Options: nosniff` — prevent MIME-type sniffing
 * - `X-Frame-Options: DENY` — prevent clickjacking via iframes
 * - `X-XSS-Protection: 0` — disable legacy XSS auditor (can cause issues)
 * - `Referrer-Policy` — limit referrer leakage
 * - `Content-Security-Policy` — default-src 'none' for API responses
 * - `Permissions-Policy` — restrict browser feature access
 * - `Strict-Transport-Security` — enforce HTTPS (production only)
 * - `X-Permitted-Cross-Domain-Policies: none` — prevent Adobe cross-domain access
 *
 * @returns Hono middleware handler
 */
export function securityHeaders(): MiddlewareHandler {
  return createMiddleware(async (c, next) => {
    await next();

    // Prevent MIME type sniffing
    c.header('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking via iframes
    c.header('X-Frame-Options', 'DENY');

    // Disable the legacy XSS auditor — modern browsers no longer need it,
    // and enabling it can introduce XSS via filter-bypass attacks.
    // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
    c.header('X-XSS-Protection', '0');

    // Limit referrer information sent to other origins
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy — restrictive default for a JSON API
    c.header('Content-Security-Policy', 'default-src \'none\'; frame-ancestors \'none\'');

    // Restrict browser features
    c.header(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(self), payment=()',
    );

    // Prevent Adobe Flash / Acrobat cross-domain data loading
    c.header('X-Permitted-Cross-Domain-Policies', 'none');

    // Enforce HTTPS in production with a 1-year max-age
    if (isProduction) {
      c.header(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
    }
  });
}
