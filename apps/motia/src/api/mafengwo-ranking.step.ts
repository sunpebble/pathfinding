/**
 * 马蜂窝榜单爬取 API
 * POST /api/crawler/mafengwo/ranking
 *
 * 爬取马蜂窝热门榜单（必去榜、美食榜等）
 */

import type { KernelBrowserSession } from '../lib/kernel-browser.js';
import { z } from 'zod';
import {
  closeKernelBrowser,
  createKernelBrowser,
  scrollToLoadMore,
} from '../lib/kernel-browser.js';

const rankingTypeSchema = z.enum([
  'must_visit', // 必去榜
  'food', // 美食榜
  'hotel', // 酒店榜
  'shopping', // 购物榜
  'hidden_gem', // 小众榜
]);

const bodySchema = z.object({
  // 目的地 ID
  destinationId: z.string(),
  destinationName: z.string().optional(),
  // 榜单类型
  rankingType: rankingTypeSchema.default('must_visit'),
  maxRetries: z.number().min(1).max(5).optional().default(3),
});

export const config = {
  type: 'api',
  name: 'MafengwoRankingCrawler',
  description: '马蜂窝榜单爬取',
  path: '/api/crawler/mafengwo/ranking',
  method: 'POST',
  emits: ['crawler.mafengwo.ranking.completed'],
  flows: ['crawler'],
  bodySchema,
};

interface RankingItem {
  rank: number;
  poiId: string;
  name: string;
  category?: string;
  rating?: number;
  reviewsCount: number;
  coverImage?: string;
  reason?: string;
}

interface RankingData {
  rankingId: string;
  rankingType: string;
  title: string;
  destinationId: string;
  destinationName?: string;
  description?: string;
  items: RankingItem[];
}

interface HandlerContext {
  emit: (event: { topic: string; data: unknown }) => Promise<void>;
  logger: {
    info: (msg: string, data?: unknown) => void;
    error: (msg: string, data?: unknown) => void;
  };
}

/**
 * 提取榜单数据
 */
