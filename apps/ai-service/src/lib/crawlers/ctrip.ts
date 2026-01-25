import type { ContentBlock, CrawlOptions, CrawlResult } from './index.js';
import {
  extractAuthor,
  extractImageUrls,
  extractStats,
  getArticleContent,
  getBestTitle,
} from './accessibility-parser.js';
import {
  disconnect,
  navigateTo,
  scrollToLoadContent,
  sleep,
  takeSnapshot,
} from './mcp-client.js';
import { waitForContentStable } from './diagnostics/index.js';

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
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const maxPages = options.maxPages || 5;
  const cityId = CITY_IDS[city] || city;

  console.log(`[Ctrip] Crawling guides for ${city} (${cityId})`);

  try {
    for (let page = 1; page <= maxPages; page++) {
      try {
        const listUrl = `https://you.ctrip.com/travels/${cityId}/t3-p${page}.html`;
        console.log(`[Ctrip] Fetching page ${page}: ${listUrl}`);

        const guideLinks = await fetchListPage(listUrl);
        console.log(
          `[Ctrip] Found ${guideLinks.length} guides on page ${page}`
        );

        for (const guideUrl of guideLinks.slice(0, 10)) {
          try {
            const guide = await fetchGuideDetail(guideUrl, city);
            if (guide) {
              results.push(guide);
            }
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
    await disconnect();
    console.log('[Ctrip] MCP client disconnected');
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

    const linkMatches = content.matchAll(
      /\/travels\/[A-Za-z]+\d+\/(\d+)\.html/g
    );
    const seenIds = new Set<string>();

    for (const match of linkMatches) {
      const guideId = match[1];
      if (seenIds.has(guideId)) continue;
      seenIds.add(guideId);

      const fullUrl = `https://you.ctrip.com${match[0]}`;
      guideLinks.push(fullUrl);
    }
  } catch (error) {
    console.error(`[Ctrip] Error fetching list page: ${url}`, error);
  }

  return guideLinks;
}

async function fetchGuideDetail(
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

    console.log(
      `[Ctrip] Snapshot for ${url.split('/').pop()}: ${content.length} chars`
    );

    // Use accessibility tree parser for extraction
    const title = getBestTitle(content, `${city}旅游攻略`);
    const textContent = getArticleContent(content);

    if (!textContent || textContent.length < 50) {
      console.log(`[Ctrip] Skipping guide with insufficient content: ${url}`);
      return null;
    }

    const authorName = extractAuthor(content) || '携程用户';
    const imageUrls = extractImageUrls(content);
    const coverImageUrl = imageUrls[0];
    const stats = extractStats(content);

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
    console.error(`[Ctrip] Error parsing guide:`, error);
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
