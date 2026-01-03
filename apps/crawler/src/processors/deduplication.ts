/**
 * Entity Resolver / Deduplication Engine
 * Identifies and merges duplicate POIs across sources
 */

import type {
  NormalizedPOI,
  SourceAttribution,
} from '@pathfinding/crawler-types';
import { calculateDistance, locationSimilarity } from '../lib/geo.js';
import { supabase, TABLES } from '../lib/supabase.js';
import {
  calculateCompletenessScore,
  calculateFreshnessScore,
  calculateQualityScore,
} from './quality-scorer.js';

/**
 * Similarity thresholds for deduplication
 */
const THRESHOLDS = {
  NAME_SIMILARITY: 0.8, // Minimum name similarity (0-1)
  DISTANCE_METERS: 100, // Maximum distance in meters
  COMBINED_SCORE: 0.75, // Minimum combined similarity score
};

/**
 * Calculate string similarity using Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate name similarity score (0-1)
 * Uses normalized Levenshtein distance
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  // Normalize names
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);

  if (n1 === n2) return 1;

  const distance = levenshteinDistance(n1, n2);
  const maxLength = Math.max(n1.length, n2.length);

  if (maxLength === 0) return 1;

  return 1 - distance / maxLength;
}

/**
 * Normalize name for comparison
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[（）()【】[\]《》<>]/g, ' ') // Replace brackets with spaces
    .replace(/[・·]/g, '') // Remove center dots
    .replace(/\s+/g, '') // Remove all spaces
    .trim();
}

/**
 * Calculate overall similarity score between two POIs
 */
export function calculateSimilarity(
  poi1: NormalizedPOI,
  poi2: NormalizedPOI
): number {
  // Name similarity (weight: 0.5)
  const nameSim = calculateNameSimilarity(poi1.name, poi2.name);

  // Location similarity (weight: 0.4)
  const distance = calculateDistance(
    poi1.location_lat,
    poi1.location_lng,
    poi2.location_lat,
    poi2.location_lng
  );
  const locSim = locationSimilarity(distance);

  // Category match bonus (weight: 0.1)
  const categorySim = poi1.category === poi2.category ? 1 : 0;

  return nameSim * 0.5 + locSim * 0.4 + categorySim * 0.1;
}

/**
 * Find potential duplicates for a POI
 */
export async function findPotentialDuplicates(
  poi: NormalizedPOI,
  searchRadius: number = THRESHOLDS.DISTANCE_METERS
): Promise<Array<{ poi: NormalizedPOI; similarity: number }>> {
  // Query nearby POIs using PostGIS
  const { data: nearby, error } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('*')
    .neq('id', poi.id)
    .eq('is_duplicate', false)
    .eq('category', poi.category) // Same category
    .gte('location_lat', poi.location_lat - 0.01) // Rough bounding box
    .lte('location_lat', poi.location_lat + 0.01)
    .gte('location_lng', poi.location_lng - 0.01)
    .lte('location_lng', poi.location_lng + 0.01);

  if (error) {
    throw new Error(`Failed to find nearby POIs: ${error.message}`);
  }

  if (!nearby || nearby.length === 0) {
    return [];
  }

  // Calculate similarity for each nearby POI
  const candidates: Array<{ poi: NormalizedPOI; similarity: number }> = [];

  for (const candidate of nearby as NormalizedPOI[]) {
    // Calculate distance first (fast filter)
    const distance = calculateDistance(
      poi.location_lat,
      poi.location_lng,
      candidate.location_lat,
      candidate.location_lng
    );

    if (distance > searchRadius) continue;

    // Calculate full similarity
    const similarity = calculateSimilarity(poi, candidate);

    if (similarity >= THRESHOLDS.COMBINED_SCORE) {
      candidates.push({ poi: candidate, similarity });
    }
  }

  // Sort by similarity descending
  candidates.sort((a, b) => b.similarity - a.similarity);

  return candidates;
}

/**
 * Merge two POIs, keeping the best data from each
 */
