/**
 * 马蜂窝攻略爬取 API
 * POST /api/crawler/mafengwo/guide
 *
 * 爬取马蜂窝攻略信息
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
  // 详情模式需要攻略 URL
  guideUrl: z.string().url().optional(),
  // 列表参数
  scrollCount: z.number().min(1).max(20).optional().default(5),
  maxRetries: z.number().min(1).max(5).optional().default(3),
});

export const config = {
  type: 'api',
  name: 'MafengwoGuideCrawler',
  description: '马蜂窝攻略爬取',
  path: '/api/crawler/mafengwo/guide',
  method: 'POST',
  emits: ['crawler.mafengwo.guide.list.completed', 'crawler.mafengwo.guide.detail.completed'],
  flows: ['crawler'],
  bodySchema,
};

interface GuideListItem {
  guideId: string;
  title: string;
  url: string;
  author?: string;
  views?: number;
  coverImage?: string;
}

interface GuideDetail {
  guideId: string;
  title: string;
  destinationName?: string;
  authorName?: string;
  authorId?: string;
  summary?: string;
  content: string;
  contentHtml?: string;
  sections: Array<{
    title: string;
    content: string;
    order: number;
  }>;
  coverImage?: string;
  images: string[];
  viewsCount: number;
  likesCount: number;
  savesCount: number;
  commentsCount: number;
  tags: string[];
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
 * 提取攻略列表
 */
async function extractGuideList(
  page: KernelBrowserSession['page'],
): Promise<GuideListItem[]> {
  return page.evaluate(() => {
    const items: GuideListItem[] = [];

    // 攻略列表选择器
    const selectors = [
      '.guide-list-item',
      '.gonglve-item',
      '.article-item',
      'a[href*="/gonglve/"]',
    ];

    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach((el) => {
        let href: string;
        let linkEl: HTMLAnchorElement | null;

        if (el.tagName === 'A') {
          linkEl = el as HTMLAnchorElement;
          href = linkEl.href;
        }
        else {
          linkEl = el.querySelector('a[href*="/gonglve/"]');
          href = linkEl?.href || '';
        }

        if (!href)
          return;

        const guideIdMatch = href.match(/\/gonglve\/(?:ziyouxing\/)?(\d+)\.html/);
        if (!guideIdMatch)
          return;

        const title = el.querySelector('.title, h3, h4')?.textContent?.trim()
          || linkEl?.textContent?.trim()
          || '';

        const author = el.querySelector('.author, .user-name')?.textContent?.trim();

        const viewsText = el.querySelector('.views, .read-count')?.textContent?.trim();
        const viewsMatch = viewsText?.match(/(\d+)/);
        const views = viewsMatch ? Number.parseInt(viewsMatch[1], 10) : undefined;

        const coverImage = el.querySelector('img')?.getAttribute('src')
          || el.querySelector('img')?.getAttribute('data-src');

        items.push({
          guideId: guideIdMatch[1],
          title,
          url: href,
          author,
          views,
          coverImage: coverImage || undefined,
        });
      });

      if (items.length > 0)
        break;
    }

    // 去重
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.guideId))
        return false;
      seen.add(item.guideId);
      return true;
    });
  });
}

/**
 * 提取攻略详情
 */
