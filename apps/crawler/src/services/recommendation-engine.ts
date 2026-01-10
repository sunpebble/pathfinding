/**
 * Recommendation Engine
 * Provides travel guide recommendations based on content, popularity, and freshness
 */

import type {
  GuidePlatform,
  RecommendationParams,
  TravelGuide,
} from '@pathfinding/crawler-types';
import { supabase } from '../lib/supabase.js';

const TABLES = {
  TRAVEL_GUIDES: 'travel_guides',
  GUIDE_RECOMMENDATIONS: 'guide_recommendations',
};

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

  let query = supabase
    .from(TABLES.TRAVEL_GUIDES)
    .select('*')
    .gte('quality_score', minQuality)
    .order('quality_score', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by destinations if provided
  if (destinations.length > 0) {
    query = query.overlaps('destinations', destinations);
  }

  // Filter by tags if provided
  if (tags.length > 0) {
    query = query.overlaps('tags', tags);
  }

  // Filter by platforms if provided
  if (platforms && platforms.length > 0) {
    query = query.in('source_platform', platforms);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch recommendations:', error);
    return [];
  }

  // Sort by composite score
  const scoredGuides = (data || []).map((guide) => ({
    ...guide,
    _compositeScore: calculateCompositeScore(guide),
  }));

  scoredGuides.sort((a, b) => b._compositeScore - a._compositeScore);

  // Remove internal score before returning
  return scoredGuides.map(
    ({ _compositeScore, ...guide }) => guide as TravelGuide
  );
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
  // Weighted engagement score
  const engagement =
    (guide.likes_count || 0) * 1 +
    (guide.saves_count || 0) * 2 + // Saves are more valuable
    (guide.comments_count || 0) * 1.5 +
    (guide.views_count || 0) * 0.1;

  // Normalize to 0-1 range (assuming 10000 is a "viral" post)
  return Math.min(engagement / 10000, 1);
}

/**
 * Calculate freshness score based on publish date
 */
export function calculateFreshnessScore(publishedAt?: string): number {
  if (!publishedAt) {
    return 0.5; // Default score for unknown publish dates
  }

  const publishDate = new Date(publishedAt);
  const now = new Date();
  const daysSincePublish =
    (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);

  // Decay over 1 year (365 days)
  // Recent content (< 7 days) gets a boost
  if (daysSincePublish < 7) {
    return 1;
  }
  if (daysSincePublish < 30) {
    return 0.9;
  }
  if (daysSincePublish < 90) {
    return 0.7;
  }
  if (daysSincePublish < 180) {
    return 0.5;
  }
  if (daysSincePublish < 365) {
    return 0.3;
  }

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

  // Build search query with text search on title and content
  let dbQuery = supabase
    .from(TABLES.TRAVEL_GUIDES)
    .select('*')
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order('quality_score', { ascending: false })
    .range(offset, offset + limit - 1);

  if (platforms && platforms.length > 0) {
    dbQuery = dbQuery.in('source_platform', platforms);
  }

  if (destinations && destinations.length > 0) {
    dbQuery = dbQuery.overlaps('destinations', destinations);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error('Failed to search guides:', error);
    return [];
  }

  return (data || []) as TravelGuide[];
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

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  let query = supabase
    .from(TABLES.TRAVEL_GUIDES)
    .select('*')
    .gte('crawled_at', cutoffDate.toISOString())
    .order('likes_count', { ascending: false })
    .limit(limit);

  if (platforms && platforms.length > 0) {
    query = query.in('source_platform', platforms);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch trending guides:', error);
    return [];
  }

  return (data || []) as TravelGuide[];
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

  let query = supabase
    .from(TABLES.TRAVEL_GUIDES)
    .select('*')
    .contains('destinations', [destination])
    .gte('quality_score', minQuality)
    .order('quality_score', { ascending: false })
    .range(offset, offset + limit - 1);

  if (platforms && platforms.length > 0) {
    query = query.in('source_platform', platforms);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch guides by destination:', error);
    return [];
  }

  return (data || []) as TravelGuide[];
}
