/**
 * POI Validator
 * Validates and cleans AI-extracted POI data for accuracy
 */

import { createLogger } from '../lib/logger.js';

const log = createLogger('POIValidator');

/**
 * POI data structure from AI extraction
 */
export interface ExtractedPOI {
  name: string;
  type: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
}

/**
 * Validated POI with quality metadata
 */
export interface ValidatedPOI extends ExtractedPOI {
  isValid: boolean;
  validationScore: number;
  validationIssues: string[];
  normalizedName: string;
  normalizedType: string;
}

/**
 * Day structure with POIs
 */
export interface ExtractedDay {
  dayNumber: number;
  theme?: string;
  pois: ExtractedPOI[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  days: Array<{
    dayNumber: number;
    theme?: string;
    pois: ValidatedPOI[];
  }>;
  stats: {
    totalPois: number;
    validPois: number;
    invalidPois: number;
    duplicatesRemoved: number;
    averageScore: number;
  };
}

/**
 * China bounds for coordinate validation
 */
const CHINA_BOUNDS = {
  minLat: 18.0,
  maxLat: 54.0,
  minLng: 73.0,
  maxLng: 135.0,
};

/**
 * POI type normalization mapping
 */
const TYPE_NORMALIZATION: Record<string, string> = {
  // Attractions
  attraction: 'attraction',
  scenic_spot: 'attraction',
  scenic: 'attraction',
  景点: 'attraction',
  景区: 'attraction',
  风景区: 'attraction',
  公园: 'attraction',
  park: 'attraction',

  // Museums & Historic
  museum: 'museum',
  博物馆: 'museum',
  historic: 'historic',
  temple: 'historic',
  寺庙: 'historic',
  古迹: 'historic',

  // Food & Dining
  restaurant: 'restaurant',
  餐厅: 'restaurant',
  餐馆: 'restaurant',
  美食: 'restaurant',
  food: 'restaurant',
  cafe: 'cafe',
  咖啡: 'cafe',
  bar: 'bar',
  酒吧: 'bar',

  // Accommodation
  hotel: 'hotel',
  酒店: 'hotel',
  民宿: 'hotel',
  住宿: 'hotel',
  hostel: 'hotel',

  // Shopping
  shopping: 'shopping',
  商场: 'shopping',
  市场: 'shopping',
  mall: 'shopping',

  // Entertainment
  entertainment: 'entertainment',
  娱乐: 'entertainment',

  // Transport
  transportation: 'transportation',
  交通: 'transportation',
  station: 'transportation',
  airport: 'transportation',

  // Default
  other: 'other',
};

/**
 * Common POI name patterns to clean
 */
const NAME_CLEANUP_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Remove excess whitespace
  { pattern: /\s+/g, replacement: ' ' },
  // Remove special characters
  { pattern: /[【】「」『』]/g, replacement: '' },
  // Remove numbered branches
  { pattern: /\s*[（(]\d+[号店分][）)]/g, replacement: '' },
  // Remove store suffixes
  { pattern: /\s*(总店|分店|旗舰店|专卖店)$/g, replacement: '' },
  // Remove common prefixes
  { pattern: /^(推荐|必去|打卡)\s*/g, replacement: '' },
  // Remove emoji
  { pattern: /[\u{1F300}-\u{1F9FF}]/gu, replacement: '' },
];

/**
 * Normalize POI name for deduplication comparison
 */
