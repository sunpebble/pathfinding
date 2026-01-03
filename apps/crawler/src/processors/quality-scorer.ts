/**
 * Quality Scorer
 * Calculates quality, completeness, and freshness scores for POIs
 */

import type {
  CreateNormalizedPOIRequest,
  NormalizedPOI,
} from '@pathfinding/crawler-types';

/**
 * Field weights for completeness scoring
 */
const FIELD_WEIGHTS: Record<string, number> = {
  name: 10,
  description: 8,
  category: 10,
  subcategory: 5,
  tags: 4,
  location_address: 6,
  location_city: 5,
  rating_overall: 7,
  rating_count: 5,
  operating_hours: 6,
  price_range: 4,
  phone: 3,
  website: 3,
  photo_urls: 8,
  sources_multiple: 6,
};

const TOTAL_WEIGHT = Object.values(FIELD_WEIGHTS).reduce((a, b) => a + b, 0);

/**
 * Calculate overall quality score (0-100)
 * Combines completeness, data quality, and source reliability
 */
export function calculateQualityScore(
  data: Partial<NormalizedPOI> | CreateNormalizedPOIRequest
): number {
  const completeness = calculateCompletenessScore(data);
  const dataQuality = calculateDataQualityScore(data);
  const sourceReliability = calculateSourceReliabilityScore(data);

  // Weighted average of the three scores
  const score =
    completeness * 0.4 + dataQuality * 0.35 + sourceReliability * 0.25;

  return Math.round(score * 100) / 100;
}

/**
 * Calculate completeness score (0-100)
 * Based on how many fields are populated
 */
export function calculateCompletenessScore(
  data: Partial<NormalizedPOI> | CreateNormalizedPOIRequest
): number {
  let score = 0;

  // Name (required)
  if (hasValue(data.name)) {
    score += FIELD_WEIGHTS.name;
  }

  // Description
  if (hasValue(data.description) && data.description!.length > 20) {
    score += FIELD_WEIGHTS.description;
  } else if (hasValue(data.description)) {
    score += FIELD_WEIGHTS.description * 0.5;
  }

  // Category (required)
  if (hasValue(data.category)) {
    score += FIELD_WEIGHTS.category;
  }

  // Subcategory
  if (hasValue(data.subcategory)) {
    score += FIELD_WEIGHTS.subcategory;
  }

  // Tags
  if (data.tags && data.tags.length > 0) {
    score += Math.min(FIELD_WEIGHTS.tags, data.tags.length);
  }

  // Location - Address
  const location = 'location' in data ? data.location : null;
  const address = location?.address || (data as any).address;
  if (hasValue(address)) {
    score += FIELD_WEIGHTS.location_address;
  }

  // Location - City
  const city = location?.city || (data as any).city;
  if (hasValue(city)) {
    score += FIELD_WEIGHTS.location_city;
  }

  // Rating
  const ratings = 'ratings' in data ? data.ratings : null;
  const ratingOverall = ratings?.overall ?? (data as any).rating_overall;
  if (ratingOverall !== undefined && ratingOverall !== null) {
    score += FIELD_WEIGHTS.rating_overall;
  }

  // Rating count
  const ratingCount = ratings?.count ?? (data as any).rating_count;
  if (ratingCount && ratingCount > 0) {
    score += FIELD_WEIGHTS.rating_count;
  }

  // Operating hours
  const operatingHours = data.operating_hours || (data as any).operating_hours;
  if (operatingHours && Object.keys(operatingHours).length > 0) {
    score += FIELD_WEIGHTS.operating_hours;
  }

  // Price range
  if (hasValue(data.price_range)) {
    score += FIELD_WEIGHTS.price_range;
  }

  // Phone
  if (hasValue(data.phone)) {
    score += FIELD_WEIGHTS.phone;
  }

  // Website
  if (hasValue(data.website)) {
    score += FIELD_WEIGHTS.website;
  }

  // Photos
  const photos = data.photo_urls || (data as any).photo_urls;
  if (photos && photos.length > 0) {
    score += Math.min(FIELD_WEIGHTS.photo_urls, photos.length * 2);
  }

  // Multiple sources
  const sources = data.sources || (data as any).sources;
  if (sources && sources.length > 1) {
    score += FIELD_WEIGHTS.sources_multiple;
  }

  return Math.round((score / TOTAL_WEIGHT) * 100);
}

