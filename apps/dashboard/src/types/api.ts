/**
 * Shared API types for the dashboard.
 *
 * These types represent the canonical shapes used across the
 * dashboard app — both for data coming from the REST API
 * (typically snake_case) and for internal UI state.
 *
 * @module
 */

import type {
  TravelGuideAiDayDto,
  TravelGuideResponseDto,
} from '@pathfinding/types';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** Authenticated user profile. */
export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  created_at?: string;
}

/** Credentials for signing in. */
export interface SignInInput {
  email: string;
  password: string;
}

/** Credentials for signing up (extends sign-in with optional name). */
export interface SignUpInput extends SignInInput {
  name?: string;
}

/** Response from sign-in / sign-up endpoints. */
export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
}

/** Shape of the auth context provided by `<AuthProvider>`. */
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

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/** Standard paginated list response envelope. */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// ---------------------------------------------------------------------------
// POIs
// ---------------------------------------------------------------------------

/** A point of interest (lightweight shape for list views). */
export interface Poi {
  id: string;
  name: string;
  category?: string;
  address?: string | null;
  latitude?: number;
  longitude?: number;
}

// ---------------------------------------------------------------------------
// Itineraries (raw API shapes — snake_case)
// ---------------------------------------------------------------------------

/** A single item within an itinerary day (raw API shape). */
export interface ItineraryItemDto {
  id: string;
  day_id?: string;
  poi_id?: string | null;
  order_index?: number;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
}

/** A single day within an itinerary (raw API shape). */
export interface ItineraryDayDto {
  id: string;
  day_number: number;
  date?: string | null;
  items: ItineraryItemDto[];
}

/** An itinerary record (raw API shape). */
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

// ---------------------------------------------------------------------------
// Collaborators
// ---------------------------------------------------------------------------

/** User info attached to a collaborator record. */
export interface CollaboratorUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

/** A collaborator on an itinerary. */
export interface Collaborator {
  id: string;
  itinerary_id: string | number;
  user_id: string | number;
  role: 'owner' | 'viewer' | 'editor';
  user?: CollaboratorUser | null;
}

/** Input for inviting a collaborator to an itinerary. */
export interface InviteCollaboratorInput {
  itineraryId: number;
  userId?: number;
  email?: string;
  role: 'viewer' | 'editor';
}

/** Input for updating a collaborator's role. */
export interface UpdateCollaboratorInput {
  role: 'viewer' | 'editor';
}

// ---------------------------------------------------------------------------
// Travel Guides (with AI enrichment)
// ---------------------------------------------------------------------------

/** Travel guide from REST API with Dashboard camelCase AI aliases. */
export interface GuideWithAI extends TravelGuideResponseDto {
  _id: string;
  aiSummary?: string;
  aiTips?: string[];
  aiBestTime?: string;
  aiDuration?: string;
  aiBudget?: string;
  aiDays?: AiDay[];
  aiProcessedAt?: number;
  ai_days?: AiDay[] | null;
}

/** A single day in an AI-generated itinerary. */
export interface AiDay extends TravelGuideAiDayDto {
  dayNumber: number;
  theme?: string;
  pois: AiPoi[];
}

/** A point of interest within an AI-generated day plan. */
export interface AiPoi {
  [key: string]: unknown;
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

// ---------------------------------------------------------------------------
// Itinerary editor types
// ---------------------------------------------------------------------------

/** Day with items for the itinerary editor UI. */
export interface DayWithItems {
  _id: string;
  dayNumber: number;
  date: string;
  items: ItineraryItem[];
}

/** An itinerary item as used in the editor UI. */
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

/** POI option for selection in the itinerary editor. */
export interface PoiOption {
  id: string;
  name: string;
  category: string;
  address?: string;
  rating?: number;
  latitude: number;
  longitude: number;
}