export function normalizePoiName(name: string): string {
  let normalized = name.trim();

  for (const { pattern, replacement } of NAME_CLEANUP_PATTERNS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized.trim();
}

/**
 * Normalize POI type
 */
export function normalizePoiType(type: string): string {
  const lower = type.toLowerCase().trim();
  return TYPE_NORMALIZATION[lower] || TYPE_NORMALIZATION[type] || 'other';
}

/**
 * Validate coordinates
 */
export function validateCoordinates(
  lat: number,
  lng: number
): {
  valid: boolean;
  reason?: string;
} {
  // Check for zero coordinates (geocoding failed)
  if (lat === 0 && lng === 0) {
    return { valid: false, reason: 'Zero coordinates (geocoding failed)' };
  }

  // Check for invalid number
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return { valid: false, reason: 'Invalid coordinates (NaN)' };
  }

  // Check basic range
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { valid: false, reason: 'Coordinates out of range' };
  }

  // Check if in China
  if (
    lat < CHINA_BOUNDS.minLat ||
    lat > CHINA_BOUNDS.maxLat ||
    lng < CHINA_BOUNDS.minLng ||
    lng > CHINA_BOUNDS.maxLng
  ) {
    return { valid: false, reason: 'Outside China bounds' };
  }

  return { valid: true };
}

/**
 * Calculate similarity score between two POI names
 * Uses Levenshtein distance normalized by length
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const s1 = name1.toLowerCase();
  const s2 = name2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  // Simple character overlap for Chinese names
  const chars1 = new Set(s1);
  const chars2 = new Set(s2);
  const intersection = [...chars1].filter((c) => chars2.has(c)).length;
  const union = new Set([...chars1, ...chars2]).size;

  return intersection / union;
}

/**
 * Check if two POIs are likely duplicates
 */
export function arePoisDuplicates(
  poi1: ExtractedPOI,
  poi2: ExtractedPOI,
  options?: { nameThreshold?: number; distanceThreshold?: number }
): boolean {
  const nameThreshold = options?.nameThreshold ?? 0.8;
  const distanceThreshold = options?.distanceThreshold ?? 0.5; // km

  // Check name similarity
  const nameSim = calculateNameSimilarity(
    normalizePoiName(poi1.name),
    normalizePoiName(poi2.name)
  );

  if (nameSim < nameThreshold) {
    return false;
  }

  // If both have valid coordinates, check distance
  const coord1Valid = validateCoordinates(poi1.latitude, poi1.longitude).valid;
  const coord2Valid = validateCoordinates(poi2.latitude, poi2.longitude).valid;

  if (coord1Valid && coord2Valid) {
    const distance = haversineDistance(
      poi1.latitude,
      poi1.longitude,
      poi2.latitude,
      poi2.longitude
    );
    return distance <= distanceThreshold;
  }

  // If coordinates not available, rely only on name similarity
  return nameSim >= 0.9;
}

/**
 * Calculate haversine distance between two points in km
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate validation score for a POI (0-1)
 */
export function calculateValidationScore(poi: ExtractedPOI): number {
  let score = 0;

  // Name quality (max 0.3)
  const normalizedName = normalizePoiName(poi.name);
  if (normalizedName.length >= 2) {
    score += 0.2;
    if (normalizedName.length >= 4) {
      score += 0.1;
    }
  }

  // Coordinate quality (max 0.4)
  const coordValidation = validateCoordinates(poi.latitude, poi.longitude);
  if (coordValidation.valid) {
    score += 0.4;
  } else if (poi.latitude !== 0 || poi.longitude !== 0) {
    score += 0.1; // Partial credit for non-zero but invalid
  }

  // Type quality (max 0.15)
  if (poi.type && normalizePoiType(poi.type) !== 'other') {
    score += 0.15;
  }

  // Description quality (max 0.1)
  if (poi.description && poi.description.length > 10) {
    score += 0.1;
  }

  // Address quality (max 0.05)
  if (poi.address && poi.address.length > 5) {
    score += 0.05;
  }

  return Math.min(1, score);
}

/**
 * Validate a single POI
 */
export function validatePOI(poi: ExtractedPOI): ValidatedPOI {
  const issues: string[] = [];

  // Validate name
  const normalizedName = normalizePoiName(poi.name);
  if (!normalizedName || normalizedName.length < 2) {
    issues.push('Name too short or empty');
  }

  // Validate coordinates
  const coordValidation = validateCoordinates(poi.latitude, poi.longitude);
  if (!coordValidation.valid) {
    issues.push(coordValidation.reason || 'Invalid coordinates');
  }

  // Validate type
  const normalizedType = normalizePoiType(poi.type);
  if (normalizedType === 'other' && poi.type) {
    issues.push(`Unknown type: ${poi.type}`);
  }

  const validationScore = calculateValidationScore(poi);

  return {
    ...poi,
    isValid: issues.length === 0 && validationScore >= 0.5,
    validationScore,
    validationIssues: issues,
    normalizedName,
    normalizedType,
  };
}

