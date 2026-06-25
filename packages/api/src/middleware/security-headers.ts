/**
 * Security headers middleware — equivalent to Helmet for Express.
 *
 * Thin wrapper over Hono's built-in {@link secureHeaders} configured to emit
 * exactly the header set this API needs (clickjacking, MIME sniffing, CSP,
 * etc.). Hono defaults that this API does not want (COOP/CORP, DNS-prefetch,
 * download-options, origin-agent-cluster) are explicitly disabled so the
 * response header set stays unchanged.
 *
 * @see https://owasp.org/www-project-secure-headers/
 * @see https://hono.dev/docs/middleware/builtin/secure-headers
 */
import type { MiddlewareHandler } from 'hono';
import { secureHeaders } from 'hono/secure-headers';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Create a security headers middleware for Hono.
 *
 * Applied headers:
 * - `X-Content-Type-Options: nosniff` — prevent MIME-type sniffing
 * - `X-Frame-Options: DENY` — prevent clickjacking via iframes
 * - `X-XSS-Protection: 0` — disable legacy XSS auditor (can cause issues)
 * - `Referrer-Policy: strict-origin-when-cross-origin` — limit referrer leakage
 * - `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` — restrictive default for a JSON API
 * - `Permissions-Policy` — restrict browser feature access
 * - `X-Permitted-Cross-Domain-Policies: none` — prevent Adobe cross-domain access
 * - `Strict-Transport-Security` — enforce HTTPS (production only)
 *
 * @returns Hono middleware handler
 */
export function securityHeaders(): MiddlewareHandler {
  return secureHeaders({
    xContentTypeOptions: 'nosniff',
    xFrameOptions: 'DENY',
    xXssProtection: '0',
    referrerPolicy: 'strict-origin-when-cross-origin',
    contentSecurityPolicy: {
      defaultSrc: ['\'none\''],
      frameAncestors: ['\'none\''],
    },
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: ['self'],
      payment: [],
    },
    xPermittedCrossDomainPolicies: 'none',
    // Enforce HTTPS in production with a 1-year max-age; omit in dev.
    strictTransportSecurity: isProduction
      ? 'max-age=31536000; includeSubDomains; preload'
      : false,
    // Disable Hono defaults this API never set, to keep the header set stable.
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
    xDnsPrefetchControl: false,
    xDownloadOptions: false,
  });
}
