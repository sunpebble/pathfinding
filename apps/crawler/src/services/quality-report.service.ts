/**
 * Quality Report Service
 * Generates and manages data quality reports
 */

import type {
  DataQualityReport,
  NormalizedPOI,
} from '@pathfinding/crawler-types';
import { TABLES } from '../lib/convex.js';

export interface QualityMetrics {
  completeness: {
    overall: number;
    byField: Record<string, number>;
  };
  freshness: {
    overall: number;
    avgAge: number; // days
    staleCount: number;
  };
  accuracy: {
    duplicateRate: number;
    failedParseRate: number;
  };
  coverage: {
    byCategory: Record<string, number>;
    byCity: Record<string, number>;
    totalPOIs: number;
  };
}

export interface AnomalyDetection {
  hasAnomaly: boolean;
  anomalies: Array<{
    type: 'spike' | 'drop' | 'threshold';
    metric: string;
    value: number;
    baseline: number;
    deviation: number;
    severity: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Generate a comprehensive quality report
 */
export async function generateQualityReport(options: {
  reportType?: string;
  category?: string;
  city?: string;
  includeAnomalies?: boolean;
}): Promise<DataQualityReport> {
  const {
    reportType = 'scheduled',
    category,
    city,
    includeAnomalies = true,
  } = options;

  const startTime = Date.now();

  // Calculate all quality metrics
  const [
    completenessMetrics,
    freshnessMetrics,
    accuracyMetrics,
    coverageMetrics,
  ] = await Promise.all([
    calculateCompletenessMetrics({ category, city }),
    calculateFreshnessMetrics({ category, city }),
    calculateAccuracyMetrics({ category, city }),
    calculateCoverageMetrics({ category, city }),
  ]);

  // Detect anomalies
  let anomalies: AnomalyDetection | undefined;
  if (includeAnomalies) {
    anomalies = await detectAnomalies({
      completeness: completenessMetrics,
      freshness: freshnessMetrics,
      accuracy: accuracyMetrics,
      coverage: coverageMetrics,
    });
  }

  // Get processing counts
  const { data: rawCounts } = await supabase
    .from(TABLES.RAW_CRAWL_RECORDS)
    .select('parse_status', { count: 'exact' });

  let totalRecords = 0;
  let processedRecords = 0;
  let failedRecords = 0;
  let skippedRecords = 0;

  if (rawCounts) {
    for (const row of rawCounts) {
      totalRecords++;
      if (row.parse_status === 'success') processedRecords++;
      else if (row.parse_status === 'failed') failedRecords++;
      else if (row.parse_status === 'skipped') skippedRecords++;
    }
  }

  // Get duplicate count
  const { count: duplicatesFound } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('*', { count: 'exact', head: true })
    .eq('is_duplicate', true);

  // Build quality metrics object
  const qualityMetrics: Record<string, unknown> = {
    completeness: completenessMetrics,
    freshness: freshnessMetrics,
    accuracy: accuracyMetrics,
    coverage: coverageMetrics,
    processing_time_ms: Date.now() - startTime,
  };

  if (anomalies) {
    qualityMetrics.anomalies = anomalies;
  }

  // Store report
  const { data: report, error } = await supabase
    .from(TABLES.DATA_QUALITY_REPORTS)
    .insert({
      report_type: reportType,
      total_records: totalRecords,
      processed_records: processedRecords,
      failed_records: failedRecords,
      skipped_records: skippedRecords,
      duplicates_found: duplicatesFound || 0,
      quality_metrics: qualityMetrics,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create quality report: ${error.message}`);
  }

  return report as DataQualityReport;
}

/**
 * Calculate completeness metrics
 */
async function calculateCompletenessMetrics(filters: {
  category?: string;
  city?: string;
}): Promise<QualityMetrics['completeness']> {
  let query = supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('*')
    .eq('is_duplicate', false);

  if (filters.category) {
    query = query.eq('category', filters.category);
  }
  if (filters.city) {
    query = query.eq('city', filters.city);
  }

  const { data: pois, error } = await query;

  if (error || !pois || pois.length === 0) {
    return { overall: 0, byField: {} };
  }

  // Fields to check for completeness
  const fieldsToCheck = [
    'name',
    'description',
    'name_en',
    'address',
    'city',
    'phone',
    'website',
    'rating_overall',
    'operating_hours',
    'photo_urls',
    'tags',
  ];

  const byField: Record<string, number> = {};
  let totalScore = 0;

  for (const field of fieldsToCheck) {
    const count = pois.filter((poi: NormalizedPOI) => {
      const value = (poi as Record<string, unknown>)[field];
      if (value === null || value === undefined) return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object') return Object.keys(value).length > 0;
      if (typeof value === 'string') return value.length > 0;
      return true;
    }).length;

    const fieldScore = (count / pois.length) * 100;
    byField[field] = Math.round(fieldScore * 100) / 100;
    totalScore += fieldScore;
  }

  const overall = totalScore / fieldsToCheck.length;

  return {
    overall: Math.round(overall * 100) / 100,
    byField,
  };
}

/**
 * Calculate freshness metrics
 */
async function calculateFreshnessMetrics(filters: {
  category?: string;
  city?: string;
}): Promise<QualityMetrics['freshness']> {
  let query = supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('last_updated_at')
    .eq('is_duplicate', false);

  if (filters.category) {
    query = query.eq('category', filters.category);
  }
  if (filters.city) {
    query = query.eq('city', filters.city);
  }

  const { data: pois, error } = await query;

  if (error || !pois || pois.length === 0) {
    return { overall: 0, avgAge: 0, staleCount: 0 };
  }

  const now = Date.now();
  const STALE_THRESHOLD_DAYS = 30;

  let totalAge = 0;
  let staleCount = 0;
  let freshCount = 0;

  for (const poi of pois) {
    const updatedAt = new Date(poi.last_updated_at).getTime();
    const ageDays = (now - updatedAt) / (1000 * 60 * 60 * 24);
    totalAge += ageDays;

    if (ageDays > STALE_THRESHOLD_DAYS) {
      staleCount++;
    } else {
      freshCount++;
    }
  }

  const avgAge = totalAge / pois.length;
  const overall = (freshCount / pois.length) * 100;

  return {
    overall: Math.round(overall * 100) / 100,
    avgAge: Math.round(avgAge * 100) / 100,
    staleCount,
  };
}

/**
 * Calculate accuracy metrics
 */
async function calculateAccuracyMetrics(_filters: {
  category?: string;
  city?: string;
}): Promise<QualityMetrics['accuracy']> {
  // Get duplicate rate
  const { count: totalPois } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('*', { count: 'exact', head: true });

  const { count: duplicatePois } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('*', { count: 'exact', head: true })
    .eq('is_duplicate', true);

  const duplicateRate =
    totalPois && totalPois > 0 ? ((duplicatePois || 0) / totalPois) * 100 : 0;

  // Get failed parse rate
  const { count: totalRecords } = await supabase
    .from(TABLES.RAW_CRAWL_RECORDS)
    .select('*', { count: 'exact', head: true });

  const { count: failedRecords } = await supabase
    .from(TABLES.RAW_CRAWL_RECORDS)
    .select('*', { count: 'exact', head: true })
    .eq('parse_status', 'failed');

  const failedParseRate =
    totalRecords && totalRecords > 0
      ? ((failedRecords || 0) / totalRecords) * 100
      : 0;

  return {
    duplicateRate: Math.round(duplicateRate * 100) / 100,
    failedParseRate: Math.round(failedParseRate * 100) / 100,
  };
}

/**
 * Calculate coverage metrics
 */
async function calculateCoverageMetrics(_filters: {
  category?: string;
  city?: string;
}): Promise<QualityMetrics['coverage']> {
  // Get category distribution
  const { data: categoryData } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('category')
    .eq('is_duplicate', false);

  const byCategory: Record<string, number> = {};
  if (categoryData) {
    for (const row of categoryData) {
      byCategory[row.category] = (byCategory[row.category] || 0) + 1;
    }
  }

  // Get city distribution
  const { data: cityData } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('city')
    .eq('is_duplicate', false)
    .not('city', 'is', null);

  const byCity: Record<string, number> = {};
  if (cityData) {
    for (const row of cityData) {
      if (row.city) {
        byCity[row.city] = (byCity[row.city] || 0) + 1;
      }
    }
  }

  // Get total POIs
  const { count: totalPOIs } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('*', { count: 'exact', head: true })
    .eq('is_duplicate', false);

  return {
    byCategory,
    byCity,
    totalPOIs: totalPOIs || 0,
  };
}

/**
 * Detect anomalies in quality metrics
 */
async function detectAnomalies(
  currentMetrics: QualityMetrics
): Promise<AnomalyDetection> {
  // Get recent reports for baseline comparison
  const { data: recentReports } = await supabase
    .from(TABLES.DATA_QUALITY_REPORTS)
    .select('quality_metrics')
    .order('created_at', { ascending: false })
    .limit(7);

  if (!recentReports || recentReports.length < 2) {
    return { hasAnomaly: false, anomalies: [] };
  }

  const anomalies: AnomalyDetection['anomalies'] = [];

  // Calculate baseline from recent reports
  const completenessBaseline = calculateBaseline(
    recentReports.map(
      (r: { quality_metrics: unknown }) =>
        (r.quality_metrics as Record<string, Record<string, number>>)
          ?.completeness?.overall || 0
    )
  );

  const freshnessBaseline = calculateBaseline(
    recentReports.map(
      (r: { quality_metrics: unknown }) =>
        (r.quality_metrics as Record<string, Record<string, number>>)?.freshness
          ?.overall || 0
    )
  );

  // Check completeness anomaly
  const completenessDeviation =
    Math.abs(currentMetrics.completeness.overall - completenessBaseline.mean) /
    (completenessBaseline.stdDev || 1);

  if (completenessDeviation > 2) {
    anomalies.push({
      type:
        currentMetrics.completeness.overall < completenessBaseline.mean
          ? 'drop'
          : 'spike',
      metric: 'completeness',
      value: currentMetrics.completeness.overall,
      baseline: completenessBaseline.mean,
      deviation: completenessDeviation,
      severity:
        completenessDeviation > 3
          ? 'high'
          : completenessDeviation > 2.5
            ? 'medium'
            : 'low',
    });
  }

  // Check freshness anomaly
  const freshnessDeviation =
    Math.abs(currentMetrics.freshness.overall - freshnessBaseline.mean) /
    (freshnessBaseline.stdDev || 1);

  if (freshnessDeviation > 2) {
    anomalies.push({
      type:
        currentMetrics.freshness.overall < freshnessBaseline.mean
          ? 'drop'
          : 'spike',
      metric: 'freshness',
      value: currentMetrics.freshness.overall,
      baseline: freshnessBaseline.mean,
      deviation: freshnessDeviation,
      severity:
        freshnessDeviation > 3
          ? 'high'
          : freshnessDeviation > 2.5
            ? 'medium'
            : 'low',
    });
  }

  // Check failure rate threshold
  if (currentMetrics.accuracy.failedParseRate > 10) {
    anomalies.push({
      type: 'threshold',
      metric: 'failedParseRate',
      value: currentMetrics.accuracy.failedParseRate,
      baseline: 10,
      deviation: currentMetrics.accuracy.failedParseRate / 10,
      severity:
        currentMetrics.accuracy.failedParseRate > 25 ? 'high' : 'medium',
    });
  }

  return {
    hasAnomaly: anomalies.length > 0,
    anomalies,
  };
}

/**
 * Calculate baseline statistics
 */
function calculateBaseline(values: number[]): { mean: number; stdDev: number } {
  if (values.length === 0) return { mean: 0, stdDev: 0 };

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  const avgSquaredDiff =
    squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  return { mean, stdDev };
}

/**
 * List quality reports
 */
export async function listQualityReports(options: {
  page?: number;
  limit?: number;
  reportType?: string;
}): Promise<{ reports: DataQualityReport[]; total: number }> {
  const { page = 1, limit = 20, reportType } = options;
  const offset = (page - 1) * limit;

  let query = supabase
    .from(TABLES.DATA_QUALITY_REPORTS)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (reportType) {
    query = query.eq('report_type', reportType);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list reports: ${error.message}`);
  }

  return {
    reports: data as DataQualityReport[],
    total: count || 0,
  };
}

/**
 * Get quality report by ID
 */
export async function getQualityReportById(
  id: string
): Promise<DataQualityReport | null> {
  const { data, error } = await supabase
    .from(TABLES.DATA_QUALITY_REPORTS)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get report: ${error.message}`);
  }

  return data as DataQualityReport;
}

/**
 * Get latest quality report
 */
export async function getLatestQualityReport(): Promise<DataQualityReport | null> {
  const { data, error } = await supabase
    .from(TABLES.DATA_QUALITY_REPORTS)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get latest report: ${error.message}`);
  }

  return data as DataQualityReport;
}
