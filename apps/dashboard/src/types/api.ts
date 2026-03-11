export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  created_at?: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput extends SignInInput {
  name?: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
}

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface Poi {
  id: string;
  name: string;
  category?: string;
  address?: string | null;
  latitude?: number;
  longitude?: number;
}

export interface ItineraryItemDto {
  id: string;
  day_id?: string;
  poi_id?: string | null;
  order_index?: number;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
}

export interface ItineraryDayDto {
  id: string;
  day_number: number;
  date?: string | null;
  items: ItineraryItemDto[];
}

export interface Itinerary {
  id: string;
  user_id?: string;
  title?: string;
  name?: string;
  visibility?: string;
  days?: ItineraryDayDto[];
  created_at?: string;
  updated_at?: string;
}

export interface CollaboratorUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

export interface Collaborator {
  id: string;
  itinerary_id: string | number;
  user_id: string | number;
  role: 'owner' | 'viewer' | 'editor';
  user?: CollaboratorUser | null;
}

export interface InviteCollaboratorInput {
  itineraryId: number;
  userId?: number;
  email?: string;
  role: 'viewer' | 'editor';
}

export interface UpdateCollaboratorInput {
  role: 'viewer' | 'editor';
}

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
  // AI enriched fields (camelCase)
  aiSummary?: string;
  aiTips?: string[];
  aiBestTime?: string;
  aiDuration?: string;
  aiBudget?: string;
  aiDays?: AiDay[];
  aiProcessedAt?: number;
  // AI enriched fields (snake_case duplicates for API compatibility)
  ai_summary?: string;
  ai_tips?: string[];
  ai_best_time?: string;
  ai_duration?: string;
  ai_budget?: string;
  ai_days?: AiDay[];
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
  type: 'attraction' | 'restaurant' | 'hotel' | 'transportation';
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
  transportMode?: 'walking' | 'driving' | 'transit' | 'cycling' | 'taxi';
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
