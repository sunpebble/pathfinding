/**
 * Convex Client Configuration for Crawler
 * HTTP client for server-side operations
 */

import { api, convex, createConvexClient } from '@pathfinding/convex';
import 'dotenv/config';

// Re-export for use in services
export { api, convex, createConvexClient };

// Types from Convex
export type { Doc, Id } from '@pathfinding/convex';

// Database table names as constants (for backwards compatibility)
export const TABLES = {
  CRAWL_JOBS: 'crawlJobs',
  RAW_CRAWL_RECORDS: 'rawCrawlRecords',
  NORMALIZED_POIS: 'normalizedPois',
  POI_REVIEWS: 'poiReviews',
  POI_SOURCE_MAPPINGS: 'poiSourceMappings',
  TRAINING_DATASETS: 'trainingDatasets',
  DATA_QUALITY_REPORTS: 'dataQualityReports',
  TRAVEL_GUIDES: 'travelGuides',
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];

/**
 * Check database connection
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await convex.query(api.crawlJobs.list, { limit: 1 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Convex client instance
 */
export function getConvexClient() {
  return convex;
}
