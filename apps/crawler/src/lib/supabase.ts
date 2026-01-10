/**
 * Supabase Client Configuration
 * Initialize and export Supabase client for database operations
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Environment validation
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_KEY environment variable');
}

// Create Supabase client with service key for full access
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  }
);

// Database table names as constants
export const TABLES = {
  CRAWL_JOBS: 'crawl_jobs',
  RAW_CRAWL_RECORDS: 'raw_crawl_records',
  NORMALIZED_POIS: 'normalized_pois',
  POI_REVIEWS: 'poi_reviews',
  POI_SOURCE_MAPPINGS: 'poi_source_mappings',
  TRAINING_DATASETS: 'training_datasets',
  DATA_QUALITY_REPORTS: 'data_quality_reports',
  TRAVEL_GUIDES: 'travel_guides',
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];

/**
 * Check database connection
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLES.CRAWL_JOBS)
      .select('id')
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Get Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient {
  return supabase;
}
