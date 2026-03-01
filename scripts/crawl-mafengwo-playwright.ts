#!/usr/bin/env npx tsx
/**
 * 马蜂窝游记爬取脚本 — Playwright 本地浏览器版
 *
 * 使用 Playwright Chromium 代替 Kernel.sh 云浏览器，
 * 可通过 WAF 验证，无需 KERNEL_API_KEY。
 *
 * 用法：
 *   DATABASE_URL="mysql://root@127.0.0.1:4000/pathfinding" npx tsx scripts/crawl-mafengwo-playwright.ts
 *
 * 选项（通过环境变量）：
 *   MAX_NOTES=50        最大爬取条数（默认 50）
 *   HEADLESS=false       显示浏览器窗口（默认 true）
 *   SCROLL_COUNT=15      列表页滚动次数（默认 15）
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import { and, eq } from 'drizzle-orm';
import { chromium } from 'playwright';
import { createDb, travelGuides } from '../packages/database/src/index';

// ============================================
// 配置
// ============================================

const CONFIG = {
  maxNotes: Number(process.env.MAX_NOTES) || 50,
  headless: process.env.HEADLESS !== 'false',
  scrollCount: Number(process.env.SCROLL_COUNT) || 15,
  delayBetweenScrolls: 2000,
  delayBetweenDetails: 3000 + Math.random() * 2000,
  maxRetries: 3,
  pageTimeout: 30000,
  waitAfterLoad: 5000,
};

// 入口 URL — 只使用包含 /i/ 游记链接的页面
const ENTRY_URLS = [
  'https://m.mafengwo.cn/note/', // 游记首页（主要链接来源）
  'https://m.mafengwo.cn/note/l-10065.html', // 北京游记
  'https://m.mafengwo.cn/note/l-10099.html', // 成都游记
  'https://m.mafengwo.cn/note/l-10264.html', // 西安游记
  'https://m.mafengwo.cn/note/l-10088.html', // 杭州游记
  'https://m.mafengwo.cn/note/l-10208.html', // 重庆游记
  'https://m.mafengwo.cn/note/l-10161.html', // 丽江游记
  'https://m.mafengwo.cn/note/l-10189.html', // 厦门游记
  'https://m.mafengwo.cn/note/l-14947.html', // 大理游记
  'https://m.mafengwo.cn/note/l-10183.html', // 东京游记
  'https://m.mafengwo.cn/note/l-11042.html', // 大阪游记
  'https://m.mafengwo.cn/note/l-10759.html', // 曼谷游记
  'https://m.mafengwo.cn/note/l-10754.html', // 清迈游记
  'https://m.mafengwo.cn/note/l-11049.html', // 巴厘岛游记
  'https://m.mafengwo.cn/note/l-10542.html', // 首尔游记
  'https://m.mafengwo.cn/note/l-14107.html', // 巴黎游记
];

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
}

interface CrawlStats {
  totalUrlsFound: number;
  detailsCrawled: number;
  detailsSaved: number;
  errors: number;
  skipped: number;
  startTime: number;
}

// ============================================
// 工具函数
// ============================================

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString().slice(11, 19);
  if (data) {
    console.log(`[${timestamp}] ${message}`, typeof data === 'string' ? data : JSON.stringify(data));
  }
  else {
    console.log(`[${timestamp}] ${message}`);
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
  const match = cleaned.match(/([\d.]+)\s*([万k])?/i);
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

function randomDelay(base: number, variance: number = 1000): number {
  return base + Math.random() * variance;
}

// ============================================
// 浏览器管理
// ============================================

async function createBrowser(): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  log('启动 Chromium 浏览器...');

  const browser = await chromium.launch({
    headless: CONFIG.headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  // 注入反检测脚本
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const page = await context.newPage();
  page.setDefaultTimeout(CONFIG.pageTimeout);

  log('浏览器已启动');
  return { browser, context, page };
}

// ============================================
// 爬取函数
// ============================================

/**
 * 从列表页/目的地页收集游记 URL
 */
