import type { Context, Next } from 'hono';
import { Buffer } from 'node:buffer';
import { createMiddleware } from 'hono/factory';

/**
 * JWT Authentication Middleware
 *
 * This is a placeholder implementation for Convex Auth migration.
 * TODO: Integrate with Convex Auth once fully configured.
 *
 * For now, this validates the Authorization header format
 * and extracts the user ID from the token (simplified).
 */
export const authMiddleware = createMiddleware(
  async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    try {
      // TODO: Replace with Convex Auth token validation
      // For now, we'll use a simplified approach where the token
      // is expected to contain the user ID (for development)

      // In production with Convex Auth:
      // 1. Validate the JWT token with Convex Auth
      // 2. Extract user claims from the validated token
      // 3. Get user info from Convex

      // Simplified: Extract user ID from token (development only)
      // The token format should be: "user_<userId>" or a JWT
      let userId: string;
      let userEmail: string = '';

      if (token.startsWith('user_')) {
        // Development token format: user_<userId>
        userId = token.slice(5);
      } else {
        // Attempt to decode as a simple base64-encoded JSON
        try {
          const payload = JSON.parse(
            Buffer.from(token.split('.')[1] || '', 'base64').toString()
          );
          userId = payload.sub || payload.userId || payload.id;
          userEmail = payload.email || '';
        } catch {
          // If decoding fails, use the token itself as user ID (dev mode)
          userId = token;
        }
      }

      if (!userId) {
        return c.json({ error: 'Invalid token: no user ID found' }, 401);
      }

      // Set user info in context for downstream handlers
      c.set('userId', userId);
      c.set('userEmail', userEmail);
      c.set('accessToken', token);

      await next();
    } catch (err) {
      console.error('Auth middleware error:', err);
      return c.json({ error: 'Authentication failed' }, 401);
    }
  }
);

/**
 * Optional auth middleware - allows unauthenticated requests
 * but extracts user info if available
 */
export const optionalAuthMiddleware = createMiddleware(
  async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);

      try {
        // Same simplified logic as above
        let userId: string | undefined;

        if (token.startsWith('user_')) {
          userId = token.slice(5);
        } else {
          try {
            const payload = JSON.parse(
              Buffer.from(token.split('.')[1] || '', 'base64').toString()
            );
            userId = payload.sub || payload.userId || payload.id;
            c.set('userEmail', payload.email || '');
          } catch {
            userId = token;
          }
        }

        if (userId) {
          c.set('userId', userId);
          c.set('accessToken', token);
        }
      } catch {
        // Ignore auth errors for optional auth
      }
    }

    await next();
  }
);
