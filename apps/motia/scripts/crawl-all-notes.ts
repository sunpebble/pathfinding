#!/usr/bin/env npx tsx
/**
 * 马蜂窝全量游记爬取脚本 (多入口版)
 *
 * 使用方法：
 * cd apps/motia && npx tsx scripts/crawl-all-notes.ts
 *
 * 断点续传：
 * cd apps/motia && npx tsx scripts/crawl-all-notes.ts --start-entry 25
 *
 * 仅爬取详情（跳过列表收集）：
 * cd apps/motia && npx tsx scripts/crawl-all-notes.ts --details-only
 *
 * 环境变量：
 * - KERNEL_API_KEY: Kernel.sh API 密钥
 * - CONVEX_URL: Convex 部署 URL
 *
 * 多入口策略：
 * 1. 游记首页 (推荐游记)
 * 2. 热门城市游记列表 (北京、上海、成都、西安、杭州等)
 * 3. 按分类爬取 (国内、境外)
 */

import { Stagehand } from "@browserbasehq/stagehand";
import Kernel from "@onkernel/sdk";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api.js";

// ============================================
// 命令行参数解析
// ============================================

const args = process.argv.slice(2);
const startEntryIndex = args.includes("--start-entry")
  ? Number.parseInt(args[args.indexOf("--start-entry") + 1], 10) || 0
  : 0;
const detailsOnly = args.includes("--details-only");

// ============================================
// 配置
// ============================================

const CONFIG = {
  // 爬取配置
  maxScrollsPerEntry: 100, // 每个入口最大滚动次数
  delayBetweenScrolls: 2000, // 滚动间隔 (ms)
  delayBetweenDetails: 2000, // 详情爬取间隔 (ms) - 加快速度
  delayBetweenEntries: 3000, // 入口切换间隔 (ms) - 加快速度
  maxRetries: 3, // 最大重试次数

  // 停止条件
  maxNoNewContent: 5, // 连续多少次没有新内容就停止当前入口

  // 浏览器重建间隔
  browserRecycleInterval: 50, // 每爬取多少条详情重建浏览器 - 增加间隔减少重建

  // 目标数量 (0 = 无限制)
  targetCount: 0,

  // 断点续传
  startEntryIndex,
  detailsOnly,
};

// 多入口配置
const ENTRY_POINTS = [
  // 游记首页
  { name: "游记首页", url: "https://m.mafengwo.cn/note/" },

  // 热门国内城市
  {
    name: "北京",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10065.html",
  },
  {
    name: "上海",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10099.html",
  },
  {
    name: "成都",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10332.html",
  },
  {
    name: "西安",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10195.html",
  },
  {
    name: "杭州",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10156.html",
  },
  {
    name: "重庆",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10208.html",
  },
  {
    name: "广州",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10088.html",
  },
  {
    name: "深圳",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10392.html",
  },
  {
    name: "南京",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10173.html",
  },
  {
    name: "苏州",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10182.html",
  },
  {
    name: "厦门",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10132.html",
  },
  {
    name: "三亚",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10186.html",
  },
  {
    name: "丽江",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10487.html",
  },
  {
    name: "大理",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10487.html",
  },
  {
    name: "桂林",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10082.html",
  },
  {
    name: "青岛",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10444.html",
  },
  {
    name: "长沙",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10188.html",
  },
  {
    name: "武汉",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10126.html",
  },
  {
    name: "拉萨",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10065.html",
  },

  // 热门境外目的地
  {
    name: "日本",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10183.html",
  },
  {
    name: "东京",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10222.html",
  },
  {
    name: "大阪",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10765.html",
  },
  {
    name: "京都",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/11042.html",
  },
  {
    name: "泰国",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10083.html",
  },
  {
    name: "曼谷",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10088.html",
  },
  {
    name: "普吉岛",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10558.html",
  },
  {
    name: "新加坡",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10754.html",
  },
  {
    name: "马尔代夫",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/11327.html",
  },
  {
    name: "巴厘岛",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10460.html",
  },
  {
    name: "韩国",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10180.html",
  },
  {
    name: "首尔",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10073.html",
  },
  {
    name: "越南",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10180.html",
  },
  {
    name: "马来西亚",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10097.html",
  },
  {
    name: "法国",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10168.html",
  },
  {
    name: "巴黎",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10066.html",
  },
  {
    name: "意大利",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10179.html",
  },
  {
    name: "瑞士",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10192.html",
  },
  {
    name: "英国",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10174.html",
  },
  {
    name: "美国",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10062.html",
  },
  {
    name: "澳大利亚",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10181.html",
  },
  {
    name: "新西兰",
    url: "https://m.mafengwo.cn/travel-scenic-spot/mafengwo/10101.html",
  },
];

