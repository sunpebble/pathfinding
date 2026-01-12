/**
 * TripAdvisor Crawler
 * Crawls travel guides and reviews from TripAdvisor using DOM-based extraction
 * Two-phase: 1) List pages to collect attraction/review URLs, 2) Detail pages for full content
 */

import type {
  CrawlJobConfig,
  TravelGuideRaw,
} from '@pathfinding/crawler-types';
import type { Page } from 'playwright';

import type { GuideExtractionResult } from './base-guide.crawler.js';
import { Request } from 'crawlee';
import { BaseGuideCrawler, sleep } from './base-guide.crawler.js';

// Popular destination mappings for TripAdvisor URLs
// Chinese city names to TripAdvisor geo IDs
const DESTINATION_PATHS: Record<string, { geoId: string; name: string }> = {
  // China destinations (for inbound travel)
  北京: { geoId: 'g294212', name: 'Beijing' },
  上海: { geoId: 'g308272', name: 'Shanghai' },
  香港: { geoId: 'g294217', name: 'Hong_Kong' },
  西安: { geoId: 'g298557', name: 'Xian' },
  成都: { geoId: 'g297463', name: 'Chengdu' },
  桂林: { geoId: 'g298556', name: 'Guilin' },
  杭州: { geoId: 'g298559', name: 'Hangzhou' },
  广州: { geoId: 'g298555', name: 'Guangzhou' },
  深圳: { geoId: 'g297415', name: 'Shenzhen' },
  三亚: { geoId: 'g660647', name: 'Sanya' },
  丽江: { geoId: 'g303781', name: 'Lijiang' },
  大理: { geoId: 'g303782', name: 'Dali' },
  厦门: { geoId: 'g297407', name: 'Xiamen' },
  苏州: { geoId: 'g297446', name: 'Suzhou' },
  南京: { geoId: 'g294220', name: 'Nanjing' },
  // International destinations (for outbound travel)
  东京: { geoId: 'g298184', name: 'Tokyo' },
  大阪: { geoId: 'g298566', name: 'Osaka' },
  京都: { geoId: 'g298564', name: 'Kyoto' },
  首尔: { geoId: 'g294197', name: 'Seoul' },
  曼谷: { geoId: 'g293916', name: 'Bangkok' },
  新加坡: { geoId: 'g294265', name: 'Singapore' },
  巴厘岛: { geoId: 'g294226', name: 'Bali' },
  普吉岛: { geoId: 'g293920', name: 'Phuket' },
  巴黎: { geoId: 'g187147', name: 'Paris' },
  伦敦: { geoId: 'g186338', name: 'London' },
  纽约: { geoId: 'g60763', name: 'New_York_City' },
  洛杉矶: { geoId: 'g32655', name: 'Los_Angeles' },
  悉尼: { geoId: 'g255060', name: 'Sydney' },
  墨尔本: { geoId: 'g255100', name: 'Melbourne' },
};

/**
 * TripAdvisor Crawler using DOM-based extraction
 * Visits attraction pages and travel forums to extract reviews and guides
 */
export class TripAdvisorCrawler extends BaseGuideCrawler {
  private baseUrl = 'https://www.tripadvisor.com';

  get platform(): string {
    return 'tripadvisor';
  }

  generateRequests(config: CrawlJobConfig): Request[] {
    const requests: Request[] = [];
    const destinations = config.geographic_scope?.cities || [];

    for (const dest of destinations) {
      const destInfo = DESTINATION_PATHS[dest];
      if (destInfo) {
        // Add attractions page request
        requests.push(
          new Request({
            url: `${this.baseUrl}/Attractions-${destInfo.geoId}-Activities-${destInfo.name}.html`,
            userData: {
              type: 'list',
              destination: dest,
              geoId: destInfo.geoId,
              destName: destInfo.name,
              page: 1,
            },
          })
        );
      }
    }

    // If no specific destinations, use a default search
    if (requests.length === 0) {
      requests.push(
        new Request({
          url: `${this.baseUrl}/Attractions-g294211-Activities-China.html`,
          userData: {
            type: 'list',
            destination: 'China',
            page: 1,
          },
        })
      );
    }

    return requests;
  }