async function extractGuideDetail(
  page: KernelBrowserSession['page'],
): Promise<GuideDetail> {
  return page.evaluate(() => {
    // 提取攻略 ID
    const urlMatch = window.location.href.match(/\/gonglve\/(?:ziyouxing\/)?(\d+)\.html/);
    const guideId = urlMatch?.[1] || '';

    // 提取标题
    const title = document.querySelector('h1.title, .article-title, .guide-title')?.textContent?.trim()
      || document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.split('-')[0]?.trim()
      || '';

    // 提取目的地
    const destinationName = document.querySelector('.destination, .mdd-name')?.textContent?.trim();

    // 提取作者
    const authorName = document.querySelector('.author-name, .user-name')?.textContent?.trim();
    const authorLink = document.querySelector('a[href*="/u/"]') as HTMLAnchorElement;
    const authorIdMatch = authorLink?.href.match(/\/u\/(\d+)/);
    const authorId = authorIdMatch?.[1];

    // 提取摘要
    const summary = document.querySelector('.summary, .intro, .abstract')?.textContent?.trim();

    // 提取正文内容
    let content = '';
    const contentEl = document.querySelector('.article-content, .guide-content, .content');
    if (contentEl) {
      const clone = contentEl.cloneNode(true) as HTMLElement;
      // 移除广告和推荐
      clone.querySelectorAll('.ad, .recommend, .related').forEach((el) => {
        el.remove();
      });
      content = clone.textContent?.trim() || '';
    }

    // 提取 HTML 内容
    const contentHtml = contentEl?.innerHTML;

    // 提取章节
    const sections: Array<{ title: string; content: string; order: number }> = [];
    document.querySelectorAll('.section, .chapter, h2').forEach((el, index) => {
      const sectionTitle = el.tagName === 'H2'
        ? el.textContent?.trim()
        : el.querySelector('h2, h3, .title')?.textContent?.trim();

      if (sectionTitle) {
        let sectionContent = '';
        let sibling = el.nextElementSibling;
        while (sibling && !sibling.matches('h2, .section, .chapter')) {
          sectionContent += `${sibling.textContent?.trim()}\n`;
          sibling = sibling.nextElementSibling;
        }
        sections.push({
          title: sectionTitle,
          content: sectionContent.trim(),
          order: index,
        });
      }
    });

    // 提取图片
    const images: string[] = [];
    document.querySelectorAll('.article-content img, .guide-content img').forEach((img) => {
      const src = img.getAttribute('src') || img.getAttribute('data-src');
      if (src && !src.includes('icon') && !src.includes('avatar')) {
        images.push(src);
      }
    });

    const coverImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content')
      || images[0];

    // 提取统计数据
    const pageText = document.body.textContent || '';

    const viewsMatch = pageText.match(/(\d+(?:\.\d+)?[万k]?)\s*(?:浏览|阅读)/i);
    let viewsCount = 0;
    if (viewsMatch) {
      const val = viewsMatch[1];
      if (val.includes('万')) {
        viewsCount = Math.round(Number.parseFloat(val) * 10000);
      }
      else if (val.toLowerCase().includes('k')) {
        viewsCount = Math.round(Number.parseFloat(val) * 1000);
      }
      else {
        viewsCount = Number.parseInt(val, 10);
      }
    }

    const likesMatch = pageText.match(/(\d+(?:\.\d+)?[万k]?)\s*(?:赞|喜欢)/i);
    let likesCount = 0;
    if (likesMatch) {
      const val = likesMatch[1];
      if (val.includes('万')) {
        likesCount = Math.round(Number.parseFloat(val) * 10000);
      }
      else if (val.toLowerCase().includes('k')) {
        likesCount = Math.round(Number.parseFloat(val) * 1000);
      }
      else {
        likesCount = Number.parseInt(val, 10);
      }
    }

    const savesMatch = pageText.match(/(\d+(?:\.\d+)?[万k]?)\s*(?:收藏|保存)/i);
    let savesCount = 0;
    if (savesMatch) {
      const val = savesMatch[1];
      if (val.includes('万')) {
        savesCount = Math.round(Number.parseFloat(val) * 10000);
      }
      else if (val.toLowerCase().includes('k')) {
        savesCount = Math.round(Number.parseFloat(val) * 1000);
      }
      else {
        savesCount = Number.parseInt(val, 10);
      }
    }

    const commentsMatch = pageText.match(/(\d+(?:\.\d+)?[万k]?)\s*(?:评论|回复)/i);
    let commentsCount = 0;
    if (commentsMatch) {
      const val = commentsMatch[1];
      if (val.includes('万')) {
        commentsCount = Math.round(Number.parseFloat(val) * 10000);
      }
      else if (val.toLowerCase().includes('k')) {
        commentsCount = Math.round(Number.parseFloat(val) * 1000);
      }
      else {
        commentsCount = Number.parseInt(val, 10);
      }
    }

    // 提取标签
    const tags: string[] = [];
    document.querySelectorAll('.tags a, .tag').forEach((el) => {
      const tag = el.textContent?.trim();
      if (tag && tag.length > 1) {
        tags.push(tag);
      }
    });

    // 提取发布时间
    const publishedAt = document.querySelector('.publish-time, .date, time')?.textContent?.trim();

    return {
      guideId,
      title,
      destinationName,
      authorName,
      authorId,
      summary,
      content,
      contentHtml,
      sections,
      coverImage,
      images,
      viewsCount,
      likesCount,
      savesCount,
      commentsCount,
      tags,
      publishedAt,
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

  const { mode, destinationId, destinationName, guideUrl, scrollCount, maxRetries } = parseResult.data;

  // 验证参数
  if (mode === 'list' && !destinationId && !destinationName) {
    return {
      status: 400,
      body: { success: false, error: 'destinationId or destinationName required for list mode' },
    };
  }

  if (mode === 'detail' && !guideUrl) {
    return {
      status: 400,
      body: { success: false, error: 'guideUrl required for detail mode' },
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
      logger.info('Crawling guide', { mode, destinationId, guideUrl, attempt });

      // 创建浏览器会话
      session = await createKernelBrowser({
        stealth: true,
        headless: false,
      });

      if (mode === 'list') {
        // 列表模式
        let url: string;
        if (destinationId) {
          url = `https://www.mafengwo.cn/gonglve/ziyouxing/${destinationId}.html`;
        }
        else {
          url = `https://www.mafengwo.cn/search/s.php?q=${encodeURIComponent(destinationName!)}&t=gonglve`;
        }

        logger.info('Navigating to guide list', { url });

        await session.page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeoutMs: 30000,
        });

        await session.page.waitForTimeout(3000);

        // 滚动加载更多
        await scrollToLoadMore(session.page, scrollCount, 2000);

        // 提取攻略列表
        const items = await extractGuideList(session.page);

        logger.info('Guide list extraction complete', { count: items.length });

        // 发送完成事件
        await emit({
          topic: 'crawler.mafengwo.guide.list.completed',
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
        logger.info('Navigating to guide detail', { url: guideUrl });

        await session.page.goto(guideUrl!, {
          waitUntil: 'domcontentloaded',
          timeoutMs: 30000,
        });

        await session.page.waitForTimeout(5000);

        // 滚动以加载完整内容
        await scrollToLoadMore(session.page, 3, 1000);

        // 提取攻略详情
        const data = await extractGuideDetail(session.page);

        if (!data.title || data.title.length < 2) {
          lastError = 'Failed to extract guide title';
          logger.info('Extraction failed, retrying', { attempt });
          await closeKernelBrowser(session);
          session = null;
          continue;
        }

        logger.info('Guide detail extraction complete', {
          title: data.title.slice(0, 50),
          guideId: data.guideId,
          contentLength: data.content.length,
        });

        // 发送完成事件
        await emit({
          topic: 'crawler.mafengwo.guide.detail.completed',
          data: {
            sourceUrl: guideUrl,
            guide: data,
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
      logger.error('Guide crawl attempt failed', { error: lastError, attempt });
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
