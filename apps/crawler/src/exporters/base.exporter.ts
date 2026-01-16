/**
 * Base Exporter
 * Abstract interface for dataset exporters
 */

import type { NormalizedPOI } from '@pathfinding/crawler-types';
import { Buffer } from 'node:buffer';

export { Buffer };

/**
 * Export options
 */
export interface ExportOptions {
  /**
   * Output format
   */
  format: 'json' | 'jsonl' | 'csv' | 'parquet';

  /**
   * Fields to include in export (default: all)
   */
  fields?: string[];

  /**
   * Include nested objects (like sources, ratings)
   */
  includeNested?: boolean;

  /**
   * Flatten nested objects into columns
   */
  flatten?: boolean;

  /**
   * Add metadata header
   */
  includeMetadata?: boolean;

  /**
   * Custom field mappings (rename fields)
   */
  fieldMappings?: Record<string, string>;
}

/**
 * Export result
 */
export interface ExportResult {
  /**
   * Export format used
   */
  format: string;

  /**
   * Number of records exported
   */
  recordCount: number;

  /**
   * Total size in bytes
   */
  sizeBytes: number;

  /**
   * File content or path
   */
  content: string | Buffer;

  /**
   * Suggested filename
   */
  filename: string;

  /**
   * MIME type
   */
  mimeType: string;

  /**
   * Export metadata
   */
  metadata: {
    exportedAt: string;
    fields: string[];
    options: ExportOptions;
  };
}

/**
 * Abstract base exporter class
 */
export abstract class BaseExporter {
  protected options: ExportOptions;

  constructor(options: Partial<ExportOptions> = {}) {
    this.options = {
      format: 'json',
      includeNested: true,
      flatten: false,
      includeMetadata: true,
      ...options,
    };
  }

  /**
   * Export POIs to the specified format
   */
  abstract export(pois: NormalizedPOI[]): Promise<ExportResult>;

  /**
   * Get the format identifier
   */
  abstract getFormat(): string;

  /**
   * Get the MIME type for the export
   */
  abstract getMimeType(): string;

  /**
   * Get the file extension
   */
  abstract getFileExtension(): string;

  /**
   * Filter and transform POI fields based on options
   */
  protected transformPOI(poi: NormalizedPOI): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const fields = this.options.fields || this.getDefaultFields();

    for (const field of fields) {
      const value = (poi as unknown as Record<string, unknown>)[field];

      // Apply field mapping
      const outputField = this.options.fieldMappings?.[field] || field;

      // Handle nested objects
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        if (this.options.flatten) {
          // Flatten nested object
          const nested = value as Record<string, unknown>;
          for (const [nestedKey, nestedValue] of Object.entries(nested)) {
            result[`${outputField}_${nestedKey}`] = nestedValue;
          }
        } else if (this.options.includeNested) {
          result[outputField] = value;
        }
      } else {
        result[outputField] = value;
      }
    }

    return result;
  }

  /**
   * Get default fields to export
   */
  protected getDefaultFields(): string[] {
    return [
      'id',
      'name',
      'name_en',
      'description',
      'category',
      'subcategory',
      'tags',
      'location_lat',
      'location_lng',
      'address',
      'city',
      'district',
      'country',
      'rating_overall',
      'rating_count',
      'operating_hours',
      'price_range',
      'price_avg',
      'phone',
      'website',
      'photo_urls',
      'quality_score',
      'completeness_score',
    ];
  }

  /**
   * Generate filename based on options and timestamp
   */
  protected generateFilename(prefix: string = 'pois'): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    return `${prefix}_${timestamp}.${this.getFileExtension()}`;
  }
}

/**
 * Exporter registry
 */
const exporterRegistry: Map<
  string,
  new (options?: Partial<ExportOptions>) => BaseExporter
> = new Map();

/**
 * Register an exporter class
 */
export function registerExporter(
  format: string,
  exporterClass: new (options?: Partial<ExportOptions>) => BaseExporter
): void {
  exporterRegistry.set(format.toLowerCase(), exporterClass);
}

/**
 * Get an exporter instance for a format
 */
export function getExporter(
  format: string,
  options?: Partial<ExportOptions>
): BaseExporter | null {
  const ExporterClass = exporterRegistry.get(format.toLowerCase());
  if (!ExporterClass) return null;
  return new ExporterClass(options);
}

/**
 * Get list of supported formats
 */
export function getSupportedFormats(): string[] {
  return Array.from(exporterRegistry.keys());
}
