import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { Hono } from 'hono';
import { z } from 'zod';
import { fetchCrawlerContent, validFetchUrl } from '../services/crawler-fetch.service.js';

const app = new Hono();

const crawlerFetchSchema = z.object({
  url: z.string().trim().min(1),
});

function jsonError(c: Context, status: ContentfulStatusCode, error: string) {
  return c.json({ success: false, error }, status);
}

app.post('/fetch', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  }
  catch {
    return jsonError(c, 400, 'Invalid JSON body');
  }

  const parsed = crawlerFetchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(c, 400, 'Valid URL required');
  }

  const targetUrl = validFetchUrl(parsed.data.url);
  if (!targetUrl) {
    return jsonError(c, 400, 'Valid URL required');
  }

  return c.json(await fetchCrawlerContent(targetUrl.toString()));
});

export default app;
