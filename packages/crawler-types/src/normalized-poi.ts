/**
 * Normalized POI Types (Silver Layer)
 * Types for unified, deduplicated POI data
 */

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  district?: string;
  country?: string;
  postal_code?: string;
}

export interface RatingInfo {
  overall?: number | null;
  count: number;
  breakdown?: Record<string, number>;
}

export interface DayHours {
  open: string;
  close: string;
}

export interface ClosedDay {
  closed: true;
}

export interface HoursException {
  date: string;
  closed?: boolean;
  hours?: DayHours;
}

export interface OperatingHours {
  monday?: DayHours | ClosedDay;
  tuesday?: DayHours | ClosedDay;
  wednesday?: DayHours | ClosedDay;
  thursday?: DayHours | ClosedDay;
  friday?: DayHours | ClosedDay;
  saturday?: DayHours | ClosedDay;
  sunday?: DayHours | ClosedDay;
  exceptions?: HoursException[];
}

export interface SourceAttribution {
  platform: string;
  external_id: string;
  url?: string;
  confidence: number;
  last_crawled: Date | string;
}

export interface NormalizedPOI {
  id: string;
  canonical_id?: string | null;
  name: string;
  name_en?: string | null;
  name_aliases?: string[] | null;
  description?: string | null;
  category: string;
  subcategory?: string | null;
  tags?: string[] | null;
  location: Location;
  location_lat: number;
  location_lng: number;
  ratings: RatingInfo;
  rating_overall?: number | null;
  rating_count: number;
  rating_breakdown?: Record<string, number> | null;
  operating_hours?: OperatingHours | null;
  price_range?: string | null;
  price_avg?: number | null;
  phone?: string | null;
  website?: string | null;
  photos_count: number;
  photo_urls?: string[] | null;
  quality_score: number;
  completeness_score: number;
  freshness_score: number;
  sources: SourceAttribution[];
  is_duplicate: boolean;
  merge_confidence?: number | null;
  first_seen_at: Date;
  last_updated_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateNormalizedPOIRequest {
  name: string;
  name_en?: string;
  name_aliases?: string[];
  description?: string;
  category: string;
  subcategory?: string;
  tags?: string[];
  location: Location;
  ratings?: Partial<RatingInfo>;
  operating_hours?: OperatingHours;
  price_range?: string;
  price_avg?: number;
  phone?: string;
  website?: string;
  photo_urls?: string[];
  sources: SourceAttribution[];
}

export interface POISearchParams {
  query?: string;
  category?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radius?: number; // in meters
  min_rating?: number;
  min_quality_score?: number;
  limit?: number;
  offset?: number;
}

export interface POIWithDistance extends NormalizedPOI {
  distance_meters?: number;
}
