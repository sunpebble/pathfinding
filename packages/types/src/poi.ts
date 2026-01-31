/**
 * POI category enum - matches Convex category strings
 */
export type PoiCategory
  = | 'attraction'
    | 'restaurant'
    | 'hotel'
    | 'shopping'
    | 'cafe'
    | 'bar'
    | 'museum'
    | 'park'
    | 'entertainment'
    | 'transport'
    | 'other';

/**
 * Business hours by day of week
 */
export interface BusinessHours {
  monday?: { open: string; close: string }[];
  tuesday?: { open: string; close: string }[];
  wednesday?: { open: string; close: string }[];
  thursday?: { open: string; close: string }[];
  friday?: { open: string; close: string }[];
  saturday?: { open: string; close: string }[];
  sunday?: { open: string; close: string }[];
}

/**
 * POI entity - Point of Interest (matches Convex schema)
 */
export interface Poi {
  id: string;
  cityId: string;
  name: string;
  nameEn?: string;
  category: string; // More flexible - Convex stores as string
  subcategory?: string;
  description?: string;
  descriptionEn?: string;
  address?: string;
  latitude: number;
  longitude: number;
  rating?: number;
  priceLevel?: number;
  openingHours?: unknown; // Convex uses v.any()
  phone?: string;
  website?: string;
  imageUrls?: string[];
  externalId?: string;
  externalSource?: string;
}

/**
 * POI input for creating a new POI
 */
export type CreatePoiInput = Omit<Poi, 'id'>;

/**
 * POI update input for partial updates
 */
export type UpdatePoiInput = Partial<Omit<Poi, 'id'>>;

/**
 * POI search filters
 */
export interface PoiSearchFilters {
  cityId: string;
  category?: string;
  query?: string;
  minRating?: number;
  priceLevel?: number;
  nearbyLat?: number;
  nearbyLng?: number;
  radiusKm?: number;
}