async function collectNoteUrls(
  page: Page,
  entryUrls: string[],
  maxTotal: number,
): Promise<GuideListItem[]> {
  const allItems: GuideListItem[] = [];
  const seenIds = new Set<string>();

  for (const entryUrl of entryUrls) {
    if (allItems.length >= maxTotal)
      break;

    log(`访问入口页: ${entryUrl}`);

    try {
      await page.goto(entryUrl, { waitUntil: 'domcontentloaded', timeout: CONFIG.pageTimeout });
      await sleep(CONFIG.waitAfterLoad);

      // 滚动加载更多内容
      for (let scroll = 0; scroll < CONFIG.scrollCount; scroll++) {
        if (allItems.length >= maxTotal)
          break;

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await sleep(randomDelay(CONFIG.delayBetweenScrolls, 1000));

        // 提取游记链接
        const urls = await page.evaluate(() => {
          const links = new Set<string>();
          document.querySelectorAll('a[href*="/i/"]').forEach((a) => {
            const href = (a as HTMLAnchorElement).href;
            if (/\/i\/\d+\.html/.test(href)) {
              links.add(href);
            }
          });
          return Array.from(links);
        });

        let newCount = 0;
        for (const url of urls) {
          const externalId = extractExternalId(url);
          if (externalId && !seenIds.has(externalId)) {
            seenIds.add(externalId);
            allItems.push({ url, externalId });
            newCount++;
          }
        }

        if (newCount > 0) {
          log(`  滚动 ${scroll + 1}: 新增 ${newCount} 条, 总计 ${allItems.length}`);
        }
      }
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`  入口页加载失败: ${message.slice(0, 100)}`);
    }
  }

  return allItems.slice(0, maxTotal);
}

/**
 * 爬取单个游记详情页
 */
async function crawlNoteDetail(page: Page, item: GuideListItem): Promise<GuideDetail | null> {
  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const mobileUrl = item.url.replace('www.mafengwo.cn', 'm.mafengwo.cn');

      await page.goto(mobileUrl, { waitUntil: 'domcontentloaded', timeout: CONFIG.pageTimeout });
      await sleep(randomDelay(CONFIG.waitAfterLoad, 2000));

      // 滚动页面确保图片和内容加载
      await page.evaluate(async () => {
        for (let i = 0; i < 5; i++) {
          window.scrollBy(0, window.innerHeight);
          await new Promise(r => setTimeout(r, 500));
        }
        window.scrollTo(0, 0);
      });

      await sleep(1500);

      // 用与 Kernel.sh 版本完全相同的 DOM 选择器提取数据
      const data = await page.evaluate(() => {
        // 提取标题
        const title
          = document.querySelector('meta[property="og:title"]')?.getAttribute('content')
            || document.title.split('，')[0].split('|')[0].trim()
            || '';

        // 提取内容
        let content = '';
        const chapterEl = document.querySelector('.chapter-container');
        if (chapterEl) {
          content = chapterEl.textContent?.trim() || '';
        }
        else {
          const noteContent = document.querySelector('.note-content, .note-body, .article-content');
          if (noteContent) {
            const clone = noteContent.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('.copyright, .recommend-note, .accusation-container, [class*="author"], [class*="avatar"], [class*="ad-container"]').forEach((el) => {
              el.remove();
            });
            content = clone.textContent?.trim() || '';
          }
        }

        // 如果以上都没拿到，尝试 body 中间部分作为 fallback
        if (!content || content.length < 50) {
          const bodyText = document.body.textContent || '';
          // 尝试去掉头尾导航内容
          const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 10);
          if (lines.length > 5) {
            content = lines.slice(2, -2).join('\n');
          }
        }

        content = content
          .replace(/图片占位符/g, '')
          .replace(/\s+/g, ' ')
          .replace(/加载更多内容/g, '')
          .replace(/查看原文|展开全文|点击展开/g, '')
          .trim();

        // 提取作者
        const author
          = document.querySelector('.user-name, .author-name, .note-author')?.textContent?.trim()
            || document.querySelector('meta[name="author"]')?.getAttribute('content')
            || document.querySelector('.note-content > div:first-child p')?.textContent?.trim().split('\n')[0]
            || undefined;

        // 提取浏览量
        const pageText = document.body.textContent || '';
        const viewsMatch = pageText.match(/(\d+(?:\.\d+)?[万k]?)\s*(?:浏览|阅读)/i);
        const views = viewsMatch?.[1] || undefined;

        // 提取点赞
        const likesMatch = pageText.match(/(\d+(?:\.\d+)?[万k]?)\s*(?:赞|喜欢)/i);
        const likes = likesMatch?.[1] || undefined;

        // 提取图片
        const images: string[] = [];
        const imgSelectors = [
          '.chapter-container img[src]',
          '.note-content img[src]',
          '.article-content img[src]',
          'img[src*="mafengwo"]',
        ];

        for (const selector of imgSelectors) {
          document.querySelectorAll(selector).forEach((img) => {
            const src = (img as HTMLImageElement).src || img.getAttribute('data-src') || '';
            if (
              src
              && src.startsWith('http')
              && !src.includes('avatar')
              && !src.includes('icon')
              && !src.includes('recommend')
              && !src.includes('logo')
              && !src.includes('emoji')
              && !images.includes(src)
            ) {
              images.push(src);
            }
          });
          if (images.length > 0)
            break;
        }

        const coverImage
          = document.querySelector('meta[property="og:image"]')?.getAttribute('content')
            || images[0]
            || undefined;

        return { title, content, author, views, likes, coverImage, images };
      });

      // 验证内容
      if (!data.content || data.content.length < 50) {
        if (attempt < CONFIG.maxRetries) {
          log(`  内容过短 (${data.content?.length || 0} 字), 重试 ${attempt}/${CONFIG.maxRetries}...`);
          await sleep(3000);
          continue;
        }
        log(`  内容过短，跳过: ${item.externalId}`);
        return null;
      }

      return data;
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`  爬取出错 ${item.externalId} (尝试 ${attempt}): ${message.slice(0, 80)}`);
      if (attempt < CONFIG.maxRetries) {
        await sleep(randomDelay(3000, 2000));
      }
    }
  }

  return null;
}