// ============================================
// 类型定义
// ============================================

interface GuideListItem {
  url: string;
  externalId: string;
  source: string;
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
  skipped: number;
  errors: number;
  startTime: number;
  entriesProcessed: number;
}

// ============================================
// 工具函数
// ============================================

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.warn(`[${timestamp}] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.warn(`[${timestamp}] ${message}`);
  }
}

function extractExternalId(url: string): string | null {
  const match = url.match(/\/i\/(\d+)\.html/);
  return match ? match[1] : null;
}

function parseChineseNumber(str: string | undefined): number {
  if (!str) return 0;
  const cleaned = str.trim();
  const match = cleaned.match(/^([\d.]+)\s*([万k])?/i);
  if (!match) return 0;
  const num = Number.parseFloat(match[1]);
  const unit = match[2]?.toLowerCase();
  if (unit === "万") return Math.round(num * 10000);
  if (unit === "k") return Math.round(num * 1000);
  return Math.round(num);
}

function calculateQualityScore(data: GuideDetail): number {
  let score = 0;
  if (data.title && data.title.length >= 5) score += 0.2;
  const contentLength = data.content?.length || 0;
  if (contentLength >= 500) score += 0.4;
  else if (contentLength >= 200) score += 0.3;
  else if (contentLength >= 100) score += 0.2;
  if (data.author) score += 0.1;
  const imageCount = data.images?.length || 0;
  if (imageCount >= 5) score += 0.2;
  else if (imageCount >= 1) score += 0.1;
  if (data.views || data.likes) score += 0.1;
  return Math.min(1, Math.round(score * 100) / 100);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  page: ReturnType<Stagehand["context"]["pages"]>[0];
}

async function createBrowser(): Promise<BrowserSession> {
  if (!process.env.KERNEL_API_KEY) {
    throw new Error("KERNEL_API_KEY environment variable is not set");
  }

  const kernel = new Kernel();
  const browser = await kernel.browsers.create({
    stealth: true,
    headless: false,
  });

  log("Browser created", {
    sessionId: browser.session_id,
    liveView: browser.browser_live_view_url,
  });

  const stagehandOptions: Record<string, unknown> = {
    env: "LOCAL",
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
  } catch {}
  try {
    await session.kernel.browsers.deleteByID(session.browser.session_id);
  } catch {}
  log("Browser closed");
}

// ============================================
// 爬取函数
// ============================================

/**
 * 从单个入口爬取游记列表
 */
async function crawlNoteListFromEntry(
  session: BrowserSession,
  entry: { name: string; url: string },
  globalSeenIds: Set<string>,
): Promise<GuideListItem[]> {
  const newUrls: GuideListItem[] = [];

  log(`\n--- Crawling entry: ${entry.name} ---`);
  log(`URL: ${entry.url}`);

  try {
    await session.page.goto(entry.url, {
      waitUntil: "domcontentloaded",
      timeoutMs: 30000,
    });

    await sleep(3000);

    // 持续滚动直到没有新内容
    let noNewContentCount = 0;
    let scrollCount = 0;

    while (
      noNewContentCount < CONFIG.maxNoNewContent &&
      scrollCount < CONFIG.maxScrollsPerEntry
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
        if (externalId && !globalSeenIds.has(externalId)) {
          globalSeenIds.add(externalId);
          newUrls.push({ url, externalId, source: entry.name });
          newCount++;
        }
      }

      if (newCount === 0) {
        noNewContentCount++;
      } else {
        noNewContentCount = 0;
      }

      // 每 20 次滚动输出一次
      if (scrollCount % 20 === 0) {
        log(
          `  Scroll ${scrollCount}: Found ${newUrls.length} new URLs from this entry`,
        );
      }
    }

    log(
      `  Entry complete: ${newUrls.length} new URLs after ${scrollCount} scrolls`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log(`  Error crawling entry ${entry.name}: ${message}`);
  }

  return newUrls;
}

/**
 * 从所有入口爬取游记列表
 */
async function crawlNoteListFromAllEntries(
  session: BrowserSession,
  stats: CrawlStats,
): Promise<GuideListItem[]> {
  const allUrls: GuideListItem[] = [];
  const seenIds = new Set<string>();

  log("Starting multi-entry list crawl...");
  log(
    `Total entries: ${ENTRY_POINTS.length}, starting from index ${CONFIG.startEntryIndex}`,
  );

  for (let i = CONFIG.startEntryIndex; i < ENTRY_POINTS.length; i++) {
    const entry = ENTRY_POINTS[i];

    log(`\n[Entry ${i + 1}/${ENTRY_POINTS.length}] ${entry.name}`);

    const newUrls = await crawlNoteListFromEntry(session, entry, seenIds);
    allUrls.push(...newUrls);
    stats.entriesProcessed++;

    log(`  Total URLs so far: ${allUrls.length}`);

    // 如果达到目标数量，提前结束
    if (CONFIG.targetCount > 0 && allUrls.length >= CONFIG.targetCount) {
      log(
        `\nReached target count of ${CONFIG.targetCount}, stopping list crawl`,
      );
      break;
    }

    // 入口切换延迟
    if (i < ENTRY_POINTS.length - 1) {
      await sleep(CONFIG.delayBetweenEntries);
    }
  }

  stats.totalUrlsFound = allUrls.length;
  log(
    `\nList crawl complete: ${allUrls.length} unique URLs from ${stats.entriesProcessed} entries`,
  );

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
      const mobileUrl = item.url.replace("www.mafengwo.cn", "m.mafengwo.cn");

      await session.page.goto(mobileUrl, {
        waitUntil: "domcontentloaded",
        timeoutMs: 30000,
      });

      await sleep(3000);

      // 提取详情
      const data = await session.page.evaluate(() => {
        // 提取标题
        const title =
          document
            .querySelector('meta[property="og:title"]')
            ?.getAttribute("content") ||
          document.title.split("，")[0].split("|")[0].trim() ||
          "";

        // 提取内容
        let content = "";
        const chapterEl = document.querySelector(".chapter-container");
        if (chapterEl) {
          content = chapterEl.textContent?.trim() || "";
        } else {
          const noteContent = document.querySelector(
            ".note-content, .note-body",
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
            content = clone.textContent?.trim() || "";
          }
        }

        content = content
          .replace(/图片占位符/g, "")
          .replace(/\s+/g, " ")
          .replace(/加载更多内容/g, "")
          .trim();

        // 提取作者
        const author =
          document
            .querySelector(".note-content > div:first-child p")
            ?.textContent?.trim()
            .split("\n")[0] ||
          document
            .querySelector('meta[name="author"]')
            ?.getAttribute("content") ||
          undefined;

        // 提取浏览量和点赞
        const pageText = document.body.textContent || "";
        const viewsMatch = pageText.match(
          /(\d+(?:\.\d+)?[万k]?)\s*(?:浏览|阅读)/i,
        );
        const views = viewsMatch?.[1] || undefined;

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
            const src =
              (img as HTMLImageElement).src || img.getAttribute("data-src");
            if (
              src &&
              !src.includes("avatar") &&
              !src.includes("icon") &&
              !src.includes("recommend")
            ) {
              images.push(src);
            }
          });

        const coverImage =
          document
            .querySelector('meta[property="og:image"]')
            ?.getAttribute("content") ||
          images[0] ||
          undefined;

        return { title, content, author, views, likes, coverImage, images };
      });

      // 验证内容
      if (data.content.length < 100) {
        log(
          `Content too short for ${item.externalId} (${data.content.length} chars), retrying...`,
        );
        await sleep(2000);
        continue;
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
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
      sourcePlatform: "mafengwo",
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log(`Error saving ${item.externalId}: ${message}`);
    return false;
  }
}

async function checkExists(
  client: ConvexHttpClient,
  externalId: string,
): Promise<boolean> {
  try {
    const existing = await client.query(
      api.travelGuides.getByPlatformAndExternalId,
      {
        sourcePlatform: "mafengwo",
        sourceExternalId: externalId,
      },
    );
    return existing !== null;
  } catch {
    return false;
  }
}

// ============================================
// 主函数
// ============================================

async function main() {
  log("=".repeat(60));
  log("马蜂窝全量游记爬取开始 (多入口版)");
  log("=".repeat(60));

  // 显示配置
  if (CONFIG.startEntryIndex > 0) {
    log(`断点续传模式：从入口 ${CONFIG.startEntryIndex} 开始`);
  }
  if (CONFIG.detailsOnly) {
    log("仅详情模式：跳过列表收集，直接爬取已有URL");
  }

  // 检查环境变量
  if (!process.env.KERNEL_API_KEY) {
    console.error("ERROR: KERNEL_API_KEY environment variable is required");
    process.exit(1);
  }

  if (!process.env.CONVEX_URL) {
    console.error("ERROR: CONVEX_URL environment variable is required");
    process.exit(1);
  }

  const convexClient = new ConvexHttpClient(process.env.CONVEX_URL);

  const stats: CrawlStats = {
    totalUrlsFound: 0,
    detailsCrawled: 0,
    detailsSaved: 0,
    skipped: 0,
    errors: 0,
    startTime: Date.now(),
    entriesProcessed: 0,
  };

  let session: BrowserSession | null = null;

  try {
    // 创建浏览器
    session = await createBrowser();

    // 1. 从所有入口爬取游记列表
    log("\n--- Phase 1: Crawling note lists from all entries ---");
    const noteList = await crawlNoteListFromAllEntries(session, stats);

    if (noteList.length === 0) {
      log("No new notes found from entries, exiting.");
      return;
    }

    // 2. 爬取游记详情
    log("\n--- Phase 2: Crawling note details ---");
    log(`Total notes to crawl: ${noteList.length}`);

    let detailsSinceRecycle = 0;

    for (let i = 0; i < noteList.length; i++) {
      const item = noteList[i];

      // 检查是否需要重建浏览器
      if (detailsSinceRecycle >= CONFIG.browserRecycleInterval) {
        log("\nRecycling browser session...");
        await closeBrowser(session);
        await sleep(5000);
        session = await createBrowser();
        detailsSinceRecycle = 0;
      }

      // 检查是否已存在
      const exists = await checkExists(convexClient, item.externalId);
      if (exists) {
        stats.skipped++;
        if (stats.skipped % 50 === 0) {
          log(
            `[${i + 1}/${noteList.length}] Skipped ${stats.skipped} existing notes`,
          );
        }
        continue;
      }

      log(
        `[${i + 1}/${noteList.length}] Crawling: ${item.externalId} (from ${item.source})`,
      );

      // 爬取详情
      const detail = await crawlNoteDetail(session, item);

      if (detail) {
        stats.detailsCrawled++;
        detailsSinceRecycle++;

        // 保存到 Convex
        const saved = await saveToConvex(convexClient, item, detail);
        if (saved) {
          stats.detailsSaved++;
          log(
            `  -> Saved: ${detail.title?.slice(0, 40)}... (${detail.content.length} chars, ${detail.images.length} images)`,
          );
        } else {
          stats.errors++;
        }
      } else {
        stats.errors++;
        log(`  -> Failed to crawl`);
      }

      // 延迟避免被封
      await sleep(CONFIG.delayBetweenDetails);

      // 定期输出统计
      if ((stats.detailsCrawled + stats.errors) % 10 === 0) {
        const elapsed = (Date.now() - stats.startTime) / 1000 / 60;
        const processed = stats.detailsCrawled + stats.errors;
        log(`\n--- Progress Report ---`);
        log(
          `  Progress: ${i + 1}/${noteList.length} (${(((i + 1) / noteList.length) * 100).toFixed(1)}%)`,
        );
        log(
          `  Saved: ${stats.detailsSaved}, Skipped: ${stats.skipped}, Errors: ${stats.errors}`,
        );
        log(
          `  Elapsed: ${elapsed.toFixed(1)} min, Rate: ${(processed / elapsed).toFixed(1)}/min`,
        );
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log(`Fatal error: ${message}`);
    stats.errors++;
  } finally {
    if (session) {
      await closeBrowser(session);
    }
  }

  // 输出最终统计
  const totalTime = (Date.now() - stats.startTime) / 1000 / 60;

  log(`\n${"=".repeat(60)}`);
  log("爬取完成！最终统计：");
  log("=".repeat(60));
  log(`  处理入口数: ${stats.entriesProcessed}`);
  log(`  发现游记 URL: ${stats.totalUrlsFound}`);
  log(`  爬取详情: ${stats.detailsCrawled}`);
  log(`  保存成功: ${stats.detailsSaved}`);
  log(`  跳过已存在: ${stats.skipped}`);
  log(`  错误数: ${stats.errors}`);
  log(`  总耗时: ${totalTime.toFixed(1)} 分钟`);
  if (stats.detailsSaved > 0) {
    log(`  平均速度: ${(stats.detailsSaved / totalTime).toFixed(1)} 条/分钟`);
  }
  log("=".repeat(60));
}

// 运行
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
