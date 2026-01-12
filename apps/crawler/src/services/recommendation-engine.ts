/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
/**
 * Recommendation Engine
 * Provides travel guide recommendations based on content, popularity, and freshness
 */

import type {
  GuidePlatform,
  RecommendationParams,
  TravelGuide,
} from '@pathfinding/crawler-types';
import { api, convex } from '../lib/convex.js';

/**
 * Weights for scoring components
 */
const SCORE_WEIGHTS = {
  quality: 0.4,
  popularity: 0.35,
  freshness: 0.25,
};

/**
 * Get travel guide recommendations based on parameters
 */
export async function getRecommendations(
  params: RecommendationParams
): Promise<TravelGuide[]> {
  const {
    destinations = [],
    tags = [],
    platforms,
    limit = 20,
    offset = 0,
    minQuality = 0.3,
  } = params;

  try {
    const guides = await convex.query(api.travelGuides.list, {
      platform: platforms?.[0] as any,
      minQuality,
      limit: limit + offset,
    });

    // Filter by destinations and tags client-side
    let filtered = guides;
    if (destinations.length > 0) {
      filtered = filtered.filter((g: any) =>
        g.destinations?.some((d: string) => destinations.includes(d))
      );
    }
    if (tags.length > 0) {
      filtered = filtered.filter((g: any) =>
        g.tags?.some((t: string) => tags.includes(t))
      );
    }

    // Sort by composite score
    const scoredGuides = filtered.map((guide: any) => ({
      ...mapGuide(guide),
      _compositeScore: calculateCompositeScore(mapGuide(guide)),
    }));

    scoredGuides.sort(
      (a: any, b: any) => b._compositeScore - a._compositeScore
    );

    // Apply offset and remove internal score
    return scoredGuides
      .slice(offset, offset + limit)
      .map(({ _compositeScore, ...guide }: any) => guide as TravelGuide);
  } catch (error) {
    console.error('Failed to fetch recommendations:', error);
    return [];
  }
}

/**
 * Calculate composite recommendation score
 */
function calculateCompositeScore(guide: TravelGuide): number {
  const qualityScore = guide.quality_score || 0;
  const popularityScore = calculatePopularityScore(guide);
  const freshnessScore = calculateFreshnessScore(guide.published_at);

  return (
    SCORE_WEIGHTS.quality * qualityScore +
    SCORE_WEIGHTS.popularity * popularityScore +
    SCORE_WEIGHTS.freshness * freshnessScore
  );
}

/**
 * Calculate popularity score based on engagement metrics
 */
export function calculatePopularityScore(guide: TravelGuide): number {
  const engagement =
    (guide.likes_count || 0) * 1 +
    (guide.saves_count || 0) * 2 +
    (guide.comments_count || 0) * 1.5 +
    (guide.views_count || 0) * 0.1;

  return Math.min(engagement / 10000, 1);
}

/**
 * Calculate freshness score based on publish date
 */
export function calculateFreshnessScore(publishedAt?: string): number {
  if (!publishedAt) {
    return 0.5;
  }

  const publishDate = new Date(publishedAt);
  const now = new Date();
  const daysSincePublish =
    (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSincePublish < 7) return 1;
  if (daysSincePublish < 30) return 0.9;
  if (daysSincePublish < 90) return 0.7;
  if (daysSincePublish < 180) return 0.5;
  if (daysSincePublish < 365) return 0.3;
  return 0.1;
}

/**
 * Search travel guides with full-text search
 */
export async function searchGuides(
  query: string,
  options: {
    platforms?: GuidePlatform[];
    destinations?: string[];
    limit?: number;
    offset?: number;
  } = {}
): Promise<TravelGuide[]> {
  const { platforms, destinations, limit = 20, offset = 0 } = options;

  try {
    const guides = await convex.query(api.travelGuides.search, {
      query,
      platform: platforms?.[0] as any,
      limit: limit + offset,
    });

    let filtered = guides.map(mapGuide);

    if (destinations && destinations.length > 0) {
      filtered = filtered.filter((g) =>
        g.destinations?.some((d: string) => destinations.includes(d))
      );
    }

    return filtered.slice(offset, offset + limit);
  } catch (error) {
    console.error('Failed to search guides:', error);
    return [];
  }
}

/**
 * Get trending guides (most popular in recent period)
 */
export async function getTrendingGuides(
  options: {
    days?: number;
    platforms?: GuidePlatform[];
    limit?: number;
  } = {}
): Promise<TravelGuide[]> {
  const { days = 7, platforms, limit = 10 } = options;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const guides = await convex.query(api.travelGuides.list, {
      platform: platforms?.[0] as any,
      limit: limit * 2,
    });

    // Filter by crawl date and sort by likes
    const filtered = guides
      .filter((g: any) => g.crawledAt >= cutoffDate.getTime())
      .map(mapGuide)
      .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
      .slice(0, limit);

    return filtered;
  } catch (error) {
    console.error('Failed to fetch trending guides:', error);
    return [];
  }
}

/**
 * Get guides for a specific destination
 */
export async function getGuidesByDestination(
  destination: string,
  options: {
    platforms?: GuidePlatform[];
    minQuality?: number;
    limit?: number;
    offset?: number;
  } = {}
): Promise<TravelGuide[]> {
  const { platforms, minQuality = 0.3, limit = 20, offset = 0 } = options;

  try {
    const guides = await convex.query(api.travelGuides.list, {
      platform: platforms?.[0] as any,
      minQuality,
      limit: (limit + offset) * 2,
    });

    // Filter by destination
    const filtered = guides
      .filter((g: any) => g.destinations?.includes(destination))
      .map(mapGuide)
      .slice(offset, offset + limit);

    return filtered;
  } catch (error) {
    console.error('Failed to fetch guides by destination:', error);
    return [];
  }
}

// Helper to map Convex guide to TravelGuide type
function mapGuide(doc: any): TravelGuide {
  return {
    id: doc._id,
    source_platform: doc.sourcePlatform,
    source_external_id: doc.sourceExternalId,
    source_url: doc.sourceUrl,
    title: doc.title,
    content: doc.content,
    content_html: doc.contentHtml,
    author_name: doc.authorName,
    author_id: doc.authorId,
    destinations: doc.destinations,
    tags: doc.tags,
    likes_count: doc.likesCount,
    saves_count: doc.savesCount,
    comments_count: doc.commentsCount,
    views_count: doc.viewsCount,
    cover_image_url: doc.coverImageUrl,
    image_urls: doc.imageUrls,
    published_at: doc.publishedAt
      ? new Date(doc.publishedAt).toISOString()
      : null,
    crawled_at: new Date(doc.crawledAt).toISOString(),
    quality_score: doc.qualityScore,
    content_hash: doc.contentHash,
    created_at: new Date(doc._creationTime).toISOString(),
    updated_at: new Date(doc._creationTime).toISOString(),
  } as TravelGuide;
}
