import { createLogger } from '@pathfinding/logger';
/**
 * JWT-based authentication middleware.
 *
 * Supports three modes:
 *   - `authRequired()` — request MUST have a valid Bearer token
 *   - `authOptional()` — token is decoded if present, but request proceeds either way
 *   - `adminRequired()` — token MUST be valid AND user must be admin
 *
 * On success, sets `c.set('userId', ...)` for downstream handlers.
 *
 * When the JWT contains a `sid` (session ID) claim, the middleware
 * verifies that the corresponding session is still active in the
 * database. This enables server-side token revocation on logout.
 * Tokens without `sid` (legacy) remain valid but cannot be revoked.
 */
import { createMiddleware } from 'hono/factory';
import { isSessionValid, verifyToken } from '../services/auth.service.js';
import { ApiError } from './error-handler.js';

const log = createLogger('auth');

/** Shape of the variables added to the Hono context by auth middleware. */
export interface AuthVariables {
  userId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Verify that the session referenced by `sid` in the JWT is still valid.
 * If the JWT has no `sid` claim (legacy token) we skip the check so
 * existing tokens aren't immediately invalidated.
 */
async function verifySession(payload: Record<string, unknown>): Promise<void> {
  const sid = payload.sid;
  if (typeof sid === 'string') {
    const valid = await isSessionValid(sid);
    if (!valid) {
      throw new ApiError(401, '会话已失效，请重新登录');
    }
  }
}

// ---------------------------------------------------------------------------
// Middleware factories
// ---------------------------------------------------------------------------

/**
 * Require a valid JWT. Returns 401 if missing / invalid.
 */
export function authRequired() {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const token = extractToken(c.req.header('Authorization'));
    if (!token) {
      throw new ApiError(401, 'Authorization token is required');
    }

    try {
      const payload = await verifyToken(token);
      const userId = payload.sub;
      if (!userId || typeof userId !== 'string') {
        throw new ApiError(401, 'Invalid token: missing subject');
      }

      // Verify session hasn't been revoked
      await verifySession(payload);

      c.set('userId', userId);
    }
    catch (err) {
      if (err instanceof ApiError)
        throw err;

      if (
        err instanceof Error
        && err.message.includes('JWT_SECRET environment variable is required')
      ) {
        log.error({ err }, 'JWT service misconfigured');
        throw new ApiError(500, 'Authentication service misconfigured');
      }

      log.warn({ err }, 'JWT verification failed');
      throw new ApiError(401, 'Invalid or expired token');
    }

    await next();
  });
}

/**
 * Decode JWT if present but do NOT require it.
 * `c.get('userId')` will be the user ID or `undefined`.
 */
export function authOptional() {
  return createMiddleware<{ Variables: Partial<AuthVariables> }>(
    async (c, next) => {
      const token = extractToken(c.req.header('Authorization'));
      if (token) {
        try {
          const payload = await verifyToken(token);
          const userId = payload.sub;
          if (userId && typeof userId === 'string') {
            // Session check — silently skip if invalid
            try {
              await verifySession(payload);
              c.set('userId', userId);
            }
            catch {
              // Session revoked — treat as unauthenticated
            }
          }
        }
        catch {
          // Ignore — proceed unauthenticated
        }
      }
      await next();
    },
  );
}

/**
 * Require a valid JWT AND admin role. Returns 403 if not admin.
 */
export function adminRequired() {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const token = extractToken(c.req.header('Authorization'));
    if (!token) {
      throw new ApiError(401, 'Authorization token is required');
    }

    try {
      const payload = await verifyToken(token);
      const userId = payload.sub;
      if (!userId || typeof userId !== 'string') {
        throw new ApiError(401, 'Invalid token: missing subject');
      }

      // Verify session hasn't been revoked
      await verifySession(payload);

      c.set('userId', userId);

      // Check admin role via JWT claim or environment allowlist
      const isAdminClaim = payload.role === 'admin';
      const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) ?? [];
      const isAdminEmail = typeof payload.email === 'string' && adminEmails.includes(payload.email);

      if (!isAdminClaim && !isAdminEmail) {
        throw new ApiError(403, 'Admin access required');
      }
    }
    catch (err) {
      if (err instanceof ApiError)
        throw err;

      if (
        err instanceof Error
        && err.message.includes('JWT_SECRET environment variable is required')
      ) {
        log.error({ err }, 'JWT service misconfigured');
        throw new ApiError(500, 'Authentication service misconfigured');
      }

      log.warn({ err }, 'JWT verification failed');
      throw new ApiError(401, 'Invalid or expired token');
    }

    await next();
  });
}
