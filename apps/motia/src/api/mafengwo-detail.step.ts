/**
 * 马蜂窝游记详情爬取 API
 * POST /api/crawler/mafengwo/detail
 *
 * 使用 Kernel.sh 云浏览器爬取游记详情
 * 支持 DOM 选择器提取（默认）和 AI 提取（可选）
 * 提取后自动执行内容清洗（去除广告/推广/个人信息）
 */

import type { KernelBrowserSession } from '../lib/kernel-browser.js';
import { cleanContent } from '@pathfinding/crawler-types';
import { z } from 'zod';
import {
  closeKernelBrowser,
  createKernelBrowser,
  extractGuideWithAI,
  extractGuideWithSelectors,
} from '../lib/kernel-browser.js';

const bodySchema = z.object({
  url: z
    .string()
    .url()
    .refine(url => url.includes('mafengwo.cn'), 'Must be a mafengwo.cn URL'),
  maxRetries: z.number().min(1).max(5).optional().default(3),
  useAI: z.boolean().optional().default(false), // 是否使用 AI 提取
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
  contentHtml?: string;
  author?: string;
  views?: string;
  likes?: string;
  coverImage?: string;
  images: string[];
  destination?: string;
  highlights?: string[];
}

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
      body: { success: false, error: 'Valid mafengwo URL required' },
    };
  }

  const { url, maxRetries, useAI } = parseResult.data;

  // 检查环境变量
  if (!process.env.KERNEL_API_KEY) {
    logger.error('KERNEL_API_KEY not configured');
    return {
      status: 503,
      body: { success: false, error: 'Browser service not configured' },
    };
  }

  // 如果使用 AI 提取，检查 OpenAI 配置
  if (useAI && !process.env.OPENAI_API_KEY) {
    logger.error('OPENAI_API_KEY not configured for AI extraction');
    return {
      status: 503,
      body: { success: false, error: 'AI extraction requires OPENAI_API_KEY' },
    };
  }

  let session: KernelBrowserSession | null = null;
  let lastError: string = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info('Crawling guide detail', { url, attempt, useAI });

      // 创建浏览器会话
      session = await createKernelBrowser({
        stealth: true,
        headless: false,
      });

      // 转换为移动版 URL
      const mobileUrl = url.replace('www.mafengwo.cn', 'm.mafengwo.cn');

      // 访问页面
      await session.page.goto(mobileUrl, {
        waitUntil: 'domcontentloaded',
        timeoutMs: 30000,
      });

      // 等待内容加载
      await session.page.waitForTimeout(5000);

      let data: GuideData;

      if (useAI) {
        // 使用 AI 提取
        logger.info('Using AI extraction');
        const aiData = await extractGuideWithAI(session.stagehand);
        const selectorData = await extractGuideWithSelectors(session.page);

        data = {
          title: aiData.title,
          content: aiData.content,
          contentHtml: selectorData.contentHtml,
          author: aiData.author,
          views: selectorData.views,
          likes: selectorData.likes,
          coverImage: selectorData.coverImage,
          images: selectorData.images,
          destination: aiData.destination,
          highlights: aiData.highlights,
        };
      }
      else {
        // 使用 DOM 选择器提取（默认）
        const selectorData = await extractGuideWithSelectors(session.page);
        data = {
          ...selectorData,
          destination: undefined,
          highlights: undefined,
        };
      }

      // 检查内容是否过短
      if (data.content.length < 100) {
        lastError = 'Content too short, possible WAF block';
        logger.info('Content too short, retrying', {
          attempt,
          length: data.content.length,
        });
        await closeKernelBrowser(session);
        session = null;
        continue;
      }

      // 清洗内容：去除广告/推广/个人信息/平台噪音
      const cleanResult = cleanContent(data.content, {
        categories: [
          'ad',
          'promotion',
          'personal',
          'platform',
          'copyright',
          'boilerplate',
          'whitespace',
        ],
        preserveParagraphs: true,
      });
      data.content = cleanResult.content;

      logger.info('Content cleaned', {
        originalLength: cleanResult.originalLength,
        cleanedLength: cleanResult.cleanedLength,
        removedTypes: cleanResult.removedTypes,
      });

      logger.info('Extraction complete', {
        title: data.title?.slice(0, 50),
        contentLength: data.content.length,
        imagesCount: data.images.length,
        method: useAI ? 'AI' : 'selectors',
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
      logger.error('Detail crawl attempt failed', {
        error: lastError,
        attempt,
      });
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
