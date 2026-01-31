import type { BrowserClient } from './clients/index.js';
import type { ContentBlock, CrawlOptions, CrawlResult } from './index.js';
import { createLogger } from '../logger.js';
import {
  extractImageUrls,
  extractPublishDate,
  extractTongchengAuthor,
  extractTongchengStats,
  getArticleContent,
  getBestTitle,
  transformToHighResTc,
} from './accessibility-parser.js';
import { createBrowserClient } from './clients/index.js';
import { waitForContentStable } from './utils.js';

const log = createLogger('tongcheng');

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

export async function crawlTongcheng(
  city: string,
  options: CrawlOptions & { client?: BrowserClient } = {},
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const maxGuides = (options.maxPages || 5) * 10;
  const citySlug = CITY_SLUGS[city] || city.toLowerCase();
  const client = options.client ?? createBrowserClient();
  const shouldCleanup = !options.client;

  log.info({ city, citySlug }, 'Crawling guides for city');

  try {
    await client.init();

    // Phase 1: Get guide URLs from list page
    const listUrl = 'https://www.ly.com/travels/';
    log.info({ listUrl }, 'Fetching guide URLs from list page');

    const guideUrls = await fetchGuideUrls(client, listUrl, city, maxGuides);
    log.info({ count: guideUrls.length }, 'Found guide URLs to fetch');

    // Phase 2: Visit each detail page (follows Mafengwo/Ctrip pattern)
    for (const { url, guideId } of guideUrls) {
      try {
        const guide = await fetchGuideDetail(client, url, guideId, city);
        if (guide) {
          results.push(guide);
          log.info(
            { title: guide.title, contentLength: guide.content.length },
            'Extracted guide',
          );
        }
        // Rate limiting delay (1-2 seconds)
        await sleep(1000 + Math.random() * 1000);
      }
      catch (error) {
        log.error({ error, url }, 'Error fetching guide');
      }
    }

    if (results.length === 0) {
      log.warn('No results found from detail pages');
    }
  }
  catch (error) {
    log.error({ error }, 'Error crawling travels list');
  }
  finally {
    if (shouldCleanup) {
      await client.close();
      log.info('Browser client closed');
    }
  }

  return results;
}

/**
 * Fetch guide URLs from the travels list page
 * Only extracts URLs, does not parse content (that's done in fetchGuideDetail)
 */
async function fetchGuideUrls(
  client: BrowserClient,
  listUrl: string,
  city: string,
  maxGuides: number,
): Promise<Array<{ url: string; guideId: string }>> {
  const guideUrls: Array<{ url: string; guideId: string }> = [];
  const seenIds = new Set<string>();

  try {
    await client.navigateTo(listUrl, { timeout: 30000 });
    await waitForContentStable(client);

    // Scroll to load more content
    for (let i = 0; i < 3; i++) {
      await client.scroll('down', 500);
      await sleep(500);
    }
    await sleep(2000);

    const snapshot = await client.takeSnapshot({ verbose: true });
    const content = snapshot.content;

    log.debug({ snapshotLength: content.length }, 'List page snapshot captured');

    // Extract guide URLs from /travels/{id}.html pattern
    const guideMatches = content.matchAll(/\/travels\/(\d+)\.html/g);

    for (const match of guideMatches) {
      if (guideUrls.length >= maxGuides)
        break;

      const guideId = match[1];
      if (seenIds.has(guideId))
        continue;
      seenIds.add(guideId);

      // Optional: Check context for city relevance
      const contextStart = Math.max(0, match.index! - 200);
      const contextEnd = Math.min(content.length, match.index! + 200);
      const context = content.substring(contextStart, contextEnd);

      // Filter by city relevance (if city is mentioned nearby)
      if (city && !context.includes(city)) {
        // Skip if city not mentioned in context (but still allow some generic guides)
        if (guideUrls.length > maxGuides / 2)
          continue;
      }

      guideUrls.push({
        url: `https://www.ly.com/travels/${guideId}.html`,
        guideId,
      });
    }

    log.info({ count: guideUrls.length }, 'Found guide URLs');
  }
  catch (error) {
    log.error({ error }, 'Error fetching list page');
  }

  return guideUrls;
}

