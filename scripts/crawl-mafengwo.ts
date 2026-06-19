#!/usr/bin/env npx tsx
/**
 * Mafengwo travel note crawler — full Playwright mode
 *
 * Mafengwo deploys Tencent Chaos VM WAF on ALL pages (not just entry pages).
 * WAF cookies are path-bound, so cookies from /note/ cannot be reused for
 * /i/{id}.html detail pages. Therefore, ALL pages must be loaded via a real
 * browser.
 *
 * Architecture:
 *   - Single persistent Playwright browser with multiple contexts
 *   - Phase 1: Visit entry pages, extract seed note IDs from rendered HTML
 *   - Phase 2: Visit each note detail page, extract content + snowball IDs
 *   - Contexts are reused across pages for cookie persistence
 *
 * Usage:
 *   DATABASE_URL="mysql://root@127.0.0.1:4000/pathfinding" npx tsx scripts/crawl-mafengwo.ts
 *
 * Options (env vars):
 *   MAX_NOTES=0          Max notes to crawl, 0 = unlimited (default 0)
 *   HEADLESS=true        Hide browser during crawling (default true)
 *   CONCURRENCY=2        Concurrent browser tabs (default 2, max 4)
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import * as cheerio from 'cheerio';
import { and, eq } from 'drizzle-orm';
import { chromium } from 'playwright';
import { normalizeGuide } from '../packages/api/src/services/guide-normalize.js';
import { persistIngestedGuide } from '../packages/api/src/services/guide-writer.js';
import { createDb, travelGuides } from '../packages/database/src/index';

// ============================================
// Config
// ============================================

const CONFIG = {
  maxNotes: Number(process.env.MAX_NOTES) || 0,
  headless: process.env.HEADLESS !== 'false',
  concurrency: Math.min(Number(process.env.CONCURRENCY) || 2, 4),
  recrawlExisting: process.env.RECRAWL_EXISTING === 'true',
  recrawlExistingLimit: Number(process.env.RECRAWL_EXISTING_LIMIT) || 0,
  delayBetweenPages: 3000,
  pageTimeout: 30000,
  overallPageTimeout: 60000, // hard kill for entire loadPage call
  maxRetries: 2,
  seedApiPages: Number(process.env.SEED_API_PAGES) || 10, // pages per destination in seed API
  collectSeeds: process.env.SEED_COLLECTION === 'true'
    || (process.env.SEED_COLLECTION !== 'false' && process.env.RECRAWL_EXISTING !== 'true'),
  probeIdSpace: process.env.PROBE_ID_SPACE === 'true'
    || (process.env.PROBE_ID_SPACE !== 'false' && process.env.RECRAWL_EXISTING !== 'true'),
};

const MOBILE_UA
  = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// ============================================
// Destination list for seed collection
// ============================================

// Top destinations by mdd ID — from sitemap mdd-0.xml and popular pages
const SEED_DESTINATIONS = [
  // China
  { id: '10065', name: 'Beijing' },
  { id: '10099', name: 'Chengdu' },
  { id: '10088', name: 'Hangzhou' },
  { id: '10208', name: 'Chongqing' },
  { id: '10035', name: 'Shanghai' },
  { id: '10189', name: 'Xiamen' },
  { id: '10195', name: 'Sanya' },
  { id: '10156', name: 'Kunming' },
  { id: '10009', name: 'HongKong' },
  { id: '10206', name: 'Xian' },
  { id: '10160', name: 'Lijiang' },
  { id: '10067', name: 'Nanjing' },
  { id: '10264', name: 'Guilin' },
  { id: '10076', name: 'Suzhou' },
  { id: '10186', name: 'Dali' },
  { id: '10366', name: 'Zhangjiajie' },
  { id: '10161', name: 'Shangri-La' },
  { id: '10053', name: 'Qingdao' },
  { id: '10101', name: 'Jiuzhaigou' },
  { id: '10199', name: 'Gulangyu' },
  { id: '10036', name: 'Tianjin' },
  { id: '10059', name: 'Harbin' },
  { id: '10212', name: 'Lhasa' },
  { id: '10105', name: 'Luoyang' },
  { id: '10013', name: 'Macau' },
  { id: '10078', name: 'Wuxi' },
  { id: '10376', name: 'Huangshan' },
  { id: '10068', name: 'Yangzhou' },
  // International
  { id: '10183', name: 'Tokyo' },
  { id: '10759', name: 'Bangkok' },
  { id: '10542', name: 'Seoul' },
  { id: '14107', name: 'Paris' },
  { id: '10754', name: 'Singapore' },
  { id: '11214', name: 'Osaka' },
  { id: '10222', name: 'Taipei' },
  { id: '10083', name: 'London' },
  { id: '21536', name: 'Bali' },
  { id: '10062', name: 'NewYork' },
  { id: '10665', name: 'Phuket' },
  { id: '11798', name: 'KualaLumpur' },
  { id: '10680', name: 'ChiangMai' },
  { id: '10046', name: 'Sydney' },
  { id: '10190', name: 'Kyoto' },
  { id: '10234', name: 'Rome' },
  { id: '10044', name: 'Melbourne' },
  { id: '21200', name: 'Santorini' },
];

// ============================================
// Types
// ============================================

interface GuideDetail {
  title: string;
  content: string;
  contentHtml?: string;
  author?: string;
  views?: string;
  likes?: string;
  coverImage?: string;
  images: string[];
  relatedNoteIds: string[];
}

interface CrawlStats {
  seedsCollected: number;
  detailsCrawled: number;
  detailsSaved: number;
  errors: number;
  skipped: number;
  snowballDiscovered: number;
  startTime: number;
}

// ============================================
// Utilities
// ============================================

function log(message: string) {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.warn(`[${timestamp}] ${message}`);
}

function extractAllNoteIds(html: string): string[] {
  const ids = new Set<string>();
  const regex = /\/i\/(\d+)\.html/g;
  for (const match of html.matchAll(regex)) {
    ids.add(match[1]);
  }
  return Array.from(ids);
}

function collectGuideImages(detail: GuideDetail): string[] {
  const images = new Set<string>();
  if (detail.coverImage)
    images.add(detail.coverImage);
  for (const image of detail.images) {
    images.add(image);
  }
  return Array.from(images);
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(base: number, variance: number = 1000): number {
  return base + Math.random() * variance;
}

// ============================================
// Browser pool
// ============================================

let _browser: Browser;
const _contexts: BrowserContext[] = [];

async function initBrowser(): Promise<void> {
  _browser = await chromium.launch({
    headless: CONFIG.headless,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  // Create concurrent contexts (each has its own cookie jar)
  for (let i = 0; i < CONFIG.concurrency; i++) {
    const ctx = await _browser.newContext({
      userAgent: MOBILE_UA,
      viewport: { width: 390, height: 844 },
      locale: 'zh-CN',
      timezoneId: 'Asia/Shanghai',
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    _contexts.push(ctx);
  }

  log(`Browser initialized with ${CONFIG.concurrency} contexts`);
}

async function closeBrowser(): Promise<void> {
  for (const ctx of _contexts) {
    await ctx.close().catch(() => {});
  }
  await _browser?.close().catch(() => {});
}

/**
 * Navigate to a URL in a given context, wait for content to render,
 * return the full page HTML. Wrapped in an overall timeout to prevent hangs.
 */
