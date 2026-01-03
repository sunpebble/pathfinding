/**
 * POI Review Types (Silver Layer)
 * Types for storing POI review data
 */

export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface POIReview {
  id: string;
  poi_id: string;
  raw_record_id?: string | null;
  content: string;
  content_language?: string | null;
  rating?: number | null;
  rating_breakdown?: Record<string, number> | null;
  author_name?: string | null;
  author_avatar_hash?: string | null;
  author_level?: string | null;
  published_at?: Date | null;
  helpful_count: number;
  reply_count: number;
  sentiment_score?: number | null;
  sentiment_label?: SentimentLabel | null;
  source_platform: string;
  source_external_id?: string | null;
  created_at: Date;
}

export interface CreatePOIReviewRequest {
  poi_id: string;
  raw_record_id?: string;
  content: string;
  content_language?: string;
  rating?: number;
  rating_breakdown?: Record<string, number>;
  author_name?: string;
  author_level?: string;
  published_at?: Date | string;
  helpful_count?: number;
  reply_count?: number;
  sentiment_score?: number;
  sentiment_label?: SentimentLabel;
  source_platform: string;
  source_external_id?: string;
}

export interface POIReviewListParams {
  poi_id?: string;
  source_platform?: string;
  sentiment_label?: SentimentLabel;
  min_rating?: number;
  limit?: number;
  offset?: number;
}

export interface ReviewStats {
  total_reviews: number;
  average_rating: number | null;
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
}