  /**
   * Extract guides from TripAdvisor page using DOM queries
   * Handles both list pages (collect URLs) and detail pages (full content)
   */
  async extractFromPage(
    page: Page,
    url: string
  ): Promise<GuideExtractionResult> {
    const guides: TravelGuideRaw[] = [];

    // Wait for dynamic content
    await sleep(2000);

    // Check if this is a detail page or list page
    const isAttractionPage = url.includes('/Attraction_Review-');
    const isReviewPage = url.includes('/ShowUserReviews-');

    if (isAttractionPage || isReviewPage) {
      // Extract full content from attraction/review page
      const guide = await this.extractAttractionContent(page, url);
      if (guide) {
        guides.push(guide);
      }
      return { guides };
    }

    // List page: extract attraction URLs
    try {
      const extractedData = await page.evaluate(() => {
        const attractions: Array<{
          title: string;
          url: string;
          rating: string;
          reviewCount: string;
          category: string;
          image: string;
        }> = [];

        // Find attraction cards
        const attractionCards = Array.from(
          document.querySelectorAll(
            '[data-automation="attractionCard"], .attraction_element, [class*="listItem"], article[class*="attraction"]'
          )
        );

        for (const card of attractionCards) {
          // Get title and link
          const linkEl = card.querySelector(
            'a[href*="/Attraction_Review-"]'
          ) as HTMLAnchorElement;
          if (!linkEl) continue;

          const title =
            linkEl.textContent?.trim() ||
            card.querySelector('h3, [class*="title"]')?.textContent?.trim() ||
            '';
          const attractionUrl = linkEl.href;

          // Get rating
          const ratingEl = card.querySelector(
            '[class*="rating"], svg[class*="bubble"], [aria-label*="bubble"]'
          );
          const rating =
            ratingEl?.getAttribute('aria-label') ||
            ratingEl?.textContent?.trim() ||
            '';

          // Get review count
          const reviewCountEl = card.querySelector(
            '[class*="reviewCount"], [class*="review_count"]'
          );
          const reviewCount = reviewCountEl?.textContent?.trim() || '0';

          // Get category
          const categoryEl = card.querySelector(
            '[class*="category"], [class*="tag"]'
          );
          const category = categoryEl?.textContent?.trim() || '';

          // Get image
          const imgEl = card.querySelector('img') as HTMLImageElement;
          const image = imgEl?.src || '';

          if (title && attractionUrl.includes('/Attraction_Review-')) {
            attractions.push({
              title,
              url: attractionUrl,
              rating,
              reviewCount,
              category,
              image,
            });
          }
        }

        // Find next page URL
        const nextPageLink = document.querySelector(
          'a[aria-label="Next page"], a.next, [class*="pagination"] a:last-child'
        ) as HTMLAnchorElement;
        const nextPageUrl = nextPageLink?.href || null;

        return { attractions, nextPageUrl };
      });

      console.warn(
        `Found ${extractedData.attractions.length} attractions on list page ${url}`
      );

      // Return attraction URLs for full content extraction
      return {
        guides: [],
        nextPageUrl: extractedData.nextPageUrl || undefined,
        articleUrls: extractedData.attractions.slice(0, 10).map((a) => a.url),
      };
    } catch (error) {
      console.error(`Failed to extract from ${url}:`, error);
      return { guides: [] };
    }
  }

