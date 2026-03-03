import { createLogger } from '@pathfinding/logger';
/**
 * Main Hono application — mounts middleware and route modules.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { errorHandler } from './middleware/error-handler.js';

import authRoutes from './routes/auth.js';
import budgetsRoutes from './routes/budgets.js';
import chatRoutes from './routes/chat.js';
import collectionsRoutes from './routes/collections.js';
import commentsRoutes from './routes/comments.js';
import crawlJobsRoutes from './routes/crawl-jobs.js';
import currencyRoutes from './routes/currency.js';
import expensesRoutes from './routes/expenses.js';
import favoritesRoutes from './routes/favorites.js';
import guidesRoutes from './routes/guides.js';
// Route modules
import healthRoutes from './routes/health.js';
import itinerariesRoutes from './routes/itineraries.js';
import likesRoutes from './routes/likes.js';
import notificationsRoutes from './routes/notifications.js';
import poisRoutes from './routes/pois.js';
import qaRoutes from './routes/qa.js';
import qualityReportsRoutes from './routes/quality-reports.js';
import sharingRoutes from './routes/sharing.js';
import trainingDatasetsRoutes from './routes/training-datasets.js';
import translationsRoutes from './routes/translations.js';
import travelNotesRoutes from './routes/travel-notes.js';
import usersRoutes from './routes/users.js';

const log = createLogger('api');

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function createApp() {
  const app = new Hono();
  const isProduction = process.env.NODE_ENV === 'production';
  const corsOrigin = process.env.CORS_ORIGIN ?? (isProduction ? '' : '*');

  if (isProduction && !process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN must be set in production');
  }

  // ── Global middleware ──────────────────────────────────

  // CORS — allow all origins in dev, restrict in production
  app.use(
    '*',
    cors({
      origin: corsOrigin,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      exposeHeaders: ['X-Request-Id'],
      maxAge: 86400,
    }),
  );

  // Request logging (uses Hono built-in, writes to stdout)
  app.use('*', honoLogger(msg => log.info(msg)));

  // Global error handler
  app.onError(errorHandler);

  // ── Routes ─────────────────────────────────────────────

  app.route('/health', healthRoutes);
  app.route('/api/auth', authRoutes);
  app.route('/api/guides', guidesRoutes);
  app.route('/api/pois', poisRoutes);
  app.route('/api/itineraries', itinerariesRoutes);
  app.route('/api/chat', chatRoutes);
  app.route('/api/users', usersRoutes);
  app.route('/api/notifications', notificationsRoutes);
  app.route('/api/comments', commentsRoutes);
  app.route('/api/collections', collectionsRoutes);
  app.route('/api/favorites', favoritesRoutes);
  app.route('/api/likes', likesRoutes);
  app.route('/api/travel-notes', travelNotesRoutes);
  app.route('/api/budgets', budgetsRoutes);
  app.route('/api/expenses', expensesRoutes);
  app.route('/api/qa', qaRoutes);
  app.route('/api/sharing', sharingRoutes);
  app.route('/api/translations', translationsRoutes);
  app.route('/api/crawl-jobs', crawlJobsRoutes);
  app.route('/api/quality-reports', qualityReportsRoutes);
  app.route('/api/training-datasets', trainingDatasetsRoutes);
  app.route('/api/currency', currencyRoutes);

  // ── Catch-all 404 ──────────────────────────────────────
  app.notFound((c) => {
    return c.json({ error: 'Not found' }, 404);
  });

  return app;
}

export type AppType = ReturnType<typeof createApp>;
