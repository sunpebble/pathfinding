/**
 * 马蜂窝游记详情爬取 API
 * POST /api/crawler/mafengwo/detail
 *
 * 使用 Kernel.sh 云浏览器爬取单篇游记详情
 */

import type { Page } from 'playwright';
import type { KernelBrowserSession } from '../lib/kernel-browser.js';
import { z } from 'zod';
import {
  closeKernelBrowser,
  createKernelBrowser,

} from '../lib/kernel-browser.js';

const bodySchema = z.object({
  url: z.string().url().refine(
    url => url.includes('mafengwo.cn'),
    'Must be a mafengwo.cn URL',
  ),
  maxRetries: z.number().min(1).max(5).optional().default(3),
});

export const config = {
  type: 'api',
  name: 'MafengwoDetailCrawler',
  description: '马蜂窝游记详情爬取',
  path: '/api/crawler/mafengwo/detail',
  method: 'POST',
  emits: ['crawler.mafengwo.detail.completed'],
  flows: ['crawler'],
  bodySchema,
};

interface GuideData {
  title: string;
  content: string;
  author?: string;
  views?: string;
  likes?: string;
  coverImage?: string;
  images: string[];
  publishedAt?: string;
}

interface HandlerContext {
  emit: (event: { topic: string; data: unknown }) => Promise<void>;
  logger: {
    info: (msg: string, data?: unknown) => void;
    error: (msg: string, data?: unknown) => void;
  };
}

/**
 * 从页面提取游记详情
 */
async function extractGuideDetail(
  page: Page,
): Promise<GuideData> {
  return page.evaluate(() => {
    // 提取标题
    const title
      = document.querySelector('h1, .title, [class*="title"]')?.textContent?.trim()
        || document.querySelector('meta[property="og:title"]')?.getAttribute('content')
        || '';

    // 提取内容
    const contentEl = document.querySelector(
      '.content, .article, [class*="content"], [class*="article"], main',
    );
    const content = contentEl?.textContent?.trim() || '';

    // 提取作者
    const author
      = document.querySelector('.author, [class*="author"], .user-name, [class*="user"]')
        ?.textContent
        ?.trim() || undefined;

    // 提取浏览量
    const pageText = document.body.textContent || '';
    const viewsMatch = pageText.match(/(\d+(?:\.\d+)?[万k]?)\s*(?:浏览|阅读|次)/i);
    const views = viewsMatch?.[1] || undefined;

    // 提取点赞
    const likesMatch = pageText.match(/(\d+(?:\.\d+)?[万k]?)\s*(?:赞|喜欢|收藏)/i);
    const likes = likesMatch?.[1] || undefined;

    // 提取图片
    const images: string[] = [];
    document.querySelectorAll('img[src*="mafengwo"], img[data-src*="mafengwo"]').forEach((img) => {
      const src = (img as HTMLImageElement).src || img.getAttribute('data-src');
      if (src && !src.includes('avatar') && !src.includes('icon')) {
        images.push(src);
      }
    });

    // 提取封面图
    const coverImage
      = document.querySelector('meta[property="og:image"]')?.getAttribute('content')
        || images[0]
        || undefined;

    return {
      title,
      content,
      author,
      views,
      likes,
      coverImage,
      images,
    };
  });
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
      body: { success: false, error: 'Valid mafengwo URL required' },
    };
  }

  const { url, maxRetries } = parseResult.data;

  // 检查环境变量
  if (!process.env.KERNEL_API_KEY) {
    logger.error('KERNEL_API_KEY not configured');
    return {
      status: 503,
      body: { success: false, error: 'Browser service not configured' },
    };
  }

  let session: KernelBrowserSession | null = null;
  let lastError: string = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info('Crawling guide detail', { url, attempt });

      // 创建浏览器会话（使用非 headless + 移动设备模拟绕过 WAF）
      session = await createKernelBrowser({
        stealth: true,
        headless: false,
        mobile: true,
      });

      // 转换为移动版 URL
      const mobileUrl = url.replace('www.mafengwo.cn', 'm.mafengwo.cn');

      // 访问页面（使用 domcontentloaded 代替 networkidle 避免超时）
      await session.page.goto(mobileUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // 等待内容加载
      await session.page.waitForTimeout(3000);

      // 提取详情
      const data = await extractGuideDetail(session.page);

      // 检查内容是否过短（可能被 WAF 拦截）
      if (data.content.length < 100) {
        lastError = 'Content too short, possible WAF block';
        logger.info('Content too short, retrying', { attempt, length: data.content.length });
        await closeKernelBrowser(session);
        session = null;
        continue;
      }

      logger.info('Extraction complete', {
        title: data.title?.slice(0, 50),
        contentLength: data.content.length,
        imagesCount: data.images.length,
      });

      // 发送完成事件
      await emit({
        topic: 'crawler.mafengwo.detail.completed',
        data: { url, guide: data },
      });

      return {
        status: 200,
        body: {
          success: true,
          data,
        },
      };
    }
    catch (error) {
      lastError = error instanceof Error ? error.message : 'Crawl failed';
      logger.error('Detail crawl attempt failed', { error: lastError, attempt });
    }
    finally {
      if (session) {
        await closeKernelBrowser(session);
        session = null;
      }
    }
  }

  // 所有重试都失败
  logger.error('All retries failed', { url, lastError });

  // 检查是否是 404
  if (lastError.includes('404') || lastError.includes('not found')) {
    return {
      status: 404,
      body: { success: false, error: 'Guide not found' },
    };
  }

  return {
    status: 500,
    body: { success: false, error: lastError },
  };
}
