/**
 * Chat Routes - Proxy to Crawler's AI Chat Service
 * Forwards chat requests to the crawler service for AI processing
 */

import { Hono } from 'hono';

interface Variables {
  userId: string;
  accessToken: string;
}

const CRAWLER_URL = process.env.CRAWLER_URL || 'http://localhost:3001';

export const chatRoutes = new Hono<{ Variables: Variables }>();
export const publicChatRoutes = new Hono();

/**
 * Proxy helper - forwards request to crawler service
 */
async function proxyToCrawler(
  path: string,
  method: string,
  body?: unknown,
  queryParams?: URLSearchParams
): Promise<Response> {
  const url = new URL(`${CRAWLER_URL}/api/chat${path}`);
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

// ============================================
// Public Routes (no auth required)
// ============================================

/**
 * GET /chat/health - Chat service health check
 */
publicChatRoutes.get('/health', async (c) => {
  const response = await proxyToCrawler('/health', 'GET');
  const data = await response.json();
  return c.json(data, response.status as any);
});

// ============================================
// Protected Routes (auth required)
// ============================================

/**
 * GET /chat/sessions - List user's chat sessions
 */
chatRoutes.get('/sessions', async (c) => {
  const userId = c.get('userId');
  const includeArchived = c.req.query('includeArchived') || 'false';
  const limit = c.req.query('limit') || '50';

  const params = new URLSearchParams({
    userId,
    includeArchived,
    limit,
  });

  const response = await proxyToCrawler('/sessions', 'GET', undefined, params);
  const data = await response.json();
  return c.json(data, response.status as any);
});

/**
 * POST /chat/sessions - Create new chat session
 */
chatRoutes.post('/sessions', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const response = await proxyToCrawler('/sessions', 'POST', {
    ...body,
    userId,
  });
  const data = await response.json();
  return c.json(data, response.status as any);
});

/**
 * GET /chat/sessions/:id - Get session details
 */
chatRoutes.get('/sessions/:id', async (c) => {
  const sessionId = c.req.param('id');

  const response = await proxyToCrawler(`/sessions/${sessionId}`, 'GET');
  const data = await response.json();
  return c.json(data, response.status as any);
});

/**
 * PATCH /chat/sessions/:id - Update session
 */
chatRoutes.patch('/sessions/:id', async (c) => {
  const sessionId = c.req.param('id');
  const body = await c.req.json();

  const response = await proxyToCrawler(
    `/sessions/${sessionId}`,
    'PATCH',
    body
  );
  const data = await response.json();
  return c.json(data, response.status as any);
});

/**
 * DELETE /chat/sessions/:id - Delete session
 */
chatRoutes.delete('/sessions/:id', async (c) => {
  const sessionId = c.req.param('id');

  const response = await proxyToCrawler(`/sessions/${sessionId}`, 'DELETE');
  const data = await response.json();
  return c.json(data, response.status as any);
});

/**
 * GET /chat/sessions/:id/messages - Get session messages
 */
chatRoutes.get('/sessions/:id/messages', async (c) => {
  const sessionId = c.req.param('id');
  const limit = c.req.query('limit') || '50';
  const cursor = c.req.query('cursor');

  const params = new URLSearchParams({ limit });
  if (cursor) params.set('cursor', cursor);

  const response = await proxyToCrawler(
    `/sessions/${sessionId}/messages`,
    'GET',
    undefined,
    params
  );
  const data = await response.json();
  return c.json(data, response.status as any);
});

/**
 * POST /chat/sessions/:id/messages - Send message and get AI response
 */
chatRoutes.post('/sessions/:id/messages', async (c) => {
  const sessionId = c.req.param('id');
  const body = await c.req.json();

  const response = await proxyToCrawler(
    `/sessions/${sessionId}/messages`,
    'POST',
    body
  );
  const data = await response.json();
  return c.json(data, response.status as any);
});

/**
 * DELETE /chat/sessions/:id/messages - Clear session messages
 */
chatRoutes.delete('/sessions/:id/messages', async (c) => {
  const sessionId = c.req.param('id');

  const response = await proxyToCrawler(
    `/sessions/${sessionId}/messages`,
    'DELETE'
  );
  const data = await response.json();
  return c.json(data, response.status as any);
});

/**
 * POST /chat/query - Direct chat query (stateless)
 */
chatRoutes.post('/query', async (c) => {
  const body = await c.req.json();

  const response = await proxyToCrawler('/query', 'POST', body);
  const data = await response.json();
  return c.json(data, response.status as any);
});

/**
 * POST /chat/recommendations - Get AI recommendations
 */
chatRoutes.post('/recommendations', async (c) => {
  const body = await c.req.json();

  const response = await proxyToCrawler('/recommendations', 'POST', body);
  const data = await response.json();
  return c.json(data, response.status as any);
});

/**
 * POST /chat/tips - Get travel tips
 */
chatRoutes.post('/tips', async (c) => {
  const body = await c.req.json();

  const response = await proxyToCrawler('/tips', 'POST', body);
  const data = await response.json();
  return c.json(data, response.status as any);
});

/**
 * POST /chat/suggest-changes - Suggest itinerary changes
 */
chatRoutes.post('/suggest-changes', async (c) => {
  const body = await c.req.json();

  const response = await proxyToCrawler('/suggest-changes', 'POST', body);
  const data = await response.json();
  return c.json(data, response.status as any);
});
