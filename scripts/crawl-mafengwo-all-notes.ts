#!/usr/bin/env npx tsx
/**
 * 马蜂窝全量游记爬取脚本
 *
 * 使用方法：
 * npx tsx scripts/crawl-mafengwo-all-notes.ts
 *
 * 环境变量：
 * - KERNEL_API_KEY: Kernel.sh API 密钥
 * - CONVEX_URL: Convex 部署 URL
 */

import { Stagehand } from '@browserbasehq/stagehand';
import Kernel from '@onkernel/sdk';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';

// ============================================
// 配置
// ============================================

const CONFIG = {
  // 爬取配置
  maxPages: 100, // 最大页数
  scrollsPerPage: 20, // 每页滚动次数
  delayBetweenScrolls: 2000, // 滚动间隔 (ms)
  delayBetweenDetails: 3000, // 详情爬取间隔 (ms)
  maxRetries: 3, // 最大重试次数

  // 并发配置
  concurrentDetails: 1, // 同时爬取详情数（建议保持 1 避免被封）

  // 保存配置
  saveInterval: 10, // 每爬取多少条保存一次
};

// ============================================
// 类型定义
// ============================================

interface GuideListItem {
  url: string;
  externalId: string;
}

interface GuideDetail {
  title: string;
  content: string;
  author?: string;
  views?: string;
  likes?: string;
  coverImage?: string;
  images: string[];
  publishedAt?: string;
}

interface CrawlStats {
  totalUrlsFound: number;
  detailsCrawled: number;
  detailsSaved: number;
  errors: number;
  startTime: number;
}

// ============================================
// 工具函数
// ============================================

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.warn(`[${timestamp}] ${message}`, JSON.stringify(data, null, 2));
  }
  else {
    console.warn(`[${timestamp}] ${message}`);
  }
}

function extractExternalId(url: string): string | null {
  const match = url.match(/\/i\/(\d+)\.html/);
  return match ? match[1] : null;
}

function parseChineseNumber(str: string | undefined): number {
  if (!str)
    return 0;
  const cleaned = str.trim();
  const match = cleaned.match(/^([\d.]+)\s*([万k])?/i);
  if (!match)
    return 0;
  const num = Number.parseFloat(match[1]);
  const unit = match[2]?.toLowerCase();
  if (unit === '万')
    return Math.round(num * 10000);
  if (unit === 'k')
    return Math.round(num * 1000);
  return Math.round(num);
}

