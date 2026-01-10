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
 * Tightened to reduce false positives
 */
const THRESHOLDS = {
  NAME_SIMILARITY: 0.85, // Minimum name similarity (0-1) - increased from 0.8
  DISTANCE_METERS: 50, // Maximum distance in meters - reduced from 100
  COMBINED_SCORE: 0.8, // Minimum combined similarity score - increased from 0.75
  CHAIN_DISTANCE_METERS: 20, // Stricter distance for chain stores
  ADDRESS_SIMILARITY: 0.7, // Minimum address similarity for chain stores
};

/**
 * Known chain store brands that require stricter deduplication
 */
const CHAIN_BRANDS = [
  // Coffee & Tea
  '星巴克',
  'Starbucks',
  '瑞幸',
  'Luckin',
  '喜茶',
  '奈雪',
  'COCO',
  '一点点',
  '蜜雪冰城',
  '茶百道',
  '古茗',
  '书亦烧仙草',
  // Fast Food
  '肯德基',
  'KFC',
  '麦当劳',
  "McDonald's",
  '汉堡王',
  'Burger King',
  '必胜客',
  'Pizza Hut',
  '德克士',
  '华莱士',
  '正新鸡排',
  '绝味鸭脖',
  '周黑鸭',
  // Convenience Stores
  '全家',
  'FamilyMart',
  '7-11',
  '7-Eleven',
  '罗森',
  'Lawson',
  '便利蜂',
  '美宜佳',
  // Banks
  '中国银行',
  '工商银行',
  '建设银行',
  '农业银行',
  '招商银行',
  '交通银行',
  // Hotels
  '如家',
  '汉庭',
  '7天',
  '锦江之星',
  '全季',
  '亚朵',
  // Supermarkets
  '永辉',
  '盒马',
  '大润发',
  '沃尔玛',
  'Walmart',
  '家乐福',
  'Carrefour',
  // Pharmacies
  '大参林',
  '老百姓',
  '益丰',
  '一心堂',
];

/**
 * Check if a POI name belongs to a chain store
 */
export function isChainStore(name: string): boolean {
  if (!name) return false;
  const normalizedName = name.toLowerCase();
  return CHAIN_BRANDS.some(
    (brand) =>
      normalizedName.includes(brand.toLowerCase()) ||
      brand.toLowerCase().includes(normalizedName)
  );
}

/**
 * Extract branch identifier from name or address
 * e.g., "星巴克(西湖店)" -> "西湖店"
 * e.g., "肯德基武林门店" -> "武林门店"
 */
export function extractBranchIdentifier(
  name: string,
  address?: string
): string | null {
  if (!name && !address) return null;

  const patterns = [
    /[（(]([^）)]+店)[）)]/u, // (XX店)
    /[（(]([^）)]+路)[）)]/u, // (XX路)
    /[（(]([^）)]+站)[）)]/u, // (XX站)
    /[（(]([^）)]+广场)[）)]/u, // (XX广场)
    /[（(]([^）)]+中心)[）)]/u, // (XX中心)
    /[（(]([^）)]+店铺)[）)]/u, // (XX店铺)
    /(\S{2,}分店)$/u, // XX分店
    /(\S{2,}门店)$/u, // XX门店
    /(\S{2,}旗舰店)$/u, // XX旗舰店
  ];

  for (const pattern of patterns) {
    const nameMatch = name?.match(pattern);
    if (nameMatch) return nameMatch[1];

    const addrMatch = address?.match(pattern);
    if (addrMatch) return addrMatch[1];
  }

  return null;
}

/**
 * Extract street number from address
 * e.g., "西湖区文三路123号" -> "123号"
 */
function extractStreetNumber(address: string): string | null {
  if (!address) return null;

  const patterns = [
    /(\d+号)/u, // 123号
    /(\d+-\d+号)/u, // 123-125号
    /(\d+弄)/u, // 123弄
    /(\d+栋)/u, // 123栋
    /(\d+幢)/u, // 123幢
    /(\d+楼)/u, // 123楼
    /(\d+层)/u, // 123层
    /(\d+[A-Z])/u, // 123A
  ];

  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Calculate address similarity score (0-1)
 * Considers street numbers, building names, and floor info
 */
export function calculateAddressSimilarity(
  addr1: string | undefined,
  addr2: string | undefined
): number {
  if (!addr1 || !addr2) return 0.5; // Unknown, neutral score

  const normalized1 = normalizeAddress(addr1);
  const normalized2 = normalizeAddress(addr2);

  if (normalized1 === normalized2) return 1;

  // Extract and compare street numbers
  const num1 = extractStreetNumber(addr1);
  const num2 = extractStreetNumber(addr2);

  // If both have street numbers and they differ, low similarity
  if (num1 && num2 && num1 !== num2) {
    return 0.2;
  }

  // Calculate text similarity
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);

  if (maxLength === 0) return 1;

  return 1 - distance / maxLength;
}

