/**
 * HTTP server entry point — starts the Hono app on @hono/node-server.
 */
import { serve } from '@hono/node-server';
import { createLogger } from '@pathfinding/logger';
import { createApp } from './app.js';

const log = createLogger('server');

const parsedPort = Number.parseInt(process.env.PORT ?? '3000', 10);
const port
  = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535
    ? parsedPort
    : 3000;

// ── Process-level error handlers ─────────────────────────
process.on('unhandledRejection', (reason) => {
  log.error({ err: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  log.error({ err }, 'Uncaught exception — shutting down');
  process.exit(1);
});

// ── Start server ─────────────────────────────────────────
try {
  const app = createApp();

  const server = serve({ fetch: app.fetch, port }, (info) => {
    log.info(`API server listening on http://localhost:${info.port}`);
  });

  // ── Graceful shutdown ────────────────────────────────────
  function shutdown(signal: string) {
    log.info(`Received ${signal} — shutting down gracefully`);
    server.close(() => {
      log.info('Server closed');
      process.exit(0);
    });

    // Force exit after timeout
    setTimeout(() => {
      log.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 10_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
catch (err) {
  log.error({ err }, 'Failed to start server');
  process.exit(1);
}
