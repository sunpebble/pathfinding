/**
 * Normalized POI Types (Silver Layer)
 * Types for unified, deduplicated POI data merged from multiple source platforms.
 */

/** Geographic location with optional address details */
export interface Location {
  /** Latitude in decimal degrees (WGS 84) */
  latitude: number;
  /** Longitude in decimal degrees (WGS 84) */
  longitude: number;
  /** Full street address */
  address?: string;
  /** City name */
  city?: string;
  /** District / neighborhood */
  district?: string;
  /** Country name or ISO 3166-1 code */
  country?: string;
  /** Postal / ZIP code */
  postal_code?: string;
}

/** Aggregated rating information for a POI */
export interface RatingInfo {
  /** Overall rating score (e.g. 1–5), null if not rated */
  overall?: number | null;
  /** Total number of ratings received */
  count: number;
  /** Per-aspect rating breakdown (e.g. `{ food: 4.2, service: 3.8 }`) */
  breakdown?: Record<string, number>;
}

/** Opening and closing times for a single day */
export interface DayHours {
  /** Opening time in HH:MM format */
  open: string;
  /** Closing time in HH:MM format */
  close: string;
}

/** Marker indicating a closed day */
export interface ClosedDay {
  closed: true;
}

/** Override hours for a specific date (e.g. holidays) */
export interface HoursException {
  /** Date in ISO 8601 format (YYYY-MM-DD) */
  date: string;
  /** Whether the POI is closed on this date */
  closed?: boolean;
  /** Override hours if open */
  hours?: DayHours;
}

/** Weekly operating schedule with optional exceptions */
export interface OperatingHours {
  monday?: DayHours | ClosedDay;
  tuesday?: DayHours | ClosedDay;
  wednesday?: DayHours | ClosedDay;
  thursday?: DayHours | ClosedDay;
  friday?: DayHours | ClosedDay;
  saturday?: DayHours | ClosedDay;
  sunday?: DayHours | ClosedDay;
  /** Date-specific overrides (holidays, special events, etc.) */
  exceptions?: HoursException[];
}

/** Provenance record linking back to a source platform */
export interface SourceAttribution {
  /** Platform identifier (e.g. 'mafengwo', 'amap', 'osm') */
  platform: string;
  /** External ID on the source platform */
  external_id: string;
  /** Direct URL to the source page */
  url?: string;
  /** Confidence of the entity match (0–1) */
  confidence: number;
  /** Timestamp when this source was last crawled */
  last_crawled: Date | string;
}

/**
 * Unified, deduplicated POI record produced by the Silver-layer pipeline.
 * Merges data from multiple source platforms into a single canonical entity.
 */
export interface NormalizedPOI {
  /** Internal unique identifier */
  id: string;
  /** Canonical ID when this POI is merged into another */
  canonical_id?: string | null;
  /** Primary name (Chinese) */
  name: string;
  /** English name */
  name_en?: string | null;
  /** Alternative names / aliases for fuzzy matching */
  name_aliases?: string[] | null;
  /** Free-text description */
  description?: string | null;
  /** Primary category (see POI_CATEGORIES) */
  category: string;
  /** Subcategory within the primary category */
  subcategory?: string | null;
  /** Free-form tags */
  tags?: string[] | null;
  /** Structured location data */
  location: Location;
  /** Denormalized latitude for spatial queries */
  location_lat: number;
  /** Denormalized longitude for spatial queries */
  location_lng: number;
  /** Aggregated rating information */
  ratings: RatingInfo;
  /** Denormalized overall rating for filtering */
  rating_overall?: number | null;
  /** Denormalized rating count for filtering */
  rating_count: number;
  /** Denormalized rating breakdown */
  rating_breakdown?: Record<string, number> | null;
  /** Weekly operating hours */
  operating_hours?: OperatingHours | null;
  /** Human-readable price range (e.g. '¥50-100') */
  price_range?: string | null;
  /** Average price in local currency */
  price_avg?: number | null;
  /** Contact phone number */
  phone?: string | null;
  /** Official website URL */
  website?: string | null;
  /** Total number of photos collected */
  photos_count: number;
  /** Representative photo URLs */
  photo_urls?: string[] | null;
  /** Composite quality score (0–1) */
  quality_score: number;
  /** Data completeness score (0–1) */
  completeness_score: number;
  /** Data freshness score (0–1) */
  freshness_score: number;
  /** All contributing source attributions */
  sources: SourceAttribution[];
  /** Whether this record is flagged as a duplicate */
  is_duplicate: boolean;
  /** Confidence of the duplicate/merge decision (0–1) */
  merge_confidence?: number | null;
  /** When this POI was first discovered */
  first_seen_at: Date;
  /** When any source data was last updated */
  last_updated_at: Date;
  /** Database creation timestamp */
  created_at: Date;
  /** Database update timestamp */
  updated_at: Date;
}

/** Request payload for creating a new normalized POI */
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

/** Parameters for searching and filtering POIs */
export interface POISearchParams {
  /** Full-text search query */
  query?: string;
  /** Filter by primary category */
  category?: string;
  /** Filter by city name */
  city?: string;
  /** Center latitude for radius search */
  lat?: number;
  /** Center longitude for radius search */
  lng?: number;
  /** Search radius in meters */
  radius?: number;
  /** Minimum overall rating */
  min_rating?: number;
  /** Minimum quality score (0–1) */
  min_quality_score?: number;
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/** Normalized POI with computed distance from a search center */
export interface POIWithDistance extends NormalizedPOI {
  /** Distance from the search center in meters */
  distance_meters?: number;
}
