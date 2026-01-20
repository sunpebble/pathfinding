/**
 * Ctrip (携程) Crawler
 * Crawls travel guides from Ctrip using Playwright
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

// City ID mapping for Ctrip
const CITY_IDS: Record<string, string> = {
  北京: 'Beijing1',
  上海: 'Shanghai2',
  杭州: 'Hangzhou14',
  成都: 'Chengdu104',
  西安: 'Xian7',
  三亚: 'Sanya61',
  厦门: 'Xiamen21',
  大理: 'Dali31',
  广州: 'Guangzhou152',
  深圳: 'Shenzhen26',
  南京: 'Nanjing9',
  苏州: 'Suzhou11',
  丽江: 'Lijiang32',
  重庆: 'Chongqing158',
  武汉: 'Wuhan145',
};

/**
 * Crawl Ctrip travel guides for a city
 */
export async function crawlCtrip(
  city: string,
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const maxPages = options.maxPages || 5;
  const cityId = CITY_IDS[city] || city;

  console.log(`[Ctrip] Crawling guides for ${city} (${cityId})`);

  const context = await createContext();

  try {
    for (let page = 1; page <= maxPages; page++) {
      try {
        const listUrl = `https://you.ctrip.com/travels/${cityId}/t3-p${page}.html`;
        console.log(`[Ctrip] Fetching page ${page}: ${listUrl}`);

        const guideLinks = await fetchListPage(context, listUrl);
        console.log(
          `[Ctrip] Found ${guideLinks.length} guides on page ${page}`
        );

        // Fetch each guide detail
        for (const guideUrl of guideLinks.slice(0, 10)) {
          try {
            const guide = await fetchGuideDetail(context, guideUrl, city);
            if (guide) {
              results.push(guide);
            }
            // Rate limiting
            await sleep(1000 / (options.rateLimit || 0.5));
          } catch (error) {
            console.error(`[Ctrip] Error fetching guide: ${guideUrl}`, error);
          }
        }
      } catch (error) {
        console.error(`[Ctrip] Error crawling page ${page}:`, error);
      }
    }
  } finally {
    await context.close();
    console.log('[Ctrip] Browser context closed');
  }

  return results;
}

/**
 * Fetch list page using Playwright
 */
async function fetchListPage(
  context: Awaited<ReturnType<typeof createContext>>,
  url: string
): Promise<string[]> {
  const page = await createPage(context);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForContent(page, 'a[href*="/travels/"]');
    await scrollToLoadContent(page);

    const html = await page.content();
    const $ = cheerio.load(html);

    const guideLinks: string[] = [];

    // Match pattern like /travels/Beijing1/3968904.html
    $('a[href*="/travels/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.match(/\/travels\/[A-Za-z]+\d+\/\d+\.html/)) {
        const fullUrl = href.startsWith('http')
          ? href
          : `https://you.ctrip.com${href}`;
        if (!guideLinks.includes(fullUrl)) {
          guideLinks.push(fullUrl);
        }
      }
    });

    return guideLinks;
  } catch (error) {
    console.error(`[Ctrip] Error fetching list page: ${url}`, error);
    return [];
  } finally {
    await page.close();
  }
}

/**
 * Fetch guide detail page using Playwright
 */
async function fetchGuideDetail(
  context: Awaited<ReturnType<typeof createContext>>,
  url: string,
  city: string
): Promise<CrawlResult | null> {
  const page = await createPage(context);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForContent(page, 'article, .ctd_content, .travel_article');
    await scrollToLoadContent(page);

    const html = await page.content();
    const $ = cheerio.load(html);

    // Extract content - try multiple selectors for new Ctrip layout
    const title =
      $('h1').first().text().trim() || $('title').text().split('-')[0].trim();

    // New Ctrip uses article or specific content areas
    const content =
      $('article').text().trim() ||
      $('.ctd_content').text().trim() ||
      $('.travel_article').text().trim() ||
      $('[class*="content"]').text().trim() ||
      $('main').text().trim();

    const authorName =
      $('.author-name, .ctd_author_name, [class*="author"]')
        .first()
        .text()
        .trim() || '携程用户';

    // Extract images
    const imageUrls: string[] = [];
    $('article img, .ctd_content img, .travel_article img, main img').each(
      (_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src && !src.includes('avatar') && !src.includes('icon')) {
          const fullSrc = src.startsWith('http') ? src : `https:${src}`;
          if (!imageUrls.includes(fullSrc)) {
            imageUrls.push(fullSrc);
          }
        }
      }
    );

    const coverImageUrl = imageUrls[0];

    // Extract stats
    const viewsText = $('[class*="view"], [class*="read"]').text();
    const likesText = $('[class*="like"], [class*="ding"]').text();
    const viewsCount = Number.parseInt(viewsText.match(/\d+/)?.[0] || '0', 10);
    const likesCount = Number.parseInt(likesText.match(/\d+/)?.[0] || '0', 10);

    // Generate external ID
    const urlMatch = url.match(/\/(\d+)\.html/);
    const sourceExternalId = `ctrip_${urlMatch?.[1] || Date.now()}`;

    if (!content || content.length < 100) {
      console.log(`[Ctrip] Skipping guide with insufficient content: ${url}`);
      return null;
    }

    return {
      sourceExternalId,
      sourceUrl: url,
      title: title || `${city}旅游攻略`,
      content: content.substring(0, 50000),
      authorName,
      coverImageUrl,
      imageUrls: imageUrls.slice(0, 20),
      destinations: [city],
      tags: extractTags(title, content),
      likesCount,
      viewsCount,
      qualityScore: calculateQualityScore(
        content,
        imageUrls.length,
        viewsCount
      ),
    };
  } catch (error) {
    console.error(`[Ctrip] Error parsing guide:`, error);
    return null;
  } finally {
    await page.close();
  }
}

/**
 * Extract tags from content
 */
function extractTags(title: string, content: string): string[] {
  const tags: string[] = [];
  const text = `${title} ${content}`.toLowerCase();

  const tagPatterns = [
    { pattern: /美食|餐厅|吃/, tag: '美食' },
    { pattern: /住宿|酒店|民宿/, tag: '住宿' },
    { pattern: /景点|景区|打卡/, tag: '景点' },
    { pattern: /交通|出行|高铁|飞机/, tag: '交通' },
    { pattern: /购物|商场/, tag: '购物' },
    { pattern: /亲子|带娃|儿童/, tag: '亲子游' },
    { pattern: /情侣|浪漫/, tag: '情侣游' },
    { pattern: /自驾/, tag: '自驾游' },
    { pattern: /摄影|拍照/, tag: '摄影' },
  ];

  for (const { pattern, tag } of tagPatterns) {
    if (pattern.test(text)) {
      tags.push(tag);
    }
  }

  return tags.slice(0, 5);
}

/**
 * Calculate quality score
 */
function calculateQualityScore(
  content: string,
  imageCount: number,
  viewsCount: number
): number {
  let score = 50;

  if (content.length > 1000) score += 10;
  if (content.length > 3000) score += 10;
  if (content.length > 5000) score += 5;

  score += Math.min(imageCount * 2, 15);

  if (viewsCount > 1000) score += 5;
  if (viewsCount > 10000) score += 5;

  return Math.min(score, 100);
}