/**
 * Fetch and parse a single guide detail page
 * Navigates to the detail page, extracts all 6 core fields
 */
async function fetchGuideDetail(
  client: BrowserClient,
  url: string,
  guideId: string,
  city: string,
): Promise<CrawlResult | null> {
  try {
    log.info({ url }, 'Entering detail page');

    await client.navigateTo(url, { timeout: 30000 });
    await waitForContentStable(client);

    // Scroll to load more content
    for (let i = 0; i < 3; i++) {
      await client.scroll('down', 500);
      await sleep(500);
    }
    await sleep(1000);

    const snapshot = await client.takeSnapshot({ verbose: true });
    const content = snapshot.content;

    log.debug(
      { guideId, snapshotLength: content.length },
      'Detail page snapshot captured',
    );

    // Extract all fields using accessibility-parser utilities
    const title = getBestTitle(content, `${city}旅游攻略`);
    const textContent = getArticleContent(content);

    log.debug(
      { contentLength: textContent?.length || 0 },
      'Extracted content length',
    );

    if (!textContent || textContent.length < 100) {
      log.info(
        { contentLength: textContent?.length || 0, url },
        'Insufficient content, skipping',
      );
      return null;
    }

    // Tongcheng-specific extractors (from Plan 06-01)
    const authorInfo = extractTongchengAuthor(content);
    const rawImageUrls = extractImageUrls(content);
    const imageUrls = rawImageUrls.map(transformToHighResTc);
    const publishedAt = extractPublishDate(content);
    const stats = extractTongchengStats(content);

    log.debug({ count: imageUrls.length }, 'Found images');

    // Build content blocks
    const contentBlocks: ContentBlock[] = [
      { type: 'text', content: textContent },
    ];
    for (const imgUrl of imageUrls) {
      contentBlocks.push({ type: 'image', url: imgUrl });
    }

    // Build and return complete CrawlResult
    return {
      sourceExternalId: `tongcheng_${guideId}`,
      sourceUrl: url,
      title: title || `${city}旅游攻略`,
      content: textContent.substring(0, 50000),
      contentBlocks,
      contentType: 'normal',
      authorName: authorInfo.name || '同程用户',
      authorAvatar: authorInfo.avatar,
      publishedAt,
      coverImageUrl: imageUrls[0],
      imageUrls: imageUrls.slice(0, 20),
      destinations: [city],
      tags: extractTags(title || '', textContent),
      likesCount: stats.likes || 0,
      savesCount: stats.saves || 0,
      commentsCount: stats.comments || 0,
      viewsCount: stats.views || 0,
      qualityScore: calculateQualityScore(
        textContent,
        imageUrls.length,
        stats.views || 0,
      ),
    };
  }
  catch (error) {
    log.error({ error, url }, 'Error parsing guide');
    return null;
  }
}

/**
 * Calculate quality score based on content metrics
 */
function calculateQualityScore(
  textContent: string,
  imageCount: number,
  viewsCount: number,
): number {
  let score = 30; // Base score

  // Content length score (up to +30)
  if (textContent.length >= 2000)
    score += 30;
  else if (textContent.length >= 1000)
    score += 20;
  else if (textContent.length >= 500)
    score += 10;

  // Image count score (up to +20)
  if (imageCount >= 10)
    score += 20;
  else if (imageCount >= 5)
    score += 15;
  else if (imageCount >= 2)
    score += 10;
  else if (imageCount >= 1)
    score += 5;

  // Views score (up to +20)
  if (viewsCount >= 10000)
    score += 20;
  else if (viewsCount >= 1000)
    score += 15;
  else if (viewsCount >= 100)
    score += 10;
  else if (viewsCount > 0)
    score += 5;

  return Math.min(score, 100);
}

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
