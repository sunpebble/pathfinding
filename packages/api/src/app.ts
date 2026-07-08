import type { Env, Vars } from './env.js';
import { flue } from '@flue/runtime/routing';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
/**
 * Main Hono application — mounts middleware and route modules.
 */
import { createLogger } from './lib/logger.js';
import { dbMiddleware } from './middleware/db.js';
import { errorHandler } from './middleware/error-handler.js';
import { rateLimit } from './middleware/rate-limit.js';
import { securityHeaders } from './middleware/security-headers.js';

// ── Route modules ────────────────────────────────────────────────

import agentRoutes from './routes/agent.js';
// Auth & users
import authRoutes from './routes/auth.js';
import auxiliaryRoutes from './routes/auxiliary.js';

// Travel — notes, budgets, expenses, currency
import budgetsRoutes from './routes/budgets.js';
import chatRoutes from './routes/chat.js';

import currencyRoutes from './routes/currency.js';

import expenseSplittingRoutes from './routes/expense-splitting.js';
import expensesRoutes from './routes/expenses.js';
// Health & system
import healthRoutes from './routes/health.js';

import itinerariesRoutes from './routes/itineraries.js';
import itineraryCollaboratorsRoutes from './routes/itinerary-collaborators.js';
import poisRoutes from './routes/pois.js';

import sharingRoutes from './routes/sharing.js';

// Uploads
import uploadsRoutes from './routes/uploads.js';

import usersRoutes from './routes/users.js';

const log = createLogger('api');

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function createApp() {
  const app = new Hono<{ Bindings: Env; Variables: Vars }>();

  // ── Global middleware ──────────────────────────────────

  // CORS — read origin per-request from c.env.CORS_ORIGIN (Workers injects vars/secrets
  // per-request into env, not at module load). Defaults to '*' in dev when unset.
  app.use(
    '*',
    cors({
      origin: (_origin, c) => c.env.CORS_ORIGIN ?? '*',
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      exposeHeaders: ['X-Request-Id'],
      maxAge: 86400,
    }),
  );

  // Security headers
  app.use('*', securityHeaders());

  // Per-request db injection (D1 binding → Drizzle instance)
  app.use('*', dbMiddleware);

  // Rate limiting for auth routes (stricter, DB-backed)
  app.use('/api/auth/*', rateLimit({ max: 20, windowSec: 60 }));

  // Global rate limiting for all API routes (in-memory for performance)
  app.use('/api/*', rateLimit({ max: 100, windowSec: 60, memoryOnly: true }));

  // Request logging (uses Hono built-in, writes to stdout)
  app.use('*', honoLogger(msg => log.info(msg)));

  // Global error handler
  app.onError(errorHandler);

  // ── Routes ─────────────────────────────────────────────

  // Health & system
  app.route('/health', healthRoutes);

  // AI agent compatibility routes
  app.route('/api/agent', agentRoutes);
  app.route('/api', auxiliaryRoutes);

  // Auth & users
  app.route('/api/auth', authRoutes);
  app.route('/api/users', usersRoutes);

  // Content
  app.route('/api/pois', poisRoutes);
  app.route('/api/itineraries', itinerariesRoutes);
  app.route('/api/itinerary-collaborators', itineraryCollaboratorsRoutes);

  app.route('/api/sharing', sharingRoutes);

  // Travel
  app.route('/api/budgets', budgetsRoutes);
  app.route('/api/expenses', expensesRoutes);
  app.route('/api/expense-splitting', expenseSplittingRoutes);
  app.route('/api/currency', currencyRoutes);

  app.route('/api/chat', chatRoutes);

  // Uploads
  app.route('/api/uploads', uploadsRoutes);

  // Flue native routes: /agents/:name/:id, /workflows/:name, /runs/:runId
  app.route('/', flue());

  // ── Catch-all 404 ──────────────────────────────────────
  app.notFound((c) => {
    return c.json({ error: 'Not found' }, 404);
  });

  return app;
}

export type AppType = ReturnType<typeof createApp>;

export default createApp();
