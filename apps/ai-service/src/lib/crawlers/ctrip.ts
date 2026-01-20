/**
 * Ctrip (携程) Crawler
 * Crawls travel guides from Ctrip
 */

import type { CrawlOptions, CrawlResult } from './index.js';
import * as cheerio from 'cheerio';

// City ID mapping for Ctrip
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
};

/**
 * Crawl Ctrip travel guides for a city
 */
export async function crawlCtrip(
  city: string,
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const maxPages = options.maxPages || 5;
  const cityId = CITY_IDS[city] || city;

  console.log(`[Ctrip] Crawling guides for ${city} (${cityId})`);

  for (let page = 1; page <= maxPages; page++) {
    try {
      const listUrl = `https://you.ctrip.com/travels/${cityId}/t3-p${page}.html`;
      console.log(`[Ctrip] Fetching page ${page}: ${listUrl}`);

      const listResponse = await fetch(listUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
      });

      if (!listResponse.ok) {
        console.error(
          `[Ctrip] Failed to fetch list page ${page}: ${listResponse.status}`
        );
        continue;
      }

      const listHtml = await listResponse.text();
      const $ = cheerio.load(listHtml);

      // Extract guide links from list page
      const guideLinks: string[] = [];
      $('.ttd_content_list li .ct_title a, .list_mod_mediaTitle a').each(
        (_, el) => {
          const href = $(el).attr('href');
          if (href && href.includes('/travels/')) {
            guideLinks.push(
              href.startsWith('http') ? href : `https://you.ctrip.com${href}`
            );
          }
        }
      );

      console.log(`[Ctrip] Found ${guideLinks.length} guides on page ${page}`);

      // Fetch each guide detail
      for (const guideUrl of guideLinks.slice(0, 10)) {
        // Limit per page
        try {
          const guide = await fetchGuideDetail(guideUrl, city);
          if (guide) {
            results.push(guide);
          }
          // Rate limiting
          await sleep(1000 / (options.rateLimit || 0.5));
        } catch (error) {
          console.error(`[Ctrip] Error fetching guide: ${guideUrl}`, error);
        }
      }
    } catch (error) {
      console.error(`[Ctrip] Error crawling page ${page}:`, error);
    }
  }

  return results;
}

/**
 * Fetch guide detail page
 */
async function fetchGuideDetail(
  url: string,
  city: string
): Promise<CrawlResult | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract content
    const title = $('h1.ctd_head_title, .tit').first().text().trim();
    const content =
      $('.ctd_content, .travel_article').text().trim() ||
      $('article').text().trim() ||
      $('.article_content').text().trim();
    const authorName = $('.ctd_author_name, .name').first().text().trim();

    // Extract images
    const imageUrls: string[] = [];
    $('.ctd_content img, .travel_article img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !src.includes('avatar')) {
        imageUrls.push(src.startsWith('http') ? src : `https:${src}`);
      }
    });

    const coverImageUrl = imageUrls[0];

    // Extract stats
    const viewsText = $('.view_count, .views').text();
    const likesText = $('.like_count, .likes').text();
    const viewsCount = Number.parseInt(viewsText.match(/\d+/)?.[0] || '0', 10);
    const likesCount = Number.parseInt(likesText.match(/\d+/)?.[0] || '0', 10);

    // Generate external ID
    const urlMatch = url.match(/\/(\d+)\.html/);
    const sourceExternalId = `ctrip_${urlMatch?.[1] || Date.now()}`;

    if (!content || content.length < 100) {
      console.log(`[Ctrip] Skipping guide with insufficient content: ${url}`);
      return null;
    }

    return {
      sourceExternalId,
      sourceUrl: url,
      title: title || `${city}旅游攻略`,
      content: content.substring(0, 50000), // Limit content length
      authorName: authorName || '携程用户',
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
    console.error(`[Ctrip] Error parsing guide:`, error);
    return null;
  }
}

/**
 * Extract tags from content
 */
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
  if (content.length > 1000) score += 10;
  if (content.length > 3000) score += 10;
  if (content.length > 5000) score += 5;

  // Image bonus
  score += Math.min(imageCount * 2, 15);

  // Views bonus
  if (viewsCount > 1000) score += 5;
  if (viewsCount > 10000) score += 5;

  return Math.min(score, 100);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
