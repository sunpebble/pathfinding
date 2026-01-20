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
  waitForContent,
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
 */
export async function crawlTongcheng(
  city: string,
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const maxPages = options.maxPages || 5;
  const citySlug = CITY_SLUGS[city] || city.toLowerCase();

  console.log(`[Tongcheng] Crawling guides for ${city} (${citySlug})`);

  // Create a browser context for this crawl session
  const context = await createContext();

  try {
    for (let page = 1; page <= maxPages; page++) {
      try {
        // Try primary URL format first
        const listUrl = `https://go.ly.com/youji/list-${citySlug}-0-0-0-0-0-${page}.html`;
        console.log(`[Tongcheng] Fetching page ${page}: ${listUrl}`);

        const guideLinks = await fetchListPage(context, listUrl);

        // If primary URL fails, try alternative URL format
        if (guideLinks.length === 0) {
          const altUrl = `https://www.ly.com/destination/${citySlug}/youji/p${page}.html`;
          console.log(`[Tongcheng] Trying alternative URL: ${altUrl}`);
          const altLinks = await fetchListPage(context, altUrl);

          if (altLinks.length > 0) {
            console.log(
              `[Tongcheng] Found ${altLinks.length} guides on page ${page} (alt URL)`
            );
            await processGuideLinks(context, altLinks, city, options, results);
            continue;
          }
        }

        console.log(
          `[Tongcheng] Found ${guideLinks.length} guides on page ${page}`
        );
        await processGuideLinks(context, guideLinks, city, options, results);
      } catch (error) {
        console.error(`[Tongcheng] Error crawling page ${page}:`, error);
      }
    }
  } finally {
    // Always close the context (but not the shared browser)
    await context.close();
    console.log('[Tongcheng] Browser context closed');
  }

  return results;
}

/**
 * Fetch list page using Playwright and extract guide links
 */
async function fetchListPage(
  context: Awaited<ReturnType<typeof createContext>>,
  url: string
): Promise<string[]> {
  const page = await createPage(context);

  try {
    // Navigate to the list page
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });

    if (!response || !response.ok()) {
      console.log(
        `[Tongcheng] Failed to load: ${url} (status: ${response?.status()})`
      );
      return [];
    }

    // Wait for content to load
    await waitForContent(
      page,
      '.youji-list, .travel-item, .note-card, .article-item'
    );

    // Scroll to load lazy content
    await scrollToLoadContent(page);

    // Get the rendered HTML
    const html = await page.content();

    // Extract guide links from HTML
    return extractGuideLinks(html);
  } catch (error) {
    console.error(`[Tongcheng] Error fetching list page: ${url}`, error);
    return [];
  } finally {
    await page.close();
  }
}

/**
 * Extract guide links from HTML
 */
function extractGuideLinks(html: string): string[] {
  const $ = cheerio.load(html);
  const guideLinks: string[] = [];

  // Tongcheng travel note selectors (may need adjustment based on actual HTML structure)
  $(
    '.youji-list a.title, .travel-item a, .note-card a, .article-item a, [class*="youji"] a[href*="youji"]'
  ).each((_, el) => {
    const href = $(el).attr('href');
    if (href && (href.includes('/youji/') || href.includes('/travels/'))) {
      const fullUrl = href.startsWith('http')
        ? href
        : `https://go.ly.com${href}`;
      if (!guideLinks.includes(fullUrl)) {
        guideLinks.push(fullUrl);
      }
    }
  });

  // Fallback: try to find any travel note links
  if (guideLinks.length === 0) {
    $('a[href*="/youji/"], a[href*="/travels/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.match(/\/youji\/\d+|\/travels\/\d+/)) {
        const fullUrl = href.startsWith('http')
          ? href
          : `https://go.ly.com${href}`;
        if (!guideLinks.includes(fullUrl)) {
          guideLinks.push(fullUrl);
        }
      }
    });
  }

  return guideLinks;
}

/**
 * Process guide links and fetch details
 */
