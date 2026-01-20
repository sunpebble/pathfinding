/**
 * Qunar (去哪儿) Crawler
 * Crawls travel guides from Qunar using Playwright
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

// City ID mapping for Qunar destination pages
const CITY_IDS: Record<string, string> = {
  北京: '300028-beijing',
  上海: '300286-shanghai',
  杭州: '300152-hangzhou',
  成都: '300318-chengdu',
  西安: '300262-xian',
  三亚: '300244-sanya',
  厦门: '300130-xiamen',
  大理: '300458-dali',
  广州: '300102-guangzhou',
  深圳: '300111-shenzhen',
  南京: '300177-nanjing',
  苏州: '300189-suzhou',
  丽江: '300459-lijiang',
  重庆: '300287-chongqing',
  武汉: '300218-wuhan',
  青岛: '300241-qingdao',
  桂林: '300068-guilin',
  昆明: '300451-kunming',
  拉萨: '300575-lhasa',
  香格里拉: '300476-xianggelila',
};

/**
 * Crawl Qunar travel guides for a city
 */
export async function crawlQunar(
  city: string,
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const maxPages = options.maxPages || 5;
  const cityId = CITY_IDS[city];

  if (!cityId) {
    console.warn(`[Qunar] City not mapped: ${city}`);
    return results;
  }

  console.log(`[Qunar] Crawling guides for ${city} (${cityId})`);

  const context = await createContext();

  try {
    for (let page = 1; page <= maxPages; page++) {
      try {
        // Qunar travel notes list URL
        const listUrl = `https://travel.qunar.com/p-cs${cityId}/youji?page=${page}`;
        console.log(`[Qunar] Fetching page ${page}: ${listUrl}`);

        const guideLinks = await fetchListPage(context, listUrl);
        console.log(
          `[Qunar] Found ${guideLinks.length} guides on page ${page}`
        );

        // Fetch each guide detail
        for (const guideUrl of guideLinks.slice(0, 10)) {
          try {
            const guide = await fetchQunarGuide(context, guideUrl, city);
            if (guide) {
              results.push(guide);
            }
            // Rate limiting
            await sleep(1000 / (options.rateLimit || 0.5));
          } catch (error) {
            console.error(`[Qunar] Error fetching guide: ${guideUrl}`, error);
          }
        }
      } catch (error) {
        console.error(`[Qunar] Error crawling page ${page}:`, error);
      }
    }
  } finally {
    await context.close();
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
    await waitForContent(
      page,
      '.b_strategy_list, .list_item, a[href*="/youji/"]'
    );
    await scrollToLoadContent(page);

    const html = await page.content();
    const $ = cheerio.load(html);

    const guideLinks: string[] = [];

    // Try multiple selectors for guide links
    $('a[href*="/youji/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.match(/\/youji\/\d+/)) {
        const fullUrl = href.startsWith('http')
          ? href
          : `https://travel.qunar.com${href}`;
        if (!guideLinks.includes(fullUrl)) {
          guideLinks.push(fullUrl);
        }
      }
    });

    return guideLinks;
  } catch (error) {
    console.error(`[Qunar] Error fetching list page: ${url}`, error);
    return [];
  } finally {
    await page.close();
  }
}

/**
 * Fetch Qunar guide detail page using Playwright
 */
async function fetchQunarGuide(
  context: Awaited<ReturnType<typeof createContext>>,
  url: string,
  city: string
): Promise<CrawlResult | null> {
  const page = await createPage(context);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForContent(page, '.b_foreword, .e_main_con, .b_panel_schedule');
    await scrollToLoadContent(page);

    const html = await page.content();
    const $ = cheerio.load(html);

    // Extract content
    const title =
      $('h1.b_crumb_cont, .e_title h1, .youji-title').first().text().trim() ||
      $('title').text().split('-')[0].trim() ||
      $('h1').first().text().trim();

    const content =
      $('.b_foreword, .e_main_con, .b_panel_schedule').text().trim() ||
      $('article').text().trim() ||
      $('.content').text().trim() ||
      $('.b_main').text().trim();

    const authorName =
      $('.e_author_name, .headpic_txt a').first().text().trim() || '去哪儿用户';

    // Extract images
    const imageUrls: string[] = [];
    $(
      '.b_foreword img, .e_main_con img, .b_panel_schedule img, .b_main img'
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
        let fullSrc = src;
        if (src.startsWith('//')) {
          fullSrc = `https:${src}`;
        } else if (!src.startsWith('http')) {
          fullSrc = `https://travel.qunar.com${src}`;
        }
        if (!imageUrls.includes(fullSrc)) {
          imageUrls.push(fullSrc);
        }
      }
    });

    const coverImageUrl = imageUrls[0];

    // Extract stats
    const viewsText = $('.e_view em, .view_count').text();
    const likesText = $('.e_ding em, .like_count').text();
    const viewsCount = Number.parseInt(viewsText.match(/\d+/)?.[0] || '0', 10);
    const likesCount = Number.parseInt(likesText.match(/\d+/)?.[0] || '0', 10);

    // Generate external ID
    const urlMatch = url.match(/\/youji\/(\d+)/);
    const sourceExternalId = `qunar_${urlMatch?.[1] || Date.now()}`;

    if (!content || content.length < 100) {
      console.log(`[Qunar] Skipping guide with insufficient content: ${url}`);
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
    console.error(`[Qunar] Error parsing guide:`, error);
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
    { pattern: /美食|餐厅|吃|小吃|火锅|烧烤/, tag: '美食' },
    { pattern: /住宿|酒店|民宿|客栈|青旅/, tag: '住宿' },
    { pattern: /景点|景区|打卡|必去|网红点/, tag: '景点' },
    { pattern: /交通|出行|高铁|飞机|地铁|公交/, tag: '交通' },
    { pattern: /购物|商场|特产|纪念品/, tag: '购物' },
    { pattern: /亲子|带娃|儿童|宝宝|家庭/, tag: '亲子游' },
    { pattern: /情侣|浪漫|蜜月|约会/, tag: '情侣游' },
    { pattern: /自驾游|租车/, tag: '自驾游' },
    { pattern: /拍照|出片|摄影点/, tag: '摄影' },
    { pattern: /徒步|登山|户外|探险/, tag: '户外' },
    { pattern: /海滩|海边|沙滩|海岛/, tag: '海滨' },
    { pattern: /古镇|古城|历史|古建筑/, tag: '人文' },
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
