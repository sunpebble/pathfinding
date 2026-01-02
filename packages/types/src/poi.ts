/**
 * POI category enum
 */
export type PoiCategory = "attraction" | "restaurant" | "hotel" | "shopping" | "other";

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
 * POI entity - Point of Interest
 */
export interface Poi {
  id: string;
  externalId?: string;
  name: string;
  nameEn?: string;
  category: PoiCategory;
  cityId: string;
  address?: string;
  latitude: number;
  longitude: number;
  rating?: number;
  ratingCount: number;
  priceLevel?: number;
  businessHours?: BusinessHours;
  phone?: string;
  imageUrls?: string[];
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * POI input for creating a new POI
 */
export type CreatePoiInput = Omit<Poi, "id" | "createdAt" | "updatedAt">;

/**
 * POI update input for partial updates
 */
export type UpdatePoiInput = Partial<Omit<Poi, "id" | "createdAt" | "updatedAt">>;

/**
 * POI search filters
 */
export interface PoiSearchFilters {
  cityId: string;
  category?: PoiCategory;
  query?: string;
  minRating?: number;
  priceLevel?: number;
  nearbyLat?: number;
  nearbyLng?: number;
  radiusKm?: number;
}