async function loadPage(contextIndex: number, url: string): Promise<string | null> {
  return Promise.race([
    _loadPageInner(contextIndex, url),
    sleep(CONFIG.overallPageTimeout).then(() => {
      log(`  Overall timeout (${CONFIG.overallPageTimeout}ms) for ${url}`);
      return null;
    }),
  ]);
}

async function _loadPageInner(contextIndex: number, url: string): Promise<string | null> {
  const ctx = _contexts[contextIndex % _contexts.length];

  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    let page: Page | null = null;
    try {
      page = await ctx.newPage();
      page.setDefaultTimeout(CONFIG.pageTimeout);

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: CONFIG.pageTimeout });
      await sleep(3000); // wait for JS rendering

      // Scroll down to trigger lazy loading
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
      await sleep(1500);

      const html = await page.content();

      // Check if we got WAF challenge
      if (html.includes('__TENCENT_CHAOS_VM') || html.includes('probe.js')) {
        log(`  WAF challenge on attempt ${attempt} for ${url}`);
        await page.close();
        page = null;
        if (attempt < CONFIG.maxRetries) {
          await sleep(randomDelay(5000, 3000));
          continue;
        }
        return null;
      }

      await page.close();
      return html;
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`  Page load error (attempt ${attempt}): ${message.slice(0, 80)}`);
      if (page)
        await page.close().catch(() => {});
      if (attempt < CONFIG.maxRetries) {
        await sleep(randomDelay(3000, 2000));
      }
    }
  }
  return null;
}

