import type { ContentBlock, CrawlOptions, CrawlResult } from './index.js';
import {
  extractAuthor,
  extractHeadings,
  extractImageUrls,
  extractStats,
} from './accessibility-parser.js';
import { waitForContentStable } from './diagnostics/index.js';
import {
  disconnect,
  navigateTo,
  scrollToLoadContent,
  sleep,
  takeSnapshot,
} from './mcp-client.js';

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
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const maxGuides = (options.maxPages || 5) * 10;
  const citySlug = CITY_SLUGS[city] || city.toLowerCase();

  console.log(`[Tongcheng] Crawling guides for ${city} (${citySlug})`);

  try {
    const listUrl = 'https://www.ly.com/travels/';
    console.log(`[Tongcheng] Fetching travels list: ${listUrl}`);

    const guides = await fetchGuidesFromTravelsList(listUrl, city, maxGuides);
    console.log(`[Tongcheng] Found ${guides.length} guides from travels list`);

    results.push(...guides);
  } catch (error) {
    console.error(`[Tongcheng] Error crawling travels list:`, error);
  } finally {
    await disconnect();
    console.log('[Tongcheng] MCP client disconnected');
  }

  return results;
}

async function fetchGuidesFromTravelsList(
  listUrl: string,
  city: string,
  maxGuides: number
): Promise<CrawlResult[]> {
  const guides: CrawlResult[] = [];
  const seenIds = new Set<string>();

  try {
    await navigateTo(listUrl, { timeout: 30000 });
    await waitForContentStable();
    await scrollToLoadContent(3);
    await sleep(2000);

    const snapshot = await takeSnapshot({ verbose: true });
    const content = snapshot.content;

    const guideMatches = content.matchAll(/\/travels\/(\d+)\.html/g);

    for (const match of guideMatches) {
      if (guides.length >= maxGuides) break;

      const guideId = match[1];
      if (seenIds.has(guideId)) continue;
      seenIds.add(guideId);

      const contextStart = Math.max(0, match.index! - 300);
      const contextEnd = Math.min(content.length, match.index! + 300);
      const context = content.substring(contextStart, contextEnd);

      // Use accessibility tree parser for title extraction
      const headings = extractHeadings(context);
      let title = headings[0];

      if (!title) {
        // Fallback: look for Chinese text that looks like a title
        const lines = context.split('\n').filter((l) => l.trim().length > 5);
        for (const line of lines) {
          const cleaned = line
            .replace(/\[[^\]]*\]/g, '')
            .replace(/uid=\S+\s*/, '')
            .replace(/^\s*(StaticText|link|heading)\s*/, '')
            .replace(/^"/, '')
            .replace(/"$/, '')
            .trim();
          if (
            cleaned.length >= 5 &&
            cleaned.length <= 100 &&
            /[\u4E00-\u9FFF]/.test(cleaned) &&
            !cleaned.includes('http')
          ) {
            title = cleaned;
            break;
          }
        }
      }

      if (!title || title.length < 5) continue;

      const authorName = extractAuthor(context) || '同程用户';
      const imageUrls = extractImageUrls(context);
      const coverImageUrl = imageUrls[0];
      const stats = extractStats(context);

      const sourceExternalId = `tongcheng_${guideId}`;
      const fullUrl = `https://www.ly.com/travels/${guideId}.html`;

      const contentBlocks: ContentBlock[] = [
        { type: 'text', content: `${title} - ${city}旅游攻略` },
      ];

      if (coverImageUrl) {
        contentBlocks.push({ type: 'image', url: coverImageUrl });
      }

      guides.push({
        sourceExternalId,
        sourceUrl: fullUrl,
        title,
        content: `${title} - ${city}旅游攻略`,
        contentBlocks,
        contentType: 'normal',
        authorName,
        coverImageUrl,
        imageUrls: coverImageUrl ? [coverImageUrl] : [],
        destinations: [city],
        tags: extractTags(title, ''),
        viewsCount: stats.views || 0,
        likesCount: stats.likes || 0,
        qualityScore: 50,
      });
    }

    console.log(`[Tongcheng] Extracted ${guides.length} guides from list`);
  } catch (error) {
    console.error(`[Tongcheng] Error fetching travels list:`, error);
  }

  return guides;
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
