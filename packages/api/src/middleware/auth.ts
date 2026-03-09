import { createLogger } from '@pathfinding/logger';
/**
 * JWT-based authentication middleware.
 *
 * Supports two modes:
 *   - `authRequired()` — request MUST have a valid Bearer token
 *   - `authOptional()` — token is decoded if present, but request proceeds either way
 *
 * On success, sets `c.set('userId', ...)` for downstream handlers.
 *
 * Token verification is delegated to the centralised auth service;
 * this module only handles HTTP-level concerns (header extraction, error mapping).
 */
import { createMiddleware } from 'hono/factory';
import { verifyToken } from '../services/auth.service.js';
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
            c.set('userId', userId);
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