// ============================================
// Detail page extraction
// ============================================

function extractDetail(html: string): GuideDetail | null {
  const $ = cheerio.load(html);

  const title = (
    $('meta[property="og:title"]').attr('content')
    ?? $('title').text().split('\uFF0C')[0]?.split('|')[0]
    ?? ''
  ).trim();

  const contentSelectors = [
    '.chapter-container',
    '.note-content',
    '._j_content',
    '.post_content',
    '.rich_text_content',
    '#_j_note_content',
    'article',
    'main',
  ].join(', ');
  const contentContainer = $(contentSelectors).first();
  const contentRoot = contentContainer.length > 0 ? contentContainer.clone() : $('body').clone();
  if (contentRoot.length === 0)
    return null;

  const removeSelectors = [
    'script',
    'style',
    'iframe',
    'nav',
    'footer',
    '.copyright',
    '.copy_right',
    '[class*="copyright"]',
    '.recommend',
    '.rec_wrap',
    '[class*="recommend"]',
    '.ad_container',
    '.ad-container',
    '[class*="ad_"]',
    '[class*="ad-"]',
    '[id*="ad_"]',
    '.share_wrap',
    '.share-wrap',
    '[class*="share"]',
    '.comment_list',
    '.comment-list',
    '[class*="comment"]',
    '.related',
    '[class*="related"]',
    '.footer',
    '[class*="footer"]',
    '.sidebar',
    '[class*="sidebar"]',
    '.nav',
    '[class*="nav"]',
  ].join(', ');
  contentRoot.find(removeSelectors).remove();

  const contentHtml = contentContainer.length > 0 ? contentRoot.html()?.trim() : undefined;
  let content = contentRoot
    .text()
    .replace(/\s+/g, ' ')
    .trim();

  // Remove common noise
  content = content
    .replace(/\u56FE\u7247\u5360\u4F4D\u7B26/g, '')
    .replace(/\u52A0\u8F7D\u66F4\u591A\u5185\u5BB9/g, '')
    .replace(/\u67E5\u770B\u539F\u6587|\u5C55\u5F00\u5168\u6587|\u70B9\u51FB\u5C55\u5F00/g, '')
    .replace(/\u9A6C\u8702\u7A9D.*?\u6E38\u8BB0/g, '') // 马蜂窝...游记
    .trim();

  if (content.length < 100)
    return null;

  // Author
  const author = $('.author-name, .user_name a, .name a, .headinfo .name, [class*="author"] a')
    .first()
    .text()
    .trim() || undefined;

  // Views/Likes from rendered text
  const viewsMatch = content.match(/(\d+(?:\.\d+)?[\u4E07k]?)\s*(?:\u6D4F\u89C8|\u9605\u8BFB)/i);
  const views = viewsMatch?.[1] || undefined;
  const likesMatch = content.match(/(\d+(?:\.\d+)?[\u4E07k]?)\s*(?:\u8D5E|\u559C\u6B22)/i);
  const likes = likesMatch?.[1] || undefined;

  // Images
  const images: string[] = [];
  const imageRoot = contentContainer.length > 0 ? contentContainer : $('body');
  imageRoot.find('img').each((_, image) => {
    const src = $(image).attr('src')
      ?? $(image).attr('data-src')
      ?? $(image).attr('data-original')
      ?? '';
    if (/^https?:\/\/.*mafengwo.*\.(?:jpg|jpeg|png|webp)/i.test(src)) {
      const lower = src.toLowerCase();
      if (!lower.includes('avatar') && !lower.includes('icon') && !lower.includes('logo') && !lower.includes('emoji') && !images.includes(src))
        images.push(src);
    }
  });

  if (images.length === 0) {
    const imgRegex = /src="(https?:\/\/[^"]*mafengwo[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;
    for (const imgMatch of html.matchAll(imgRegex)) {
      const src = imgMatch[1];
      if (!src.includes('avatar') && !src.includes('icon') && !src.includes('logo') && !src.includes('emoji') && !images.includes(src)) {
        images.push(src);
      }
    }
  }

  const coverImage = $('meta[property="og:image"]').attr('content') || images[0] || undefined;

  // Related note IDs (snowball)
  const relatedNoteIds = extractAllNoteIds(html);

  return { title, content, contentHtml, author, views, likes, coverImage, images, relatedNoteIds };
}

