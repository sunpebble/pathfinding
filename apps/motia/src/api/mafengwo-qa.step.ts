/**
 * 马蜂窝问答爬取 API
 * POST /api/crawler/mafengwo/qa
 *
 * 爬取马蜂窝问答信息
 */

import type { KernelBrowserSession } from '../lib/kernel-browser.js';
import { z } from 'zod';
import {
  closeKernelBrowser,
  createKernelBrowser,
  scrollToLoadMore,
} from '../lib/kernel-browser.js';

const bodySchema = z.object({
  // 爬取模式：list 列表 或 detail 详情
  mode: z.enum(['list', 'detail']).default('list'),
  // 目的地 ID
  destinationId: z.string().optional(),
  destinationName: z.string().optional(),
  // 详情模式需要问答 URL
  qaUrl: z.string().url().optional(),
  // 列表参数
  scrollCount: z.number().min(1).max(20).optional().default(5),
  maxRetries: z.number().min(1).max(5).optional().default(3),
});

export const config = {
  type: 'api',
  name: 'MafengwoQaCrawler',
  description: '马蜂窝问答爬取',
  path: '/api/crawler/mafengwo/qa',
  method: 'POST',
  emits: ['crawler.mafengwo.qa.list.completed', 'crawler.mafengwo.qa.detail.completed'],
  flows: ['crawler'],
  bodySchema,
};

interface QAListItem {
  questionId: string;
  title: string;
  url: string;
  answersCount: number;
  author?: string;
}

interface QADetail {
  questionId: string;
  title: string;
  content: string;
  destinationName?: string;
  authorName?: string;
  authorId?: string;
  answersCount: number;
  viewsCount: number;
  tags: string[];
  createdAt?: string;
  bestAnswer?: {
    content: string;
    authorName?: string;
    authorId?: string;
    likesCount: number;
    createdAt?: string;
  };
}

interface HandlerContext {
  emit: (event: { topic: string; data: unknown }) => Promise<void>;
  logger: {
    info: (msg: string, data?: unknown) => void;
    error: (msg: string, data?: unknown) => void;
  };
}

/**
 * 提取问答列表
 */
async function extractQAList(
  page: KernelBrowserSession['page'],
): Promise<QAListItem[]> {
  return page.evaluate(() => {
    const items: QAListItem[] = [];

    // 问答列表选择器
    document.querySelectorAll('a[href*="/wenda/detail"]').forEach((el) => {
      const link = el as HTMLAnchorElement;
      const href = link.href;

      const questionIdMatch = href.match(/\/wenda\/detail-(\d+)\.html/);
      if (!questionIdMatch)
        return;

      const title = el.textContent?.trim() || '';
      if (!title || title.length < 5)
        return;

      const parent = el.closest('.qa-item, .question-item, li, .item');
      const answersText = parent?.querySelector('.answer-count, .answers')?.textContent?.trim();
      const answersMatch = answersText?.match(/(\d+)/);
      const answersCount = answersMatch ? Number.parseInt(answersMatch[1], 10) : 0;

      const author = parent?.querySelector('.author, .user-name')?.textContent?.trim();

      items.push({
        questionId: questionIdMatch[1],
        title,
        url: href,
        answersCount,
        author,
      });
    });

    // 去重
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.questionId))
        return false;
      seen.add(item.questionId);
      return true;
    });
  });
}

/**
 * 提取问答详情
 */