/**
 * Normalize address for comparison
 */
function normalizeAddress(address: string): string {
  if (!address) return '';
  return address
    .replace(/[省市区县镇乡村]/g, '') // Remove administrative units
    .replace(/[（）()【】[\]]/g, '') // Remove brackets
    .replace(/\s+/g, '') // Remove spaces
    .toLowerCase()
    .trim();
}

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
  // Handle null/undefined names
  if (!name1 || !name2) return 0;

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
  if (name == null) return ''; // Handle null and undefined
  return String(name) // Safely convert to string
    .toLowerCase()
    .replace(/[（）()【】[\]《》<>]/g, ' ') // Replace brackets with spaces
    .replace(/[・·]/g, '') // Remove center dots
    .replace(/\s+/g, '') // Remove all spaces
    .trim();
}

/**
 * Calculate overall similarity score between two POIs
 * Enhanced with chain store detection and address comparison
 */
export function calculateSimilarity(
  poi1: NormalizedPOI,
  poi2: NormalizedPOI
): number {
  // Name similarity (weight: 0.4)
  const nameSim = calculateNameSimilarity(poi1.name, poi2.name);

  // Location similarity (weight: 0.3)
  const distance = calculateDistance(
    { latitude: poi1.location_lat, longitude: poi1.location_lng },
    { latitude: poi2.location_lat, longitude: poi2.location_lng }
  );

  // Use stricter distance threshold for chain stores
  const isChain = isChainStore(poi1.name) || isChainStore(poi2.name);
  const maxDistance = isChain
    ? THRESHOLDS.CHAIN_DISTANCE_METERS
    : THRESHOLDS.DISTANCE_METERS;
  const locSim = locationSimilarity(distance, maxDistance);

  // Category match (weight: 0.1)
  const categorySim = poi1.category === poi2.category ? 1 : 0;

  // Address similarity (weight: 0.2) - especially important for chain stores
  const addr1 = poi1.location?.address || (poi1 as any).address;
  const addr2 = poi2.location?.address || (poi2 as any).address;
  const addrSim = calculateAddressSimilarity(addr1, addr2);

  // For chain stores, also check branch identifiers
  if (isChain) {
    const branch1 = extractBranchIdentifier(poi1.name, addr1);
    const branch2 = extractBranchIdentifier(poi2.name, addr2);

    // If both have branch identifiers and they differ, not duplicates
    if (branch1 && branch2 && branch1 !== branch2) {
      return 0; // Definitely different stores
    }

    // Chain stores need higher address similarity
    if (addrSim < THRESHOLDS.ADDRESS_SIMILARITY) {
      return nameSim * 0.3; // Low score if addresses don't match
    }
  }

  return nameSim * 0.4 + locSim * 0.3 + categorySim * 0.1 + addrSim * 0.2;
}

/**
 * Find potential duplicates for a POI
 * Enhanced with chain store detection and cross-platform options
 */
