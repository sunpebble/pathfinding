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
const app = createApp();

serve({ fetch: app.fetch, port }, (info) => {
  log.info(`API server listening on http://localhost:${info.port}`);
});