async function extractQADetail(
  page: KernelBrowserSession['page'],
): Promise<QADetail> {
  return page.evaluate(() => {
    // 提取问题 ID
    const urlMatch = window.location.href.match(/\/wenda\/detail-(\d+)\.html/);
    const questionId = urlMatch?.[1] || '';

    // 提取标题
    const title = document.querySelector('h1.question-title, .title h1, .qa-title')?.textContent?.trim()
      || document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.split('-')[0]?.trim()
      || '';

    // 提取问题内容
    const content = document.querySelector('.question-content, .question-detail, .content')?.textContent?.trim() || '';

    // 提取目的地
    const destinationName = document.querySelector('.destination, .mdd-name, .location')?.textContent?.trim();

    // 提取提问者
    const authorName = document.querySelector('.question-author, .asker-name')?.textContent?.trim();
    const authorLink = document.querySelector('.question-author a[href*="/u/"]') as HTMLAnchorElement;
    const authorIdMatch = authorLink?.href.match(/\/u\/(\d+)/);
    const authorId = authorIdMatch?.[1];

    // 提取回答数
    const answersText = document.querySelector('.answers-count, .answer-num')?.textContent?.trim();
    const answersMatch = answersText?.match(/(\d+)/);
    const answersCount = answersMatch ? Number.parseInt(answersMatch[1], 10) : 0;

    // 提取浏览数
    const viewsText = document.querySelector('.views-count, .view-num')?.textContent?.trim();
    const viewsMatch = viewsText?.match(/(\d+)/);
    const viewsCount = viewsMatch ? Number.parseInt(viewsMatch[1], 10) : 0;

    // 提取标签
    const tags: string[] = [];
    document.querySelectorAll('.qa-tags a, .tag').forEach((el) => {
      const tag = el.textContent?.trim();
      if (tag && tag.length > 1) {
        tags.push(tag);
      }
    });

    // 提取创建时间
    const createdAt = document.querySelector('.question-time, .ask-time, time')?.textContent?.trim();

    // 提取最佳答案
    let bestAnswer: QADetail['bestAnswer'];
    const bestAnswerEl = document.querySelector('.best-answer, .accepted-answer, .answer-item.best');
    if (bestAnswerEl) {
      const answerContent = bestAnswerEl.querySelector('.answer-content, .content')?.textContent?.trim() || '';
      const answerAuthor = bestAnswerEl.querySelector('.author-name, .answerer')?.textContent?.trim();
      const answerAuthorLink = bestAnswerEl.querySelector('a[href*="/u/"]') as HTMLAnchorElement;
      const answerAuthorIdMatch = answerAuthorLink?.href.match(/\/u\/(\d+)/);
      const answerLikesText = bestAnswerEl.querySelector('.likes, .like-count')?.textContent?.trim();
      const answerLikesMatch = answerLikesText?.match(/(\d+)/);
      const answerCreatedAt = bestAnswerEl.querySelector('.answer-time, time')?.textContent?.trim();

      bestAnswer = {
        content: answerContent,
        authorName: answerAuthor,
        authorId: answerAuthorIdMatch?.[1],
        likesCount: answerLikesMatch ? Number.parseInt(answerLikesMatch[1], 10) : 0,
        createdAt: answerCreatedAt,
      };
    }

    return {
      questionId,
      title,
      content,
      destinationName,
      authorName,
      authorId,
      answersCount,
      viewsCount,
      tags,
      createdAt,
      bestAnswer,
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
      body: { success: false, error: parseResult.error.message },
    };
  }

  const { mode, destinationId, destinationName, qaUrl, scrollCount, maxRetries } = parseResult.data;

  // 验证参数
  if (mode === 'list' && !destinationId && !destinationName) {
    return {
      status: 400,
      body: { success: false, error: 'destinationId or destinationName required for list mode' },
    };
  }

  if (mode === 'detail' && !qaUrl) {
    return {
      status: 400,
      body: { success: false, error: 'qaUrl required for detail mode' },
    };
  }

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
      logger.info('Crawling Q&A', { mode, destinationId, qaUrl, attempt });

      // 创建浏览器会话
      session = await createKernelBrowser({
        stealth: true,
        headless: false,
      });

      if (mode === 'list') {
        // 列表模式
        let url: string;
        if (destinationId) {
          url = `https://www.mafengwo.cn/wenda/area-${destinationId}.html`;
        }
        else {
          url = `https://www.mafengwo.cn/search/s.php?q=${encodeURIComponent(destinationName!)}&t=wenda`;
        }

        logger.info('Navigating to Q&A list', { url });

        await session.page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeoutMs: 30000,
        });

        await session.page.waitForTimeout(3000);

        // 滚动加载更多
        await scrollToLoadMore(session.page, scrollCount, 2000);

        // 提取问答列表
        const items = await extractQAList(session.page);

        logger.info('Q&A list extraction complete', { count: items.length });

        // 发送完成事件
        await emit({
          topic: 'crawler.mafengwo.qa.list.completed',
          data: {
            destinationId,
            destinationName,
            items,
            count: items.length,
          },
        });

        return {
          status: 200,
          body: {
            success: true,
            mode: 'list',
            items,
            count: items.length,
          },
        };
      }
      else {
        // 详情模式
        logger.info('Navigating to Q&A detail', { url: qaUrl });

        await session.page.goto(qaUrl!, {
          waitUntil: 'domcontentloaded',
          timeoutMs: 30000,
        });

        await session.page.waitForTimeout(5000);

        // 提取问答详情
        const data = await extractQADetail(session.page);

        if (!data.title || data.title.length < 2) {
          lastError = 'Failed to extract Q&A title';
          logger.info('Extraction failed, retrying', { attempt });
          await closeKernelBrowser(session);
          session = null;
          continue;
        }

        logger.info('Q&A detail extraction complete', {
          title: data.title.slice(0, 50),
          questionId: data.questionId,
          answersCount: data.answersCount,
        });

        // 发送完成事件
        await emit({
          topic: 'crawler.mafengwo.qa.detail.completed',
          data: {
            sourceUrl: qaUrl,
            qa: data,
          },
        });

        return {
          status: 200,
          body: {
            success: true,
            mode: 'detail',
            data,
          },
        };
      }
    }
    catch (error) {
      lastError = error instanceof Error ? error.message : 'Crawl failed';
      logger.error('Q&A crawl attempt failed', { error: lastError, attempt });
    }
    finally {
      if (session) {
        await closeKernelBrowser(session);
        session = null;
      }
    }
  }

  // 所有重试都失败
  logger.error('All retries failed', { mode, lastError });

  return {
    status: 500,
    body: { success: false, error: lastError },
  };
}
