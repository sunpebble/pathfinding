/**
 * Normalization Pipeline
 * Orchestrates the complete data normalization workflow
 */

import type {
  DataQualityReport,
  RawCrawlRecord,
} from '@pathfinding/crawler-types';
import { TABLES } from '../lib/convex.js';
import { runBatchDeduplication } from './deduplication.js';
import { batchNormalize } from './normalizer.js';

export interface PipelineResult {
  success: boolean;
  stats: {
    recordsProcessed: number;
    recordsNormalized: number;
    recordsSkipped: number;
    recordsFailed: number;
    duplicatesFound: number;
    duplicatesMerged: number;
    processingTime: number;
  };
  errors: string[];
}

export interface PipelineOptions {
  /**
   * Maximum records to process in one run
   */
  batchSize?: number;

  /**
   * Run deduplication after normalization
   */
  runDeduplication?: boolean;

  /**
   * Filter by platform
   */
  platform?: string;

  /**
   * Filter by city
   */
  city?: string;

  /**
   * Filter by category
   */
  category?: string;

  /**
   * Job ID to process records for
   */
  crawlJobId?: string;
}

/**
 * Run the full normalization pipeline
 */
export async function runNormalizationPipeline(
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const startTime = Date.now();
  const {
    batchSize = 100,
    runDeduplication = true,
    platform,
    city,
    category,
    crawlJobId,
  } = options;

  const errors: string[] = [];
  let recordsProcessed = 0;
  let recordsNormalized = 0;
  let recordsSkipped = 0;
  let recordsFailed = 0;
  let duplicatesFound = 0;
  let duplicatesMerged = 0;

  try {
    // Step 1: Get pending records
    console.warn('Step 1: Fetching pending records...');
    const records = await getPendingRecordsWithFilters({
      batchSize,
      platform,
      crawlJobId,
    });

    console.warn(`Found ${records.length} pending records`);
    recordsProcessed = records.length;

    // Step 2: Normalize records
    if (records.length > 0) {
      console.warn('Step 2: Normalizing records...');
      const normalizeResult = await batchNormalize(records);

      recordsNormalized = normalizeResult.success;
      recordsSkipped = normalizeResult.skipped;
      recordsFailed = normalizeResult.failed;

      console.warn(
        `Normalized: ${recordsNormalized}, Skipped: ${recordsSkipped}, Failed: ${recordsFailed}`
      );
    }

    // Step 3: Run deduplication (staged: same-platform first, then cross-platform)
    if (runDeduplication && recordsNormalized > 0) {
      console.warn('Step 3a: Running same-platform deduplication...');
      const samePlatformResult = await runBatchDeduplication({
        category,
        city,
        limit: batchSize * 2,
        samePlatformOnly: true,
      });

      console.warn(
        `Same-platform dedup: processed ${samePlatformResult.processed}, merged ${samePlatformResult.merged}`
      );

      console.warn('Step 3b: Running cross-platform deduplication...');
      const crossPlatformResult = await runBatchDeduplication({
        category,
        city,
        limit: batchSize * 2,
        crossPlatformOnly: true,
      });

      console.warn(
        `Cross-platform dedup: processed ${crossPlatformResult.processed}, merged ${crossPlatformResult.merged}`
      );

      duplicatesFound =
        samePlatformResult.processed + crossPlatformResult.processed;
      duplicatesMerged = samePlatformResult.merged + crossPlatformResult.merged;

      console.warn(
        `Total deduplication: processed ${duplicatesFound}, merged ${duplicatesMerged}`
      );
    }

    // Step 4: Generate quality report
    console.warn('Step 4: Generating quality report...');
    await generateQualityReport({
      recordsProcessed,
      recordsNormalized,
      recordsSkipped,
      recordsFailed,
      duplicatesMerged,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMessage);
    console.error('Pipeline error:', errorMessage);
  }

  const processingTime = Date.now() - startTime;

  return {
    success: errors.length === 0,
    stats: {
      recordsProcessed,
      recordsNormalized,
      recordsSkipped,
      recordsFailed,
      duplicatesFound,
      duplicatesMerged,
      processingTime,
    },
    errors,
  };
}

/**
 * Get pending records with optional filters
 */
async function getPendingRecordsWithFilters(options: {
  batchSize: number;
  platform?: string;
  crawlJobId?: string;
}): Promise<RawCrawlRecord[]> {
  let query = supabase
    .from(TABLES.RAW_CRAWL_RECORDS)
    .select('*')
    .eq('parse_status', 'pending')
    .order('crawled_at', { ascending: true })
    .limit(options.batchSize);

  if (options.platform) {
    query = query.eq('source_platform', options.platform);
  }

  if (options.crawlJobId) {
    query = query.eq('crawl_job_id', options.crawlJobId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get pending records: ${error.message}`);
  }

  return data as RawCrawlRecord[];
}

/**
 * Generate and store a quality report
 */
async function generateQualityReport(stats: {
  recordsProcessed: number;
  recordsNormalized: number;
  recordsSkipped: number;
  recordsFailed: number;
  duplicatesMerged: number;
}): Promise<DataQualityReport | null> {
  try {
    // Get overall POI stats
    const { count: totalPois } = await supabase
      .from(TABLES.NORMALIZED_POIS)
      .select('*', { count: 'exact', head: true })
      .eq('is_duplicate', false);

    // Get category breakdown
    const { data: categoryStats } = await supabase
      .from(TABLES.NORMALIZED_POIS)
      .select('category')
      .eq('is_duplicate', false);

    const categoryBreakdown: Record<string, number> = {};
    if (categoryStats) {
      for (const row of categoryStats) {
        categoryBreakdown[row.category] =
          (categoryBreakdown[row.category] || 0) + 1;
      }
    }

    // Get average quality score
    const { data: qualityData } = await supabase
      .from(TABLES.NORMALIZED_POIS)
      .select('quality_score, completeness_score')
      .eq('is_duplicate', false);

    let avgQualityScore = 0;
    let avgCompletenessScore = 0;
    if (qualityData && qualityData.length > 0) {
      avgQualityScore =
        qualityData.reduce((sum, row) => sum + (row.quality_score || 0), 0) /
        qualityData.length;
      avgCompletenessScore =
        qualityData.reduce(
          (sum, row) => sum + (row.completeness_score || 0),
          0
        ) / qualityData.length;
    }

    // Calculate quality grades
    const qualityBreakdown = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
    };

    if (qualityData) {
      for (const row of qualityData) {
        const score = row.quality_score || 0;
        if (score >= 80) qualityBreakdown.excellent++;
        else if (score >= 60) qualityBreakdown.good++;
        else if (score >= 40) qualityBreakdown.fair++;
        else qualityBreakdown.poor++;
      }
    }

    // Store report with correct schema
    const now = new Date();
    const report = {
      report_type: 'pipeline_run',
      period_start: new Date(now.getTime() - 3600000).toISOString(), // 1 hour ago
      period_end: now.toISOString(),
      metrics: {
        pipeline: {
          total_records: stats.recordsProcessed,
          processed_records: stats.recordsNormalized,
          failed_records: stats.recordsFailed,
          skipped_records: stats.recordsSkipped,
        },
        accuracy: {
          duplicates_found: stats.duplicatesMerged,
          duplicates_merged: stats.duplicatesMerged,
        },
        completeness: {
          total_pois: totalPois || 0,
          avg_quality_score: Math.round(avgQualityScore * 100) / 100,
          avg_completeness_score: Math.round(avgCompletenessScore * 100) / 100,
          quality_breakdown: qualityBreakdown,
          category_breakdown: categoryBreakdown,
        },
      },
    };

    const { data, error } = await supabase
      .from(TABLES.DATA_QUALITY_REPORTS)
      .insert(report)
      .select()
      .single();

    if (error) {
      console.error('Failed to store quality report:', error.message);
      return null;
    }

    return data as DataQualityReport;
  } catch (error) {
    console.error('Failed to generate quality report:', error);
    return null;
  }
}

/**
 * Process a single crawl job's records
 */
export async function processJobRecords(
  jobId: string
): Promise<PipelineResult> {
  return runNormalizationPipeline({
    crawlJobId: jobId,
    batchSize: 1000,
    runDeduplication: true,
  });
}

/**
 * Get pipeline statistics
 */
export async function getPipelineStats(): Promise<{
  pendingRecords: number;
  normalizedPois: number;
  duplicates: number;
  lastReport: DataQualityReport | null;
}> {
  // Count pending records
  const { count: pendingRecords } = await supabase
    .from(TABLES.RAW_CRAWL_RECORDS)
    .select('*', { count: 'exact', head: true })
    .eq('parse_status', 'pending');

  // Count normalized POIs (non-duplicates)
  const { count: normalizedPois } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('*', { count: 'exact', head: true })
    .eq('is_duplicate', false);

  // Count duplicates
  const { count: duplicates } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('*', { count: 'exact', head: true })
    .eq('is_duplicate', true);

  // Get latest report
  const { data: lastReport } = await supabase
    .from(TABLES.DATA_QUALITY_REPORTS)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return {
    pendingRecords: pendingRecords || 0,
    normalizedPois: normalizedPois || 0,
    duplicates: duplicates || 0,
    lastReport: lastReport as DataQualityReport | null,
  };
}
