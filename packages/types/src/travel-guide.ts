/**
 * Client-facing travel guide DTOs.
 *
 * These shapes describe REST API JSON responses. They intentionally use
 * snake_case because Dashboard and iOS both consume the external API contract.
 */

export type TravelGuidePlatform
  = | 'xiaohongshu'
    | 'weibo'
    | 'ctrip'
    | 'douyin'
    | 'tripadvisor'
    | 'tongcheng'
    | 'mafengwo'
    | 'qunar'
    | 'qyer'
    | string;

export interface TravelGuideContentDto {
  content: string;
  content_html?: string | null;
  content_markdown?: string | null;
}

export interface TravelGuideAiDayDto {
  day_number?: number;
  dayNumber?: number;
  theme?: string;
  pois?: Array<Record<string, unknown>>;
}

export interface TravelGuideGeocodingMetricsDto {
  total_pois: number;
  average_confidence: number;
  low_confidence_count: number;
}

export interface TravelGuideResponseDto extends TravelGuideContentDto {
  id: string;
  _id?: string;
  title: string;
  summary?: string | null;
  source_platform: TravelGuidePlatform;
  source_external_id?: string | null;
  source_url?: string | null;
  author_name?: string | null;
  author_id?: string | null;
  cover_image_url?: string | null;
  image_urls: string[];
  quality_score: number;
  views_count: number;
  likes_count: number;
  saves_count: number;
  comments_count: number;
  destinations: string[];
  tags: string[];
  published_at?: string | null;
  crawled_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  ai_summary?: string | null;
  ai_tips?: string[] | null;
  ai_best_time?: string | null;
  ai_duration?: string | null;
  ai_budget?: string | null;
  ai_days?: TravelGuideAiDayDto[] | null;
  ai_processed_at?: string | null;
  ai_version?: string | null;
  ai_model?: string | null;
  geocoding_metrics?: TravelGuideGeocodingMetricsDto | null;
}
