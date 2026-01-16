/**
 * Search Types
 * Types for smart search functionality across POIs, itineraries, guides, and users
 */

// Search result types
export type SearchResultType = 'poi' | 'itinerary' | 'guide' | 'user';

// Base search result interface
export interface BaseSearchResult {
  id: string;
  type: SearchResultType;
  score: number; // Relevance score 0-1
  matchedFields: string[]; // Fields that matched the query
}

// POI search result
export interface PoiSearchResult extends BaseSearchResult {
  type: 'poi';
  name: string;
  nameEn?: string;
  category: 'attraction' | 'restaurant' | 'hotel' | 'shopping' | 'other';
  cityId: string;
  cityName?: string;
  address?: string;
  latitude: number;
  longitude: number;
  rating?: number;
  imageUrl?: string;
}

// Itinerary search result
export interface ItinerarySearchResult extends BaseSearchResult {
  type: 'itinerary';
  title: string;
  cityId: string;
  cityName?: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  coverImageUrl?: string;
  visibility: 'private' | 'team' | 'public';
  userId: string;
  userName?: string;
}

// Travel guide search result
export interface GuideSearchResult extends BaseSearchResult {
  type: 'guide';
  title: string;
  authorName?: string;
  summary?: string;
  coverImageUrl?: string;
  sourcePlatform: string;
  destinations: string[];
  tags: string[];
  qualityScore: number;
  likesCount: number;
  viewsCount: number;
}

// User search result
export interface UserSearchResult extends BaseSearchResult {
  type: 'user';
  email: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
}

// Union type for all search results
export type SearchResult =
  | PoiSearchResult
  | ItinerarySearchResult
  | GuideSearchResult
  | UserSearchResult;

// Search request
export interface GlobalSearchRequest {
  query: string;
  types?: SearchResultType[]; // Filter by result types, defaults to all
  cityId?: string; // Filter by city
  page?: number;
  pageSize?: number;
  userId?: string; // For personalized results
}

// Search response
export interface GlobalSearchResponse {
  data: SearchResult[];
  meta: {
    query: string;
    types: SearchResultType[];
    page: number;
    pageSize: number;
    total: number;
    totalByType: Record<SearchResultType, number>;
    timeTakenMs: number;
  };
}

// Search suggestion
export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'popular' | 'suggestion';
  resultType?: SearchResultType;
  iconName?: string;
  metadata?: {
    resultId?: string;
    category?: string;
    cityName?: string;
  };
}

// Search suggestions response
export interface SearchSuggestionsResponse {
  suggestions: SearchSuggestion[];
}

// Search history item
export interface SearchHistoryItem {
  id: string;
  query: string;
  resultType?: SearchResultType;
  resultId?: string;
  searchedAt: number;
}

// Search history response
export interface SearchHistoryResponse {
  history: SearchHistoryItem[];
}

// Popular/trending search
export interface TrendingSearch {
  id: string;
  query: string;
  searchCount: number;
  trend: 'rising' | 'stable' | 'falling';
  category?: string;
}

// Trending searches response
export interface TrendingSearchesResponse {
  trending: TrendingSearch[];
  updatedAt: number;
}

// Voice search request
export interface VoiceSearchRequest {
  audioData?: string; // Base64 encoded audio (for server-side processing)
  transcription?: string; // Pre-transcribed text (from client-side speech recognition)
  locale?: string; // e.g., 'zh-CN', 'en-US'
}

// Voice search response
export interface VoiceSearchResponse {
  transcription: string;
  confidence: number;
  searchResults: GlobalSearchResponse;
}
