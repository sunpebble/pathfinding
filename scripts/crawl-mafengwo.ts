#!/usr/bin/env npx tsx
/**
 * Mafengwo travel note crawler — HTTP-only version
 *
 * Uses native fetch + cheerio instead of Playwright/Stagehand.
 * No browser binary, no cloud browser service, no heavy dependencies.
 *
 * Usage:
 *   DATABASE_URL="mysql://root@127.0.0.1:4000/pathfinding" npx tsx scripts/crawl-mafengwo.ts
 *
 * Options (env vars):
 *   MAX_NOTES=50        Max notes to crawl (default 50)
 *   SCROLL_COUNT=15     Paginated requests per entry URL (default 15)
 *   CONCURRENCY=3       Concurrent detail fetches (default 3)
 */

import * as cheerio from 'cheerio';
import { and, eq } from 'drizzle-orm';
import { createDb, travelGuides } from '../packages/database/src/index';

// ============================================
// Config
// ============================================

const CONFIG = {
  maxNotes: Number(process.env.MAX_NOTES) || 50,
  scrollCount: Number(process.env.SCROLL_COUNT) || 15,
  concurrency: Number(process.env.CONCURRENCY) || 3,
  delayBetweenRequests: 2000,
  maxRetries: 3,
  requestTimeout: 15000,
};

const MOBILE_UA
  = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const COMMON_HEADERS: Record<string, string> = {
  'User-Agent': MOBILE_UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Referer': 'https://m.mafengwo.cn/',
};

// Entry URLs — destination-specific note list pages
const ENTRY_URLS = [
  'https://m.mafengwo.cn/note/',
  'https://m.mafengwo.cn/note/l-10065.html', // Beijing
  'https://m.mafengwo.cn/note/l-10099.html', // Chengdu
  'https://m.mafengwo.cn/note/l-10264.html', // Xi'an
  'https://m.mafengwo.cn/note/l-10088.html', // Hangzhou
  'https://m.mafengwo.cn/note/l-10208.html', // Chongqing
  'https://m.mafengwo.cn/note/l-10161.html', // Lijiang
  'https://m.mafengwo.cn/note/l-10189.html', // Xiamen
  'https://m.mafengwo.cn/note/l-14947.html', // Dali
  'https://m.mafengwo.cn/note/l-10183.html', // Tokyo
  'https://m.mafengwo.cn/note/l-11042.html', // Osaka
  'https://m.mafengwo.cn/note/l-10759.html', // Bangkok
  'https://m.mafengwo.cn/note/l-10754.html', // Chiang Mai
  'https://m.mafengwo.cn/note/l-11049.html', // Bali
  'https://m.mafengwo.cn/note/l-10542.html', // Seoul
  'https://m.mafengwo.cn/note/l-14107.html', // Paris
];

// ============================================
// Types
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
// Utilities
// ============================================

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString().slice(11, 19);
  if (data) {
    console.warn(`[${timestamp}] ${message}`, typeof data === 'string' ? data : JSON.stringify(data));
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
// HTTP fetch with retry
// ============================================

async function fetchHtml(url: string): Promise<string | null> {
  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CONFIG.requestTimeout);

      const res = await fetch(url, {
        headers: COMMON_HEADERS,
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);

      if (!res.ok) {
        log(`  HTTP ${res.status} for ${url} (attempt ${attempt})`);
        if (res.status === 429) {
          // Rate limited — back off
          await sleep(randomDelay(5000, 5000));
          continue;
        }
        if (attempt < CONFIG.maxRetries) {
          await sleep(randomDelay(2000, 1000));
          continue;
        }
        return null;
      }

      return await res.text();
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`  Fetch error ${url} (attempt ${attempt}): ${message.slice(0, 80)}`);
      if (attempt < CONFIG.maxRetries) {
        await sleep(randomDelay(2000, 1000));
      }
    }
  }
  return null;
}

// ============================================
// List page scraping
// ============================================

