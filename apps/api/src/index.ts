import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authMiddleware } from './middleware/auth.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { tracingMiddleware } from './middleware/tracing.ts';
import { itinerariesRoutes } from './routes/itineraries.ts';
import { poisRoutes } from './routes/pois.ts';

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

// API v1 routes
const api = new Hono();
api.use('*', authMiddleware);

// Mount route modules
api.route('/itineraries', itinerariesRoutes);
api.route('/pois', poisRoutes);

// Mount itinerary items under itineraries
// Nested routes: /itineraries/:id/days/:dayId/items
app.route('/v1', api);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// Start server
const port = Number.parseInt(Deno.env.get('PORT') || '8000');
// eslint-disable-next-line no-console -- Server startup log is intentional
console.log(`🚀 API server running at http://localhost:${port}`);

Deno.serve({ port }, app.fetch);
