/**
 * Travel Guide Types
 * Types for crawled travel guide content from various platforms
 */

/**
 * Supported platforms for travel guide crawling
 */
export type GuidePlatform = 'xiaohongshu' | 'weibo' | 'ctrip';

/**
 * Raw travel guide data as extracted from source platforms
 */
export interface TravelGuideRaw {
  title?: string;
  content: string;
  content_html?: string; // HTML content for rich text rendering
  author_name?: string;
  author_id?: string;
  likes_count?: number;
  saves_count?: number;
  comments_count?: number;
  views_count?: number;
  cover_image_url?: string;
  image_urls?: string[];
  published_at?: string;
  tags?: string[];
}

/**
 * Processed travel guide with extracted metadata
 */
export interface TravelGuide {
  id: string;
  source_platform: GuidePlatform;
  source_external_id: string;
  source_url?: string;

  title?: string;
  content: string;
  content_html?: string; // HTML content for rich text rendering
  author_name?: string;
  author_id?: string;

  destinations: string[];
  tags: string[];

  likes_count: number;
  saves_count: number;
  comments_count: number;
  views_count: number;

  cover_image_url?: string;
  image_urls: string[];

  published_at?: string;
  crawled_at: string;

  quality_score: number;
  content_hash?: string;

  created_at: string;
  updated_at: string;
}

/**
 * Guide recommendation for a user
 */
export interface GuideRecommendation {
  id: string;
  user_id: string;
  guide_id: string;
  score: number;
  reason?: string;
  is_dismissed: boolean;
  created_at: string;
  guide?: TravelGuide;
}

/**
 * Parameters for recommendation queries
 */
export interface RecommendationParams {
  destinations?: string[];
  tags?: string[];
  platforms?: GuidePlatform[];
  limit?: number;
  offset?: number;
  minQuality?: number;
}

/**
 * Crawl job configuration for guide crawling
 */
export interface GuideCrawlConfig {
  keywords?: string[];
  destinations?: string[];
  max_pages?: number;
  min_likes?: number;
  date_range?: {
    start?: string;
    end?: string;
  };
}