export async function mergePOIs(
  primary: NormalizedPOI,
  duplicate: NormalizedPOI,
  _matchMethod: string = 'name_location'
): Promise<NormalizedPOI> {
  const now = new Date().toISOString();

  // Merge sources
  const allSources = [...(primary.sources || [])];
  for (const source of duplicate.sources || []) {
    const existing = allSources.find(
      (s: SourceAttribution) => s.platform === source.platform
    );
    if (!existing) {
      allSources.push(source);
    }
  }

  // Select best values (prefer non-null, more complete)
  const merged = {
    // Keep primary ID
    id: primary.id,

    // Prefer longer name (usually more complete)
    name:
      primary.name.length >= duplicate.name.length
        ? primary.name
        : duplicate.name,
    name_en: primary.name_en || duplicate.name_en,

    // Merge aliases
    name_aliases: [
      ...(primary.name_aliases || []),
      ...(duplicate.name_aliases || []),
      // Add other name as alias if different
      ...(primary.name !== duplicate.name ? [duplicate.name] : []),
    ].filter((v, i, a) => a.indexOf(v) === i), // Unique

    // Prefer longer description
    description:
      (primary.description?.length || 0) >= (duplicate.description?.length || 0)
        ? primary.description
        : duplicate.description,

    // Keep primary category (assumed more accurate)
    category: primary.category,
    subcategory: primary.subcategory || duplicate.subcategory,

    // Merge tags
    tags: [...(primary.tags || []), ...(duplicate.tags || [])].filter(
      (v, i, a) => a.indexOf(v) === i
    ),

    // Keep primary location (usually more accurate)
    location_lat: primary.location_lat,
    location_lng: primary.location_lng,
    address: primary.address || duplicate.address,
    city: primary.city || duplicate.city,
    district: primary.district || duplicate.district,
    country: primary.country || duplicate.country,

    // Prefer higher rating with more reviews
    rating_overall:
      (primary.rating_count || 0) >= (duplicate.rating_count || 0)
        ? primary.rating_overall
        : duplicate.rating_overall,
    rating_count: Math.max(
      primary.rating_count || 0,
      duplicate.rating_count || 0
    ),
    rating_breakdown: primary.rating_breakdown || duplicate.rating_breakdown,

    // Prefer more complete operating hours
    operating_hours:
      Object.keys(primary.operating_hours || {}).length >=
      Object.keys(duplicate.operating_hours || {}).length
        ? primary.operating_hours
        : duplicate.operating_hours,

    // Prefer more detailed price info
    price_range: primary.price_range || duplicate.price_range,
    price_avg: primary.price_avg || duplicate.price_avg,

    // Prefer any contact info
    phone: primary.phone || duplicate.phone,
    website: primary.website || duplicate.website,

    // Merge photos
    photo_urls: [
      ...(primary.photo_urls || []),
      ...(duplicate.photo_urls || []),
    ].filter((v, i, a) => a.indexOf(v) === i),

    sources: allSources,
    last_updated_at: now,
  };

  // Calculate new quality scores
  const qualityScore = calculateQualityScore(merged);
  const completenessScore = calculateCompletenessScore(merged);
  const freshnessScore = calculateFreshnessScore(now);

  // Update primary POI
  const { data: updatedPoi, error: updateError } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .update({
      ...merged,
      photos_count: merged.photo_urls?.length || 0,
      quality_score: qualityScore,
      completeness_score: completenessScore,
      freshness_score: freshnessScore,
    })
    .eq('id', primary.id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to update primary POI: ${updateError.message}`);
  }

  // Mark duplicate as merged
  const { error: markError } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .update({
      is_duplicate: true,
      duplicate_of_id: primary.id,
      last_updated_at: now,
    })
    .eq('id', duplicate.id);

  if (markError) {
    throw new Error(`Failed to mark duplicate: ${markError.message}`);
  }

  // Update source mappings to point to primary
  await supabase
    .from(TABLES.POI_SOURCE_MAPPINGS)
    .update({ poi_id: primary.id })
    .eq('poi_id', duplicate.id);

  return updatedPoi as NormalizedPOI;
}

/**
 * Run deduplication for a specific POI
 */
export async function deduplicatePOI(poi: NormalizedPOI): Promise<{
  merged: boolean;
  mergedWith?: string;
}> {
  const duplicates = await findPotentialDuplicates(poi);

  if (duplicates.length === 0) {
    return { merged: false };
  }

  // Merge with the most similar POI
  const bestMatch = duplicates[0];

  // Determine which one to keep as primary (higher quality score)
  const primaryPoi =
    poi.quality_score >= bestMatch.poi.quality_score ? poi : bestMatch.poi;
  const duplicatePoi =
    poi.quality_score >= bestMatch.poi.quality_score ? bestMatch.poi : poi;

  await mergePOIs(primaryPoi, duplicatePoi, 'name_location');

  return {
    merged: true,
    mergedWith: primaryPoi.id === poi.id ? duplicatePoi.id : primaryPoi.id,
  };
}

/**
 * Run batch deduplication
 */
export async function runBatchDeduplication(options: {
  category?: string;
  city?: string;
  limit?: number;
}): Promise<{
  processed: number;
  merged: number;
}> {
  const { category, city, limit = 1000 } = options;

  // Build query
  let query = supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('*')
    .eq('is_duplicate', false)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (category) {
    query = query.eq('category', category);
  }
  if (city) {
    query = query.eq('city', city);
  }

  const { data: pois, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch POIs: ${error.message}`);
  }

  if (!pois || pois.length === 0) {
    return { processed: 0, merged: 0 };
  }

  let processed = 0;
  let merged = 0;

  for (const poi of pois as NormalizedPOI[]) {
    // Skip if already marked as duplicate in this batch
    const { data: current } = await supabase
      .from(TABLES.NORMALIZED_POIS)
      .select('is_duplicate')
      .eq('id', poi.id)
      .single();

    if (current?.is_duplicate) continue;

    const result = await deduplicatePOI(poi);
    processed++;
    if (result.merged) {
      merged++;
    }
  }

  return { processed, merged };
}
