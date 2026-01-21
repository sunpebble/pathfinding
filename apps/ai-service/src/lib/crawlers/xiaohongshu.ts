/**
 * Xiaohongshu (小红书) Crawler
 * Crawls travel guides from Xiaohongshu using Playwright headless browser
 *
 * Note: Xiaohongshu has strong anti-bot protections. This crawler uses
 * the explore/search pages which are publicly accessible.
 */

import type { CrawlOptions, CrawlResult } from './index.js';
import * as cheerio from 'cheerio';
import {
  createContext,
  createPage,
  scrollToLoadContent,
  sleep,
} from './browser.js';

// City/destination keywords for search
const CITY_KEYWORDS: Record<string, string[]> = {
  北京: ['北京旅游攻略', '北京打卡', '北京必去'],
  上海: ['上海旅游攻略', '上海打卡', '上海必去'],
  杭州: ['杭州旅游攻略', '杭州西湖', '杭州打卡'],
  成都: ['成都旅游攻略', '成都打卡', '成都美食'],
  西安: ['西安旅游攻略', '西安打卡', '西安美食'],
  三亚: ['三亚旅游攻略', '三亚打卡', '三亚海滩'],
  厦门: ['厦门旅游攻略', '厦门鼓浪屿', '厦门打卡'],
  大理: ['大理旅游攻略', '大理洱海', '大理打卡'],
  广州: ['广州旅游攻略', '广州打卡', '广州美食'],
  深圳: ['深圳旅游攻略', '深圳打卡', '深圳周末'],
  南京: ['南京旅游攻略', '南京打卡', '南京美食'],
  苏州: ['苏州旅游攻略', '苏州园林', '苏州打卡'],
  丽江: ['丽江旅游攻略', '丽江古城', '丽江打卡'],
  重庆: ['重庆旅游攻略', '重庆打卡', '重庆夜景'],
  武汉: ['武汉旅游攻略', '武汉打卡', '武汉美食'],
  青岛: ['青岛旅游攻略', '青岛打卡', '青岛海滩'],
  桂林: ['桂林旅游攻略', '桂林山水', '桂林打卡'],
  昆明: ['昆明旅游攻略', '昆明打卡', '昆明美食'],
  西双版纳: ['西双版纳旅游', '版纳攻略', '西双版纳打卡'],
  张家界: ['张家界旅游攻略', '张家界打卡', '张家界玻璃桥'],
};

/**
 * Crawl Xiaohongshu travel guides for a city
 * Uses the explore page which shows trending notes
 */
