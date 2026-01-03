/**
 * Content Hashing Utilities
 * SHA-256 hashing for content deduplication and incremental crawling
 */

import type { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';

/**
 * Generate SHA-256 hash of content
 * @param content - String content to hash
 * @returns 64-character hex string
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Generate SHA-256 hash of buffer
 * @param buffer - Buffer to hash
 * @returns 64-character hex string
 */
export function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Compare two hashes for equality
 * @param hash1 - First hash
 * @param hash2 - Second hash
 * @returns True if hashes match
 */
export function hashesMatch(hash1: string, hash2: string): boolean {
  if (hash1.length !== hash2.length) {
    return false;
  }
  // Constant-time comparison to prevent timing attacks
  let result = 0;
  for (let i = 0; i < hash1.length; i++) {
    result |= hash1.charCodeAt(i) ^ hash2.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generate a unique identifier based on platform and external ID
 * Useful for creating canonical IDs for deduplication
 * @param platform - Data source platform
 * @param externalId - Platform's unique identifier
 * @returns Hash string for the combination
 */
export function generateSourceKey(
  platform: string,
  externalId: string
): string {
  const combined = `${platform}:${externalId}`;
  return hashContent(combined);
}

/**
 * Generate hash for POI deduplication based on name and location
 * @param name - POI name
 * @param lat - Latitude
 * @param lng - Longitude
 * @param precision - Decimal precision for coordinates (default: 5 = ~1m accuracy)
 * @returns Hash string for the combination
 */
export function generatePOIKey(
  name: string,
  lat: number,
  lng: number,
  precision: number = 5
): string {
  const normalizedName = name.toLowerCase().trim();
  const normalizedLat = lat.toFixed(precision);
  const normalizedLng = lng.toFixed(precision);
  const combined = `${normalizedName}:${normalizedLat}:${normalizedLng}`;
  return hashContent(combined);
}