  /**
   * Extract full content from attraction detail page
   */
  private async extractAttractionContent(
    page: Page,
    url: string
  ): Promise<TravelGuideRaw | null> {
    try {
      await sleep(1500);

      const attractionData = await page.evaluate(() => {
        // Title - attraction name
        const title =
          document
            .querySelector(
              'h1[data-automation="mainH1"], h1.header, h1[class*="title"]'
            )
            ?.textContent?.trim() ||
          document.querySelector('h1')?.textContent?.trim() ||
          '';

        // Overall rating
        const ratingEl = document.querySelector(
          '[data-automation="rating"], [class*="rating"] svg, [aria-label*="bubbles"]'
        );
        const rating =
          ratingEl?.getAttribute('aria-label') ||
          ratingEl?.textContent?.trim() ||
          '';

        // Review count
        const reviewCountEl = document.querySelector(
          '[data-automation="reviewCount"], [class*="reviewCount"]'
        );
        const reviewCount = reviewCountEl?.textContent?.trim() || '0';

        // Category/type
        const categoryEl = document.querySelector(
          '[data-automation="categoryTag"], [class*="category"]'
        );
        const category = categoryEl?.textContent?.trim() || '';

        // Description/About
        let description = '';
        const aboutSection = document.querySelector(
          '[data-automation="AboutSection"], [class*="about"], [class*="description"], [class*="overview"]'
        );
        if (aboutSection) {
          description = aboutSection.textContent?.trim() || '';
        }

        // Top reviews - collect several to build content
        const reviews: string[] = [];
        const reviewElements = document.querySelectorAll(
          '[data-automation="reviewCard"], [class*="review-container"], [class*="reviewSelector"]'
        );

        for (const reviewEl of Array.from(reviewElements).slice(0, 5)) {
          const reviewText =
            reviewEl
              .querySelector('[class*="reviewText"], [class*="entry"], p')
              ?.textContent?.trim() || '';
          const reviewTitle =
            reviewEl
              .querySelector('[class*="title"], [class*="reviewTitle"]')
              ?.textContent?.trim() || '';
          const reviewAuthor =
            reviewEl
              .querySelector('[class*="username"], [class*="member"]')
              ?.textContent?.trim() || '';

          if (reviewText) {
            reviews.push(
              `${reviewTitle ? `**${reviewTitle}** - ` : ''}${reviewText}${reviewAuthor ? ` (${reviewAuthor})` : ''}`
            );
          }
        }

        // Address
        const addressEl = document.querySelector(
          '[data-automation="locationAddress"], [class*="address"], address'
        );
        const address = addressEl?.textContent?.trim() || '';

        // Hours
        const hoursEl = document.querySelector(
          '[data-automation="openingHours"], [class*="hours"]'
        );
        const hours = hoursEl?.textContent?.trim() || '';

        // Images
        const images: string[] = [];
        document
          .querySelectorAll(
            '[data-automation="photoSection"] img, [class*="photo"] img, [class*="gallery"] img'
          )
          .forEach((img) => {
            if (img instanceof HTMLImageElement && img.src) {
              // Get higher quality image if available
              const src = img.src.replace(/photo-[a-z]/, 'photo-o');
              if (!images.includes(src)) {
                images.push(src);
              }
            }
          });

        // Also check for background images in photo containers
        document
          .querySelectorAll('[class*="photo"][style*="background-image"]')
          .forEach((el) => {
            const style = (el as HTMLElement).style.backgroundImage;
            const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (match && match[1] && !images.includes(match[1])) {
              images.push(match[1]);
            }
          });

        // Helpful votes (from reviews)
        let helpfulVotes = 0;
        document
          .querySelectorAll(
            '[class*="helpful"] span, [data-automation="helpfulVotes"]'
          )
          .forEach((el) => {
            const text = el.textContent?.trim() || '';
            const num = Number.parseInt(text.replace(/\D/g, ''));
            if (!Number.isNaN(num)) {
              helpfulVotes += num;
            }
          });

        // Build full content from description and top reviews
        let content = '';
        if (description) {
          content += `## About\n${description}\n\n`;
        }
        if (address) {
          content += `## Location\n${address}\n\n`;
        }
        if (hours) {
          content += `## Hours\n${hours}\n\n`;
        }
        if (reviews.length > 0) {
          content += `## Traveler Reviews\n${reviews.join('\n\n')}\n`;
        }

        return {
          title,
          rating,
          reviewCount,
          category,
          content: content.trim(),
          address,
          hours,
          images,
          helpfulVotes,
        };
      });

      if (!attractionData.title && !attractionData.content) {
        console.warn(`No content found for ${url}`);
        return null;
      }

      console.warn(
        `Extracted attraction: ${attractionData.title?.slice(0, 30)}... (${attractionData.content.length} chars)`
      );

      // Parse rating to extract numeric value (e.g., "4.5 of 5 bubbles" -> 4.5)
      const ratingMatch = attractionData.rating.match(/(\d+\.?\d*)/);
      const ratingValue = ratingMatch
        ? Number.parseFloat(ratingMatch[1]) * 20
        : 0; // Convert 5-point to 100-point scale

      return {
        title: attractionData.title,
        content: attractionData.content,
        // Use category as tag
        tags: attractionData.category
          ? [attractionData.category, 'tripadvisor', 'travel']
          : ['tripadvisor', 'travel'],
        image_urls: attractionData.images,
        cover_image_url: attractionData.images[0],
        // Map helpful votes to likes (closest equivalent)
        likes_count: attractionData.helpfulVotes,
        // Use review count for comments
        comments_count: this.parseReviewCount(attractionData.reviewCount),
        views_count: ratingValue, // Store rating as views for now (0-100 scale)
      };
    } catch (error) {
      console.error(`Failed to extract attraction from ${url}:`, error);
      return null;
    }
  }

  /**
   * Parse review count strings like "1,234 reviews" or "12K reviews"
   */
  private parseReviewCount(countStr: string): number {
    if (!countStr) return 0;

    // Remove "reviews" text and clean up
    const cleaned = countStr
      .toLowerCase()
      .replace(/reviews?/g, '')
      .trim();

    // Handle K/M suffixes
    if (cleaned.includes('k')) {
      const num = Number.parseFloat(cleaned.replace(/[^\d.]/g, ''));
      return Math.round(num * 1000);
    }
    if (cleaned.includes('m')) {
      const num = Number.parseFloat(cleaned.replace(/[^\d.]/g, ''));
      return Math.round(num * 1000000);
    }

    // Remove commas and parse
    const num = Number.parseInt(cleaned.replace(/\D/g, ''));
    return Number.isNaN(num) ? 0 : num;
  }
}