export async function crawlXiaohongshu(
  city: string,
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const maxGuides = (options.maxPages || 5) * 10;
  const keywords = CITY_KEYWORDS[city] || [`${city}旅游攻略`];

  console.log(`[Xiaohongshu] Crawling guides for ${city}`);

  const context = await createContext();

  try {
    // Search for each keyword
    for (const keyword of keywords.slice(0, 2)) {
      if (results.length >= maxGuides) break;

      try {
        const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}&source=web_explore_feed`;
        console.log(`[Xiaohongshu] Searching: ${keyword}`);

        const guides = await fetchNotesFromSearch(context, searchUrl, city, maxGuides - results.length);
        console.log(`[Xiaohongshu] Found ${guides.length} notes for "${keyword}"`);

        // Add unique results
        for (const guide of guides) {
          if (!results.some(r => r.sourceExternalId === guide.sourceExternalId)) {
            results.push(guide);
          }
        }
      } catch (error) {
        console.error(`[Xiaohongshu] Error searching "${keyword}":`, error);
      }

      // Rate limiting between searches
      await sleep(2000);
    }

    // Also try the explore page for travel content
    try {
      const exploreUrl = 'https://www.xiaohongshu.com/explore?channel_id=homefeed.travel_v3';
      console.log('[Xiaohongshu] Fetching travel explore page');

      const exploreGuides = await fetchNotesFromExplore(context, exploreUrl, city, maxGuides - results.length);
      console.log(`[Xiaohongshu] Found ${exploreGuides.length} notes from explore`);

      for (const guide of exploreGuides) {
        if (!results.some(r => r.sourceExternalId === guide.sourceExternalId)) {
          results.push(guide);
        }
      }
    } catch (error) {
      console.error('[Xiaohongshu] Error fetching explore page:', error);
    }
  } finally {
    await context.close();
    console.log('[Xiaohongshu] Browser context closed');
  }

  return results;
}

/**
 * Fetch notes from search results page
 */
async function fetchNotesFromSearch(
  context: Awaited<ReturnType<typeof createContext>>,
  searchUrl: string,
  city: string,
  maxNotes: number
): Promise<CrawlResult[]> {
  const page = await createPage(context);
  const notes: CrawlResult[] = [];
  const seenIds = new Set<string>();

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for notes to load
    try {
      await page.waitForSelector('[class*="note-item"], [class*="search-result"]', { timeout: 15000 });
    } catch {
      console.log('[Xiaohongshu] Waiting for content...');
    }

    // Wait for network to settle
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Scroll to load more content
    await scrollToLoadContent(page);
    await sleep(2000);

    const html = await page.content();
    const $ = cheerio.load(html);

    // Debug: save HTML for analysis
    const fs = await import('fs/promises');
    await fs.writeFile('/tmp/xiaohongshu-search-debug.html', html);
    console.log('[Xiaohongshu] Saved search HTML to /tmp/xiaohongshu-search-debug.html');

    // Find note cards - Xiaohongshu uses various class patterns
    const noteSelectors = [
      'a[href*="/explore/"]',
      'a[href*="/search_result/"]',
      '[class*="note-item"] a',
      '[class*="feeds-container"] a[href*="/"]',
    ];

    for (const selector of noteSelectors) {
      if (notes.length >= maxNotes) break;

      $(selector).each((_, el) => {
        if (notes.length >= maxNotes) return false;

        const $el = $(el);
        const href = $el.attr('href');
        if (!href) return;

        // Match note URLs like /explore/xxx or /search_result/xxx
        const noteMatch = href.match(/\/(explore|search_result|discover)\/([a-f0-9]+)/i);
        if (!noteMatch) return;

        const noteId = noteMatch[2];
        if (seenIds.has(noteId)) return;
        seenIds.add(noteId);

        // Try to extract info from the card
        const $card = $el.closest('[class*="note-item"], [class*="card"], section, article');

        // Get title - try multiple patterns
        let title = $card.find('[class*="title"], h3, h2').first().text().trim();
        if (!title) {
          title = $el.find('[class*="title"]').text().trim();
        }
        if (!title || title.length < 3) {
          title = $el.text().trim().substring(0, 100);
        }
        if (!title || title.length < 3) return;

        // Get author
        const authorName = $card.find('[class*="author"], [class*="user"], [class*="nickname"]').first().text().trim() || '小红书用户';

        // Get cover image
        const $img = $card.find('img').first();
        const coverImageUrl = $img.attr('src') || $img.attr('data-src');

        // Get likes count
        const likesText = $card.find('[class*="like"], [class*="count"]').text();
        const likesMatch = likesText.match(/(\d+(?:\.\d+)?)(万|k)?/i);
        let likesCount = 0;
        if (likesMatch) {
          likesCount = parseFloat(likesMatch[1]);
          if (likesMatch[2] === '万' || likesMatch[2]?.toLowerCase() === 'k') {
            likesCount *= (likesMatch[2] === '万' ? 10000 : 1000);
          }
        }

        const sourceExternalId = `xiaohongshu_${noteId}`;
        const fullUrl = `https://www.xiaohongshu.com/explore/${noteId}`;

        notes.push({
          sourceExternalId,
          sourceUrl: fullUrl,
          title: title.substring(0, 200),
          content: `${title} - ${city}旅游攻略`,
          authorName,
          coverImageUrl: coverImageUrl?.startsWith('http') ? coverImageUrl : (coverImageUrl ? `https:${coverImageUrl}` : undefined),
          imageUrls: [],
          destinations: [city],
          tags: extractTags(title, ''),
          likesCount: Math.floor(likesCount),
          qualityScore: calculateQualityScore('', 1, Math.floor(likesCount)),
        });
      });
    }

    console.log(`[Xiaohongshu] Extracted ${notes.length} notes from search`);
  } catch (error) {
    console.error('[Xiaohongshu] Error fetching search page:', error);
  } finally {
    await page.close();
  }

  return notes;
}

/**
 * Fetch notes from explore page
 */
