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

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { checkConnection } from './lib/convex.js';

import { agentRouter } from './routes/agent.js';
// Import routes (to be migrated from crawler)
import { aiRouter } from './routes/ai.js';

import { translationsRouter } from './routes/translations.js';
import { weatherRouter } from './routes/weather.js';
import 'dotenv/config';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/health', async (c) => {
  let dbConnected = false;
  try {
    dbConnected = await Promise.race([
      checkConnection(),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2000)),
    ]);
  } catch {
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
    dbConnected ? 200 : 503
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
      weather: '/api/weather',
      translations: '/api/translations',
    },
  });
});

// Mount API routers
app.route('/api/ai', aiRouter);
app.route('/api/agent', agentRouter);
app.route('/api/weather', weatherRouter);
app.route('/api/translations', translationsRouter);

// 404 handler
app.notFound((c) => {
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

console.log(`🤖 Starting AI Service on port ${port}...`);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`✅ AI Service running at http://localhost:${info.port}`);
  }
);

export default app;
