/**
 * Tongcheng (同程旅行/LY.com) Crawler
 * Crawls travel guides from Tongcheng Travel using Playwright headless browser
 */

import type { CrawlOptions, CrawlResult } from './index.js';
import * as cheerio from 'cheerio';
import {
  createContext,
  createPage,
  scrollToLoadContent,
  sleep,
} from './browser.js';

// City ID/slug mapping for Tongcheng
// Tongcheng uses city pinyin or IDs in URLs
const CITY_SLUGS: Record<string, string> = {
  北京: 'beijing',
  上海: 'shanghai',
  杭州: 'hangzhou',
  成都: 'chengdu',
  西安: 'xian',
  三亚: 'sanya',
  厦门: 'xiamen',
  大理: 'dali',
  广州: 'guangzhou',
  深圳: 'shenzhen',
  南京: 'nanjing',
  苏州: 'suzhou',
  丽江: 'lijiang',
  重庆: 'chongqing',
  武汉: 'wuhan',
  青岛: 'qingdao',
  桂林: 'guilin',
  昆明: 'kunming',
  西双版纳: 'xishuangbanna',
  张家界: 'zhangjiajie',
};

/**
 * Crawl Tongcheng travel guides for a city
 * Uses the new travels list page at www.ly.com/travels/
 */
export async function crawlTongcheng(
  city: string,
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const maxGuides = (options.maxPages || 5) * 10; // Convert pages to guide count
  const citySlug = CITY_SLUGS[city] || city.toLowerCase();

  console.log(`[Tongcheng] Crawling guides for ${city} (${citySlug})`);

  // Create a browser context for this crawl session
  const context = await createContext();

  try {
    // Use the main travels list page and extract guides
    const listUrl = 'https://www.ly.com/travels/';
    console.log(`[Tongcheng] Fetching travels list: ${listUrl}`);

    const guides = await fetchGuidesFromTravelsList(context, listUrl, city, maxGuides);
    console.log(`[Tongcheng] Found ${guides.length} guides from travels list`);

    results.push(...guides);
  } catch (error) {
    console.error(`[Tongcheng] Error crawling travels list:`, error);
  } finally {
    // Always close the context (but not the shared browser)
    await context.close();
    console.log('[Tongcheng] Browser context closed');
  }

  return results;
}

/**
 * Fetch guides directly from the travels list page
 * The page uses JavaScript to load content, so we need to wait for it
 */
async function fetchGuidesFromTravelsList(
  context: Awaited<ReturnType<typeof createContext>>,
  listUrl: string,
  city: string,
  maxGuides: number
): Promise<CrawlResult[]> {
  const page = await createPage(context);
  const guides: CrawlResult[] = [];
  const seenIds = new Set<string>();

  try {
    // Navigate to the travels list page
    await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for the guide list to load
    try {
      await page.waitForSelector('a[href*="/travels/"]', { timeout: 15000 });
      console.log('[Tongcheng] Found travel links');
    } catch {
      console.log('[Tongcheng] Travel links not found immediately, waiting...');
    }

    // Wait for network to settle
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Scroll to load more content
    await scrollToLoadContent(page);

    // Additional wait for dynamic content
    await sleep(2000);

    // Get the rendered HTML
    const html = await page.content();
    const $ = cheerio.load(html);

    // Extract guide items from the list
    // Based on the page structure: links with /travels/{id}.html format
    $('a[href*="/travels/"]').each((_, el) => {
      if (guides.length >= maxGuides) return false;

      const href = $(el).attr('href');
      if (!href || !href.match(/\/travels\/\d+\.html/)) return;

      // Extract guide ID
      const urlMatch = href.match(/\/travels\/(\d+)\.html/);
      const guideId = urlMatch?.[1];
      if (!guideId || seenIds.has(guideId)) return;
      seenIds.add(guideId);

      // Try to extract title from the link or nearby elements
      const $el = $(el);
      let title = $el.text().trim();

      // If this is an image link, look for title in parent or sibling
      if (!title || title.length < 5) {
        const $parent = $el.closest('li, .item, [class*="item"]');
        title = $parent.find('p a, h1 a, h2 a, h3 a, .title').text().trim() ||
                $parent.find('p, h1, h2, h3').first().text().trim();
      }

      // Skip if still no title
      if (!title || title.length < 5) return;

      // Try to get cover image
      const $img = $el.find('img').first();
      const coverImageUrl = $img.attr('src') || $img.attr('data-src') || $img.attr('data-original');

      // Try to get author
      const $parent = $el.closest('li, .item, [class*="item"]');
      const authorName = $parent.find('[class*="author"], [class*="user"], [class*="name"]').text().trim() || '同程用户';

      const sourceExternalId = `tongcheng_${guideId}`;
      const fullUrl = href.startsWith('http') ? href : `https://www.ly.com${href}`;

      guides.push({
        sourceExternalId,
        sourceUrl: fullUrl,
        title,
        content: `${title} - ${city}旅游攻略`, // Will be enriched with full content if needed
        authorName,
        coverImageUrl: coverImageUrl?.startsWith('http') ? coverImageUrl : (coverImageUrl ? `https:${coverImageUrl}` : undefined),
        imageUrls: [],
        destinations: [city],
        tags: extractTags(title, ''),
        viewsCount: 0,
        qualityScore: 50,
      });
    });

    console.log(`[Tongcheng] Extracted ${guides.length} guides from list`);
  } catch (error) {
    console.error(`[Tongcheng] Error fetching travels list:`, error);
  } finally {
    await page.close();
  }

  return guides;
}


/**
 * Extract tags from title and content
 */
function extractTags(title: string, content: string): string[] {
  const tags: string[] = [];
  const text = `${title} ${content}`.toLowerCase();

  const tagPatterns = [
    { pattern: /美食|餐厅|吃|小吃|特色菜/, tag: '美食' },
    { pattern: /住宿|酒店|民宿|客栈|度假村/, tag: '住宿' },
    { pattern: /景点|景区|打卡|必去|网红/, tag: '景点' },
    { pattern: /交通|出行|高铁|飞机|地铁|公交/, tag: '交通' },
    { pattern: /购物|商场|特产|纪念品/, tag: '购物' },
    { pattern: /亲子|带娃|儿童|宝宝|家庭/, tag: '亲子游' },
    { pattern: /情侣|浪漫|蜜月|约会/, tag: '情侣游' },
    { pattern: /自驾|租车|自由行/, tag: '自驾游' },
    { pattern: /摄影|拍照|出片|打卡点/, tag: '摄影' },
    { pattern: /徒步|登山|户外|露营/, tag: '户外' },
    { pattern: /省钱|预算|穷游|便宜/, tag: '省钱攻略' },
    { pattern: /周末|两天|一日游/, tag: '短途游' },
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
  viewsCount: number
): number {
  let score = 50;

  // Content length bonus
  if (content.length > 1000) score += 10;
  if (content.length > 3000) score += 10;
  if (content.length > 5000) score += 5;

  // Image bonus
  score += Math.min(imageCount * 2, 15);

  // Views bonus
  if (viewsCount > 1000) score += 5;
  if (viewsCount > 10000) score += 5;

  return Math.min(score, 100);
}
