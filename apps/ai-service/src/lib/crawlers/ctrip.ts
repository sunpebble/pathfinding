import type { BrowserClient } from './clients/index.js';
import type { ContentBlock, CrawlOptions, CrawlResult } from './index.js';
import { createLogger } from '../logger.js';
import {
  extractAuthorWithAvatar,
  extractCtripStats,
  extractImageUrls,
  extractPublishDate,
  getArticleContent,
  getBestTitle,
  transformToHighRes,
} from './accessibility-parser.js';
import { createBrowserClient } from './clients/index.js';
import { waitForContentStable } from './utils.js';

const log = createLogger('ctrip');

// Helper function for delay
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

export async function crawlCtrip(
  city: string,
  options: CrawlOptions & { client?: BrowserClient } = {},
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const maxPages = options.maxPages || 5;
  const cityId = CITY_IDS[city] || city;
  const client = options.client ?? createBrowserClient();

  log.info({ city, cityId }, 'Crawling guides for city');

  try {
    // Initialize browser client
    await client.init();

    for (let page = 1; page <= maxPages; page++) {
      try {
        const listUrl = `https://you.ctrip.com/travels/${cityId}/t3-p${page}.html`;
        log.info({ page, url: listUrl }, 'Fetching page');

        const guideLinks = await fetchListPage(listUrl, client);
        log.info(
          { count: guideLinks.length, page },
          'Found guides on page',
        );

        for (const guideUrl of guideLinks.slice(0, 10)) {
          try {
            const guide = await fetchGuideDetail(guideUrl, city, client);
            if (guide) {
              results.push(guide);
            }
            await sleep(1000 / (options.rateLimit || 0.5));
          }
          catch (error) {
            log.error({ error, url: guideUrl }, 'Error fetching guide');
          }
        }
      }
      catch (error) {
        log.error({ error, page }, 'Error crawling page');
      }
    }
  }
  finally {
    await client.close();
    log.info('Browser client closed');
  }

  return results;
}

async function fetchListPage(
  url: string,
  client: BrowserClient,
): Promise<string[]> {
  const guideLinks: string[] = [];

  try {
    await client.navigateTo(url, { timeout: 30000 });
    await waitForContentStable(client);
    // Scroll multiple times to load content
    await client.scroll('down');
    await sleep(500);
    await client.scroll('down');
    await sleep(1000);

    const snapshot = await client.takeSnapshot();
    const content = snapshot.content;

    const linkMatches = content.matchAll(
      /\/travels\/[A-Za-z]+\d+\/(\d+)\.html/g,
    );
    const seenIds = new Set<string>();

    for (const match of linkMatches) {
      const guideId = match[1];
      if (seenIds.has(guideId))
        continue;
      seenIds.add(guideId);

      const fullUrl = `https://you.ctrip.com${match[0]}`;
      guideLinks.push(fullUrl);
    }
  }
  catch (error) {
    log.error({ error, url }, 'Error fetching list page');
  }

  return guideLinks;
}

async function fetchGuideDetail(
  url: string,
  city: string,
  client: BrowserClient,
): Promise<CrawlResult | null> {
  try {
    await client.navigateTo(url, { timeout: 30000 });
    await waitForContentStable(client);
    // Scroll multiple times to load content
    await client.scroll('down');
    await sleep(500);
    await client.scroll('down');
    await sleep(500);
    await client.scroll('down');
    await sleep(1000);

    const snapshot = await client.takeSnapshot({ verbose: true });
    const content = snapshot.content;

    log.debug(
      { guideId: url.split('/').pop(), contentLength: content.length },
      'Snapshot captured',
    );

    // Use accessibility tree parser for extraction
    const title = getBestTitle(content, `${city}旅游攻略`);
    const textContent = getArticleContent(content);

    if (!textContent || textContent.length < 50) {
      log.debug({ url }, 'Skipping guide with insufficient content');
      return null;
    }

    // Enhanced extraction using Ctrip-specific utilities
    const authorInfo = extractAuthorWithAvatar(content);
    const authorName = authorInfo.name || '携程用户';
    const authorAvatar = authorInfo.avatar;

    // Transform image URLs to high-resolution versions
    const rawImageUrls = extractImageUrls(content);
    const imageUrls = rawImageUrls.map(transformToHighRes);
    const coverImageUrl = imageUrls[0];

    // Extract publish date
    const publishedAt = extractPublishDate(content);

    // Extract Ctrip-specific engagement stats with Chinese number parsing
    const stats = extractCtripStats(content);

    const urlMatch = url.match(/\/(\d+)\.html/);
    const sourceExternalId = `ctrip_${urlMatch?.[1] || Date.now()}`;

    const contentBlocks: ContentBlock[] = [
      { type: 'text', content: textContent },
    ];
    for (const imgUrl of imageUrls) {
      contentBlocks.push({ type: 'image', url: imgUrl });
    }

    return {
      sourceExternalId,
      sourceUrl: url,
      title: title || `${city}旅游攻略`,
      content: textContent.substring(0, 50000),
      contentBlocks,
      contentType: 'normal',
      authorName,
      authorAvatar,
      publishedAt,
      coverImageUrl,
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
    log.error({ error }, 'Error parsing guide');
    return null;
  }
}

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

function calculateQualityScore(
  content: string,
  imageCount: number,
  viewsCount: number,
): number {
  let score = 50;

  if (content.length > 1000)
    score += 10;
  if (content.length > 3000)
    score += 10;
  if (content.length > 5000)
    score += 5;

  score += Math.min(imageCount * 2, 15);

  if (viewsCount > 1000)
    score += 5;
  if (viewsCount > 10000)
    score += 5;

  return Math.min(score, 100);
}
