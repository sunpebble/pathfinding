/**
 * Qyer (穷游网) Crawler
 * Crawls travel guides from Qyer using BrowserClient abstraction
 *
 * Qyer is known for high-quality travel guides and detailed trip reports,
 * especially for international destinations.
 */

import type { BrowserClient } from './clients/index.js';
import type { CrawlOptions, CrawlResult } from './index.js';
import * as cheerio from 'cheerio';
import { createLogger } from '../logger.js';
import { createBrowserClient } from './clients/index.js';
import { sleep, waitForContentStable } from './utils.js';

const log = createLogger('qyer');

// Destination info structure
interface DestinationInfo {
  placeId: string;
  forumId: string;
  englishName: string;
  name: string;
  type: 'domestic' | 'international';
}

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
 * Scroll to load lazy content
 */
async function scrollToLoadContent(client: BrowserClient): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await client.scroll('down', 500);
    await sleep(800);
  }
}

/**
 * Crawl Qyer travel guides for a city
 * Uses destination pages and forum threads
 */
export async function crawlQyer(
  city: string,
  options: CrawlOptions & { client?: BrowserClient } = {},
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const maxPages = options.maxPages || 3;
  const config = CITY_CONFIG[city];

  if (!config) {
    log.warn({ city }, 'City not mapped, using search fallback');
    // Fallback to search
    return crawlQyerBySearch(city, options);
  }

  log.info({ city, englishName: config.englishName }, 'Crawling guides for city');

  const client = options.client ?? createBrowserClient();
  const shouldCloseClient = !options.client;

  try {
    await client.init();

    // Strategy 1: Fetch from destination page (place.qyer.com)
    // This is the most reliable source as forum pages may return 503
    try {
      const placeUrl = `https://place.qyer.com/${config.placeId}/`;
      log.info({ url: placeUrl }, 'Fetching destination page');

      // Increase max guides per destination page since forum may be unavailable
      const maxGuidesFromPlace = Math.max(50, maxPages * 10);
      const placeGuides = await fetchGuidesFromPlacePage(
        client,
        placeUrl,
        city,
        maxGuidesFromPlace,
      );
      log.info(
        { count: placeGuides.length },
        'Found guides from destination page',
      );

      for (const guide of placeGuides) {
        if (
          !results.some(r => r.sourceExternalId === guide.sourceExternalId)
        ) {
          results.push(guide);
        }
      }
    }
    catch (error) {
      log.error({ error }, 'Error fetching destination page');
    }

    // Strategy 2: Fetch from forum (bbs.qyer.com)
    // Note: Forum pages may return 503 due to anti-crawl measures
    for (let page = 1; page <= maxPages; page++) {
      try {
        const forumUrl = `https://bbs.qyer.com/forum-${config.forumId}-${page}.html`;
        log.info({ page, forumUrl }, 'Fetching forum page');

        const forumGuides = await fetchGuidesFromForumPage(
          client,
          forumUrl,
          city,
          20,
        );

        // If we get 0 results, forum may be blocked - skip remaining pages
        if (forumGuides.length === 0 && page === 1) {
          log.warn('Forum appears to be blocked, skipping forum pages');
          break;
        }

        log.info(
          { count: forumGuides.length, page },
          'Found guides from forum page',
        );

        for (const guide of forumGuides) {
          if (
            !results.some(r => r.sourceExternalId === guide.sourceExternalId)
          ) {
            results.push(guide);
          }
        }

        // Rate limiting between pages
        await sleep(1500);
      }
      catch (error) {
        log.error({ error, page }, 'Error fetching forum page');
      }
    }
  }
  finally {
    if (shouldCloseClient) {
      await client.close();
      log.info('Browser client closed');
    }
  }

  return results;
}

/**
 * Crawl Qyer by search when city is not in the mapping
 */
