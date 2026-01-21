/**
 * Mafengwo (马蜂窝) Crawler
 * Crawls travel guides from Mafengwo using Playwright headless browser
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

// City ID mapping for Mafengwo
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
 * Crawl Mafengwo travel guides for a city
 * Uses the destination page which is publicly accessible and contains guide previews
 */
export async function crawlMafengwo(
  city: string,
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const maxGuides = (options.maxPages || 5) * 10; // Convert pages to guide count
  const cityId = CITY_IDS[city];

  if (!cityId) {
    console.warn(`[Mafengwo] City not mapped: ${city}`);
    return results;
  }

  console.log(`[Mafengwo] Crawling guides for ${city} (${cityId})`);

  // Create a browser context for this crawl session
  const context = await createContext();

  try {
    // Use destination page which is publicly accessible
    const destUrl = `https://www.mafengwo.cn/travel-scenic-spot/mafengwo/${cityId}.html`;
    console.log(`[Mafengwo] Fetching destination page: ${destUrl}`);

    // Extract guides from the destination page
    const guides = await fetchGuidesFromDestPage(context, destUrl, city, maxGuides);
    console.log(`[Mafengwo] Found ${guides.length} guides from destination page`);

    results.push(...guides);
  } catch (error) {
    console.error(`[Mafengwo] Error crawling destination page:`, error);
  } finally {
    // Always close the context when done
    await context.close();
    console.log('[Mafengwo] Browser context closed');
  }

  return results;
}

/**
 * Fetch guides from destination page which contains guide previews
 * The page structure has guide items in .tn-item.clearfix containers with:
 * - Title link in dt a.title-link[href*="/i/"]
 * - Preview content in dd > a[href*="/i/"]
 * - Author info in .tn-user a
 * - Cover image in .tn-image img (data-original attribute)
 * - Stats in .tn-nums (format: "views/likes")
 */
