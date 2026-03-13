/**
 * POI Review Types (Silver Layer)
 * Types for storing and querying user-generated POI reviews.
 */

/** NLP-derived sentiment classification */
export type SentimentLabel = 'positive' | 'neutral' | 'negative';

/** A single user review associated with a normalized POI */
export interface POIReview {
  /** Internal unique identifier */
  id: string;
  /** Associated NormalizedPOI ID */
  poi_id: string;
  /** Source raw crawl record ID (for provenance) */
  raw_record_id?: string | null;
  /** Review text content */
  content: string;
  /** ISO 639-1 language code of the review content */
  content_language?: string | null;
  /** Reviewer's overall rating (e.g. 1–5) */
  rating?: number | null;
  /** Per-aspect rating breakdown */
  rating_breakdown?: Record<string, number> | null;
  /** Reviewer display name */
  author_name?: string | null;
  /** SHA hash of the reviewer's avatar URL (privacy-safe) */
  author_avatar_hash?: string | null;
  /** Platform-specific author level / badge */
  author_level?: string | null;
  /** When the review was originally published */
  published_at?: Date | null;
  /** Number of "helpful" votes received */
  helpful_count: number;
  /** Number of replies to this review */
  reply_count: number;
  /** NLP sentiment score (–1 to 1) */
  sentiment_score?: number | null;
  /** Derived sentiment label */
  sentiment_label?: SentimentLabel | null;
  /** Source platform identifier */
  source_platform: string;
  /** External review ID on the source platform */
  source_external_id?: string | null;
  /** Database creation timestamp */
  created_at: Date;
}

/** Request payload for creating a new POI review */
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

/** Query parameters for listing POI reviews */
export interface POIReviewListParams {
  poi_id?: string;
  source_platform?: string;
  sentiment_label?: SentimentLabel;
  min_rating?: number;
  limit?: number;
  offset?: number;
}

/** Aggregate statistics for reviews of a single POI */
export interface ReviewStats {
  /** Total number of reviews */
  total_reviews: number;
  /** Average rating across all reviews (null if no ratings) */
  average_rating: number | null;
  /** Count distribution by sentiment label */
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
}