async function crawlQyerBySearch(
  city: string,
  options: CrawlOptions & { client?: BrowserClient } = {},
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const client = options.client ?? createBrowserClient();
  const shouldCloseClient = !options.client;

  try {
    await client.init();

    const searchUrl = `https://www.qyer.com/search2/topic?keyword=${encodeURIComponent(`${city}攻略`)}`;
    log.info({ searchUrl }, 'Searching');

    const guides = await fetchGuidesFromSearchPage(client, searchUrl, city, 30);
    results.push(...guides);
  }
  catch (error) {
    log.error({ error }, 'Error searching');
  }
  finally {
    if (shouldCloseClient) {
      await client.close();
    }
  }

  return results;
}

/**
 * Fetch guides from destination page (place.qyer.com)
 */
async function fetchGuidesFromPlacePage(
  client: BrowserClient,
  url: string,
  city: string,
  maxGuides: number,
): Promise<CrawlResult[]> {
  const guides: CrawlResult[] = [];
  const seenIds = new Set<string>();

  try {
    await client.navigateTo(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Wait for content to load
    await waitForContentStable(client, 15000);
    await scrollToLoadContent(client);
    await sleep(2000);

    const html = await client.getPageContent();
    const $ = cheerio.load(html);

    // Strategy 1: Extract from "热门游记" section (ess-diary-list)
    // Links format: href="//bbs.qyer.com/thread-xxx-1.html"
    $('.ess-diary-list li').each((_, el) => {
      if (guides.length >= maxGuides)
        return false;

      const $li = $(el);
      const $link = $li.find('a.diary-box');
      const href = $link.attr('href');
      if (!href)
        return;

      // Match thread URLs: //bbs.qyer.com/thread-XXXXX-1.html
      const threadMatch = href.match(/thread-(\d+)/);
      if (!threadMatch)
        return;

      const threadId = threadMatch[1];
      if (seenIds.has(threadId))
        return;
      seenIds.add(threadId);

      // Get title from .diary-title
      let title = $li.find('.diary-title').text().trim();
      if (!title || title.length < 5) {
        title = $li.find('img').attr('alt') || '';
      }
      if (!title || title.length < 5)
        return;

      // Skip non-travel posts
      if (isSkippableThread(title))
        return;

      // Get author from .user-info
      const authorName
        = $li.find('.user-info .user-link').text().trim() || '穷游用户';

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
        if (guides.length >= maxGuides)
          return false;

        const $el = $(el);
        const href = $el.attr('href');
        if (!href)
          return;

        // Match thread URLs
        const threadMatch = href.match(/thread-(\d+)/);
        if (!threadMatch)
          return;

        const threadId = threadMatch[1];
        if (seenIds.has(threadId))
          return;
        seenIds.add(threadId);

        // Get title
        let title = $el.text().trim();
        if (!title || title.length < 5) {
          title = $el.attr('title') || '';
        }
        if (!title || title.length < 5)
          return;

        // Skip non-travel posts
        if (isSkippableThread(title))
          return;

        // Get parent container for more info
        const $container = $el.closest('li, .diary-box, article');

        // Get author
        const authorName
          = $container
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

    log.info({ count: guides.length }, 'Extracted guides from place page');
  }
  catch (error) {
    log.error({ error }, 'Error fetching place page');
  }

  return guides;
}

/**
 * Fetch guides from forum page (bbs.qyer.com)
 */
async function fetchGuidesFromForumPage(
  client: BrowserClient,
  url: string,
  city: string,
  maxGuides: number,
): Promise<CrawlResult[]> {
  const guides: CrawlResult[] = [];
  const seenIds = new Set<string>();

  try {
    await client.navigateTo(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Wait for forum thread list
    await waitForContentStable(client, 15000);
    await scrollToLoadContent(client);
    await sleep(1500);

    const html = await client.getPageContent();
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
      if (guides.length >= maxGuides)
        break;

      $(selector).each((_, el) => {
        if (guides.length >= maxGuides)
          return false;

        const $el = $(el);
        const href = $el.attr('href');
        if (!href)
          return;

        // Match thread URLs: /thread-XXXXX-1.html
        const threadMatch = href.match(/\/thread-(\d+)/);
        if (!threadMatch)
          return;

        const threadId = threadMatch[1];
        if (seenIds.has(threadId))
          return;
        seenIds.add(threadId);

        // Get title
        let title = $el.text().trim();
        if (!title || title.length < 5) {
          title = $el.attr('title') || '';
        }
        if (!title || title.length < 5)
          return;

        // Skip non-travel posts (ads, announcements, etc.)
        if (isSkippableThread(title))
          return;

        // Get parent row/container
        const $container = $el.closest('tr, .bbs-item, .thread-item, li');

        // Get author
        const authorName
          = $container
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
        const replyCount = repliesMatch
          ? Number.parseInt(repliesMatch[1], 10)
          : 0;

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

    log.info({ count: guides.length }, 'Extracted guides from forum page');
  }
  catch (error) {
    log.error({ error }, 'Error fetching forum page');
  }

  return guides;
}

/**
 * Fetch guides from search page
 */
async function fetchGuidesFromSearchPage(
  client: BrowserClient,
  url: string,
  city: string,
  maxGuides: number,
): Promise<CrawlResult[]> {
  const guides: CrawlResult[] = [];
  const seenIds = new Set<string>();

  try {
    await client.navigateTo(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await waitForContentStable(client, 15000);
    await scrollToLoadContent(client);
    await sleep(2000);

    const html = await client.getPageContent();
    const $ = cheerio.load(html);

    // Search result selectors
    $('a[href*="/travels/"], a[href*="/thread-"]').each((_, el) => {
      if (guides.length >= maxGuides)
        return false;

      const $el = $(el);
      const href = $el.attr('href');
      if (!href)
        return;

      // Match travel or thread URLs
      const travelMatch = href.match(/\/travels\/([a-zA-Z0-9-]+)/);
      const threadMatch = href.match(/\/thread-(\d+)/);
      const match = travelMatch || threadMatch;
      if (!match)
        return;

      const id = match[1];
      const type = travelMatch ? 'travel' : 'thread';
      if (seenIds.has(id))
        return;
      seenIds.add(id);

      const title = $el.text().trim();
      if (!title || title.length < 5)
        return;

      const $container = $el.closest(
        '.result-item, .search-result, article, li',
      );
      const authorName
        = $container.find('.author, .user').first().text().trim() || '穷游用户';

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

    log.info({ count: guides.length }, 'Extracted guides from search');
  }
  catch (error) {
    log.error({ error }, 'Error fetching search page');
  }

  return guides;
}

/**
 * Fetch full guide detail (optional, for enrichment)
 */
export async function fetchQyerGuideDetail(
  client: BrowserClient,
  url: string,
  city: string,
): Promise<CrawlResult | null> {
  try {
    await client.navigateTo(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await waitForContentStable(client, 15000);
    await scrollToLoadContent(client);

    const html = await client.getPageContent();
    const $ = cheerio.load(html);

    // Extract title
    const title
      = $('h1, .title, .thread-title, .travel-title').first().text().trim()
        || $('title').text().split('-')[0].trim();

    // Extract content
    const content
      = $('article, .post-content, .travel-content, .thread-content')
        .text()
        .trim() || $('.content, main').text().trim();

    // Extract author
    const authorName
      = $('.author-name, .user-name, .author').first().text().trim()
        || '穷游用户';

    // Extract images
    const imageUrls: string[] = [];
    $('article img, .post-content img, .travel-content img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (
        src
        && !src.includes('avatar')
        && !src.includes('icon')
        && !src.includes('emoji')
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
      log.info({ url }, 'Skipping guide with insufficient content');
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
        viewsCount,
      ),
    };
  }
  catch (error) {
    log.error({ error }, 'Error fetching guide detail');
    return null;
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
  return skipPatterns.some(pattern => pattern.test(title));
}

/**
 * Normalize image URL
 */
function normalizeImageUrl(src: string | undefined): string | undefined {
  if (!src)
    return undefined;
  if (src.startsWith('http'))
    return src;
  if (src.startsWith('//'))
    return `https:${src}`;
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
  viewsCount: number,
): number {
  let score = 50;

  // Content length bonus
  if (content.length > 500)
    score += 5;
  if (content.length > 1000)
    score += 10;
  if (content.length > 3000)
    score += 10;
  if (content.length > 5000)
    score += 5;

  // Image bonus
  score += Math.min(imageCount * 2, 15);

  // Views bonus
  if (viewsCount > 500)
    score += 3;
  if (viewsCount > 1000)
    score += 5;
  if (viewsCount > 5000)
    score += 5;
  if (viewsCount > 10000)
    score += 2;

  return Math.min(score, 100);
}

// ============================================================
// Full Site Crawling - 全站爬取功能
// ============================================================

/**
 * Crawl all destinations from Qyer
 * This discovers all available destinations and crawls them systematically
 */
export async function crawlQyerAllDestinations(
  options: {
    maxPagesPerDestination?: number;
    maxDestinations?: number;
    client?: BrowserClient;
    onProgress?: (progress: {
      currentDestination: string;
      destinationIndex: number;
      totalDestinations: number;
      guidesFound: number;
    }) => void;
  } = {},
): Promise<CrawlResult[]> {
  const {
    maxPagesPerDestination = 10,
    maxDestinations = 100,
    onProgress,
  } = options;

  const allResults: CrawlResult[] = [];
  const seenIds = new Set<string>();

  log.info('Starting full site crawl...');

  const client = options.client ?? createBrowserClient();
  const shouldCloseClient = !options.client;

  try {
    await client.init();

    // Step 1: Discover all destinations
    const destinations = await discoverAllDestinations({ client });
    log.info({ count: destinations.length }, 'Discovered destinations');

    const limitedDestinations = destinations.slice(0, maxDestinations);

    // Step 2: Crawl each destination
    for (let i = 0; i < limitedDestinations.length; i++) {
      const dest = limitedDestinations[i];
      log.info(
        { index: i + 1, total: limitedDestinations.length, name: dest.name },
        'Crawling destination',
      );

      try {
        const guides = await crawlQyer(dest.name, {
          maxPages: maxPagesPerDestination,
          client,
        });

        // Deduplicate
        for (const guide of guides) {
          if (!seenIds.has(guide.sourceExternalId)) {
            seenIds.add(guide.sourceExternalId);
            allResults.push(guide);
          }
        }

        onProgress?.({
          currentDestination: dest.name,
          destinationIndex: i + 1,
          totalDestinations: limitedDestinations.length,
          guidesFound: allResults.length,
        });

        // Rate limiting between destinations
        await sleep(3000);
      }
      catch (error) {
        log.error({ error, destination: dest.name }, 'Error crawling destination');
      }
    }
  }
  finally {
    if (shouldCloseClient) {
      await client.close();
    }
  }

  log.info({ total: allResults.length }, 'Full site crawl complete');
  return allResults;
}

/**
 * Discover all destinations from Qyer's destination index
 * Scrapes place.qyer.com to find all available destinations
 */
export async function discoverAllDestinations(
  options: { client?: BrowserClient } = {},
): Promise<DestinationInfo[]> {
  const destinations: DestinationInfo[] = [];
  const seenPlaceIds = new Set<string>();

  const client = options.client ?? createBrowserClient();
  const shouldCloseClient = !options.client;

  try {
    if (!options.client) {
      await client.init();
    }

    // Strategy 1: Use predefined cities first (they have verified forumIds)
    for (const [name, config] of Object.entries(CITY_CONFIG)) {
      if (!seenPlaceIds.has(config.placeId)) {
        seenPlaceIds.add(config.placeId);
        destinations.push({
          ...config,
          name,
          type: isInternationalDestination(name) ? 'international' : 'domestic',
        });
      }
    }

    // Strategy 2: Discover more from Qyer's destination directory
    const discoveryUrls = [
      'https://place.qyer.com/china/', // 中国目的地
      'https://place.qyer.com/asia/', // 亚洲目的地
      'https://place.qyer.com/europe/', // 欧洲目的地
      'https://place.qyer.com/north-america/', // 北美目的地
      'https://place.qyer.com/oceania/', // 大洋洲目的地
    ];

    for (const url of discoveryUrls) {
      try {
        log.info({ url }, 'Discovering destinations from');
        const discovered = await discoverDestinationsFromIndex(client, url);

        for (const dest of discovered) {
          if (!seenPlaceIds.has(dest.placeId)) {
            seenPlaceIds.add(dest.placeId);
            destinations.push(dest);
          }
        }

        await sleep(2000);
      }
      catch (error) {
        log.error({ error, url }, 'Error discovering from URL');
      }
    }

    // Strategy 3: Discover from BBS forum list
    try {
      log.info('Discovering destinations from BBS forum list...');
      const forumDestinations = await discoverDestinationsFromBBS(client);

      for (const dest of forumDestinations) {
        if (!seenPlaceIds.has(dest.placeId)) {
          seenPlaceIds.add(dest.placeId);
          destinations.push(dest);
        }
      }
    }
    catch (error) {
      log.error({ error }, 'Error discovering from BBS');
    }
  }
  finally {
    if (shouldCloseClient) {
      await client.close();
    }
  }

  log.info({ total: destinations.length }, 'Total destinations discovered');
  return destinations;
}

/**
 * Discover destinations from a Qyer index page
 */
async function discoverDestinationsFromIndex(
  client: BrowserClient,
  url: string,
): Promise<DestinationInfo[]> {
  const destinations: DestinationInfo[] = [];

  try {
    await client.navigateTo(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await waitForContentStable(client, 15000);
    await scrollToLoadContent(client);
    await sleep(2000);

    const html = await client.getPageContent();
    const $ = cheerio.load(html);

    // Look for destination links
    // Format: href="/beijing/" or href="https://place.qyer.com/tokyo/"
    $('a[href*="place.qyer.com/"], a[href^="/"]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const text = $el.text().trim();

      // Extract placeId from URL
      const placeMatch
        = href.match(/place\.qyer\.com\/([a-z0-9-]+)\/?$/)
          || href.match(/^\/([a-z0-9-]+)\/?$/);

      if (!placeMatch || !text || text.length < 2 || text.length > 20)
        return;

      const placeId = placeMatch[1];

      // Skip non-destination pages
      if (['mdd', 'search', 'user', 'bbs', 'guide', 'travel'].includes(placeId))
        return;

      destinations.push({
        placeId,
        forumId: '', // Will be discovered later
        englishName: placeId,
        name: text,
        type: url.includes('china') ? 'domestic' : 'international',
      });
    });

    log.info({ count: destinations.length, url }, 'Found destinations from URL');
  }
  catch (error) {
    log.error({ error, url }, 'Error parsing URL');
  }

  return destinations;
}

/**
 * Discover destinations from BBS forum list
 * This gets destinations with their forumIds directly
 */
async function discoverDestinationsFromBBS(
  client: BrowserClient,
): Promise<DestinationInfo[]> {
  const destinations: DestinationInfo[] = [];

  try {
    // BBS forum index
    await client.navigateTo('https://bbs.qyer.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await waitForContentStable(client, 15000);
    await scrollToLoadContent(client);
    await sleep(2000);

    const html = await client.getPageContent();
    const $ = cheerio.load(html);

    // Look for forum links: /forum-{forumId}-1.html
    $('a[href*="/forum-"]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const text = $el.text().trim();

      const forumMatch = href.match(/\/forum-(\d+)-/);
      if (!forumMatch || !text || text.length < 2 || text.length > 20)
        return;

      // Skip non-destination forums (general discussion, etc.)
      if (/版务|公告|活动|签证|交通|摄影|装备|自驾/.test(text))
        return;

      const forumId = forumMatch[1];

      destinations.push({
        placeId: text.toLowerCase().replace(/\s+/g, '-'),
        forumId,
        englishName: text,
        name: text,
        type: isInternationalDestination(text) ? 'international' : 'domestic',
      });
    });

    log.info({ count: destinations.length }, 'Found forums from BBS');
  }
  catch (error) {
    log.error({ error }, 'Error parsing BBS');
  }

  return destinations;
}

/**
 * Check if a destination is international
 */
function isInternationalDestination(name: string): boolean {
  const internationalPatterns = [
    /东京|大阪|京都|北海道|冲绑|奈良|名古屋/, // 日本
    /首尔|釜山|济州/, // 韩国
    /曼谷|清迈|普吉|芭提雅/, // 泰国
    /新加坡|马来西亚|吉隆坡/, // 东南亚
    /巴黎|伦敦|罗马|巴塞罗那|阿姆斯特丹/, // 欧洲
    /纽约|洛杉矶|旧金山|拉斯维加斯/, // 美国
    /悉尼|墨尔本|奥克兰/, // 澳新
    /迪拜|土耳其|埃及/, // 中东
  ];

  return internationalPatterns.some(pattern => pattern.test(name));
}

/**
 * Deep crawl a single destination forum
 * Crawls all pages until no more content is found
 */
export async function crawlQyerDestinationDeep(
  city: string,
  options: {
    maxPages?: number;
    fetchDetails?: boolean;
    client?: BrowserClient;
    onPageComplete?: (page: number, guides: number) => void;
  } = {},
): Promise<CrawlResult[]> {
  const { maxPages = 50, fetchDetails = false, onPageComplete } = options;
  const results: CrawlResult[] = [];
  const seenIds = new Set<string>();

  const config = CITY_CONFIG[city];
  if (!config) {
    log.warn({ city }, 'City not in config, using search');
    return crawlQyerBySearch(city, { maxPages: 5, client: options.client });
  }

  log.info(
    { city, englishName: config.englishName, maxPages },
    'Deep crawling',
  );

  const client = options.client ?? createBrowserClient();
  const shouldCloseClient = !options.client;

  try {
    await client.init();

    // First, get from destination page
    try {
      const placeUrl = `https://place.qyer.com/${config.placeId}/`;
      const placeGuides = await fetchGuidesFromPlacePage(
        client,
        placeUrl,
        city,
        50,
      );

      for (const guide of placeGuides) {
        if (!seenIds.has(guide.sourceExternalId)) {
          seenIds.add(guide.sourceExternalId);
          results.push(guide);
        }
      }
    }
    catch (error) {
      log.error({ error }, 'Error fetching destination page');
    }

    // Then crawl forum pages deeply
    let emptyPages = 0;
    const maxEmptyPages = 3; // Stop after 3 consecutive empty pages

    for (let page = 1; page <= maxPages; page++) {
      try {
        const forumUrl = `https://bbs.qyer.com/forum-${config.forumId}-${page}.html`;
        log.info({ page, maxPages }, 'Fetching forum page');

        const pageGuides = await fetchGuidesFromForumPage(
          client,
          forumUrl,
          city,
          50,
        );

        let newGuides = 0;
        for (const guide of pageGuides) {
          if (!seenIds.has(guide.sourceExternalId)) {
            seenIds.add(guide.sourceExternalId);
            results.push(guide);
            newGuides++;
          }
        }

        onPageComplete?.(page, results.length);

        // Check if we're getting empty pages
        if (newGuides === 0) {
          emptyPages++;
          if (emptyPages >= maxEmptyPages) {
            log.info(
              { maxEmptyPages },
              'Stopping: consecutive empty pages',
            );
            break;
          }
        }
        else {
          emptyPages = 0;
        }

        // Rate limiting
        await sleep(1500);
      }
      catch (error) {
        log.error({ error, page }, 'Error on page');
        emptyPages++;
        if (emptyPages >= maxEmptyPages)
          break;
      }
    }

    // Optionally fetch full details for each guide
    if (fetchDetails && results.length > 0) {
      log.info({ count: results.length }, 'Fetching details for guides');

      for (let i = 0; i < results.length; i++) {
        const guide = results[i];
        if (!guide.sourceUrl)
          continue;

        try {
          const detail = await fetchQyerGuideDetail(
            client,
            guide.sourceUrl,
            city,
          );
          if (detail) {
            // Merge detail into result
            results[i] = { ...guide, ...detail };
          }

          // Rate limiting
          await sleep(2000);
        }
        catch (error) {
          log.error(
            { error, sourceExternalId: guide.sourceExternalId },
            'Error fetching detail',
          );
        }
      }
    }
  }
  finally {
    if (shouldCloseClient) {
      await client.close();
    }
  }

  log.info({ city, total: results.length }, 'Deep crawl complete');
  return results;
}

/**
 * Get all predefined cities from CITY_CONFIG
 */
export function getQyerPredefinedCities(): string[] {
  return Object.keys(CITY_CONFIG);
}
