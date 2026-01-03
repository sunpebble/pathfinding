import type { Context, Next } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { createMiddleware } from 'hono/factory';

/**
 * JWT authentication middleware using Supabase Auth
 * Validates the Authorization header and extracts user info
 */
export const authMiddleware = createMiddleware(
  async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing Supabase environment variables');
        return c.json({ error: 'Server configuration error' }, 500);
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        return c.json({ error: 'Invalid or expired token' }, 401);
      }

      // Set user info in context for downstream handlers
      c.set('userId', user.id);
      c.set('userEmail', user.email || '');
      c.set('accessToken', token);

      await next();
    } catch (err) {
      console.error('Auth middleware error:', err);
      return c.json({ error: 'Authentication failed' }, 401);
    }
  }
);
