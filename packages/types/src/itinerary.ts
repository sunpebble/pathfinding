import type { ItineraryItem } from './itinerary-item';

/**
 * Itinerary visibility enum (Convex: 'private' | 'public')
 */
export type ItineraryVisibility = 'private' | 'public';

/**
 * ItineraryDay entity - single day within an itinerary
 */
export interface ItineraryDay {
  id: string;
  itineraryId: string;
  dayNumber: number;
  date: string; // ISO date string YYYY-MM-DD
  // Populated relation
  items?: ItineraryItem[];
}

/**
 * Itinerary entity - core travel plan
 */
export interface Itinerary {
  id: string;
  userId: string;
  title: string;
  cityId: string;
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string;
  visibility: ItineraryVisibility;
  coverImageUrl?: string;
  sourceItineraryId?: string;
  copyCount?: number;
  // Convex provides _creationTime as timestamp
  createdAt?: number;
  // Populated relations
  days?: ItineraryDay[];
  cityName?: string;
}

/**
 * Itinerary input for creating a new itinerary
 */
export interface CreateItineraryInput {
  title: string;
  cityId: string;
  startDate: string;
  endDate: string;
  visibility?: ItineraryVisibility;
  coverImageUrl?: string;
}

/**
 * Itinerary update input for partial updates
 */
export interface UpdateItineraryInput {
  title?: string;
  cityId?: string;
  startDate?: string;
  endDate?: string;
  visibility?: ItineraryVisibility;
  coverImageUrl?: string;
}

/**
 * Itinerary list filters
 */
export interface ItineraryFilters {
  userId?: string;
  cityId?: string;
  visibility?: ItineraryVisibility;
  startDateFrom?: string;
  startDateTo?: string;
}

/**
 * Itinerary with computed fields for display (matches Convex list response)
 */
export interface ItineraryWithStats extends Itinerary {
  dayCount: number;
  itemCount: number;
}