// ============================================
// Save to TiDB
// ============================================

/**
 * Route the crawled note through the canonical ingest pipeline.
 *
 * This script crawls by noteId and snowballs to related notes, so at save time
 * there is NO reliable destination. The canonical pipeline REJECTS empty-
 * destination guides — by design. We pass no import context and no staging
 * supplement, so destination-less guides are rejected and SKIPPED (logged),
 * never written. This deliberately replaces the old direct `travelGuides`
 * write so the script can no longer bypass validation/quality/raw-record.
 */
async function saveToTiDB(
  db: ReturnType<typeof createDb>,
  externalId: string,
  sourceUrl: string,
  detail: GuideDetail,
): Promise<boolean> {
  try {
    const normalized = normalizeGuide(
      {
        url: sourceUrl,
        externalId,
        title: detail.title || externalId,
        content: detail.content,
        contentHtml: detail.contentHtml,
        author: detail.author ?? '',
        viewsRaw: detail.views,
        likesRaw: detail.likes,
        coverImage: detail.coverImage ?? '',
        images: collectGuideImages(detail),
      } as never,
      sourceUrl,
      undefined,
      null,
    );
    const result = await persistIngestedGuide(db as never, normalized);
    if (!result.success) {
      log(`  Skipped ${externalId}: ${result.message}`);
    }
    return result.success;
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`  Save failed ${externalId}: ${message.slice(0, 80)}`);
    return false;
  }
}

// ============================================
// Main
// ============================================

