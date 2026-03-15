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
import { and, eq } from 'drizzle-orm';
import { chromium } from 'playwright';
import { createDb, travelGuides } from '../packages/database/src/index';

// ============================================
// Config
// ============================================

const CONFIG = {
  maxNotes: Number(process.env.MAX_NOTES) || 0,
  headless: process.env.HEADLESS !== 'false',
  concurrency: Math.min(Number(process.env.CONCURRENCY) || 2, 4),
  delayBetweenPages: 3000,
  pageTimeout: 30000,
  maxRetries: 2,
};

const MOBILE_UA
  = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// ============================================
// Destination list for seed collection
// ============================================

const SEED_DESTINATIONS = [
  { id: '10065', name: 'Beijing' },
  { id: '10099', name: 'Chengdu' },
  { id: '10088', name: 'Hangzhou' },
  { id: '10208', name: 'Chongqing' },
  { id: '10035', name: 'Shanghai' },
  { id: '10189', name: 'Xiamen' },
  { id: '10195', name: 'Sanya' },
  { id: '10156', name: 'Kunming' },
  { id: '10183', name: 'Tokyo' },
  { id: '10759', name: 'Bangkok' },
  { id: '10542', name: 'Seoul' },
  { id: '14107', name: 'Paris' },
];

// ============================================
// Types
// ============================================

interface GuideDetail {
  title: string;
  content: string;
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

function parseChineseNumber(str: string | undefined): number {
  if (!str)
    return 0;
  const match = str.trim().match(/([\d.]+)\s*([万k])?/i);
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
 * return the full page HTML.
 */
async function loadPage(contextIndex: number, url: string): Promise<string | null> {
  const ctx = _contexts[contextIndex % _contexts.length];

  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    let page: Page | null = null;
    try {
      page = await ctx.newPage();
      page.setDefaultTimeout(CONFIG.pageTimeout);

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: CONFIG.pageTimeout });
      await sleep(4000); // wait for JS rendering

      // Scroll down to trigger lazy loading
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(2000);

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
  // Use regex-based extraction (no cheerio needed since we have full rendered HTML)

  // Title: from <title> tag or og:title
  let title = '';
  const ogTitle = html.match(/property="og:title"\s+content="([^"]+)"/);
  if (ogTitle) {
    title = ogTitle[1];
  }
  else {
    const titleTag = html.match(/<title>([^<]+)<\/title>/);
    if (titleTag) {
      title = titleTag[1].split('\uFF0C')[0].split('|')[0].trim();
    }
  }

  // Content: extract text from rendered body
  // Remove HTML tags but keep text content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch)
    return null;

  let content = bodyMatch[1]
    // Remove script/style blocks
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Remove navigation, footer, ads
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Clean whitespace
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
  const authorMatch = html.match(/class="[^"]*(?:user-name|author-name|note-author)[^"]*"[^>]*>([^<]+)</);
  const author = authorMatch?.[1]?.trim() || undefined;

  // Views/Likes from rendered text
  const viewsMatch = content.match(/(\d+(?:\.\d+)?[\u4E07k]?)\s*(?:\u6D4F\u89C8|\u9605\u8BFB)/i);
  const views = viewsMatch?.[1] || undefined;
  const likesMatch = content.match(/(\d+(?:\.\d+)?[\u4E07k]?)\s*(?:\u8D5E|\u559C\u6B22)/i);
  const likes = likesMatch?.[1] || undefined;

  // Images
  const images: string[] = [];
  const imgRegex = /src="(https?:\/\/[^"]*mafengwo[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;
  for (const imgMatch of html.matchAll(imgRegex)) {
    const src = imgMatch[1];
    if (!src.includes('avatar') && !src.includes('icon') && !src.includes('logo') && !src.includes('emoji') && !images.includes(src)) {
      images.push(src);
    }
  }

  const coverMatch = html.match(/property="og:image"\s+content="([^"]+)"/);
  const coverImage = coverMatch?.[1] || images[0] || undefined;

  // Related note IDs (snowball)
  const relatedNoteIds = extractAllNoteIds(html);

  return { title, content, author, views, likes, coverImage, images, relatedNoteIds };
}

// ============================================
// Save to TiDB
// ============================================

async function saveToTiDB(
  db: ReturnType<typeof createDb>,
  externalId: string,
  sourceUrl: string,
  detail: GuideDetail,
): Promise<boolean> {
  try {
    const qualityScore = calculateQualityScore(detail);

    const guideData = {
      platform: 'mafengwo',
      externalId,
      title: detail.title || externalId,
      content: detail.content,
      authorName: detail.author ?? null,
      sourceUrl,
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

    const existing = await db
      .select({ id: travelGuides.id })
      .from(travelGuides)
      .where(and(eq(travelGuides.platform, 'mafengwo'), eq(travelGuides.externalId, externalId)))
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
  console.warn('  (all pages via browser, snowball URL discovery)');
  console.warn('='.repeat(60));
  console.warn(`  Max notes:    ${CONFIG.maxNotes === 0 ? 'unlimited' : CONFIG.maxNotes}`);
  console.warn(`  Headless:     ${CONFIG.headless}`);
  console.warn(`  Concurrency:  ${CONFIG.concurrency} tabs`);
  console.warn(`  Destinations: ${SEED_DESTINATIONS.length} seed cities`);
  console.warn(`${'='.repeat(60)}\n`);

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL not set');
    console.error('  Example: DATABASE_URL="mysql://root@127.0.0.1:4000/pathfinding"');
    process.exit(1);
  }

  const db = createDb();
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
    for (const row of existingRows) {
      seenIds.add(row.externalId);
    }
    log(`Loaded ${seenIds.size} existing IDs`);
  }
  catch {
    log('Failed to load existing IDs');
  }

  try {
    await initBrowser();

    // ================================================
    // Phase 1: Collect seed URLs from entry pages
    // ================================================
    log('\n--- Phase 1: Seed collection from entry pages ---');

    const entryUrls = [
      'https://m.mafengwo.cn/note/',
      ...SEED_DESTINATIONS.map(d => `https://m.mafengwo.cn/note/l-${d.id}.html`),
    ];

    for (const entryUrl of entryUrls) {
      log(`  Entry: ${entryUrl}`);
      const html = await loadPage(0, entryUrl);
      if (!html) {
        log('    Failed to load');
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
      log(`    Found ${ids.length} IDs, ${newCount} new. Queue: ${queue.length}`);

      // Also scroll more to discover additional content
      await sleep(randomDelay(2000, 1000));
    }

    log(`\nPhase 1 complete: ${queue.length} seed URLs in queue\n`);

    // ================================================
    // Phase 2: Crawl details with snowball discovery
    // ================================================
    log('--- Phase 2: Detail crawl + snowball ---');

    let processedCount = 0;

    while (queue.length > 0) {
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
    if (CONFIG.maxNotes === 0 || stats.detailsSaved < CONFIG.maxNotes) {
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
