/**
 * Guides Routes - Proxy to Crawler Service
 * Forwards guide-related requests to the crawler service
 */

import { Hono } from 'hono';

const CRAWLER_URL = process.env.CRAWLER_URL || 'http://localhost:3001';

export const guidesProxyRoutes = new Hono();

/**
 * Proxy helper - forwards request to crawler service
 */
async function proxyToCrawler(
  path: string,
  method: string,
  body?: unknown,
  queryParams?: URLSearchParams
): Promise<Response> {
  const url = new URL(`${CRAWLER_URL}/api/guides${path}`);
  if (queryParams) {
    queryParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
  }

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body && method !== 'GET' && method !== 'DELETE') {
    options.body = JSON.stringify(body);
  }

  return fetch(url.toString(), options);
}

/**
 * GET /api/guides - List guides
 */
guidesProxyRoutes.get('/', async (c) => {
  const limit = c.req.query('limit') || '30';
  const offset = c.req.query('offset') || '0';

  const params = new URLSearchParams({ limit, offset });

  const response = await proxyToCrawler('', 'GET', undefined, params);
  const data = await response.json();
  return c.json(data, response.status as any);
});

/**
 * GET /api/guides/:id - Get single guide
 */
guidesProxyRoutes.get('/:id', async (c) => {
  const guideId = c.req.param('id');

  const response = await proxyToCrawler(`/${guideId}`, 'GET');
  const data = await response.json();
  return c.json(data, response.status as any);
});

/**
 * POST /api/guides/:id/enrich - Enrich guide with AI
 */
guidesProxyRoutes.post('/:id/enrich', async (c) => {
  const guideId = c.req.param('id');
  const force = c.req.query('force') === 'true';

  const params = new URLSearchParams();
  if (force) params.set('force', 'true');

  const response = await proxyToCrawler(
    `/${guideId}/enrich`,
    'POST',
    {},
    params
  );
  const data = await response.json();
  return c.json(data, response.status as any);
});
