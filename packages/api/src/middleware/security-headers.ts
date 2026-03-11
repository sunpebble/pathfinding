import { createMiddleware } from 'hono/factory';

/**
 * Security headers middleware — equivalent to Helmet for Express.
 * Sets recommended HTTP security headers.
 */
export function securityHeaders() {
  return createMiddleware(async (c, next) => {
    await next();

    // Prevent MIME type sniffing
    c.header('X-Content-Type-Options', 'nosniff');
    // Prevent clickjacking
    c.header('X-Frame-Options', 'DENY');
    // XSS protection (legacy browsers)
    c.header('X-XSS-Protection', '1; mode=block');
    // Referrer policy
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Permissions policy
    c.header(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(self), payment=()',
    );
    // Strict Transport Security (HTTPS)
    if (process.env.NODE_ENV === 'production') {
      c.header(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }
  });
}
