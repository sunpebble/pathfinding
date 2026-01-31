import { serve } from '@hono/node-server';

/**
 * AI Service Entry Point
 * Lightweight service for AI/LLM and external API integrations
 *
 * This service handles:
 * - AI/LLM processing (Ollama)
 * - Weather data (OpenWeatherMap)
 * - Currency exchange (External APIs)
 * - Transportation routing (高德地图)
 * - Translation AI (Ollama)
 * - Guide enrichment (Ollama + Nominatim)
 * - PDF export (PDFKit)
 * - Flight information (Flight APIs)
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { logger as honoLogger } from 'hono/logger';
import { checkConnection } from './lib/convex.js';
import { logger as appLogger } from './lib/logger.js';
import { agentRouter } from './routes/agent.js';
import { aiRouter } from './routes/ai.js';

import { crawlerRouter } from './routes/crawler.js';
import { translationsRouter } from './routes/translations.js';
import { transportRouter } from './routes/transport.js';

import { weatherRouter } from './routes/weather.js';
// Load environment variables FIRST, before any other imports
import 'dotenv/config';

const app = new Hono();

// Global middleware
app.use('*', honoLogger());
app.use('*', cors());

// Health check
app.get('/health', async (c) => {
  let dbConnected = false;
  try {
    dbConnected = await Promise.race([
      checkConnection(),
      new Promise<boolean>(resolve => setTimeout(() => resolve(false), 2000)),
    ]);
  }
  catch {
    dbConnected = false;
  }

  return c.json(
    {
      status: dbConnected ? 'healthy' : 'unhealthy',
      service: 'ai-service',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbConnected ? 'connected' : 'disconnected',
        ollama: process.env.OLLAMA_BASE_URL ? 'configured' : 'not configured',
      },
    },
    dbConnected ? 200 : 503,
  );
});

// API info
app.get('/', (c) => {
  return c.json({
    name: 'Pathfinding AI Service',
    version: '1.0.0',
    description: 'AI and external API integrations for Pathfinding',
    endpoints: {
      ai: '/api/ai',
      agent: '/api/agent',
      crawler: '/api/crawler',
      weather: '/api/weather',
      translations: '/api/translations',
      transport: '/api/transport',
    },
  });
});

// Mount API routers
app.route('/api/ai', aiRouter);
app.route('/api/agent', agentRouter);
app.route('/api/crawler', crawlerRouter);
app.route('/api/weather', weatherRouter);
app.route('/api/translations', translationsRouter);
app.route('/api/transport', transportRouter);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404,
  );
});

// Start server
const port = Number.parseInt(process.env.PORT || '3001', 10);

appLogger.info({ port }, '🤖 Starting AI Service');

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    appLogger.info({ port: info.port, url: `http://localhost:${info.port}` }, '✅ AI Service running');
  },
);

export default app;