async function fetchGuidesFromDestPage(
  context: Awaited<ReturnType<typeof createContext>>,
  destUrl: string,
  city: string,
  maxGuides: number
): Promise<CrawlResult[]> {
  const page = await createPage(context);
  const guides: CrawlResult[] = [];
  const seenIds = new Set<string>();

  try {
    // Navigate to the destination page
    await page.goto(destUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for the specific guide container to load
    try {
      await page.waitForSelector('.tn-item', { timeout: 15000 });
      console.log('[Mafengwo] Found .tn-item elements');
    } catch {
      console.log('[Mafengwo] .tn-item not found, trying alternative selectors...');
      await page.waitForSelector('a[href*="/i/"]', { timeout: 10000 }).catch(() => {});
    }

    // Wait for network to settle
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Scroll to load lazy content
    await scrollToLoadContent(page);

    // Additional wait for dynamic content
    await sleep(2000);

    // Get the rendered HTML
    const html = await page.content();

    // Debug: Save HTML to file for analysis
    const fs = await import('fs/promises');
    await fs.writeFile('/tmp/mafengwo-debug.html', html);
    console.log('[Mafengwo] Saved HTML to /tmp/mafengwo-debug.html, length:', html.length);

    const $ = cheerio.load(html);

    // Debug: Log what we find
    const tnItemCount = $('.tn-item').length;
    const titleLinkCount = $('a.title-link').length;
    console.log(`[Mafengwo] Found ${tnItemCount} .tn-item containers, ${titleLinkCount} title links`);

    // Strategy 1: Find guide items by .tn-item container (preferred)
    $('.tn-item').each((index, container) => {
      if (guides.length >= maxGuides) return false;

      const $container = $(container);

      // Find the title link - use .title-link class which is more specific
      const titleLink = $container.find('a.title-link').first();
      let href = titleLink.attr('href');

      // Fallback: find any link with /i/ pattern in dt
      if (!href) {
        const dtLink = $container.find('dt a[href*="/i/"]').first();
        href = dtLink.attr('href');
      }

      if (!href || !href.match(/\/i\/\d+\.html/)) return;

      // Extract guide ID to avoid duplicates
      const urlMatch = href.match(/\/i\/(\d+)/);
      const guideId = urlMatch?.[1];
      if (!guideId || seenIds.has(guideId)) return;
      seenIds.add(guideId);

      // Get title from the title link
      const title = (titleLink.text().trim() || $container.find('dt a[href*="/i/"]').first().text().trim()).replace(/_游记$/, '');
      if (!title || title.length < 3) return;

      // Get preview content from dd
      const preview = $container.find('dd a').first().text().trim();

      // Get author name from .tn-user
      const authorName = $container.find('.tn-user a').text().trim() || '马蜂窝用户';

      // Get cover image from .tn-image - use data-original for lazy-loaded images
      const img = $container.find('.tn-image img').first();
      const coverImageUrl = img.attr('data-original') || img.attr('src') || img.attr('data-src');

      // Get stats from .tn-nums - format is "views/likes"
      const statsText = $container.find('.tn-nums').text().trim();
      const statsMatch = statsText.match(/(\d+)\/(\d+)/);
      const viewsCount = statsMatch ? Number.parseInt(statsMatch[1], 10) : 0;

      const sourceExternalId = `mafengwo_${guideId}`;
      const fullUrl = `https://www.mafengwo.cn${href}`;

      guides.push({
        sourceExternalId,
        sourceUrl: fullUrl,
        title,
        content: preview.length > 50 ? preview : `${title} - ${city}旅游攻略`,
        authorName,
        coverImageUrl: coverImageUrl?.startsWith('http') ? coverImageUrl : (coverImageUrl ? `https:${coverImageUrl}` : undefined),
        imageUrls: [],
        destinations: [city],
        tags: extractTags(title, preview),
        viewsCount,
        qualityScore: calculateQualityScore(preview, 1, viewsCount),
      });
    });

    // Strategy 2: Fallback - find title links with .title-link class
    if (guides.length === 0) {
      console.log('[Mafengwo] Using fallback strategy...');
      $('a.title-link[href*="/i/"]').each((index, el) => {
        if (guides.length >= maxGuides) return false;

        const href = $(el).attr('href');
        if (!href || !href.match(/\/i\/\d+\.html/)) return;

        const urlMatch = href.match(/\/i\/(\d+)/);
        const guideId = urlMatch?.[1];
        if (!guideId || seenIds.has(guideId)) return;
        seenIds.add(guideId);

        const title = $(el).text().trim().replace(/_游记$/, '');
        if (!title || title.length < 3) return;

        // Try to find parent container for more info
        const container = $(el).closest('.tn-item');
        const preview = container.find('dd a').first().text().trim();
        const authorName = container.find('.tn-user a').text().trim() || '马蜂窝用户';

        const sourceExternalId = `mafengwo_${guideId}`;
        const fullUrl = `https://www.mafengwo.cn${href}`;

        guides.push({
          sourceExternalId,
          sourceUrl: fullUrl,
          title,
          content: preview.length > 50 ? preview : `${title} - ${city}旅游攻略`,
          authorName,
          coverImageUrl: undefined,
          imageUrls: [],
          destinations: [city],
          tags: extractTags(title, preview),
          viewsCount: 0,
          qualityScore: calculateQualityScore(preview, 1, 0),
        });
      });
    }

    console.log(`[Mafengwo] Extracted ${guides.length} guides`);
  } catch (error) {
    console.error(`[Mafengwo] Error fetching destination page:`, error);
  } finally {
    await page.close();
  }

  return guides;
}

/**
 * Fetch list page and extract guide links using Playwright
 */
async function fetchListPage(
  context: Awaited<ReturnType<typeof createContext>>,
  listUrl: string
): Promise<string[]> {
  const page = await createPage(context);
  const guideLinks: string[] = [];

  try {
    // Navigate to the list page
    await page.goto(listUrl, { waitUntil: 'domcontentloaded' });

    // Wait for content to load
    await waitForContent(page, '.post-list, .note-list, ._j_note_link');

    // Scroll to load lazy content
    await scrollToLoadContent(page);

    // Get the rendered HTML
    const html = await page.content();
    const $ = cheerio.load(html);

    // Extract guide links using multiple selectors
    $('.post-list li a.title, .note-item a.title, ._j_note_link').each(
      (_, el) => {
        const href = $(el).attr('href');
        if (href && (href.includes('/i/') || href.includes('/note/'))) {
          guideLinks.push(
            href.startsWith('http') ? href : `https://www.mafengwo.cn${href}`
          );
        }
      }
    );

    // Also try alternative selectors if no links found
    if (guideLinks.length === 0) {
      $('a[href*="/i/"], a[href*="/note/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.match(/\/(i|note)\/\d+/)) {
          const fullUrl = href.startsWith('http')
            ? href
            : `https://www.mafengwo.cn${href}`;
          if (!guideLinks.includes(fullUrl)) {
            guideLinks.push(fullUrl);
          }
        }
      });
    }
  } finally {
    await page.close();
  }

  return guideLinks;
}

