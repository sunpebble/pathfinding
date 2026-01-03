import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { tracingMiddleware } from './middleware/tracing.js';
import {
  itinerariesRoutes,
  publicItinerariesRoutes,
} from './routes/itineraries.js';
import { itineraryItemsRoutes } from './routes/itinerary-items.js';
import { poisRoutes } from './routes/pois.js';
import { remindersRoutes } from './routes/reminders.js';
import 'dotenv/config';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:8081', // Expo web
      'http://localhost:19006', // Expo web alternative
      'exp://localhost:8081', // Expo Go
    ],
    credentials: true,
  })
);
app.use('*', tracingMiddleware);
app.use('*', errorHandler);

// Health check (no auth required)
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public API v1 routes (no auth required)
const publicApi = new Hono();
publicApi.route('/itineraries', publicItinerariesRoutes);

// Protected API v1 routes (auth required)
const protectedApi = new Hono();
protectedApi.use('*', authMiddleware);
protectedApi.route('/itineraries', itinerariesRoutes);
protectedApi.route('/itineraries', itineraryItemsRoutes); // Nested items routes
protectedApi.route('/pois', poisRoutes);
protectedApi.route('/', remindersRoutes);

// Mount both API groups under /v1
// Public routes first so they take precedence for matching paths
app.route('/v1', publicApi);
app.route('/v1', protectedApi);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// Start server
const port = Number.parseInt(process.env.PORT || '8000');
// eslint-disable-next-line no-console -- Server startup log is intentional
console.log(`🚀 API server running at http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
