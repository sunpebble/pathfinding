import type { ItineraryItem } from './itinerary-item';

/**
 * Itinerary visibility enum
 */
export type ItineraryVisibility = 'private' | 'team' | 'public';

/**
 * ItineraryDay entity - single day within an itinerary
 */
export interface ItineraryDay {
  id: string;
  itineraryId: string;
  dayNumber: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
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
  startDate: Date;
  endDate: Date;
  visibility: ItineraryVisibility;
  coverImageUrl?: string;
  copiedFromId?: string;
  createdAt: Date;
  updatedAt: Date;
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
  startDate: Date | string;
  endDate: Date | string;
  visibility?: ItineraryVisibility;
  coverImageUrl?: string;
}

/**
 * Itinerary update input for partial updates
 */
export interface UpdateItineraryInput {
  title?: string;
  cityId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
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
  startDateFrom?: Date | string;
  startDateTo?: Date | string;
}

/**
 * Itinerary with computed fields for display
 */
export interface ItineraryWithStats extends Itinerary {
  daysCount: number;
  itemsCount: number;
}