/**
 * Calculate data quality score (0-100)
 * Based on data consistency and validity
 */
function calculateDataQualityScore(
  data: Partial<NormalizedPOI> | CreateNormalizedPOIRequest
): number {
  let score = 100;
  let checks = 0;

  // Check name quality
  if (hasValue(data.name)) {
    checks++;
    if (data.name!.length < 2) {
      score -= 20;
    } else if (data.name!.length > 200) {
      score -= 10;
    }
  }

  // Check coordinates validity
  const location = 'location' in data ? data.location : null;
  const lat = location?.latitude ?? (data as any).location_lat;
  const lng = location?.longitude ?? (data as any).location_lng;

  if (lat !== undefined && lng !== undefined) {
    checks++;
    // Valid China coordinates (roughly)
    if (lat < 18 || lat > 54 || lng < 73 || lng > 135) {
      score -= 30; // Outside China bounds
    }
  }

  // Check rating validity
  const ratings = 'ratings' in data ? data.ratings : null;
  const ratingOverall = ratings?.overall ?? (data as any).rating_overall;
  if (ratingOverall !== undefined && ratingOverall !== null) {
    checks++;
    if (ratingOverall < 0 || ratingOverall > 5) {
      score -= 20;
    }
  }

  // Check phone format
  if (hasValue(data.phone)) {
    checks++;
    const phoneClean = data.phone!.replace(/[\s\-()]/g, '');
    if (!/^\+?\d{7,15}$/.test(phoneClean)) {
      score -= 10;
    }
  }

  // Check website format
  if (hasValue(data.website)) {
    checks++;
    if (
      !data.website!.startsWith('http://') &&
      !data.website!.startsWith('https://')
    ) {
      score -= 10;
    }
  }

  // Ensure minimum checks
  if (checks === 0) {
    return 50; // Default score if no checks could be performed
  }

  return Math.max(0, score);
}

/**
 * Calculate source reliability score (0-100)
 * Based on number and quality of sources
 */
function calculateSourceReliabilityScore(
  data: Partial<NormalizedPOI> | CreateNormalizedPOIRequest
): number {
  const sources = data.sources || (data as any).sources;

  if (!sources || sources.length === 0) {
    return 50; // Default score for single source
  }

  let score = 50; // Base score for having at least one source

  // Bonus for multiple sources
  if (sources.length >= 2) {
    score += 25;
  }
  if (sources.length >= 3) {
    score += 15;
  }

  // Bonus for high confidence sources
  const avgConfidence =
    sources.reduce(
      (sum: number, s: { confidence?: number }) => sum + (s.confidence || 0),
      0
    ) / sources.length;

  score += avgConfidence * 10;

  return Math.min(100, score);
}

/**
 * Calculate freshness score (0-100)
 * Based on how recent the data was updated
 */
export function calculateFreshnessScore(lastUpdated: string): number {
  const now = new Date();
  const updated = new Date(lastUpdated);
  const daysSinceUpdate =
    (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);

  // Full score if updated within last 7 days
  if (daysSinceUpdate <= 7) {
    return 100;
  }

  // Gradual decay
  if (daysSinceUpdate <= 30) {
    return 90;
  }
  if (daysSinceUpdate <= 90) {
    return 75;
  }
  if (daysSinceUpdate <= 180) {
    return 60;
  }
  if (daysSinceUpdate <= 365) {
    return 40;
  }

  // Very old data
  return 20;
}

/**
 * Helper to check if a value is non-empty
 */
function hasValue(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.length > 0;
}