function calculateQualityScore(data: GuideDetail): number {
  let score = 0;
  if (data.title && data.title.length >= 5)
    score += 0.2;
  const contentLength = data.content?.length || 0;
  if (contentLength >= 500)
    score += 0.4;
  else if (contentLength >= 200)
    score += 0.3;
  else if (contentLength >= 100)
    score += 0.2;
  if (data.author)
    score += 0.1;
  const imageCount = data.images?.length || 0;
  if (imageCount >= 5)
    score += 0.2;
  else if (imageCount >= 1)
    score += 0.1;
  if (data.views || data.likes)
    score += 0.1;
  return Math.min(1, Math.round(score * 100) / 100);
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// 浏览器管理
// ============================================

interface BrowserSession {
  kernel: InstanceType<typeof Kernel>;
  browser: {
    session_id: string;
    cdp_ws_url: string;
    browser_live_view_url?: string;
  };
  stagehand: Stagehand;
  page: ReturnType<Stagehand['context']['pages']>[0];
}

async function createBrowser(): Promise<BrowserSession> {
  if (!process.env.KERNEL_API_KEY) {
    throw new Error('KERNEL_API_KEY environment variable is not set');
  }

  const kernel = new Kernel();
  const browser = await kernel.browsers.create({
    stealth: true,
    headless: false,
  });

  log('Browser created', {
    sessionId: browser.session_id,
    liveView: browser.browser_live_view_url,
  });

  const stagehandOptions: Record<string, unknown> = {
    env: 'LOCAL',
    localBrowserLaunchOptions: {
      cdpUrl: browser.cdp_ws_url,
    },
    verbose: 0,
    domSettleTimeout: 30000,
  };

  const stagehand = new Stagehand(stagehandOptions);
  await stagehand.init();
  const page = stagehand.context.pages()[0];

  return { kernel, browser, stagehand, page };
}

async function closeBrowser(session: BrowserSession): Promise<void> {
  try {
    await session.stagehand.close();
  }
  catch {}
  try {
    await session.kernel.browsers.deleteByID(session.browser.session_id);
  }
  catch {}
}

// ============================================
// 爬取函数
// ============================================

/**
 * 爬取游记列表页，获取所有游记 URL
 */
async function crawlNoteList(
  session: BrowserSession,
  stats: CrawlStats,
): Promise<GuideListItem[]> {
  const allUrls: GuideListItem[] = [];
  const seenIds = new Set<string>();

  log('Starting note list crawl...');

  // 访问马蜂窝游记首页
  const listUrl = 'https://m.mafengwo.cn/note/';
  await session.page.goto(listUrl, {
    waitUntil: 'domcontentloaded',
    timeoutMs: 30000,
  });

  await sleep(3000);

  // 持续滚动直到没有新内容
  let noNewContentCount = 0;
  let scrollCount = 0;
  const maxNoNewContent = 5; // 连续 5 次没有新内容就停止

  while (
    noNewContentCount < maxNoNewContent
    && scrollCount < CONFIG.maxPages * CONFIG.scrollsPerPage
  ) {
    // 滚动到页面底部
    await session.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await sleep(CONFIG.delayBetweenScrolls);
    scrollCount++;

    // 提取当前页面的游记链接
    const urls = await session.page.evaluate(() => {
      const links = new Set<string>();
      const anchors = document.querySelectorAll('a[href*="/i/"]');
      anchors.forEach((a) => {
        const href = (a as HTMLAnchorElement).href;
        if (/\/i\/\d+\.html/.test(href)) {
          links.add(href);
        }
      });
      return Array.from(links);
    });

    // 统计新增的 URL
    let newCount = 0;
    for (const url of urls) {
      const externalId = extractExternalId(url);
      if (externalId && !seenIds.has(externalId)) {
        seenIds.add(externalId);
        allUrls.push({ url, externalId });
        newCount++;
      }
    }

    if (newCount === 0) {
      noNewContentCount++;
    }
    else {
      noNewContentCount = 0;
    }

    log(
      `Scroll ${scrollCount}: Found ${urls.length} links, ${newCount} new, total ${allUrls.length}`,
    );

    // 每 50 次滚动输出一次统计
    if (scrollCount % 50 === 0) {
      log(
        `Progress: ${allUrls.length} unique URLs collected after ${scrollCount} scrolls`,
      );
    }
  }

  stats.totalUrlsFound = allUrls.length;
  log(`List crawl complete: ${allUrls.length} unique URLs found`);

  return allUrls;
}

/**
 * 爬取单个游记详情
 */
async function crawlNoteDetail(
  session: BrowserSession,
  item: GuideListItem,
): Promise<GuideDetail | null> {
  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      // 转换为移动版 URL
      const mobileUrl = item.url.replace('www.mafengwo.cn', 'm.mafengwo.cn');

      await session.page.goto(mobileUrl, {
        waitUntil: 'domcontentloaded',
        timeoutMs: 30000,
      });

      await sleep(3000);

      // 提取详情
      const data = await session.page.evaluate(() => {
        // 提取标题
        const title
          = document
            .querySelector('meta[property="og:title"]')
            ?.getAttribute('content')
            || document.title.split('，')[0].split('|')[0].trim()
            || '';

        // 提取内容
        let content = '';
        const chapterEl = document.querySelector('.chapter-container');
        if (chapterEl) {
          content = chapterEl.textContent?.trim() || '';
        }
        else {
          const noteContent = document.querySelector(
            '.note-content, .note-body',
          );
          if (noteContent) {
            const clone = noteContent.cloneNode(true) as HTMLElement;
            clone
              .querySelectorAll(
                '.copyright, .recommend-note, .accusation-container, [class*="author"], [class*="avatar"], [class*="ad-container"]',
              )
              .forEach((el) => {
                el.remove();
              });
            content = clone.textContent?.trim() || '';
          }
        }

        content = content
          .replace(/图片占位符/g, '')
          .replace(/\s+/g, ' ')
          .replace(/加载更多内容/g, '')
          .trim();

        // 提取作者
        const author
          = document
            .querySelector('.note-content > div:first-child p')
            ?.textContent
            ?.trim()
            .split('\n')[0]
            || document
              .querySelector('meta[name="author"]')
              ?.getAttribute('content')
              || undefined;

        // 提取浏览量
        const pageText = document.body.textContent || '';
        const viewsMatch = pageText.match(
          /(\d+(?:\.\d+)?[万k]?)\s*(?:浏览|阅读)/i,
        );
        const views = viewsMatch?.[1] || undefined;

        // 提取点赞
        const likesMatch = pageText.match(
          /(\d+(?:\.\d+)?[万k]?)\s*(?:赞|喜欢)/i,
        );
        const likes = likesMatch?.[1] || undefined;

        // 提取图片
        const images: string[] = [];
        document
          .querySelectorAll(
            '.chapter-container img[src*="mafengwo"], .note-content img[src*="mafengwo"]',
          )
          .forEach((img) => {
            const src
              = (img as HTMLImageElement).src || img.getAttribute('data-src');
            if (
              src
              && !src.includes('avatar')
              && !src.includes('icon')
              && !src.includes('recommend')
            ) {
              images.push(src);
            }
          });

        const coverImage
          = document
            .querySelector('meta[property="og:image"]')
            ?.getAttribute('content')
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

      // 验证内容
      if (data.content.length < 100) {
        log(`Content too short for ${item.externalId}, retrying...`);
        continue;
      }

      return data;
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log(`Error crawling ${item.externalId} (attempt ${attempt}): ${message}`);

      if (attempt < CONFIG.maxRetries) {
        await sleep(2000);
      }
    }
  }

  return null;
}

// ============================================
// 保存到 Convex
// ============================================

async function saveToConvex(
  client: ConvexHttpClient,
  item: GuideListItem,
  detail: GuideDetail,
): Promise<boolean> {
  try {
    const qualityScore = calculateQualityScore(detail);

    await client.mutation(api.travelGuides.upsert, {
      sourcePlatform: 'mafengwo',
      sourceExternalId: item.externalId,
      sourceUrl: item.url,
      title: detail.title,
      content: detail.content,
      authorName: detail.author,
      destinations: [],
      tags: [],
      likesCount: parseChineseNumber(detail.likes),
      savesCount: 0,
      commentsCount: 0,
      viewsCount: parseChineseNumber(detail.views),
      coverImageUrl: detail.coverImage,
      imageUrls: detail.images,
      qualityScore,
    });

    return true;
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log(`Error saving ${item.externalId}: ${message}`);
    return false;
  }
}

// ============================================
// 主函数
// ============================================

async function main() {
  log('='.repeat(60));
  log('马蜂窝全量游记爬取开始');
  log('='.repeat(60));

  // 检查环境变量
  if (!process.env.KERNEL_API_KEY) {
    console.error('ERROR: KERNEL_API_KEY environment variable is required');
    process.exit(1);
  }

  if (!process.env.CONVEX_URL) {
    console.error('ERROR: CONVEX_URL environment variable is required');
    process.exit(1);
  }

  const convexClient = new ConvexHttpClient(process.env.CONVEX_URL);

  const stats: CrawlStats = {
    totalUrlsFound: 0,
    detailsCrawled: 0,
    detailsSaved: 0,
    errors: 0,
    startTime: Date.now(),
  };

  let session: BrowserSession | null = null;

  try {
    // 创建浏览器
    session = await createBrowser();

    // 1. 爬取游记列表
    log('\n--- Phase 1: Crawling note list ---');
    const noteList = await crawlNoteList(session, stats);

    if (noteList.length === 0) {
      log('No notes found, exiting.');
      return;
    }

    // 2. 爬取游记详情
    log('\n--- Phase 2: Crawling note details ---');
    log(`Total notes to crawl: ${noteList.length}`);

    for (let i = 0; i < noteList.length; i++) {
      const item = noteList[i];

      log(`\n[${i + 1}/${noteList.length}] Crawling: ${item.externalId}`);

      // 检查是否已存在
      try {
        const existing = await convexClient.query(
          api.travelGuides.getByPlatformAndExternalId,
          {
            sourcePlatform: 'mafengwo',
            sourceExternalId: item.externalId,
          },
        );

        if (existing) {
          log(`  -> Already exists, skipping`);
          continue;
        }
      }
      catch {
        // 查询失败，继续爬取
      }

      // 爬取详情
      const detail = await crawlNoteDetail(session, item);

      if (detail) {
        stats.detailsCrawled++;

        // 保存到 Convex
        const saved = await saveToConvex(convexClient, item, detail);
        if (saved) {
          stats.detailsSaved++;
          log(
            `  -> Saved: ${detail.title?.slice(0, 50)}... (${detail.content.length} chars)`,
          );
        }
        else {
          stats.errors++;
        }
      }
      else {
        stats.errors++;
        log(`  -> Failed to crawl`);
      }

      // 延迟避免被封
      await sleep(CONFIG.delayBetweenDetails);

      // 定期输出统计
      if ((i + 1) % 10 === 0) {
        const elapsed = (Date.now() - stats.startTime) / 1000 / 60;
        log(`\n--- Progress Report ---`);
        log(`  Processed: ${i + 1}/${noteList.length}`);
        log(`  Saved: ${stats.detailsSaved}`);
        log(`  Errors: ${stats.errors}`);
        log(`  Elapsed: ${elapsed.toFixed(1)} minutes`);
        log(`  Rate: ${((i + 1) / elapsed).toFixed(1)} notes/min`);
      }

      // 每 50 条重新创建浏览器（避免内存泄漏）
      if ((i + 1) % 50 === 0 && i + 1 < noteList.length) {
        log('\nRecreating browser session...');
        await closeBrowser(session);
        await sleep(5000);
        session = await createBrowser();
      }
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log(`Fatal error: ${message}`);
    stats.errors++;
  }
  finally {
    if (session) {
      await closeBrowser(session);
    }
  }

  // 输出最终统计
  const totalTime = (Date.now() - stats.startTime) / 1000 / 60;

  log(`\n${'='.repeat(60)}`);
  log('爬取完成！最终统计：');
  log('='.repeat(60));
  log(`  发现游记 URL: ${stats.totalUrlsFound}`);
  log(`  爬取详情: ${stats.detailsCrawled}`);
  log(`  保存成功: ${stats.detailsSaved}`);
  log(`  错误数: ${stats.errors}`);
  log(`  总耗时: ${totalTime.toFixed(1)} 分钟`);
  log(`  平均速度: ${(stats.detailsSaved / totalTime).toFixed(1)} 条/分钟`);
  log('='.repeat(60));
}

// 运行
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
