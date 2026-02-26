/**
 * Travel guide from REST API (uses snake_case)
 */
export interface GuideWithAI {
  _id: string;
  id?: string; // Duplicate ID field for compatibility
  title: string;
  content?: string;
  content_html?: string;
  source_platform: string;
  source_url?: string;
  source_external_id?: string;
  author_name?: string;
  published_at?: string;
  crawled_at?: string;
  updated_at?: string;
  likes_count: number;
  views_count: number;
  comments_count: number;
  saves_count: number;
  image_urls?: string[];
  cover_image_url?: string;
  quality_score: number;
  destinations?: string[];
  tags?: string[];
  // AI enriched fields
  aiSummary?: string;
  ai_summary?: string; // Duplicate for snake_case compatibility
  aiTips?: string[];
  ai_tips?: string[]; // Duplicate for snake_case compatibility
  aiBestTime?: string;
  ai_best_time?: string; // Duplicate for snake_case compatibility
  aiDuration?: string;
  ai_duration?: string; // Duplicate for snake_case compatibility
  aiBudget?: string;
  ai_budget?: string; // Duplicate for snake_case compatibility
  aiDays?: AiDay[];
  ai_days?: AiDay[]; // Duplicate for snake_case compatibility
  aiProcessedAt?: number;
  geocoding_metrics?: {
    total_pois: number;
    average_confidence: number;
    low_confidence_count: number;
  };
}

export interface AiDay {
  dayNumber: number;
  theme?: string;
  pois: AiPoi[];
}

export interface AiPoi {
  name: string;
  type: "attraction" | "restaurant" | "hotel" | "transportation";
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  geocodeConfidence?: number;
  geocodeSource?: string;
  isManuallyVerified?: boolean;
  verifiedAt?: number;
  verifiedBy?: string;
}

/**
 * Day with items for itinerary editor
 */
export interface DayWithItems {
  _id: string;
  dayNumber: number;
  date: string;
  items: ItineraryItem[];
}

export interface ItineraryItem {
  _id: string;
  poiId: string;
  orderIndex: number;
  startTime?: string;
  endTime?: string;
  transportMode?: "walking" | "driving" | "transit" | "cycling" | "taxi";
  notes?: string;
  poi: PoiOption | null;
}

export interface PoiOption {
  id: string;
  name: string;
  category: string;
  address?: string;
  rating?: number;
  latitude: number;
  longitude: number;
}