async function collectNoteUrls(
  entryUrls: string[],
  maxTotal: number,
): Promise<GuideListItem[]> {
  const allItems: GuideListItem[] = [];
  const seenIds = new Set<string>();

  for (const entryUrl of entryUrls) {
    if (allItems.length >= maxTotal)
      break;

    log(`Fetching entry page: ${entryUrl}`);

    const html = await fetchHtml(entryUrl);
    if (!html) {
      log(`  Failed to fetch entry page`);
      continue;
    }

    const $ = cheerio.load(html);

    // Extract all note links matching /i/<digits>.html
    $('a[href*="/i/"]').each((_i, el) => {
      if (allItems.length >= maxTotal)
        return false;

      const href = $(el).attr('href');
      if (!href)
        return;

      // Normalize to absolute URL
      let fullUrl = href;
      if (href.startsWith('/')) {
        fullUrl = `https://m.mafengwo.cn${href}`;
      }
      else if (!href.startsWith('http')) {
        return;
      }

      if (!/\/i\/\d+\.html/.test(fullUrl))
        return;

      const externalId = extractExternalId(fullUrl);
      if (externalId && !seenIds.has(externalId)) {
        seenIds.add(externalId);
        allItems.push({ url: fullUrl, externalId });
      }
    });

    log(`  Extracted ${allItems.length} unique URLs so far`);

    // Polite delay between entry pages
    await sleep(randomDelay(CONFIG.delayBetweenRequests, 1000));
  }

  return allItems.slice(0, maxTotal);
}

// ============================================
// Detail page scraping
// ============================================

function extractDetail(html: string): GuideDetail | null {
  const $ = cheerio.load(html);

  // Title
  const title
    = $('meta[property="og:title"]').attr('content')?.trim()
      || $('title').text().split('，')[0].split('|')[0].trim()
      || '';

  // Content — try multiple selectors
  let content = '';

  const chapterEl = $('.chapter-container');
  if (chapterEl.length) {
    // Remove noise elements
    chapterEl.find('.copyright, .recommend-note, .accusation-container, [class*="ad-container"]').remove();
    content = chapterEl.text().trim();
  }

  if (!content || content.length < 50) {
    const noteContent = $('.note-content, .note-body, .article-content').first();
    if (noteContent.length) {
      noteContent.find('.copyright, .recommend-note, .accusation-container, [class*="author"], [class*="avatar"], [class*="ad-container"]').remove();
      content = noteContent.text().trim();
    }
  }

  // Clean up content
  content = content
    .replace(/图片占位符/g, '')
    .replace(/\s+/g, ' ')
    .replace(/加载更多内容/g, '')
    .replace(/查看原文|展开全文|点击展开/g, '')
    .trim();

  if (!content || content.length < 50) {
    return null;
  }

  // Author
  const author
    = $('.user-name, .author-name, .note-author').first().text().trim()
      || $('meta[name="author"]').attr('content')?.trim()
      || undefined;

  // Views / Likes — from page text
  const pageText = $('body').text();
  const viewsMatch = pageText.match(/(\d+(?:\.\d+)?[万k]?)\s*(?:浏览|阅读)/i);
  const views = viewsMatch?.[1] || undefined;

  const likesMatch = pageText.match(/(\d+(?:\.\d+)?[万k]?)\s*(?:赞|喜欢)/i);
  const likes = likesMatch?.[1] || undefined;

  // Images
  const images: string[] = [];
  const imgSelectors = [
    '.chapter-container img[src]',
    '.note-content img[src]',
    '.article-content img[src]',
    'img[src*="mafengwo"]',
  ];

  for (const selector of imgSelectors) {
    $(selector).each((_i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
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
    = $('meta[property="og:image"]').attr('content')
      || images[0]
      || undefined;

  return { title, content, author, views, likes, coverImage, images };
}

async function crawlNoteDetail(item: GuideListItem): Promise<GuideDetail | null> {
  const mobileUrl = item.url.replace('www.mafengwo.cn', 'm.mafengwo.cn');
  const html = await fetchHtml(mobileUrl);
  if (!html)
    return null;
  return extractDetail(html);
}

// ============================================
// Save to TiDB
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
    log(`  Save failed ${item.externalId}: ${message.slice(0, 80)}`);
    return false;
  }
}

// ============================================
// Concurrency helper
// ============================================

async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, j) => fn(item, i + j)),
    );
    results.push(...batchResults);
  }
  return results;
}