async function processGuideLinks(
  context: Awaited<ReturnType<typeof createContext>>,
  guideLinks: string[],
  city: string,
  options: CrawlOptions,
  results: CrawlResult[]
): Promise<void> {
  for (const guideUrl of guideLinks.slice(0, 10)) {
    try {
      const guide = await fetchTongchengGuide(context, guideUrl, city);
      if (guide) {
        results.push(guide);
      }
      // Rate limiting
      await sleep(1000 / (options.rateLimit || 0.5));
    } catch (error) {
      console.error(`[Tongcheng] Error fetching guide: ${guideUrl}`, error);
    }
  }
}

/**
 * Fetch Tongcheng guide detail page using Playwright
 */
async function fetchTongchengGuide(
  context: Awaited<ReturnType<typeof createContext>>,
  url: string,
  city: string
): Promise<CrawlResult | null> {
  const page = await createPage(context);

  try {
    // Navigate to the guide detail page
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });

    if (!response || !response.ok()) {
      console.log(
        `[Tongcheng] Failed to load guide: ${url} (status: ${response?.status()})`
      );
      return null;
    }

    // Wait for content to load
    await waitForContent(
      page,
      '.article-content, .youji-content, .detail-content, .travel-content'
    );

    // Scroll to load lazy images
    await scrollToLoadContent(page);

    // Get the rendered HTML
    const html = await page.content();
    const $ = cheerio.load(html);

    // Extract content - Tongcheng specific selectors
    const title =
      $('h1.title, .article-title, .youji-title, .detail-title')
        .first()
        .text()
        .trim() ||
      $('title').text().split('-')[0].trim() ||
      $('h1').first().text().trim();

    const content =
      $('.article-content, .youji-content, .detail-content, .travel-content')
        .text()
        .trim() ||
      $('article').text().trim() ||
      $('.content').text().trim() ||
      $('[class*="content"]').text().trim();

    const authorName =
      $('.author-name, .user-name, .nickname, .author').first().text().trim() ||
      $('[class*="author"]').first().text().trim();

    // Extract images
    const imageUrls: string[] = [];
    $(
      '.article-content img, .youji-content img, .detail-content img, .travel-content img, article img'
    ).each((_, el) => {
      const src =
        $(el).attr('src') ||
        $(el).attr('data-src') ||
        $(el).attr('data-original');
      if (
        src &&
        !src.includes('avatar') &&
        !src.includes('icon') &&
        !src.includes('logo')
      ) {
        const fullSrc = src.startsWith('http') ? src : `https:${src}`;
        if (!imageUrls.includes(fullSrc)) {
          imageUrls.push(fullSrc);
        }
      }
    });

    const coverImageUrl = imageUrls[0];

    // Extract stats
    const viewsText = $(
      '.view-count, .views, .read-count, [class*="view"]'
    ).text();
    const likesText = $('.like-count, .likes, .zan, [class*="like"]').text();
    const commentsText = $(
      '.comment-count, .comments, [class*="comment"]'
    ).text();

    const viewsCount = Number.parseInt(viewsText.match(/\d+/)?.[0] || '0', 10);
    const likesCount = Number.parseInt(likesText.match(/\d+/)?.[0] || '0', 10);
    const commentsCount = Number.parseInt(
      commentsText.match(/\d+/)?.[0] || '0',
      10
    );

    // Generate external ID from URL
    const urlMatch = url.match(/\/youji\/(\d+)|\/travels\/(\d+)|(\d+)\.html/);
    const idPart =
      urlMatch?.[1] || urlMatch?.[2] || urlMatch?.[3] || Date.now().toString();
    const sourceExternalId = `tongcheng_${idPart}`;

    if (!content || content.length < 100) {
      console.log(
        `[Tongcheng] Skipping guide with insufficient content: ${url}`
      );
      return null;
    }

    return {
      sourceExternalId,
      sourceUrl: url,
      title: title || `${city}旅游攻略`,
      content: content.substring(0, 50000), // Limit content length
      authorName: authorName || '同程用户',
      coverImageUrl,
      imageUrls: imageUrls.slice(0, 20),
      destinations: [city],
      tags: extractTags(title, content),
      likesCount,
      viewsCount,
      commentsCount,
      qualityScore: calculateQualityScore(
        content,
        imageUrls.length,
        viewsCount
      ),
    };
  } catch (error) {
    console.error(`[Tongcheng] Error parsing guide:`, error);
    return null;
  } finally {
    await page.close();
  }
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
