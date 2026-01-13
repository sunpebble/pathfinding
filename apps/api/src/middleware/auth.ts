import type { Context, Next } from 'hono';
import { ConvexHttpClient } from 'convex/browser';
import { createMiddleware } from 'hono/factory';
import { api } from '../lib/convex';

/**
 * JWT Authentication Middleware
 *
 * Validates JWT tokens with Convex Auth by creating an authenticated
 * client and querying the current user identity.
 */
export const authMiddleware = createMiddleware(
  async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    try {
      // Create an authenticated Convex client for this request
      const convexUrl = process.env.CONVEX_URL;
      if (!convexUrl) {
        throw new Error('CONVEX_URL environment variable not set');
      }

      const authenticatedClient = new ConvexHttpClient(convexUrl);
      authenticatedClient.setAuth(token);

      // Validate token by querying current user from Convex Auth
      const user = await authenticatedClient.query(
        api.users.getCurrentUser,
        {}
      );

      if (!user) {
        return c.json({ error: 'Invalid or expired token' }, 401);
      }

      // Extract user info from validated token
      const userId = user.id;
      const userEmail = user.email || '';

      if (!userId) {
        return c.json({ error: 'Invalid token: no user ID found' }, 401);
      }

      // Set user info in context for downstream handlers
      c.set('userId', userId);
      c.set('userEmail', userEmail);
      c.set('accessToken', token);

      await next();
    } catch {
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
        // Create an authenticated Convex client for this request
        const convexUrl = process.env.CONVEX_URL;
        if (convexUrl) {
          const authenticatedClient = new ConvexHttpClient(convexUrl);
          authenticatedClient.setAuth(token);

          // Attempt to validate token and get user info
          const user = await authenticatedClient.query(
            api.users.getCurrentUser,
            {}
          );

          if (user && user.id) {
            c.set('userId', user.id);
            c.set('userEmail', user.email || '');
            c.set('accessToken', token);
          }
        }
      } catch {
        // Ignore auth errors for optional auth
      }
    }

    await next();
  }
);