async function main() {
  console.warn(`\n${'='.repeat(60)}`);
  console.warn('  Mafengwo crawler \u2014 full Playwright mode');
  console.warn('  (paginated API seeds + browser detail + snowball)');
  console.warn('='.repeat(60));
  console.warn(`  Max notes:    ${CONFIG.maxNotes === 0 ? 'unlimited' : CONFIG.maxNotes}`);
  console.warn(`  Headless:     ${CONFIG.headless}`);
  console.warn(`  Concurrency:  ${CONFIG.concurrency} tabs`);
  console.warn(`  Recrawl:      ${CONFIG.recrawlExisting ? 'existing guides' : 'new guides only'}`);
  if (CONFIG.recrawlExisting)
    console.warn(`  Recrawl cap:  ${CONFIG.recrawlExistingLimit === 0 ? 'unlimited' : CONFIG.recrawlExistingLimit}`);
  console.warn(`  Seed crawl:   ${CONFIG.collectSeeds}`);
  console.warn(`  Destinations: ${SEED_DESTINATIONS.length} seed cities`);
  console.warn(`  API pages/dest: ${CONFIG.seedApiPages}`);
  console.warn(`  ID probing:   ${CONFIG.probeIdSpace}`);
  console.warn(`${'='.repeat(60)}\n`);

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL not set');
    console.error('  Example: DATABASE_URL="mysql://root@127.0.0.1:4000/pathfinding"');
    process.exit(1);
  }

  const db = createDb();
  let shuttingDown = false;

  // Graceful shutdown on SIGINT/SIGTERM
  const handleSignal = (signal: string) => {
    if (shuttingDown)
      return;
    shuttingDown = true;
    log(`\nReceived ${signal}, finishing current batch and shutting down...`);
  };
  process.on('SIGINT', () => handleSignal('SIGINT'));
  process.on('SIGTERM', () => handleSignal('SIGTERM'));

  const stats: CrawlStats = {
    seedsCollected: 0,
    detailsCrawled: 0,
    detailsSaved: 0,
    errors: 0,
    skipped: 0,
    snowballDiscovered: 0,
    startTime: Date.now(),
  };

  const seenIds = new Set<string>();
  const queue: string[] = []; // queue of externalIds to crawl

  // Load existing IDs from DB for dedup
  log('Loading existing IDs from database...');
  try {
    const existingRows = await db
      .select({ externalId: travelGuides.externalId })
      .from(travelGuides)
      .where(eq(travelGuides.platform, 'mafengwo'));

    const existingIds: string[] = [];
    for (const row of existingRows) {
      if (!row.externalId)
        continue;
      existingIds.push(row.externalId);
    }

    if (CONFIG.recrawlExisting) {
      for (const id of existingIds) {
        seenIds.add(id);
      }

      const idsToRecrawl = CONFIG.recrawlExistingLimit > 0
        ? existingIds.slice(0, CONFIG.recrawlExistingLimit)
        : existingIds;

      for (const id of idsToRecrawl) {
        queue.push(id);
      }

      log(`Queued ${queue.length} existing IDs for recrawl`);
    }
    else {
      for (const id of existingIds) {
        seenIds.add(id);
      }
      log(`Loaded ${seenIds.size} existing IDs`);
    }
  }
  catch {
    log('Failed to load existing IDs');
  }

  try {
    await initBrowser();

    if (CONFIG.collectSeeds) {
      // ================================================
      // Phase 1: Collect seed URLs via paginated API + sitemap
      // The mobile SPA entry pages show the same 17 "hot" notes regardless
      // of destination, so we use the JSON API for real destination-specific
      // note listings, plus article sitemaps for bulk IDs.
      // ================================================
      log('\n--- Phase 1: Seed collection ---');

      // Phase 1a: Paginated note listing API (no WAF, returns HTML fragments)
      // GET https://m.mafengwo.cn/note/index/more?mddid={id}&iPage={page}
      log('  Phase 1a: Paginated API seed collection');
      for (const dest of SEED_DESTINATIONS) {
        let emptyPages = 0;
        for (let page = 1; page <= CONFIG.seedApiPages; page++) {
          if (emptyPages >= 2)
            break; // stop if 2 consecutive empty pages

          const apiUrl = `https://m.mafengwo.cn/note/index/more?mddid=${dest.id}&iPage=${page}`;
          try {
            const resp = await fetch(apiUrl, {
              headers: { 'User-Agent': MOBILE_UA, 'Referer': `https://m.mafengwo.cn/note/l-${dest.id}.html` },
            });
            const text = await resp.text();
            const ids = extractAllNoteIds(text);

            if (ids.length === 0) {
              emptyPages++;
              continue;
            }
            emptyPages = 0;

            let newCount = 0;
            for (const id of ids) {
              if (!seenIds.has(id)) {
                seenIds.add(id);
                queue.push(id);
                newCount++;
                stats.seedsCollected++;
              }
            }
            if (newCount > 0) {
              log(`    ${dest.name} p${page}: +${newCount} new (total queue: ${queue.length})`);
            }
          }
          catch {
            // API call failed, skip
          }

          await sleep(randomDelay(500, 500));
        }
      }
      log(`  API seeds collected: ${stats.seedsCollected}, queue: ${queue.length}`);

      // Phase 1b: Article sitemaps for bulk ID extraction
      // Sitemaps at https://www.mafengwo.cn/sitemapIndex.xml contain article-{0-3}.xml
      log('  Phase 1b: Sitemap bulk ID extraction');
      for (let sitemapIdx = 0; sitemapIdx <= 3; sitemapIdx++) {
        try {
          const sitemapUrl = `https://www.mafengwo.cn/article-${sitemapIdx}.xml`;
          const resp = await fetch(sitemapUrl, {
            headers: { 'User-Agent': MOBILE_UA },
          });
          const xml = await resp.text();

          // Extract note IDs from URLs like /i/12345.html or /note/12345.html
          const urlIds: string[] = [];
          for (const match of xml.matchAll(/\/i\/(\d+)\.html/g)) {
            urlIds.push(match[1]);
          }
          // Also match /note/{id}.html pattern (desktop)
          for (const match of xml.matchAll(/\/note\/(\d+)\.html/g)) {
            urlIds.push(match[1]);
          }

          let newCount = 0;
          for (const id of urlIds) {
            if (!seenIds.has(id)) {
              seenIds.add(id);
              queue.push(id);
              newCount++;
              stats.seedsCollected++;
            }
          }
          log(`    article-${sitemapIdx}.xml: ${urlIds.length} IDs, ${newCount} new`);
        }
        catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          log(`    article-${sitemapIdx}.xml: failed (${msg.slice(0, 60)})`);
        }
      }

      // Phase 1c: Also load entry pages via browser as fallback seed source
      log('  Phase 1c: Browser entry pages (fallback)');
      const entryUrls = [
        'https://m.mafengwo.cn/note/',
      ];

      for (const entryUrl of entryUrls) {
        log(`    Entry: ${entryUrl}`);
        const html = await loadPage(0, entryUrl);
        if (!html) {
          log('      Failed to load');
          continue;
        }

        const ids = extractAllNoteIds(html);
        let newCount = 0;
        for (const id of ids) {
          if (!seenIds.has(id)) {
            seenIds.add(id);
            queue.push(id);
            newCount++;
            stats.seedsCollected++;
          }
        }
        log(`      Found ${ids.length} IDs, ${newCount} new`);
        await sleep(randomDelay(2000, 1000));
      }

      log(`\nPhase 1 complete: ${queue.length} seed URLs in queue\n`);
    }
    else {
      log('\n--- Phase 1: Seed collection skipped ---');
    }

    // ================================================
    // Phase 2: Crawl details with snowball discovery
    // ================================================
    log('--- Phase 2: Detail crawl + snowball ---');

    let processedCount = 0;

    while (queue.length > 0) {
      if (shuttingDown) {
        log('Shutdown requested, stopping Phase 2...');
        break;
      }
      if (CONFIG.maxNotes > 0 && stats.detailsSaved >= CONFIG.maxNotes) {
        log(`Reached max notes limit (${CONFIG.maxNotes})`);
        break;
      }

      // Process batch
      const batchSize = Math.min(CONFIG.concurrency, queue.length);
      const batch = queue.splice(0, batchSize);

      await Promise.all(
        batch.map(async (noteId, batchIdx) => {
          processedCount++;
          const progress = `[${processedCount} | Q:${queue.length} | S:${stats.detailsSaved}]`;

          if (!CONFIG.recrawlExisting) {
            // Check if already in DB
            try {
              const existing = await db
                .select({ id: travelGuides.id })
                .from(travelGuides)
                .where(and(eq(travelGuides.platform, 'mafengwo'), eq(travelGuides.externalId, noteId)))
                .limit(1);
              if (existing.length > 0) {
                stats.skipped++;
                return;
              }
            }
            catch {
              // continue
            }
          }

          log(`${progress} Crawling: ${noteId}`);
          const url = `https://m.mafengwo.cn/i/${noteId}.html`;
          const html = await loadPage(batchIdx, url);

          if (!html) {
            stats.errors++;
            log(`${progress} FAIL: no HTML`);
            return;
          }

          const detail = extractDetail(html);
          if (!detail) {
            stats.errors++;
            log(`${progress} FAIL: no content extracted`);
            return;
          }

          stats.detailsCrawled++;

          const saved = await saveToTiDB(db, noteId, url, detail);
          if (saved) {
            stats.detailsSaved++;
            const titlePreview = detail.title?.slice(0, 40) || 'Untitled';
            log(`${progress} OK ${titlePreview} (${detail.content.length} chars, ${detail.images.length} imgs, +${detail.relatedNoteIds.length} links)`);
          }
          else {
            stats.errors++;
          }

          // Snowball: add related note IDs
          for (const relatedId of detail.relatedNoteIds) {
            if (!seenIds.has(relatedId)) {
              seenIds.add(relatedId);
              queue.push(relatedId);
              stats.snowballDiscovered++;
            }
          }
        }),
      );

      await sleep(randomDelay(CONFIG.delayBetweenPages, 2000));

      // Progress report every 25 items
      if (processedCount % 25 === 0) {
        const elapsed = (Date.now() - stats.startTime) / 1000 / 60;
        log(`\n--- Progress Report ---`);
        log(`  Processed:    ${processedCount}`);
        log(`  Queue:        ${queue.length}`);
        log(`  Saved:        ${stats.detailsSaved}`);
        log(`  Skipped:      ${stats.skipped}`);
        log(`  Errors:       ${stats.errors}`);
        log(`  Snowball:     +${stats.snowballDiscovered}`);
        log(`  Elapsed:      ${elapsed.toFixed(1)} min`);
        if (stats.detailsSaved > 0) {
          log(`  Speed:        ${(stats.detailsSaved / elapsed).toFixed(1)} notes/min`);
        }
        log('');
      }
    }

    // ================================================
    // Phase 3: ID space probing
    // When snowball runs dry, probe sequential IDs near known valid notes.
    // Known ID range: ~1 to ~25,000,000
    // ================================================
    if (!CONFIG.probeIdSpace) {
      log('\n--- Phase 3: ID space probing skipped ---');
    }
    if (!shuttingDown && CONFIG.probeIdSpace && (CONFIG.maxNotes === 0 || stats.detailsSaved < CONFIG.maxNotes)) {
      log('\n--- Phase 3: ID space probing ---');

      const knownIds = Array.from(seenIds).map(Number).filter(n => !Number.isNaN(n) && n > 0);
      if (knownIds.length > 0) {
        knownIds.sort((a, b) => a - b);
        const maxKnown = knownIds[knownIds.length - 1]!;

        // Strategy: scan backwards from maxKnown in steps of 100
        // Recent notes have higher IDs, so work backwards to find more valid content
        const PROBE_STEP = 100;
        const MAX_EMPTY_STREAKS = 10;
        let emptyStreaks = 0;
        let probeId = maxKnown - 1;

        log(`  Starting probe from ID ${probeId}, stepping by -${PROBE_STEP}`);

        while (probeId > 0) {
          if (shuttingDown) {
            log('Shutdown requested, stopping Phase 3...');
            break;
          }
          if (CONFIG.maxNotes > 0 && stats.detailsSaved >= CONFIG.maxNotes)
            break;
          if (emptyStreaks >= MAX_EMPTY_STREAKS) {
            log(`  ${MAX_EMPTY_STREAKS} consecutive empty probes, jumping...`);
            probeId -= PROBE_STEP * 50; // big jump
            emptyStreaks = 0;
            continue;
          }

          const noteId = String(probeId);
          probeId -= PROBE_STEP;

          if (seenIds.has(noteId))
            continue;
          seenIds.add(noteId);

          processedCount++;
          const progress = `[${processedCount} | PROBE:${probeId} | S:${stats.detailsSaved}]`;

          log(`${progress} Probing: ${noteId}`);
          const url = `https://m.mafengwo.cn/i/${noteId}.html`;
          const html = await loadPage(0, url);

          if (!html) {
            emptyStreaks++;
            continue;
          }

          const detail = extractDetail(html);
          if (!detail) {
            emptyStreaks++;
            continue;
          }

          emptyStreaks = 0;
          stats.detailsCrawled++;

          const saved = await saveToTiDB(db, noteId, url, detail);
          if (saved) {
            stats.detailsSaved++;
            const titlePreview = detail.title?.slice(0, 40) || 'Untitled';
            log(`${progress} OK ${titlePreview} (${detail.content.length} chars)`);

            // Add snowball discoveries from probe
            for (const relatedId of detail.relatedNoteIds) {
              if (!seenIds.has(relatedId)) {
                seenIds.add(relatedId);
                queue.push(relatedId);
                stats.snowballDiscovered++;
              }
            }

            // If snowball found new IDs, go process them first
            if (queue.length > 0) {
              log(`  Snowball found ${queue.length} new IDs, processing...`);
              while (queue.length > 0) {
                if (CONFIG.maxNotes > 0 && stats.detailsSaved >= CONFIG.maxNotes)
                  break;

                const batchSize = Math.min(CONFIG.concurrency, queue.length);
                const batch = queue.splice(0, batchSize);

                await Promise.all(
                  batch.map(async (qId, bIdx) => {
                    processedCount++;
                    const qProgress = `[${processedCount} | Q:${queue.length} | S:${stats.detailsSaved}]`;

                    if (!CONFIG.recrawlExisting) {
                      try {
                        const existing = await db
                          .select({ id: travelGuides.id })
                          .from(travelGuides)
                          .where(and(eq(travelGuides.platform, 'mafengwo'), eq(travelGuides.externalId, qId)))
                          .limit(1);
                        if (existing.length > 0) {
                          stats.skipped++;
                          return;
                        }
                      }
                      catch {}
                    }

                    log(`${qProgress} Crawling: ${qId}`);
                    const qUrl = `https://m.mafengwo.cn/i/${qId}.html`;
                    const qHtml = await loadPage(bIdx, qUrl);
                    if (!qHtml) {
                      stats.errors++;
                      return;
                    }

                    const qDetail = extractDetail(qHtml);
                    if (!qDetail) {
                      stats.errors++;
                      return;
                    }

                    stats.detailsCrawled++;
                    const qSaved = await saveToTiDB(db, qId, qUrl, qDetail);
                    if (qSaved) {
                      stats.detailsSaved++;
                      log(`${qProgress} OK ${qDetail.title?.slice(0, 40)} (${qDetail.content.length} chars)`);
                    }
                    else {
                      stats.errors++;
                    }

                    for (const rid of qDetail.relatedNoteIds) {
                      if (!seenIds.has(rid)) {
                        seenIds.add(rid);
                        queue.push(rid);
                        stats.snowballDiscovered++;
                      }
                    }
                  }),
                );

                await sleep(randomDelay(CONFIG.delayBetweenPages, 2000));
              }
            }
          }

          await sleep(randomDelay(CONFIG.delayBetweenPages, 1000));

          // Progress report
          if (processedCount % 25 === 0) {
            const elapsed = (Date.now() - stats.startTime) / 1000 / 60;
            log(`\n--- Probe Progress ---`);
            log(`  Current ID:   ${probeId}`);
            log(`  Saved:        ${stats.detailsSaved}`);
            log(`  Snowball:     +${stats.snowballDiscovered}`);
            log(`  Elapsed:      ${elapsed.toFixed(1)} min\n`);
          }
        }
      }
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Fatal error: ${message}`);
    stats.errors++;
  }
  finally {
    await closeBrowser();
  }

  // Final report
  const totalTime = (Date.now() - stats.startTime) / 1000 / 60;

  console.warn(`\n${'='.repeat(60)}`);
  console.warn('  Crawl complete!');
  console.warn('='.repeat(60));
  console.warn(`  Seeds:          ${stats.seedsCollected}`);
  console.warn(`  Snowball:       +${stats.snowballDiscovered}`);
  console.warn(`  Total unique:   ${seenIds.size}`);
  console.warn(`  Crawled:        ${stats.detailsCrawled}`);
  console.warn(`  Saved:          ${stats.detailsSaved}`);
  console.warn(`  Skipped:        ${stats.skipped}`);
  console.warn(`  Errors:         ${stats.errors}`);
  console.warn(`  Total time:     ${totalTime.toFixed(1)} min`);
  if (stats.detailsSaved > 0) {
    console.warn(`  Speed:          ${(stats.detailsSaved / totalTime).toFixed(1)} notes/min`);
  }
  console.warn(`${'='.repeat(60)}\n`);
}

main().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
