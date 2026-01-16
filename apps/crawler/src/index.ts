/**
 * Crawler API Server Entry Point
 * Hono-based HTTP server for the data crawler service
 */

import type { Context } from 'hono';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { initScheduler } from './jobs/scheduler.js';

import { checkConnection } from './lib/convex.js';
import { errorHandler } from './middleware/error-handler.js';
import { initTracing } from './middleware/tracing.js';
import { initSentry } from './monitoring/index.js';
import { aiItineraryRouter } from './routes/ai-itinerary.js';
import { aiRouter } from './routes/ai.js';
import { astronomyRouter } from './routes/astronomy.js';
import { chatRouter } from './routes/chat.js';
import { crawlJobsRouter } from './routes/crawl-jobs.js';
import { dashboardRouter } from './routes/dashboard.js';
import { flightsRouter } from './routes/flights.js';
import { guideEnrichmentRouter } from './routes/guide-enrichment.js';
import { guidesRouter } from './routes/guides.js';
import { pdfExportRouter } from './routes/pdf-export.js';
import { poisRouter } from './routes/pois.js';
import { qualityReportsRouter } from './routes/quality-reports.js';
import { routeOptimizationRouter } from './routes/route-optimization.js';
import { trainingDatasetsRouter } from './routes/training-datasets.js';
import { translationsRouter } from './routes/translations.js';
import { transportRouter } from './routes/transport.js';
import { weatherRouter } from './routes/weather.js';
import 'dotenv/config';

// Initialize OpenTelemetry tracing
initTracing();

// Initialize Sentry for error tracking
initSentry();

// Create Hono app
const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors());
app.use('*', secureHeaders());
app.use('*', errorHandler());

// Simple ping endpoint - no dependencies
app.get('/ping', (c: Context) => {
  return c.text('pong');
});

// Health check endpoint - responds immediately, checks db in background
const healthCheck = async (c: Context) => {
  // Use a short timeout to not block the response
  let dbConnected = false;
  try {
    const timeoutPromise = new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), 2000)
    );
    const checkPromise = checkConnection();
    dbConnected = await Promise.race([checkPromise, timeoutPromise]);
  } catch {
    dbConnected = false;
  }

  const status = dbConnected ? 'healthy' : 'unhealthy';
  const statusCode = dbConnected ? 200 : 503;

  return c.json(
    {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: dbConnected ? 'connected' : 'disconnected',
      },
    },
    statusCode
  );
};

// Register health check on both /health and /api/health
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// API info endpoint
app.get('/', (c: Context) => {
  return c.json({
    name: 'Pathfinding Crawler API',
    version: '1.0.0',
    description:
      'Data crawler service for travel POI collection and training dataset generation',
    endpoints: {
      dashboard: '/dashboard',
      health: '/health',
      crawlJobs: '/api/crawl-jobs',
      pois: '/api/pois',
      guides: '/api/guides',
      trainingDatasets: '/api/training-datasets',
      qualityReports: '/api/quality-reports',
      ai: '/api/ai',
      chat: '/api/chat',
      aiItinerary: '/api/ai-itinerary',
      optimize: '/api/optimize',
      astronomy: '/api/astronomy',
      pdf: '/api/pdf',
      weather: '/api/weather',
      flights: '/api/flights',
      translations: '/api/translations',
    },
  });
});

// Mount dashboard
app.route('/dashboard', dashboardRouter);

// Mount API routers
app.route('/api/crawl-jobs', crawlJobsRouter);
app.route('/api/pois', poisRouter);
app.route('/api/guides', guidesRouter);
app.route('/api/guides', guideEnrichmentRouter);
app.route('/api/training-datasets', trainingDatasetsRouter);
app.route('/api/quality-reports', qualityReportsRouter);
app.route('/api/ai', aiRouter);
app.route('/api/chat', chatRouter);
app.route('/api/ai-itinerary', aiItineraryRouter);
app.route('/api/astronomy', astronomyRouter);
app.route('/api/optimize', routeOptimizationRouter);
app.route('/api/transport', transportRouter);
app.route('/api/pdf', pdfExportRouter);
app.route('/api/weather', weatherRouter);
app.route('/api/flights', flightsRouter);
app.route('/api/translations', translationsRouter);

// 404 handler
app.notFound((c: Context) => {
  return c.json(
    {
      error: 'Not Found',
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404
  );
});

// Start server
const port = Number.parseInt(process.env.PORT || '3001', 10);

console.warn(`🚀 Starting Crawler API server on port ${port}...`);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info: { port: number }) => {
    console.warn(
      `✅ Crawler API server running at http://localhost:${info.port}`
    );

    // Initialize scheduler after server starts
    if (process.env.ENABLE_SCHEDULER !== 'false') {
      initScheduler();
    }
  }
);

export default app;