// ============================================
// Main
// ============================================

async function main() {
  console.warn(`\n${'='.repeat(50)}`);
  console.warn('  Mafengwo crawler — HTTP-only (no browser)');
  console.warn('='.repeat(50));
  console.warn(`  Max notes:    ${CONFIG.maxNotes}`);
  console.warn(`  Concurrency:  ${CONFIG.concurrency}`);
  console.warn(`  Entry pages:  ${ENTRY_URLS.length}`);
  console.warn(`${'='.repeat(50)}\n`);

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL not set');
    console.error('  Example: DATABASE_URL="mysql://root@127.0.0.1:4000/pathfinding"');
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

  try {
    // Phase 1: Collect note URLs
    log('\n--- Phase 1: Collecting note URLs ---');
    const noteList = await collectNoteUrls(ENTRY_URLS, CONFIG.maxNotes);
    stats.totalUrlsFound = noteList.length;

    if (noteList.length === 0) {
      log('No note URLs found, exiting');
      return;
    }

    log(`\nCollected ${noteList.length} note URLs\n`);

    // Phase 2: Crawl details in batches
    log('--- Phase 2: Crawling note details ---');

    await processInBatches(noteList, CONFIG.concurrency, async (item, i) => {
      const progress = `[${i + 1}/${noteList.length}]`;

      // Check if already exists
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
          log(`${progress} Already exists, skipping: ${item.externalId}`);
          stats.skipped++;
          return;
        }
      }
      catch {
        // Query failed, proceed with crawl
      }

      log(`${progress} Crawling: ${item.externalId}`);

      const detail = await crawlNoteDetail(item);

      if (detail) {
        stats.detailsCrawled++;

        const saved = await saveToTiDB(db, item, detail);
        if (saved) {
          stats.detailsSaved++;
          const titlePreview = detail.title?.slice(0, 40) || 'Untitled';
          log(`${progress} OK ${titlePreview} (${detail.content.length} chars, ${detail.images.length} imgs)`);
        }
        else {
          stats.errors++;
        }
      }
      else {
        stats.errors++;
        log(`${progress} FAIL`);
      }

      // Polite delay
      await sleep(randomDelay(CONFIG.delayBetweenRequests, 1000));

      // Progress report every 10 items
      if ((i + 1) % 10 === 0) {
        const elapsed = (Date.now() - stats.startTime) / 1000 / 60;
        log(`\n--- Progress ---`);
        log(`  Processed: ${i + 1}/${noteList.length}`);
        log(`  Saved:     ${stats.detailsSaved}`);
        log(`  Skipped:   ${stats.skipped}`);
        log(`  Errors:    ${stats.errors}`);
        log(`  Elapsed:   ${elapsed.toFixed(1)} min\n`);
      }
    });
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Fatal error: ${message}`);
    stats.errors++;
  }

  // Final report
  const totalTime = (Date.now() - stats.startTime) / 1000 / 60;

  console.warn(`\n${'='.repeat(50)}`);
  console.warn('  Crawl complete!');
  console.warn('='.repeat(50));
  console.warn(`  URLs found:   ${stats.totalUrlsFound}`);
  console.warn(`  Crawled:      ${stats.detailsCrawled}`);
  console.warn(`  Saved:        ${stats.detailsSaved}`);
  console.warn(`  Skipped:      ${stats.skipped}`);
  console.warn(`  Errors:       ${stats.errors}`);
  console.warn(`  Total time:   ${totalTime.toFixed(1)} min`);
  if (stats.detailsSaved > 0) {
    console.warn(`  Speed:        ${(stats.detailsSaved / totalTime).toFixed(1)} notes/min`);
  }
  console.warn(`${'='.repeat(50)}\n`);
}

main().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
