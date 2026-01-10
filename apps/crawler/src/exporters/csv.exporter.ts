/**
 * CSV Exporter
 * Export POIs to CSV format
 */

import type { NormalizedPOI } from '@pathfinding/crawler-types';
import type { ExportOptions, ExportResult } from './base.exporter.js';
import { BaseExporter, Buffer, registerExporter } from './base.exporter.js';

/**
 * CSV Exporter - exports as comma-separated values
 */
export class CSVExporter extends BaseExporter {
  private delimiter: string;
  private quoteChar: string;

  constructor(
    options: Partial<
      ExportOptions & { delimiter?: string; quoteChar?: string }
    > = {}
  ) {
    super({ ...options, format: 'csv', flatten: true }); // CSV always flattens
    this.delimiter = options.delimiter || ',';
    this.quoteChar = options.quoteChar || '"';
  }

  getFormat(): string {
    return 'csv';
  }

  getMimeType(): string {
    return 'text/csv';
  }

  getFileExtension(): string {
    return 'csv';
  }

  /**
   * Escape a value for CSV
   */
  private escapeValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    let stringValue: string;

    if (typeof value === 'object') {
      // Convert arrays and objects to JSON strings
      stringValue = JSON.stringify(value);
    } else if (typeof value === 'boolean') {
      stringValue = value ? 'true' : 'false';
    } else if (typeof value === 'number') {
      stringValue = String(value);
    } else {
      stringValue = String(value);
    }

    // Check if value needs quoting
    const needsQuoting =
      stringValue.includes(this.delimiter) ||
      stringValue.includes(this.quoteChar) ||
      stringValue.includes('\n') ||
      stringValue.includes('\r');

    if (needsQuoting) {
      // Escape quotes by doubling them
      const escaped = stringValue.replace(
        new RegExp(this.quoteChar, 'g'),
        this.quoteChar + this.quoteChar
      );
      return `${this.quoteChar}${escaped}${this.quoteChar}`;
    }

    return stringValue;
  }

  /**
   * Get flat field list for CSV columns
   */
  protected getFlatFields(): string[] {
    const baseFields = this.options.fields || this.getDefaultFields();
    const flatFields: string[] = [];

    for (const field of baseFields) {
      // Expand nested fields
      if (field === 'operating_hours') {
        flatFields.push(
          'operating_hours_monday',
          'operating_hours_tuesday',
          'operating_hours_wednesday',
          'operating_hours_thursday',
          'operating_hours_friday',
          'operating_hours_saturday',
          'operating_hours_sunday'
        );
      } else if (field === 'rating_breakdown') {
        flatFields.push(
          'rating_breakdown_food',
          'rating_breakdown_service',
          'rating_breakdown_ambiance',
          'rating_breakdown_value'
        );
      } else {
        flatFields.push(field);
      }
    }

    return flatFields;
  }

  /**
   * Transform POI to flat record for CSV
   */
  protected transformPOIFlat(poi: NormalizedPOI): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const fields = this.getFlatFields();

    for (const field of fields) {
      // Handle flattened nested fields
      if (field.includes('_')) {
        const parts = field.split('_');
        const parentField = `${parts[0]}_${parts[1]}`;
        const childField = parts.slice(2).join('_');

        if (parentField === 'operating_hours') {
          const hours = poi.operating_hours as
            | Record<string, unknown>
            | undefined;
          result[field] = hours?.[childField] || '';
        } else if (parentField === 'rating_breakdown') {
          const breakdown = poi.rating_breakdown as
            | Record<string, unknown>
            | undefined;
          result[field] = breakdown?.[childField] || '';
        } else {
          result[field] =
            (poi as unknown as Record<string, unknown>)[field] ?? '';
        }
      } else {
        result[field] =
          (poi as unknown as Record<string, unknown>)[field] ?? '';
      }
    }

    return result;
  }

  async export(pois: NormalizedPOI[]): Promise<ExportResult> {
    const lines: string[] = [];
    const fields = this.getFlatFields();

    // Add header row
    lines.push(fields.map((f) => this.escapeValue(f)).join(this.delimiter));

    // Add metadata comment if requested
    if (this.options.includeMetadata) {
      const metadataComment = `# Exported: ${new Date().toISOString()}, Records: ${pois.length}`;
      lines.unshift(metadataComment);
    }

    // Add data rows
    for (const poi of pois) {
      const transformed = this.transformPOIFlat(poi);
      const row = fields.map((field) => this.escapeValue(transformed[field]));
      lines.push(row.join(this.delimiter));
    }

    const content = `${lines.join('\n')}\n`;

    return {
      format: this.getFormat(),
      recordCount: pois.length,
      sizeBytes: Buffer.byteLength(content, 'utf8'),
      content,
      filename: this.generateFilename('pois'),
      mimeType: this.getMimeType(),
      metadata: {
        exportedAt: new Date().toISOString(),
        fields,
        options: this.options,
      },
    };
  }
}

// Register exporter
registerExporter('csv', CSVExporter);

export { CSVExporter as default };