async function fetchNotesFromExplore(
  context: Awaited<ReturnType<typeof createContext>>,
  exploreUrl: string,
  city: string,
  maxNotes: number
): Promise<CrawlResult[]> {
  const page = await createPage(context);
  const notes: CrawlResult[] = [];
  const seenIds = new Set<string>();

  try {
    await page.goto(exploreUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for content
    try {
      await page.waitForSelector('[class*="note"], [class*="feed"]', { timeout: 15000 });
    } catch {
      console.log('[Xiaohongshu] Explore page content not found');
    }

    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await scrollToLoadContent(page);
    await sleep(2000);

    const html = await page.content();
    const $ = cheerio.load(html);

    // Find note links
    $('a[href*="/explore/"]').each((_, el) => {
      if (notes.length >= maxNotes) return false;

      const href = $(el).attr('href');
      const noteMatch = href?.match(/\/explore\/([a-f0-9]+)/i);
      if (!noteMatch) return;

      const noteId = noteMatch[1];
      if (seenIds.has(noteId)) return;
      seenIds.add(noteId);

      const $card = $(el).closest('section, article, [class*="note"], [class*="feed-item"]');

      let title = $card.find('[class*="title"], h3').first().text().trim();
      if (!title || title.length < 3) {
        title = $(el).text().trim().substring(0, 100);
      }
      if (!title || title.length < 3) return;

      const authorName = $card.find('[class*="author"], [class*="name"]').first().text().trim() || '小红书用户';
      const $img = $card.find('img').first();
      const coverImageUrl = $img.attr('src') || $img.attr('data-src');

      const sourceExternalId = `xiaohongshu_${noteId}`;
      const fullUrl = `https://www.xiaohongshu.com/explore/${noteId}`;

      notes.push({
        sourceExternalId,
        sourceUrl: fullUrl,
        title: title.substring(0, 200),
        content: `${title} - 旅游攻略`,
        authorName,
        coverImageUrl: coverImageUrl?.startsWith('http') ? coverImageUrl : (coverImageUrl ? `https:${coverImageUrl}` : undefined),
        imageUrls: [],
        destinations: [city],
        tags: extractTags(title, ''),
        likesCount: 0,
        qualityScore: 50,
      });
    });

    console.log(`[Xiaohongshu] Extracted ${notes.length} notes from explore`);
  } catch (error) {
    console.error('[Xiaohongshu] Error fetching explore page:', error);
  } finally {
    await page.close();
  }

  return notes;
}

/**
 * Extract tags from title and content
 */
function extractTags(title: string, content: string): string[] {
  const tags: string[] = [];
  const text = `${title} ${content}`.toLowerCase();

  const tagPatterns = [
    { pattern: /美食|餐厅|吃|探店|必吃/, tag: '美食' },
    { pattern: /住宿|酒店|民宿|客栈|打卡住/, tag: '住宿' },
    { pattern: /景点|景区|打卡|必去|网红/, tag: '景点' },
    { pattern: /交通|出行|高铁|飞机|地铁|攻略/, tag: '交通' },
    { pattern: /购物|商场|特产|伴手礼/, tag: '购物' },
    { pattern: /亲子|带娃|儿童|宝宝|遛娃/, tag: '亲子游' },
    { pattern: /情侣|浪漫|蜜月|约会|小众/, tag: '情侣游' },
    { pattern: /自驾|租车|自由行|路线/, tag: '自驾游' },
    { pattern: /摄影|拍照|出片|氛围感|穿搭/, tag: '摄影' },
    { pattern: /徒步|登山|户外|露营|野餐/, tag: '户外' },
    { pattern: /省钱|预算|穷游|平价|白嫖/, tag: '省钱攻略' },
    { pattern: /周末|一日游|两天|短途/, tag: '短途游' },
    { pattern: /古镇|古城|历史|文化/, tag: '文化' },
    { pattern: /海滩|海边|海岛|潜水/, tag: '海滩' },
  ];

  for (const { pattern, tag } of tagPatterns) {
    if (pattern.test(text)) {
      tags.push(tag);
    }
  }

  return tags.slice(0, 5);
}

/**
 * Calculate quality score based on content metrics
 */
function calculateQualityScore(
  content: string,
  imageCount: number,
  likesCount: number
): number {
  let score = 50;

  // Content length bonus
  if (content.length > 500) score += 10;
  if (content.length > 1000) score += 10;
  if (content.length > 2000) score += 5;

  // Image bonus
  score += Math.min(imageCount * 2, 15);

  // Likes bonus (xiaohongshu tends to have higher engagement)
  if (likesCount > 100) score += 5;
  if (likesCount > 1000) score += 5;
  if (likesCount > 10000) score += 5;

  return Math.min(score, 100);
}
