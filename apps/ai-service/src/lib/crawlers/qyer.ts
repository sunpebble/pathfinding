/**
 * Qyer (穷游网) Crawler
 * Crawls travel guides from Qyer using Playwright headless browser
 *
 * Qyer is known for high-quality travel guides and detailed trip reports,
 * especially for international destinations.
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

// City/destination mapping for Qyer
// Format: Chinese name -> { placeId, forumId }
// placeId is used for place.qyer.com, forumId for bbs.qyer.com
const CITY_CONFIG: Record<
  string,
  { placeId: string; forumId: string; englishName: string }
> = {
  北京: { placeId: 'beijing', forumId: '2', englishName: 'Beijing' },
  上海: { placeId: 'shanghai', forumId: '3', englishName: 'Shanghai' },
  杭州: { placeId: 'hangzhou', forumId: '14', englishName: 'Hangzhou' },
  成都: { placeId: 'chengdu', forumId: '15', englishName: 'Chengdu' },
  西安: { placeId: 'xian', forumId: '17', englishName: 'Xian' },
  三亚: { placeId: 'sanya', forumId: '108', englishName: 'Sanya' },
  厦门: { placeId: 'xiamen', forumId: '16', englishName: 'Xiamen' },
  大理: { placeId: 'dali', forumId: '109', englishName: 'Dali' },
  广州: { placeId: 'guangzhou', forumId: '5', englishName: 'Guangzhou' },
  深圳: { placeId: 'shenzhen', forumId: '6', englishName: 'Shenzhen' },
  南京: { placeId: 'nanjing', forumId: '13', englishName: 'Nanjing' },
  苏州: { placeId: 'suzhou', forumId: '12', englishName: 'Suzhou' },
  丽江: { placeId: 'lijiang', forumId: '110', englishName: 'Lijiang' },
  重庆: { placeId: 'chongqing', forumId: '18', englishName: 'Chongqing' },
  武汉: { placeId: 'wuhan', forumId: '19', englishName: 'Wuhan' },
  青岛: { placeId: 'qingdao', forumId: '20', englishName: 'Qingdao' },
  桂林: { placeId: 'guilin', forumId: '21', englishName: 'Guilin' },
  昆明: { placeId: 'kunming', forumId: '22', englishName: 'Kunming' },
  西双版纳: {
    placeId: 'xishuangbanna',
    forumId: '111',
    englishName: 'Xishuangbanna',
  },
  张家界: {
    placeId: 'zhangjiajie',
    forumId: '112',
    englishName: 'Zhangjiajie',
  },
  // International destinations (穷游's strength)
  东京: { placeId: 'tokyo', forumId: '42', englishName: 'Tokyo' },
  大阪: { placeId: 'osaka', forumId: '43', englishName: 'Osaka' },
  京都: { placeId: 'kyoto', forumId: '44', englishName: 'Kyoto' },
  首尔: { placeId: 'seoul', forumId: '51', englishName: 'Seoul' },
  曼谷: { placeId: 'bangkok', forumId: '61', englishName: 'Bangkok' },
  新加坡: { placeId: 'singapore', forumId: '71', englishName: 'Singapore' },
  巴黎: { placeId: 'paris', forumId: '81', englishName: 'Paris' },
  伦敦: { placeId: 'london', forumId: '82', englishName: 'London' },
};

/**
 * Crawl Qyer travel guides for a city
 * Uses destination pages and forum threads
 */