async function extractRanking(
  page: KernelBrowserSession['page'],
  rankingType: string,
  destinationId: string,
): Promise<RankingData> {
  const config = { rankingType, destinationId };
  return page.evaluate((cfg: { rankingType: string; destinationId: string }) => {
    const type = cfg.rankingType;
    const destId = cfg.destinationId;

    interface RankingItemInner {
      rank: number;
      poiId: string;
      name: string;
      category?: string;
      rating?: number;
      reviewsCount: number;
      coverImage?: string;
      reason?: string;
    }

    // 提取标题
    const title = document.querySelector('h1.rank-title, .ranking-title, .list-title')?.textContent?.trim()
      || document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.split('-')[0]?.trim()
      || `${type} 榜单`;

    // 提取描述
    const description = document.querySelector('.rank-desc, .ranking-desc')?.textContent?.trim();

    // 提取目的地名称
    const destinationName = document.querySelector('.destination-name, .mdd-name')?.textContent?.trim();

    // 提取榜单项目
    const items: RankingItemInner[] = [];
    const rankingSelectors = [
      '.rank-item',
      '.ranking-item',
      '.list-item',
      '.poi-item',
      '[data-rank]',
    ];

    for (const selector of rankingSelectors) {
      document.querySelectorAll(selector).forEach((el, index) => {
        // 提取 POI 链接
        const link = el.querySelector('a[href*="/poi/"]') as HTMLAnchorElement;
        if (!link)
          return;

        const poiIdMatch = link.href.match(/\/poi\/(\d+)\.html/);
        if (!poiIdMatch)
          return;

        // 提取排名
        const rankEl = el.querySelector('.rank-num, .ranking-num, [data-rank]');
        const rankAttr = rankEl?.getAttribute('data-rank');
        const rankText = rankEl?.textContent?.trim();
        const rank = rankAttr
          ? Number.parseInt(rankAttr, 10)
          : (rankText ? Number.parseInt(rankText, 10) : index + 1);

        // 提取名称
        const name = el.querySelector('.name, .title, h3, h4')?.textContent?.trim()
          || link.textContent?.trim()
          || '';

        // 提取类别
        const category = el.querySelector('.category, .type')?.textContent?.trim();

        // 提取评分
        const ratingText = el.querySelector('.score, .rating')?.textContent?.trim();
        const rating = ratingText ? Number.parseFloat(ratingText) : undefined;

        // 提取评价数
        const reviewsText = el.querySelector('.review-count, .comments')?.textContent?.trim();
        const reviewsMatch = reviewsText?.match(/(\d+)/);
        const reviewsCount = reviewsMatch ? Number.parseInt(reviewsMatch[1], 10) : 0;

        // 提取图片
        const coverImage = el.querySelector('img')?.getAttribute('src')
          || el.querySelector('img')?.getAttribute('data-src');

        // 提取上榜理由
        const reason = el.querySelector('.reason, .desc, .summary')?.textContent?.trim();

        items.push({
          rank,
          poiId: poiIdMatch[1],
          name,
          category,
          rating,
          reviewsCount,
          coverImage: coverImage || undefined,
          reason,
        });
      });

      if (items.length > 0)
        break;
    }

    // 排序
    items.sort((a, b) => a.rank - b.rank);

    // 生成榜单 ID
    const rankingId = `${destId}_${type}`;

    return {
      rankingId,
      rankingType: type,
      title,
      destinationId: destId,
      destinationName,
      description,
      items,
    };
  }, config);
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

  const { destinationId, destinationName, rankingType, maxRetries } = parseResult.data;

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

  // 榜单类型到 URL 路径的映射
  const rankingPaths: Record<string, string> = {
    must_visit: 'jd', // 景点必去
    food: 'cy', // 美食
    hotel: 'hotel', // 酒店
    shopping: 'gw', // 购物
    hidden_gem: 'jd/xiaoz', // 小众景点
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info('Crawling ranking', { destinationId, rankingType, attempt });

      // 创建浏览器会话
      session = await createKernelBrowser({
        stealth: true,
        headless: false,
      });

      // 构建榜单 URL
      const path = rankingPaths[rankingType] || 'jd';
      const url = `https://www.mafengwo.cn/${path}/${destinationId}/gonglve.html`;

      logger.info('Navigating to ranking page', { url });

      await session.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeoutMs: 30000,
      });

      await session.page.waitForTimeout(3000);

      // 滚动加载更多
      await scrollToLoadMore(session.page, 5, 2000);

      // 提取榜单数据
      const data = await extractRanking(session.page, rankingType, destinationId);

      if (data.items.length === 0) {
        lastError = 'No ranking items found';
        logger.info('No items found, retrying', { attempt });
        await closeKernelBrowser(session);
        session = null;
        continue;
      }

      // 添加目的地名称
      if (destinationName && !data.destinationName) {
        data.destinationName = destinationName;
      }

      const sourceUrl = await session.page.url();

      logger.info('Ranking extraction complete', {
        title: data.title,
        itemsCount: data.items.length,
        rankingType,
      });

      // 发送完成事件
      await emit({
        topic: 'crawler.mafengwo.ranking.completed',
        data: {
          sourceUrl,
          ranking: data,
        },
      });

      return {
        status: 200,
        body: {
          success: true,
          data: {
            ...data,
            sourceUrl,
          },
        },
      };
    }
    catch (error) {
      lastError = error instanceof Error ? error.message : 'Crawl failed';
      logger.error('Ranking crawl attempt failed', { error: lastError, attempt });
    }
    finally {
      if (session) {
        await closeKernelBrowser(session);
        session = null;
      }
    }
  }

  // 所有重试都失败
  logger.error('All retries failed', { destinationId, rankingType, lastError });

  return {
    status: 500,
    body: { success: false, error: lastError },
  };
}
