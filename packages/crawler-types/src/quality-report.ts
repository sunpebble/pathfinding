/**
 * Data Quality Report Types
 * Types for data pipeline monitoring and quality reporting
 */

export type ReportType = 'daily' | 'weekly' | 'monthly' | 'on_demand';
export type AnomalySeverity = 'low' | 'medium' | 'high';
export type AnomalyType = 'spike' | 'drop' | 'error' | 'warning';

export interface CompletenessMetrics {
  total_pois: number;
  with_description: number;
  with_photos: number;
  with_ratings: number;
  with_hours: number;
  completeness_rate: number;
}

export interface FreshnessMetrics {
  updated_last_24h: number;
  updated_last_7d: number;
  stale_30d: number;
  freshness_rate: number;
}

export interface AccuracyMetrics {
  duplicates_found: number;
  duplicates_merged: number;
  conflicts_resolved: number;
  accuracy_rate: number;
}

export interface CoverageMetrics {
  cities_covered: number;
  categories_covered: number;
  avg_pois_per_city: number;
}

export interface QualityMetrics {
  completeness: CompletenessMetrics;
  freshness: FreshnessMetrics;
  accuracy: AccuracyMetrics;
  coverage: CoverageMetrics;
}

export interface QualityAnomaly {
  type: AnomalyType;
  description: string;
  severity: AnomalySeverity;
  affected_platform?: string;
  details?: Record<string, unknown>;
}

export interface DataQualityReport {
  id: string;
  report_type: ReportType;
  scope_platform?: string | null;
  scope_city?: string | null;
  period_start: Date;
  period_end: Date;
  metrics: QualityMetrics;
  anomalies: QualityAnomaly[];
  created_at: Date;
}

export interface CreateQualityReportRequest {
  report_type: ReportType;
  scope_platform?: string;
  scope_city?: string;
  period_start: Date | string;
  period_end: Date | string;
}

export interface QualityReportListParams {
  report_type?: ReportType;
  scope_platform?: string;
  scope_city?: string;
  limit?: number;
  offset?: number;
}

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