export async function crawlQyer(
  city: string,
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const maxPages = options.maxPages || 3;
  const config = CITY_CONFIG[city];

  if (!config) {
    console.warn(`[Qyer] City not mapped: ${city}, using search fallback`);
    // Fallback to search
    return crawlQyerBySearch(city, options);
  }

  console.log(`[Qyer] Crawling guides for ${city} (${config.englishName})`);

  const context = await createContext();

  try {
    // Strategy 1: Fetch from destination page (place.qyer.com)
    try {
      const placeUrl = `https://place.qyer.com/${config.placeId}/`;
      console.log(`[Qyer] Fetching destination page: ${placeUrl}`);

      const placeGuides = await fetchGuidesFromPlacePage(
        context,
        placeUrl,
        city,
        20
      );
      console.log(
        `[Qyer] Found ${placeGuides.length} guides from destination page`
      );

      for (const guide of placeGuides) {
        if (
          !results.some((r) => r.sourceExternalId === guide.sourceExternalId)
        ) {
          results.push(guide);
        }
      }
    } catch (error) {
      console.error('[Qyer] Error fetching destination page:', error);
    }

    // Strategy 2: Fetch from forum (bbs.qyer.com)
    for (let page = 1; page <= maxPages; page++) {
      try {
        const forumUrl = `https://bbs.qyer.com/forum-${config.forumId}-${page}.html`;
        console.log(`[Qyer] Fetching forum page ${page}: ${forumUrl}`);

        const forumGuides = await fetchGuidesFromForumPage(
          context,
          forumUrl,
          city,
          20
        );
        console.log(
          `[Qyer] Found ${forumGuides.length} guides from forum page ${page}`
        );

        for (const guide of forumGuides) {
          if (
            !results.some((r) => r.sourceExternalId === guide.sourceExternalId)
          ) {
            results.push(guide);
          }
        }

        // Rate limiting between pages
        await sleep(1500);
      } catch (error) {
        console.error(`[Qyer] Error fetching forum page ${page}:`, error);
      }
    }
  } finally {
    await context.close();
    console.log('[Qyer] Browser context closed');
  }

  return results;
}

/**
 * Crawl Qyer by search when city is not in the mapping
 */
async function crawlQyerBySearch(
  city: string,
  _options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const context = await createContext();

  try {
    const searchUrl = `https://www.qyer.com/search2/topic?keyword=${encodeURIComponent(`${city  }攻略`)}`;
    console.log(`[Qyer] Searching: ${searchUrl}`);

    const guides = await fetchGuidesFromSearchPage(
      context,
      searchUrl,
      city,
      30
    );
    results.push(...guides);
  } catch (error) {
    console.error('[Qyer] Error searching:', error);
  } finally {
    await context.close();
  }

  return results;
}

/**
 * Fetch guides from destination page (place.qyer.com)
 */
async function fetchGuidesFromPlacePage(
  context: Awaited<ReturnType<typeof createContext>>,
  url: string,
  city: string,
  maxGuides: number
): Promise<CrawlResult[]> {
  const page = await createPage(context);
  const guides: CrawlResult[] = [];
  const seenIds = new Set<string>();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for content to load
    try {
      await page.waitForSelector('.ui_list_item, .place-list-item, article', {
        timeout: 15000,
      });
    } catch {
      console.log('[Qyer] Waiting for content...');
    }

    await page
      .waitForLoadState('networkidle', { timeout: 10000 })
      .catch(() => {});
    await scrollToLoadContent(page);
    await sleep(2000);

    const html = await page.content();
    const $ = cheerio.load(html);

    // Strategy 1: Extract from "热门游记" section (ess-diary-list)
    // Links format: href="//bbs.qyer.com/thread-xxx-1.html"
    $('.ess-diary-list li').each((_, el) => {
      if (guides.length >= maxGuides) return false;

      const $li = $(el);
      const $link = $li.find('a.diary-box');
      const href = $link.attr('href');
      if (!href) return;

      // Match thread URLs: //bbs.qyer.com/thread-XXXXX-1.html
      const threadMatch = href.match(/thread-(\d+)/);
      if (!threadMatch) return;

      const threadId = threadMatch[1];
      if (seenIds.has(threadId)) return;
      seenIds.add(threadId);

      // Get title from .diary-title
      let title = $li.find('.diary-title').text().trim();
      if (!title || title.length < 5) {
        title = $li.find('img').attr('alt') || '';
      }
      if (!title || title.length < 5) return;

      // Skip non-travel posts
      if (isSkippableThread(title)) return;

      // Get author from .user-info
      const authorName =
        $li.find('.user-info .user-link').text().trim() || '穷游用户';

      // Get cover image
      const $img = $li.find('.diary-pic img');
      const coverImageUrl = $img.attr('src') || $img.attr('data-src');

      // Check if it's featured (精华)
      const isEssence = $li.find('.is-essence').length > 0;

      const sourceExternalId = `qyer_thread_${threadId}`;
      const fullUrl = href.startsWith('http') ? href : `https:${href}`;

      guides.push({
        sourceExternalId,
        sourceUrl: fullUrl,
        title: cleanTitle(title),
        content: `${title} - ${city}旅游攻略`,
        authorName,
        coverImageUrl: normalizeImageUrl(coverImageUrl),
        imageUrls: [],
        destinations: [city],
        tags: extractTags(title, ''),
        viewsCount: 0,
        qualityScore: calculateQualityScore('', 1, 0) + (isEssence ? 15 : 0),
      });
    });

    // Strategy 2: Look for any thread links in the page as fallback
    if (guides.length < maxGuides) {
      $('a[href*="thread-"]').each((_, el) => {
        if (guides.length >= maxGuides) return false;

        const $el = $(el);
        const href = $el.attr('href');
        if (!href) return;

        // Match thread URLs
        const threadMatch = href.match(/thread-(\d+)/);
        if (!threadMatch) return;

        const threadId = threadMatch[1];
        if (seenIds.has(threadId)) return;
        seenIds.add(threadId);

        // Get title
        let title = $el.text().trim();
        if (!title || title.length < 5) {
          title = $el.attr('title') || '';
        }
        if (!title || title.length < 5) return;

        // Skip non-travel posts
        if (isSkippableThread(title)) return;

        // Get parent container for more info
        const $container = $el.closest('li, .diary-box, article');

        // Get author
        const authorName =
          $container
            .find('.author, .user-name, .name, .user-link')
            .first()
            .text()
            .trim() || '穷游用户';

        // Get cover image
        const $img = $container.find('img').first();
        const coverImageUrl = $img.attr('src') || $img.attr('data-src');

        const sourceExternalId = `qyer_thread_${threadId}`;
        const fullUrl = href.startsWith('http')
          ? href
          : href.startsWith('//')
            ? `https:${href}`
            : `https://bbs.qyer.com${href}`;

        guides.push({
          sourceExternalId,
          sourceUrl: fullUrl,
          title: cleanTitle(title),
          content: `${title} - ${city}旅游攻略`,
          authorName,
          coverImageUrl: normalizeImageUrl(coverImageUrl),
          imageUrls: [],
          destinations: [city],
          tags: extractTags(title, ''),
          viewsCount: 0,
          qualityScore: calculateQualityScore('', 1, 0),
        });
      });
    }

    console.log(`[Qyer] Extracted ${guides.length} guides from place page`);
  } catch (error) {
    console.error('[Qyer] Error fetching place page:', error);
  } finally {
    await page.close();
  }

  return guides;
}

