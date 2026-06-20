/**
 * @module @pathfinding/crawler-types
 * Shared TypeScript types and utilities for the data crawler service.
 *
 * Architecture follows a medallion data lakehouse pattern:
 * - Bronze Layer: Raw crawl records and job management
 * - Silver Layer: Normalized, deduplicated POI and review data
 * - Gold Layer: ML training datasets and quality reports
 */

// ============================================================================
// Category Taxonomy
// ============================================================================

export * from './categories.js';

// ============================================================================
// Bronze Layer — Raw Crawl Data
// ============================================================================

export * from './content-cleaner.js';

// ============================================================================
// Silver Layer — Normalized & Enriched Data
// ============================================================================

export * from './crawl-job.js';
export * from './normalized-poi.js';
export * from './parse-number.js';

// ============================================================================
// Quality Scoring
// ============================================================================

export * from './quality-score.js';

// ============================================================================
// Utilities — Validation, Cleaning, Scoring
// ============================================================================

export * from './raw-record.js';
export * from './travel-guide.js';
export * from './validators.js';