export async function findPotentialDuplicates(
  poi: NormalizedPOI,
  options: {
    searchRadius?: number;
    samePlatformOnly?: boolean;
    crossPlatformOnly?: boolean;
  } = {}
): Promise<Array<{ poi: NormalizedPOI; similarity: number }>> {
  const {
    searchRadius = THRESHOLDS.DISTANCE_METERS,
    samePlatformOnly = false,
    crossPlatformOnly = false,
  } = options;

  // Use stricter radius for chain stores
  const isChain = isChainStore(poi.name);
  const effectiveRadius = isChain
    ? Math.min(searchRadius, THRESHOLDS.CHAIN_DISTANCE_METERS)
    : searchRadius;

  // Query nearby POIs using PostGIS
  const query = supabase
    .from(TABLES.NORMALIZED_POIS)
    .select('*')
    .neq('id', poi.id)
    .eq('is_duplicate', false)
    .eq('category', poi.category) // Same category
    .gte('location_lat', poi.location_lat - 0.01) // Rough bounding box
    .lte('location_lat', poi.location_lat + 0.01)
    .gte('location_lng', poi.location_lng - 0.01)
    .lte('location_lng', poi.location_lng + 0.01);

  const { data: nearby, error } = await query;

  if (error) {
    throw new Error(`Failed to find nearby POIs: ${error.message}`);
  }

  if (!nearby || nearby.length === 0) {
    return [];
  }

  // Get POI's platform for filtering
  const poiPlatform = poi.sources?.[0]?.platform;

  // Calculate similarity for each nearby POI
  const candidates: Array<{ poi: NormalizedPOI; similarity: number }> = [];

  for (const candidate of nearby as NormalizedPOI[]) {
    const candidatePlatform = candidate.sources?.[0]?.platform;

    // Apply platform filters
    if (samePlatformOnly && poiPlatform !== candidatePlatform) continue;
    if (crossPlatformOnly && poiPlatform === candidatePlatform) continue;

    // Calculate distance first (fast filter)
    const distance = calculateDistance(
      { latitude: poi.location_lat, longitude: poi.location_lng },
      { latitude: candidate.location_lat, longitude: candidate.location_lng }
    );

    if (distance > effectiveRadius) continue;

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
  const now = new Date();

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

  // Safe name handling
  const primaryName = primary.name || '';
  const duplicateName = duplicate.name || '';

  // Select best values (prefer non-null, more complete)
  const merged = {
    // Keep primary ID
    id: primary.id,

    // Prefer longer name (usually more complete)
    name:
      primaryName.length >= duplicateName.length ? primaryName : duplicateName,
    name_en: primary.name_en || duplicate.name_en,

    // Merge aliases
    name_aliases: [
      ...(primary.name_aliases || []),
      ...(duplicate.name_aliases || []),
      // Add other name as alias if different
      ...(primaryName !== duplicateName && duplicateName
        ? [duplicateName]
        : []),
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
    location: {
      latitude: primary.location_lat,
      longitude: primary.location_lng,
      address: primary.location?.address || duplicate.location?.address,
      city: primary.location?.city || duplicate.location?.city,
      district: primary.location?.district || duplicate.location?.district,
      country: primary.location?.country || duplicate.location?.country,
    },

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
  const freshnessScore = calculateFreshnessScore(now.toISOString());

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
  return deduplicatePOIWithOptions(poi, {});
}

/**
 * Run deduplication for a specific POI with options
 */
export async function deduplicatePOIWithOptions(
  poi: NormalizedPOI,
  options: {
    samePlatformOnly?: boolean;
    crossPlatformOnly?: boolean;
  }
): Promise<{
  merged: boolean;
  mergedWith?: string;
}> {
  const duplicates = await findPotentialDuplicates(poi, options);

  if (duplicates.length === 0) {
    return { merged: false };
  }

  // Merge with the most similar POI
  const bestMatch = duplicates[0];

  // Determine which one to keep as primary (higher quality score)
  const poiScore = poi.quality_score ?? 0;
  const matchScore = bestMatch.poi.quality_score ?? 0;
  const primaryPoi = poiScore >= matchScore ? poi : bestMatch.poi;
  const duplicatePoi = poiScore >= matchScore ? bestMatch.poi : poi;

  await mergePOIs(primaryPoi, duplicatePoi, 'name_location');

  return {
    merged: true,
    mergedWith: primaryPoi.id === poi.id ? duplicatePoi.id : primaryPoi.id,
  };
}

/**
 * Run batch deduplication
 * Enhanced with same-platform and cross-platform options
 */
export async function runBatchDeduplication(options: {
  category?: string;
  city?: string;
  limit?: number;
  samePlatformOnly?: boolean;
  crossPlatformOnly?: boolean;
}): Promise<{
  processed: number;
  merged: number;
}> {
  const {
    category,
    city,
    limit = 1000,
    samePlatformOnly = false,
    crossPlatformOnly = false,
  } = options;

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
    try {
      // Skip if already marked as duplicate in this batch
      const { data: current } = await supabase
        .from(TABLES.NORMALIZED_POIS)
        .select('is_duplicate')
        .eq('id', poi.id)
        .single();

      if (current?.is_duplicate) continue;

      const result = await deduplicatePOIWithOptions(poi, {
        samePlatformOnly,
        crossPlatformOnly,
      });
      processed++;
      if (result.merged) {
        merged++;
      }
    } catch (poiError) {
      console.error(
        `Error deduplicating POI ${poi.id} (${poi.name}):`,
        poiError
      );
      // Continue with other POIs
    }
  }

  return { processed, merged };
}