/**
 * Fetch guides from forum page (bbs.qyer.com)
 */
async function fetchGuidesFromForumPage(
  context: Awaited<ReturnType<typeof createContext>>,
  url: string,
  city: string,
  maxGuides: number
): Promise<CrawlResult[]> {
  const page = await createPage(context);
  const guides: CrawlResult[] = [];
  const seenIds = new Set<string>();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for forum thread list
    try {
      await page.waitForSelector(
        '.bbs-item, .thread-item, tbody tr, .post-item',
        { timeout: 15000 }
      );
    } catch {
      console.log('[Qyer] Waiting for forum content...');
    }

    await page
      .waitForLoadState('networkidle', { timeout: 10000 })
      .catch(() => {});
    await scrollToLoadContent(page);
    await sleep(1500);

    const html = await page.content();
    const $ = cheerio.load(html);

    // Forum thread selectors
    const threadSelectors = [
      'a[href*="/thread-"]',
      '.bbs-item a.title',
      '.thread-item a',
      'tbody tr a[href*="thread"]',
      '.post-title a',
    ];

    for (const selector of threadSelectors) {
      if (guides.length >= maxGuides) break;

      $(selector).each((_, el) => {
        if (guides.length >= maxGuides) return false;

        const $el = $(el);
        const href = $el.attr('href');
        if (!href) return;

        // Match thread URLs: /thread-XXXXX-1.html
        const threadMatch = href.match(/\/thread-(\d+)/);
        if (!threadMatch) return;

        const threadId = threadMatch[1];
        if (seenIds.has(threadId)) return;
        seenIds.add(threadId);

        // Get title
        let title = $el.text().trim();
        if (!title || title.length < 5) {
          title = $el.attr('title') || '';
        }
        if (!title || title.length < 5) return;

        // Skip non-travel posts (ads, announcements, etc.)
        if (isSkippableThread(title)) return;

        // Get parent row/container
        const $container = $el.closest('tr, .bbs-item, .thread-item, li');

        // Get author
        const authorName =
          $container
            .find('.author, .user, td:nth-child(2)')
            .first()
            .text()
            .trim() || '穷游用户';

        // Get reply/view counts
        const statsText = $container.text();
        const viewsMatch = statsText.match(/(\d+)\s*(次浏览|浏览|阅读)/);
        const repliesMatch = statsText.match(/(\d+)\s*(回复|回帖)/);
        const viewsCount = viewsMatch ? Number.parseInt(viewsMatch[1], 10) : 0;

        // Higher quality if more replies
        const replyCount = repliesMatch ? Number.parseInt(repliesMatch[1], 10) : 0;

        const sourceExternalId = `qyer_thread_${threadId}`;
        const fullUrl = href.startsWith('http')
          ? href
          : `https://bbs.qyer.com${href}`;

        guides.push({
          sourceExternalId,
          sourceUrl: fullUrl,
          title: cleanTitle(title),
          content: `${title} - ${city}旅游攻略`,
          authorName,
          coverImageUrl: undefined,
          imageUrls: [],
          destinations: [city],
          tags: extractTags(title, ''),
          viewsCount,
          commentsCount: replyCount,
          qualityScore:
            calculateQualityScore('', 1, viewsCount) + Math.min(replyCount, 20),
        });
      });
    }

    console.log(`[Qyer] Extracted ${guides.length} guides from forum page`);
  } catch (error) {
    console.error('[Qyer] Error fetching forum page:', error);
  } finally {
    await page.close();
  }

  return guides;
}

