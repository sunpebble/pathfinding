/**
 * 马蜂窝游记列表爬取 API
 * POST /api/crawler/mafengwo/list
 *
 * 使用 Kernel.sh 云浏览器爬取移动版马蜂窝游记列表
 */

import type { KernelBrowserSession } from '../lib/kernel-browser.js';
import { z } from 'zod';
import {
  closeKernelBrowser,
  createKernelBrowser,
  extractGuideUrls,
  scrollToLoadMore,
} from '../lib/kernel-browser.js';

const bodySchema = z.object({
  city: z.string().min(1, 'City name is required'),
  scrollCount: z.number().min(1).max(20).optional().default(5),
});

export const config = {
  type: 'api',
  name: 'MafengwoListCrawler',
  description: '马蜂窝游记列表爬取',
  path: '/api/crawler/mafengwo/list',
  method: 'POST',
  emits: ['crawler.mafengwo.list.completed'],
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
  // 验证请求参数
  const parseResult = bodySchema.safeParse(req.body);
  if (!parseResult.success) {
    return {
      status: 400,
      body: { success: false, error: 'Invalid city name' },
    };
  }

  const { city, scrollCount } = parseResult.data;

  // 检查环境变量
  if (!process.env.KERNEL_API_KEY) {
    logger.error('KERNEL_API_KEY not configured');
    return {
      status: 503,
      body: { success: false, error: 'Browser service not configured' },
    };
  }

  let session: KernelBrowserSession | null = null;

  try {
    logger.info('Creating browser session', { city });

    // 创建浏览器会话（使用非 headless 绕过 WAF）
    session = await createKernelBrowser({
      stealth: true,
      headless: false,
    });

    logger.info('Browser created', {
      sessionId: session.browser.session_id,
      liveView: session.browser.browser_live_view_url,
    });

    // 访问马蜂窝移动版游记页面
    const url = 'https://m.mafengwo.cn/note/';
    logger.info('Navigating to', { url });

    await session.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeoutMs: 30000,
    });

    // 等待页面加载
    await session.page.waitForTimeout(3000);

    // 滚动加载更多内容
    logger.info('Scrolling to load more', { scrollCount });
    await scrollToLoadMore(session.page, scrollCount, 2000);

    // 提取游记 URL
    logger.info('Extracting guide URLs');
    const urls = await extractGuideUrls(session.page);

    logger.info('Extraction complete', { count: urls.length });

    // 发送完成事件
    await emit({
      topic: 'crawler.mafengwo.list.completed',
      data: { city, urls, count: urls.length },
    });

    return {
      status: 200,
      body: {
        success: true,
        city,
        urls,
        count: urls.length,
      },
    };
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Crawl failed';
    logger.error('Mafengwo list crawl failed', { error: message, city });

    // 检查是否是浏览器服务不可用
    if (message.includes('KERNEL') || message.includes('connect')) {
      return {
        status: 503,
        body: { success: false, error: 'Browser service unavailable' },
      };
    }

    return {
      status: 500,
      body: { success: false, error: message },
    };
  }
  finally {
    // 释放浏览器资源
    if (session) {
      logger.info('Releasing browser session');
      await closeKernelBrowser(session);
    }
  }
}