// ============================================
// 保存到 TiDB
// ============================================

async function saveToTiDB(
  db: ReturnType<typeof createDb>,
  item: GuideListItem,
  detail: GuideDetail,
): Promise<boolean> {
  try {
    const qualityScore = calculateQualityScore(detail);

    const guideData = {
      platform: 'mafengwo',
      externalId: item.externalId,
      title: detail.title || item.externalId,
      content: detail.content,
      authorName: detail.author ?? null,
      sourceUrl: item.url,
      coverImageUrl: detail.coverImage ?? null,
      imageUrls: detail.images,
      destinations: [] as string[],
      tags: [] as string[],
      viewCount: parseChineseNumber(detail.views),
      likeCount: parseChineseNumber(detail.likes),
      commentCount: 0,
      qualityScore,
      crawledAt: new Date(),
      lastUpdatedAt: new Date(),
    };

    // 检查是否已存在（upsert）
    const existing = await db
      .select({ id: travelGuides.id })
      .from(travelGuides)
      .where(
        and(
          eq(travelGuides.platform, 'mafengwo'),
          eq(travelGuides.externalId, item.externalId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await db.update(travelGuides).set(guideData).where(eq(travelGuides.id, existing[0]!.id));
    }
    else {
      await db.insert(travelGuides).values(guideData);
    }

    return true;
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`  保存失败 ${item.externalId}: ${message.slice(0, 80)}`);
    return false;
  }
}

// ============================================
// 主函数
// ============================================

async function main() {
  console.log(`\n${'='.repeat(50)}`);
  console.log('  马蜂窝游记爬取 — Playwright 本地浏览器版');
  console.log('='.repeat(50));
  console.log(`  最大条数: ${CONFIG.maxNotes}`);
  console.log(`  Headless: ${CONFIG.headless}`);
  console.log(`  入口页数: ${ENTRY_URLS.length}`);
  console.log(`${'='.repeat(50)}\n`);

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL 环境变量未设置');
    console.error('  示例: DATABASE_URL="mysql://root@127.0.0.1:4000/pathfinding"');
    process.exit(1);
  }

  const db = createDb();
  const stats: CrawlStats = {
    totalUrlsFound: 0,
    detailsCrawled: 0,
    detailsSaved: 0,
    errors: 0,
    skipped: 0,
    startTime: Date.now(),
  };

  let browser: Browser | null = null;

  try {
    // 1. 启动浏览器
    const session = await createBrowser();
    browser = session.browser;
    const page = session.page;

    // 2. 收集游记 URL
    log('\n--- 阶段 1: 收集游记链接 ---');
    const noteList = await collectNoteUrls(page, ENTRY_URLS, CONFIG.maxNotes);
    stats.totalUrlsFound = noteList.length;

    if (noteList.length === 0) {
      log('未找到任何游记链接，退出');
      return;
    }

    log(`\n共收集到 ${noteList.length} 条游记链接\n`);

    // 3. 逐条爬取详情
    log('--- 阶段 2: 爬取游记详情 ---');

    for (let i = 0; i < noteList.length; i++) {
      const item = noteList[i];
      const progress = `[${i + 1}/${noteList.length}]`;

      // 先检查是否已存在
      try {
        const existing = await db
          .select({ id: travelGuides.id })
          .from(travelGuides)
          .where(
            and(
              eq(travelGuides.platform, 'mafengwo'),
              eq(travelGuides.externalId, item.externalId),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          log(`${progress} 已存在，跳过: ${item.externalId}`);
          stats.skipped++;
          continue;
        }
      }
      catch {
        // 查询失败，继续爬取
      }

      log(`${progress} 爬取: ${item.externalId}`);

      const detail = await crawlNoteDetail(page, item);

      if (detail) {
        stats.detailsCrawled++;

        const saved = await saveToTiDB(db, item, detail);
        if (saved) {
          stats.detailsSaved++;
          const titlePreview = detail.title?.slice(0, 40) || '无标题';
          log(`${progress} ✓ ${titlePreview} (${detail.content.length} 字, ${detail.images.length} 图)`);
        }
        else {
          stats.errors++;
        }
      }
      else {
        stats.errors++;
        log(`${progress} ✗ 爬取失败`);
      }

      // 随机延迟避免被封
      if (i < noteList.length - 1) {
        await sleep(randomDelay(CONFIG.delayBetweenDetails, 2000));
      }

      // 定期输出统计
      if ((i + 1) % 10 === 0) {
        const elapsed = (Date.now() - stats.startTime) / 1000 / 60;
        log(`\n--- 进度报告 ---`);
        log(`  已处理: ${i + 1}/${noteList.length}`);
        log(`  已保存: ${stats.detailsSaved}`);
        log(`  已跳过: ${stats.skipped}`);
        log(`  错误数: ${stats.errors}`);
        log(`  耗时: ${elapsed.toFixed(1)} 分钟\n`);
      }
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`致命错误: ${message}`);
    stats.errors++;
  }
  finally {
    if (browser) {
      await browser.close();
      log('浏览器已关闭');
    }
  }

  // 输出最终统计
  const totalTime = (Date.now() - stats.startTime) / 1000 / 60;

  console.log(`\n${'='.repeat(50)}`);
  console.log('  爬取完成！统计：');
  console.log('='.repeat(50));
  console.log(`  发现链接:  ${stats.totalUrlsFound}`);
  console.log(`  爬取详情:  ${stats.detailsCrawled}`);
  console.log(`  保存成功:  ${stats.detailsSaved}`);
  console.log(`  已跳过:    ${stats.skipped}`);
  console.log(`  错误数:    ${stats.errors}`);
  console.log(`  总耗时:    ${totalTime.toFixed(1)} 分钟`);
  if (stats.detailsSaved > 0) {
    console.log(`  平均速度:  ${(stats.detailsSaved / totalTime).toFixed(1)} 条/分钟`);
  }
  console.log(`${'='.repeat(50)}\n`);
}

// 运行
main().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('未捕获错误:', error);
  process.exit(1);
});