/**
 * Fetch guides from search page
 */
async function fetchGuidesFromSearchPage(
  context: Awaited<ReturnType<typeof createContext>>,
  url: string,
  city: string,
  maxGuides: number
): Promise<CrawlResult[]> {
  const page = await createPage(context);
  const guides: CrawlResult[] = [];
  const seenIds = new Set<string>();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    try {
      await page.waitForSelector('.search-result, .result-item, article', {
        timeout: 15000,
      });
    } catch {
      console.log('[Qyer] Waiting for search results...');
    }

    await page
      .waitForLoadState('networkidle', { timeout: 10000 })
      .catch(() => {});
    await scrollToLoadContent(page);
    await sleep(2000);

    const html = await page.content();
    const $ = cheerio.load(html);

    // Search result selectors
    $('a[href*="/travels/"], a[href*="/thread-"]').each((_, el) => {
      if (guides.length >= maxGuides) return false;

      const $el = $(el);
      const href = $el.attr('href');
      if (!href) return;

      // Match travel or thread URLs
      const travelMatch = href.match(/\/travels\/([a-zA-Z0-9-]+)/);
      const threadMatch = href.match(/\/thread-(\d+)/);
      const match = travelMatch || threadMatch;
      if (!match) return;

      const id = match[1];
      const type = travelMatch ? 'travel' : 'thread';
      if (seenIds.has(id)) return;
      seenIds.add(id);

      const title = $el.text().trim();
      if (!title || title.length < 5) return;

      const $container = $el.closest(
        '.result-item, .search-result, article, li'
      );
      const authorName =
        $container.find('.author, .user').first().text().trim() || '穷游用户';

      const sourceExternalId = `qyer_${type}_${id}`;
      const fullUrl = href.startsWith('http')
        ? href
        : `https://www.qyer.com${href}`;

      guides.push({
        sourceExternalId,
        sourceUrl: fullUrl,
        title: cleanTitle(title),
        content: `${title} - ${city}旅游攻略`,
        authorName,
        coverImageUrl: undefined,
        imageUrls: [],
        destinations: [city],
        tags: extractTags(title, ''),
        viewsCount: 0,
        qualityScore: 50,
      });
    });

    console.log(`[Qyer] Extracted ${guides.length} guides from search`);
  } catch (error) {
    console.error('[Qyer] Error fetching search page:', error);
  } finally {
    await page.close();
  }

  return guides;
}

/**
 * Fetch full guide detail (optional, for enrichment)
 */