/**
 * Fetch Mafengwo guide detail using Playwright
 */
async function fetchMafengwoGuide(
  context: Awaited<ReturnType<typeof createContext>>,
  url: string,
  city: string
): Promise<CrawlResult | null> {
  const page = await createPage(context);

  try {
    // Navigate to the guide page
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Wait for content to load
    await waitForContent(
      page,
      '.post-info, ._j_content, .note-content, article'
    );

    // Scroll to load lazy images
    await scrollToLoadContent(page);

    // Get the rendered HTML
    const html = await page.content();
    const $ = cheerio.load(html);

    // Extract content
    const title =
      $('h1.headtext, .post-title, .note-title').first().text().trim() ||
      $('title').text().split('-')[0].trim();

    const content =
      $('.post-info, ._j_content, .note-content').text().trim() ||
      $('article').text().trim() ||
      $('.content').text().trim();

    const authorName = $('.author-name, .user-name, .name')
      .first()
      .text()
      .trim();

    // Extract images (including lazy-loaded ones)
    const imageUrls: string[] = [];
    $('.post-info img, ._j_content img, .note-content img, article img').each(
      (_, el) => {
        const src =
          $(el).attr('src') ||
          $(el).attr('data-src') ||
          $(el).attr('data-original');
        if (src && !src.includes('avatar') && !src.includes('icon')) {
          const fullSrc = src.startsWith('http') ? src : `https:${src}`;
          if (!imageUrls.includes(fullSrc)) {
            imageUrls.push(fullSrc);
          }
        }
      }
    );

    const coverImageUrl = imageUrls[0];

    // Extract stats
    const viewsText = $('.view-count, .views, ._j_view_count').text();
    const likesText = $('.ding-count, .likes, ._j_ding').text();
    const viewsCount = Number.parseInt(viewsText.match(/\d+/)?.[0] || '0', 10);
    const likesCount = Number.parseInt(likesText.match(/\d+/)?.[0] || '0', 10);

    // Generate external ID
    const urlMatch = url.match(/\/(i|note)\/(\d+)/);
    const sourceExternalId = `mafengwo_${urlMatch?.[2] || Date.now()}`;

    if (!content || content.length < 100) {
      console.log(
        `[Mafengwo] Skipping guide with insufficient content: ${url}`
      );
      return null;
    }

    return {
      sourceExternalId,
      sourceUrl: url,
      title: title || `${city}旅游攻略`,
      content: content.substring(0, 50000),
      authorName: authorName || '马蜂窝用户',
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
    console.error(`[Mafengwo] Error parsing guide:`, error);
    return null;
  } finally {
    await page.close();
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