/**
 * Remove duplicate POIs from a list, keeping the one with higher score
 */
export function deduplicatePOIs(pois: ValidatedPOI[]): {
  unique: ValidatedPOI[];
  removed: number;
} {
  if (pois.length <= 1) {
    return { unique: pois, removed: 0 };
  }

  const unique: ValidatedPOI[] = [];
  const removed: ValidatedPOI[] = [];

  for (const poi of pois) {
    const existingIndex = unique.findIndex((existing) =>
      arePoisDuplicates(existing, poi)
    );

    if (existingIndex === -1) {
      unique.push(poi);
    } else {
      // Keep the one with higher validation score
      if (poi.validationScore > unique[existingIndex].validationScore) {
        removed.push(unique[existingIndex]);
        unique[existingIndex] = poi;
      } else {
        removed.push(poi);
      }
    }
  }

  return { unique, removed: removed.length };
}

/**
 * Validate and clean all POIs in extracted days
 */
export function validateExtractedDays(
  days: ExtractedDay[],
  options?: {
    removeInvalid?: boolean;
    deduplicate?: boolean;
    minValidationScore?: number;
  }
): ValidationResult {
  const removeInvalid = options?.removeInvalid ?? true;
  const deduplicate = options?.deduplicate ?? true;
  const minScore = options?.minValidationScore ?? 0.3;

  let totalPois = 0;
  let validPois = 0;
  let invalidPois = 0;
  let duplicatesRemoved = 0;
  let totalScore = 0;

  const validatedDays = days.map((day) => {
    // Validate all POIs
    let validatedPois = day.pois.map((poi) => {
      totalPois++;
      const validated = validatePOI(poi);

      if (validated.isValid && validated.validationScore >= minScore) {
        validPois++;
        totalScore += validated.validationScore;
      } else {
        invalidPois++;
      }

      return validated;
    });

    // Remove invalid POIs if requested
    if (removeInvalid) {
      validatedPois = validatedPois.filter(
        (poi) => poi.isValid && poi.validationScore >= minScore
      );
    }

    // Deduplicate if requested
    if (deduplicate) {
      const dedupResult = deduplicatePOIs(validatedPois);
      duplicatesRemoved += dedupResult.removed;
      validatedPois = dedupResult.unique;
    }

    return {
      dayNumber: day.dayNumber,
      theme: day.theme,
      pois: validatedPois,
    };
  });

  log.info(
    `Validation complete: ${validPois}/${totalPois} valid, ${duplicatesRemoved} duplicates removed`
  );

  return {
    days: validatedDays,
    stats: {
      totalPois,
      validPois,
      invalidPois,
      duplicatesRemoved,
      averageScore: validPois > 0 ? totalScore / validPois : 0,
    },
  };
}

/**
 * Convert validated POIs back to the original format (for storage)
 */
export function toStorageFormat(
  validatedDays: ValidationResult['days']
): ExtractedDay[] {
  return validatedDays.map((day) => ({
    dayNumber: day.dayNumber,
    theme: day.theme,
    pois: day.pois.map((poi) => ({
      name: poi.normalizedName || poi.name,
      type: poi.normalizedType || poi.type,
      description: poi.description,
      latitude: poi.latitude,
      longitude: poi.longitude,
      address: poi.address,
    })),
  }));
}

export default {
  validatePOI,
  validateExtractedDays,
  normalizePoiName,
  normalizePoiType,
  validateCoordinates,
  arePoisDuplicates,
  deduplicatePOIs,
  toStorageFormat,
};