export async function fetchQyerGuideDetail(
  context: Awaited<ReturnType<typeof createContext>>,
  url: string,
  city: string
): Promise<CrawlResult | null> {
  const page = await createPage(context);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForContent(
      page,
      'article, .post-content, .travel-content, .thread-content'
    );
    await scrollToLoadContent(page);

    const html = await page.content();
    const $ = cheerio.load(html);

    // Extract title
    const title =
      $('h1, .title, .thread-title, .travel-title').first().text().trim() ||
      $('title').text().split('-')[0].trim();

    // Extract content
    const content =
      $('article, .post-content, .travel-content, .thread-content')
        .text()
        .trim() || $('.content, main').text().trim();

    // Extract author
    const authorName =
      $('.author-name, .user-name, .author').first().text().trim() ||
      '穷游用户';

    // Extract images
    const imageUrls: string[] = [];
    $('article img, .post-content img, .travel-content img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (
        src &&
        !src.includes('avatar') &&
        !src.includes('icon') &&
        !src.includes('emoji')
      ) {
        const fullSrc = normalizeImageUrl(src);
        if (fullSrc && !imageUrls.includes(fullSrc)) {
          imageUrls.push(fullSrc);
        }
      }
    });

    // Extract stats
    const viewsText = $('.views, .read-count, .view-count').text();
    const likesText = $('.likes, .like-count, .ding').text();
    const viewsCount = Number.parseInt(viewsText.match(/\d+/)?.[0] || '0', 10);
    const likesCount = Number.parseInt(likesText.match(/\d+/)?.[0] || '0', 10);

    // Generate ID from URL
    const travelMatch = url.match(/\/travels\/([a-zA-Z0-9-]+)/);
    const threadMatch = url.match(/\/thread-(\d+)/);
    const id = travelMatch?.[1] || threadMatch?.[1] || Date.now().toString();
    const type = travelMatch ? 'travel' : 'thread';

    if (!content || content.length < 100) {
      console.log(`[Qyer] Skipping guide with insufficient content: ${url}`);
      return null;
    }

    return {
      sourceExternalId: `qyer_${type}_${id}`,
      sourceUrl: url,
      title: cleanTitle(title) || `${city}旅游攻略`,
      content: content.substring(0, 50000),
      authorName,
      coverImageUrl: imageUrls[0],
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
    console.error('[Qyer] Error fetching guide detail:', error);
    return null;
  } finally {
    await page.close();
  }
}

/**
 * Clean title by removing common suffixes
 */
function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-_|｜]\s*(穷游|穷游网|Qyer|游记|攻略).*$/i, '')
    .replace(/\[.*?\]/g, '')
    .trim();
}

/**
 * Check if thread should be skipped (ads, announcements, etc.)
 */
function isSkippableThread(title: string): boolean {
  const skipPatterns = [
    /公告|通知|声明|规则/,
    /招募|招聘|诚聘/,
    /广告|推广|活动/,
    /置顶|精华申请/,
    /版规|版务/,
  ];
  return skipPatterns.some((pattern) => pattern.test(title));
}

/**
 * Normalize image URL
 */
function normalizeImageUrl(src: string | undefined): string | undefined {
  if (!src) return undefined;
  if (src.startsWith('http')) return src;
  if (src.startsWith('//')) return `https:${src}`;
  return undefined;
}

/**
 * Extract tags from title and content
 */
function extractTags(title: string, content: string): string[] {
  const tags: string[] = [];
  const text = `${title} ${content}`.toLowerCase();

  const tagPatterns = [
    { pattern: /美食|餐厅|吃|小吃|美味/, tag: '美食' },
    { pattern: /住宿|酒店|民宿|客栈|青旅/, tag: '住宿' },
    { pattern: /景点|景区|打卡|必去|游览/, tag: '景点' },
    { pattern: /交通|出行|高铁|飞机|地铁|公交/, tag: '交通' },
    { pattern: /购物|商场|特产|纪念品/, tag: '购物' },
    { pattern: /亲子|带娃|儿童|宝宝|家庭/, tag: '亲子游' },
    { pattern: /情侣|浪漫|蜜月|度假/, tag: '情侣游' },
    { pattern: /自驾|租车|公路/, tag: '自驾游' },
    { pattern: /摄影|拍照|出片|相机/, tag: '摄影' },
    { pattern: /徒步|登山|户外|露营|远足/, tag: '户外' },
    { pattern: /穷游|省钱|预算|便宜|背包/, tag: '穷游' },
    { pattern: /签证|办签|入境/, tag: '签证' },
    { pattern: /自由行|自助游/, tag: '自由行' },
    { pattern: /跟团|团队游/, tag: '跟团游' },
    { pattern: /历史|文化|古迹|博物馆/, tag: '文化' },
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
 * Calculate quality score
 */
function calculateQualityScore(
  content: string,
  imageCount: number,
  viewsCount: number
): number {
  let score = 50;

  // Content length bonus
  if (content.length > 500) score += 5;
  if (content.length > 1000) score += 10;
  if (content.length > 3000) score += 10;
  if (content.length > 5000) score += 5;

  // Image bonus
  score += Math.min(imageCount * 2, 15);

  // Views bonus
  if (viewsCount > 500) score += 3;
  if (viewsCount > 1000) score += 5;
  if (viewsCount > 5000) score += 5;
  if (viewsCount > 10000) score += 2;

  return Math.min(score, 100);
}
