import type { ContentBlock, CrawlOptions, CrawlResult } from './index.js';
import {
  extractAuthor,
  extractImageUrls,
  extractStats,
  getArticleContent,
  getBestTitle,
} from './accessibility-parser.js';
import { waitForContentStable } from './diagnostics/index.js';
import {
  disconnect,
  navigateTo,
  scrollToLoadContent,
  sleep,
  takeSnapshot,
} from './mcp-client.js';

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

  try {
    for (let page = 1; page <= maxPages; page++) {
      try {
        const listUrl = `https://travel.qunar.com/p-cs${cityId}/youji?page=${page}`;
        console.log(`[Qunar] Fetching page ${page}: ${listUrl}`);

        const guideLinks = await fetchListPage(listUrl);
        console.log(
          `[Qunar] Found ${guideLinks.length} guides on page ${page}`
        );

        for (const guideUrl of guideLinks.slice(0, 10)) {
          try {
            const guide = await fetchQunarGuide(guideUrl, city);
            if (guide) {
              results.push(guide);
            }
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
    await disconnect();
    console.log('[Qunar] MCP client disconnected');
  }

  return results;
}

async function fetchListPage(url: string): Promise<string[]> {
  const guideLinks: string[] = [];

  try {
    await navigateTo(url, { timeout: 30000 });
    await waitForContentStable();
    await scrollToLoadContent(2);
    await sleep(1000);

    const snapshot = await takeSnapshot();
    const content = snapshot.content;

    const linkMatches = content.matchAll(/\/youji\/(\d+)/g);
    const seenIds = new Set<string>();

    for (const match of linkMatches) {
      const guideId = match[1];
      if (seenIds.has(guideId)) continue;
      seenIds.add(guideId);

      const fullUrl = `https://travel.qunar.com/youji/${guideId}`;
      guideLinks.push(fullUrl);
    }
  } catch (error) {
    console.error(`[Qunar] Error fetching list page: ${url}`, error);
  }

  return guideLinks;
}

async function fetchQunarGuide(
  url: string,
  city: string
): Promise<CrawlResult | null> {
  try {
    await navigateTo(url, { timeout: 30000 });
    await waitForContentStable();
    await scrollToLoadContent(3);
    await sleep(1000);

    const snapshot = await takeSnapshot({ verbose: true });
    const content = snapshot.content;

    // Use accessibility tree parser for extraction
    const title = getBestTitle(content, `${city}旅游攻略`);
    const textContent = getArticleContent(content);

    if (!textContent || textContent.length < 100) {
      console.log(`[Qunar] Skipping guide with insufficient content: ${url}`);
      return null;
    }

    const authorName = extractAuthor(content) || '去哪儿用户';
    const imageUrls = extractImageUrls(content);
    const coverImageUrl = imageUrls[0];
    const stats = extractStats(content);

    const urlMatch = url.match(/\/youji\/(\d+)/);
    const sourceExternalId = `qunar_${urlMatch?.[1] || Date.now()}`;

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
      coverImageUrl,
      imageUrls: imageUrls.slice(0, 20),
      destinations: [city],
      tags: extractTags(title || '', textContent),
      likesCount: stats.likes || 0,
      viewsCount: stats.views || 0,
      qualityScore: calculateQualityScore(
        textContent,
        imageUrls.length,
        stats.views || 0
      ),
    };
  } catch (error) {
    console.error(`[Qunar] Error parsing guide:`, error);
    return null;
  }
}

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
