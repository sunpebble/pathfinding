import { z } from 'zod';

async function simpleCrawl(
  url: string,
): Promise<{
  success: boolean;
  data?: { url: string; title: string; content: string };
  error?: string;
  platform: string;
}> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TravelBot/1.0)' },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`,
        platform: 'unknown',
      };
    }

    const html = await response.text();
    const content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000);
    const title
      = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || 'Untitled';

    let platform = 'unknown';
    if (url.includes('xiaohongshu') || url.includes('xhs'))
      platform = 'xiaohongshu';
    else if (url.includes('mafengwo'))
      platform = 'mafengwo';

    return { success: true, data: { url, title, content }, platform };
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Crawl failed',
      platform: 'unknown',
    };
  }
}

const bodySchema = z.object({ url: z.string().url() });

export const config = {
  type: 'api',
  name: 'CrawlerFetch',
  description: '爬虫 API',
  path: '/api/crawler/fetch',
  method: 'POST',
  emits: ['crawler.result.received'],
  flows: ['crawler'],
  bodySchema,
};

interface HandlerContext {
  emit: (event: { topic: string; data: unknown }) => Promise<void>;
  logger: {
    info: (msg: string, data?: unknown) => void;
    error: (msg: string, data?: unknown) => void;
  };
}

export async function handler(
  req: { body?: unknown },
  { emit, logger }: HandlerContext,
) {
  const parseResult = bodySchema.safeParse(req.body);
  if (!parseResult.success)
    return { status: 400, body: { error: 'Valid URL required' } };

  const { url } = parseResult.data;

  try {
    logger.info('Crawling', { url });
    const result = await simpleCrawl(url);
    if (result.success && result.data) {
      await emit({
        topic: 'crawler.result.received',
        data: { url, platform: result.platform, content: result.data },
      });
    }
    return { status: 200, body: result };
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Crawl failed';
    logger.error('Crawl failed', { error: message });
    return { status: 500, body: { error: message } };
  }
}
