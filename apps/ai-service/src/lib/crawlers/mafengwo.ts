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
  initMCP,
  navigateTo,
  scrollToLoadContent,
  sleep,
  takeSnapshot,
} from './mcp-client.js';

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

export async function crawlMafengwo(
  city: string,
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const maxGuides = (options.maxPages || 5) * 10;
  const cityId = CITY_IDS[city];

  if (!cityId) {
    console.warn(`[Mafengwo] City not mapped: ${city}`);
    return results;
  }

  console.log(`[Mafengwo] Crawling guides for ${city} (${cityId})`);

  try {
    await initMCP({ persistent: false });
    console.log('[Mafengwo] Using isolated Chrome session');

    const destUrl = `https://www.mafengwo.cn/travel-scenic-spot/mafengwo/${cityId}.html`;
    console.log(`[Mafengwo] Fetching destination page: ${destUrl}`);

    const guides = await fetchGuidesFromDestPage(destUrl, city, maxGuides);
    console.log(
      `[Mafengwo] Found ${guides.length} guides from destination page`
    );

    results.push(...guides);

    if (results.length === 0) {
      console.warn('[Mafengwo] No results found. You may need to login first:');
      console.warn(
        '  Run: pnpm --filter ai-service exec tsx src/login-helper.ts mafengwo'
      );
    }
  } catch (error) {
    console.error(`[Mafengwo] Error crawling destination page:`, error);
  } finally {
    await disconnect();
    console.log('[Mafengwo] MCP client disconnected');
  }

  return results;
}

async function fetchGuidesFromDestPage(
  destUrl: string,
  city: string,
  maxGuides: number
): Promise<CrawlResult[]> {
  const guides: CrawlResult[] = [];
  const seenIds = new Set<string>();

  try {
    await navigateTo(destUrl, { timeout: 30000 });
    await waitForContentStable();
    await scrollToLoadContent(3);
    await sleep(2000);

    const snapshot = await takeSnapshot({ verbose: true });
    const content = snapshot.content;

    console.log(`[Mafengwo] Snapshot length: ${content.length} chars`);
    console.log(`[Mafengwo] Snapshot preview: ${content.substring(0, 800)}`);

    // Check for captcha/verification
    if (
      content.includes('验证') ||
      content.includes('captcha') ||
      content.includes('verify')
    ) {
      console.warn(
        '[Mafengwo] Captcha detected - site requires manual verification'
      );
      return guides;
    }

    const guideMatches = content.matchAll(/\/i\/(\d+)\.html/g);

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
            .replace(/_游记$/, '')
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

      if (!title || title.length < 3) continue;

      const authorName = extractAuthor(context) || '马蜂窝用户';
      const stats = extractStats(context);
      const imageUrls = extractImageUrls(context);
      const coverImageUrl = imageUrls[0];

      const sourceExternalId = `mafengwo_${guideId}`;
      const fullUrl = `https://www.mafengwo.cn/i/${guideId}.html`;

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
        qualityScore: calculateQualityScore('', 1, stats.views || 0),
      });
    }

    console.log(`[Mafengwo] Extracted ${guides.length} guides`);
  } catch (error) {
    console.error(`[Mafengwo] Error fetching destination page:`, error);
  }

  return guides;
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
