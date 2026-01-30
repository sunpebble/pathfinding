import type { BrowserClient } from './clients/index.js';
import type { ContentBlock, CrawlOptions, CrawlResult } from './index.js';
import {
  extractImageUrls,
  extractMafengwoAuthor,
  extractMafengwoStats,
  extractPublishDate,
  getArticleContent,
  getBestTitle,
  transformToHighResMfw,
} from './accessibility-parser.js';
import { createBrowserClient } from './clients/index.js';
import { waitForContentStable } from './utils.js';

// Helper function for delay
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const CITY_IDS: Record<string, string> = {
  北京: '10065',
  上海: '10099',
  杭州: '10156',
  成都: '10332',
  西安: '10195',
  三亚: '10186',
  厦门: '10132',
  大理: '10487',
  广州: '10088',
  深圳: '10086',
  南京: '10183',
  苏州: '10206',
  丽江: '10460',
  重庆: '10208',
  武汉: '10140',
};

/**
 * Detect captcha/verification pages from Mafengwo
 * Returns true if content appears to be a captcha or blocked page
 */
function detectMafengwoCaptcha(content: string): boolean {
  const indicators = [
    /验证码/,
    /captcha/i,
    /滑动验证/,
    /请完成验证/,
    /安全验证/,
    /频繁访问/,
    /请求过于频繁/,
  ];

  for (const pattern of indicators) {
    if (pattern.test(content)) {
      return true;
    }
  }

  // Also check for very short content (blocked page)
  if (content.length < 500) {
    return true;
  }

  return false;
}

export async function crawlMafengwo(
  city: string,
  options: CrawlOptions & { client?: BrowserClient } = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const maxGuides = (options.maxPages || 5) * 10;
  const cityId = CITY_IDS[city];
  const client = options.client ?? createBrowserClient();

  if (!cityId) {
    console.warn(`[Mafengwo] City not mapped: ${city}`);
    return results;
  }

  console.log(`[Mafengwo] Crawling guides for ${city} (${cityId})`);

  try {
    await client.init();

    // Phase 1: Get guide URLs from list page
    const destUrl = `https://www.mafengwo.cn/travel-scenic-spot/mafengwo/${cityId}.html`;
    console.log(`[Mafengwo] Fetching guide URLs from: ${destUrl}`);

    const guideUrls = await fetchGuideUrls(destUrl, maxGuides, client);
    console.log(`[Mafengwo] Found ${guideUrls.length} guide URLs to fetch`);

    // Phase 2: Visit each detail page
    for (const url of guideUrls) {
      try {
        const guide = await fetchGuideDetail(url, city, client);
        if (guide) {
          results.push(guide);
          console.log(
            `[Mafengwo] Extracted guide: ${guide.title} (${guide.content.length} chars)`
          );
        }
        // Rate limiting delay
        await sleep(1000 / (options.rateLimit || 0.5));
      } catch (error) {
        console.error(`[Mafengwo] Error fetching guide: ${url}`, error);
      }
    }

    if (results.length === 0) {
      console.warn(
        '[Mafengwo] No results found. Site may require verification.'
      );
    }
  } catch (error) {
    console.error(`[Mafengwo] Error crawling destination page:`, error);
  } finally {
    await client.close();
    console.log('[Mafengwo] Browser client closed');
  }

  return results;
}

/**
 * Fetch guide URLs from the destination list page
 * Only extracts URLs, does not parse content (that's done in fetchGuideDetail)
 */
async function fetchGuideUrls(
  destUrl: string,
  maxGuides: number,
  client: BrowserClient
): Promise<string[]> {
  const guideUrls: string[] = [];
  const seenIds = new Set<string>();

  try {
    await client.navigateTo(destUrl, { timeout: 30000 });
    await waitForContentStable(client);
    // Scroll multiple times to load content
    await client.scroll('down');
    await sleep(500);
    await client.scroll('down');
    await sleep(500);
    await client.scroll('down');
    await sleep(2000);

    const snapshot = await client.takeSnapshot({ verbose: true });
    const content = snapshot.content;

    console.log(`[Mafengwo] Snapshot length: ${content.length} chars`);

    // Check for captcha
    if (detectMafengwoCaptcha(content)) {
      console.warn(
        '[Mafengwo] Captcha detected on list page - site requires manual verification'
      );
      return guideUrls;
    }

    // Extract guide URLs from /i/{id}.html pattern
    const guideMatches = content.matchAll(/\/i\/(\d+)\.html/g);

    for (const match of guideMatches) {
      if (guideUrls.length >= maxGuides) break;

      const guideId = match[1];
      if (seenIds.has(guideId)) continue;
      seenIds.add(guideId);

      guideUrls.push(`https://www.mafengwo.cn/i/${guideId}.html`);
    }

    console.log(`[Mafengwo] Found ${guideUrls.length} guide URLs`);
  } catch (error) {
    console.error(`[Mafengwo] Error fetching list page:`, error);
  }

  return guideUrls;
}

/**
 * Fetch and parse a single guide detail page
 * Navigates to the detail page, extracts all 6 core fields
 */
async function fetchGuideDetail(
  url: string,
  city: string,
  client: BrowserClient
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

    console.log(
      `[Mafengwo] Detail page snapshot for ${url.split('/').pop()}: ${content.length} chars`
    );

    // Check for captcha/login wall
    if (detectMafengwoCaptcha(content)) {
      console.warn(`[Mafengwo] Captcha detected on ${url}, skipping`);
      return null;
    }

    // Extract all fields using accessibility-parser utilities
    const title = getBestTitle(content, `${city}旅游攻略`);
    const textContent = getArticleContent(content);

    if (!textContent || textContent.length < 100) {
      console.log(
        `[Mafengwo] Insufficient content (${textContent?.length || 0} chars): ${url}`
      );
      return null;
    }

    // Mafengwo-specific extractors (from Plan 01)
    const authorInfo = extractMafengwoAuthor(content);
    const rawImageUrls = extractImageUrls(content);
    const imageUrls = rawImageUrls.map(transformToHighResMfw);
    const publishedAt = extractPublishDate(content);
    const stats = extractMafengwoStats(content);

    // Build result
    const urlMatch = url.match(/\/i\/(\d+)\.html/);
    const sourceExternalId = `mafengwo_${urlMatch?.[1] || Date.now()}`;

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
      authorName: authorInfo.name || '马蜂窝用户',
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
        stats.views || 0
      ),
    };
  } catch (error) {
    console.error(`[Mafengwo] Error parsing guide: ${url}`, error);
    return null;
  }
}

function extractTags(title: string, content: string): string[] {
  const tags: string[] = [];
  const text = `${title} ${content}`.toLowerCase();

  const tagPatterns = [
    { pattern: /美食|餐厅|吃|小吃/, tag: '美食' },
    { pattern: /住宿|酒店|民宿|客栈/, tag: '住宿' },
    { pattern: /景点|景区|打卡|必去/, tag: '景点' },
    { pattern: /交通|出行|高铁|飞机|地铁/, tag: '交通' },
    { pattern: /购物|商场|特产/, tag: '购物' },
    { pattern: /亲子|带娃|儿童|宝宝/, tag: '亲子游' },
    { pattern: /情侣|浪漫|蜜月/, tag: '情侣游' },
    { pattern: /自驾|租车/, tag: '自驾游' },
    { pattern: /摄影|拍照|出片/, tag: '摄影' },
    { pattern: /徒步|登山|户外/, tag: '户外' },
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
