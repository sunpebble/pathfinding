/**
 * Data Quality Report Types
 * Types for data pipeline monitoring and quality reporting.
 */

/** Reporting cadence / trigger */
export type ReportType = 'daily' | 'weekly' | 'monthly' | 'on_demand';

/** Severity level for detected anomalies */
export type AnomalySeverity = 'low' | 'medium' | 'high';

/** Classification of detected anomalies */
export type AnomalyType = 'spike' | 'drop' | 'error' | 'warning';

/** Measures how many POIs have key fields populated */
export interface CompletenessMetrics {
  /** Total POIs evaluated */
  total_pois: number;
  /** POIs with a non-empty description */
  with_description: number;
  /** POIs with at least one photo */
  with_photos: number;
  /** POIs with rating data */
  with_ratings: number;
  /** POIs with operating hours */
  with_hours: number;
  /** Overall completeness rate (0–1) */
  completeness_rate: number;
}

/** Measures how recently POI data has been updated */
export interface FreshnessMetrics {
  /** POIs updated in the last 24 hours */
  updated_last_24h: number;
  /** POIs updated in the last 7 days */
  updated_last_7d: number;
  /** POIs not updated in 30+ days */
  stale_30d: number;
  /** Overall freshness rate (0–1) */
  freshness_rate: number;
}

/** Measures data accuracy via deduplication and conflict resolution */
export interface AccuracyMetrics {
  /** Duplicate POI pairs detected */
  duplicates_found: number;
  /** Duplicate pairs that were merged */
  duplicates_merged: number;
  /** Data conflicts that were resolved */
  conflicts_resolved: number;
  /** Overall accuracy rate (0–1) */
  accuracy_rate: number;
}

/** Measures geographic and categorical coverage */
export interface CoverageMetrics {
  /** Number of distinct cities with POI data */
  cities_covered: number;
  /** Number of distinct categories with POI data */
  categories_covered: number;
  /** Average number of POIs per city */
  avg_pois_per_city: number;
}

/** Composite quality metrics across all dimensions */
export interface QualityMetrics {
  completeness: CompletenessMetrics;
  freshness: FreshnessMetrics;
  accuracy: AccuracyMetrics;
  coverage: CoverageMetrics;
}

/** A single detected quality anomaly */
export interface QualityAnomaly {
  /** Anomaly classification */
  type: AnomalyType;
  /** Human-readable description */
  description: string;
  /** Impact severity */
  severity: AnomalySeverity;
  /** Platform affected (if specific to one) */
  affected_platform?: string;
  /** Additional structured details */
  details?: Record<string, unknown>;
}

/** A periodic data quality report */
export interface DataQualityReport {
  id: string;
  report_type: ReportType;
  /** Scoped to a specific platform (null = all platforms) */
  scope_platform?: string | null;
  /** Scoped to a specific city (null = all cities) */
  scope_city?: string | null;
  /** Start of the reporting period */
  period_start: Date;
  /** End of the reporting period */
  period_end: Date;
  /** Computed quality metrics for this period */
  metrics: QualityMetrics;
  /** Detected anomalies during this period */
  anomalies: QualityAnomaly[];
  created_at: Date;
}

/** Request payload for creating a quality report */
export interface CreateQualityReportRequest {
  report_type: ReportType;
  scope_platform?: string;
  scope_city?: string;
  period_start: Date | string;
  period_end: Date | string;
}

/** Query parameters for listing quality reports */
export interface QualityReportListParams {
  report_type?: ReportType;
  scope_platform?: string;
  scope_city?: string;
  limit?: number;
  offset?: number;
}

/** Default zero-state quality metrics */
export const DEFAULT_QUALITY_METRICS: QualityMetrics = {
  completeness: {
    total_pois: 0,
    with_description: 0,
    with_photos: 0,
    with_ratings: 0,
    with_hours: 0,
    completeness_rate: 0,
  },
  freshness: {
    updated_last_24h: 0,
    updated_last_7d: 0,
    stale_30d: 0,
    freshness_rate: 0,
  },
  accuracy: {
    duplicates_found: 0,
    duplicates_merged: 0,
    conflicts_resolved: 0,
    accuracy_rate: 0,
  },
  coverage: {
    cities_covered: 0,
    categories_covered: 0,
    avg_pois_per_city: 0,
  },
};
