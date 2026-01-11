/**
 * Data Normalizer
 * Transforms raw crawl data into unified NormalizedPOI schema
 */

import type {
  CreateNormalizedPOIRequest,
  NormalizedPOI,
  RawCrawlRecord,
  SourceAttribution,
} from '@pathfinding/crawler-types';

import type { ParserResult } from './parsers/index.js';
import { TABLES } from '../lib/convex.js';
import { getParser } from './parsers/index.js';
import {
  calculateCompletenessScore,
  calculateFreshnessScore,
  calculateQualityScore,
} from './quality-scorer.js';

/**
 * Normalize a raw crawl record into the unified POI schema
 */
export async function normalizeRecord(
  record: RawCrawlRecord
): Promise<NormalizedPOI | null> {
  // Get appropriate parser for the platform
  const parser = getParser(record.source_platform);
  if (!parser) {
    console.warn(`No parser found for platform: ${record.source_platform}`);
    return null;
  }

  // Parse raw content
  let parsed: ParserResult;
  try {
    parsed = await parser.parse(record.raw_content, record.source_url);
  } catch (error) {
    console.error(`Failed to parse record ${record.id}:`, error);

    // Update record with parse error
    await supabase
      .from(TABLES.RAW_CRAWL_RECORDS)
      .update({
        parse_status: 'failed',
        parse_error: error instanceof Error ? error.message : 'Unknown error',
        parsed_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    return null;
  }

  // Skip if no valid data
  if (!parsed.name || !parsed.location) {
    await supabase
      .from(TABLES.RAW_CRAWL_RECORDS)
      .update({
        parse_status: 'skipped',
        parse_error: 'Missing required fields (name or location)',
        parsed_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    return null;
  }

  // Build source attribution
  const sourceAttribution: SourceAttribution = {
    platform: record.source_platform,
    external_id: record.source_external_id || '',
    url: record.source_url,
    confidence: 1.0,
    last_crawled: record.crawled_at,
  };

  // Build normalized POI data
  const poiData: CreateNormalizedPOIRequest = {
    name: parsed.name,
    name_en: parsed.name_en,
    name_aliases: parsed.aliases,
    description: parsed.description,
    category: parsed.category,
    subcategory: parsed.subcategory,
    tags: parsed.tags,
    location: parsed.location,
    ratings: parsed.ratings || { count: 0 },
    operating_hours: parsed.operating_hours,
    price_range: parsed.price_range,
    price_avg: parsed.price_avg,
    phone: parsed.phone,
    website: parsed.website,
    photo_urls: parsed.photo_urls,
    sources: [sourceAttribution],
  };

  // Insert or update normalized POI
  const normalizedPoi = await upsertNormalizedPOI(poiData, record);

  // Update raw record with successful parse
  await supabase
    .from(TABLES.RAW_CRAWL_RECORDS)
    .update({
      parse_status: 'success',
      parsed_at: new Date().toISOString(),
      normalized_poi_id: normalizedPoi.id,
    })
    .eq('id', record.id);

  return normalizedPoi;
}

/**
 * Insert or update a normalized POI
 * If a matching POI exists (by external ID), update it
 * Otherwise, create a new record
 */
async function upsertNormalizedPOI(
  data: CreateNormalizedPOIRequest,
  record: RawCrawlRecord
): Promise<NormalizedPOI> {
  // Check for existing POI by source mapping
  const { data: existingMapping } = await supabase
    .from(TABLES.POI_SOURCE_MAPPINGS)
    .select('poi_id')
    .eq('platform', record.source_platform)
    .eq('external_id', record.source_external_id || '')
    .single();

  const now = new Date().toISOString();

  if (existingMapping) {
    // Update existing POI
    const { data: existingPoi } = await supabase
      .from(TABLES.NORMALIZED_POIS)
      .select('*')
      .eq('id', existingMapping.poi_id)
      .single();

    if (existingPoi) {
      // Merge sources
      const existingSources = existingPoi.sources || [];
      const newSource = data.sources[0];
      const sourceIndex = existingSources.findIndex(
        (s: SourceAttribution) => s.platform === newSource.platform
      );

      if (sourceIndex >= 0) {
        existingSources[sourceIndex] = newSource;
      } else {
        existingSources.push(newSource);
      }

      // Calculate quality scores
      const qualityScore = calculateQualityScore({ ...existingPoi, ...data });
      const completenessScore = calculateCompletenessScore({
        ...existingPoi,
        ...data,
      });
      const freshnessScore = calculateFreshnessScore(now);

      // Update POI
      const { data: updatedPoi, error } = await supabase
        .from(TABLES.NORMALIZED_POIS)
        .update({
          name: data.name,
          name_en: data.name_en || existingPoi.name_en,
          name_aliases: data.name_aliases || existingPoi.name_aliases,
          description: data.description || existingPoi.description,
          category: data.category,
          subcategory: data.subcategory || existingPoi.subcategory,
          tags: data.tags || existingPoi.tags,
          location_lat: data.location.latitude,
          location_lng: data.location.longitude,
          address: data.location.address || existingPoi.address,
          city: data.location.city || existingPoi.city,
          district: data.location.district || existingPoi.district,
          country: data.location.country || existingPoi.country,
          rating_overall: data.ratings?.overall ?? existingPoi.rating_overall,
          rating_count: data.ratings?.count ?? existingPoi.rating_count,
          rating_breakdown:
            data.ratings?.breakdown || existingPoi.rating_breakdown,
          operating_hours: data.operating_hours || existingPoi.operating_hours,
          price_range: data.price_range || existingPoi.price_range,
          price_avg: data.price_avg || existingPoi.price_avg,
          phone: data.phone || existingPoi.phone,
          website: data.website || existingPoi.website,
          photo_urls: data.photo_urls || existingPoi.photo_urls,
          photos_count:
            (data.photo_urls || existingPoi.photo_urls)?.length || 0,
          sources: existingSources,
          quality_score: qualityScore,
          completeness_score: completenessScore,
          freshness_score: freshnessScore,
          last_updated_at: now,
        })
        .eq('id', existingMapping.poi_id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update POI: ${error.message}`);
      }

      // Update source mapping verification time
      await supabase
        .from(TABLES.POI_SOURCE_MAPPINGS)
        .update({
          last_verified_at: now,
          last_crawled_at: now,
        })
        .eq('platform', record.source_platform)
        .eq('external_id', record.source_external_id || '');

      return updatedPoi as NormalizedPOI;
    }
  }

  // Create new POI
  const qualityScore = calculateQualityScore(data);
  const completenessScore = calculateCompletenessScore(data);
  const freshnessScore = calculateFreshnessScore(now);

  const { data: newPoi, error } = await supabase
    .from(TABLES.NORMALIZED_POIS)
    .insert({
      name: data.name,
      name_en: data.name_en,
      name_aliases: data.name_aliases,
      description: data.description,
      category: data.category,
      subcategory: data.subcategory,
      tags: data.tags,
      location_lat: data.location.latitude,
      location_lng: data.location.longitude,
      address: data.location.address,
      city: data.location.city,
      district: data.location.district,
      country: data.location.country,
      rating_overall: data.ratings?.overall,
      rating_count: data.ratings?.count || 0,
      rating_breakdown: data.ratings?.breakdown,
      operating_hours: data.operating_hours,
      price_range: data.price_range,
      price_avg: data.price_avg,
      phone: data.phone,
      website: data.website,
      photo_urls: data.photo_urls,
      photos_count: data.photo_urls?.length || 0,
      sources: data.sources,
      quality_score: qualityScore,
      completeness_score: completenessScore,
      freshness_score: freshnessScore,
      first_seen_at: now,
      last_updated_at: now,
      is_duplicate: false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create POI: ${error.message}`);
  }

  // Create source mapping
  await supabase.from(TABLES.POI_SOURCE_MAPPINGS).insert({
    poi_id: newPoi.id,
    platform: record.source_platform,
    external_id: record.source_external_id || '',
    external_url: record.source_url,
    confidence: 1.0,
    match_method: 'exact_id',
    last_verified_at: now,
    last_crawled_at: now,
  });

  return newPoi as NormalizedPOI;
}

/**
 * Batch normalize multiple records
 */
export async function batchNormalize(records: RawCrawlRecord[]): Promise<{
  success: number;
  failed: number;
  skipped: number;
}> {
  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const record of records) {
    try {
      const result = await normalizeRecord(record);
      if (result) {
        success++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Failed to normalize record ${record.id}:`, error);
      failed++;
    }
  }

  return { success, failed, skipped };
}

/**
 * Get pending records for normalization
 */
export async function getPendingRecords(
  limit: number = 100
): Promise<RawCrawlRecord[]> {
  const { data, error } = await supabase
    .from(TABLES.RAW_CRAWL_RECORDS)
    .select('*')
    .eq('parse_status', 'pending')
    .order('crawled_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get pending records: ${error.message}`);
  }

  return data as RawCrawlRecord[];
}
