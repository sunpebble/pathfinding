/**
 * JSON Exporter
 * Export POIs to JSON and JSON Lines formats
 */

import type { NormalizedPOI } from '@pathfinding/crawler-types';
import type { ExportOptions, ExportResult } from './base.exporter.js';
import { BaseExporter, Buffer, registerExporter } from './base.exporter.js';

/**
 * JSON Exporter - exports as a JSON array
 */
export class JSONExporter extends BaseExporter {
  constructor(options: Partial<ExportOptions> = {}) {
    super({ ...options, format: 'json' });
  }

  getFormat(): string {
    return 'json';
  }

  getMimeType(): string {
    return 'application/json';
  }

  getFileExtension(): string {
    return 'json';
  }

  async export(pois: NormalizedPOI[]): Promise<ExportResult> {
    const transformedPOIs = pois.map((poi) => this.transformPOI(poi));

    const output: Record<string, unknown> = {};

    // Add metadata if requested
    if (this.options.includeMetadata) {
      output.metadata = {
        exportedAt: new Date().toISOString(),
        recordCount: pois.length,
        format: this.getFormat(),
        fields: this.options.fields || this.getDefaultFields(),
      };
    }

    output.data = transformedPOIs;

    const content = JSON.stringify(output, null, 2);

    return {
      format: this.getFormat(),
      recordCount: pois.length,
      sizeBytes: Buffer.byteLength(content, 'utf8'),
      content,
      filename: this.generateFilename('pois'),
      mimeType: this.getMimeType(),
      metadata: {
        exportedAt: new Date().toISOString(),
        fields: this.options.fields || this.getDefaultFields(),
        options: this.options,
      },
    };
  }
}

/**
 * JSON Lines Exporter - exports one JSON object per line
 * Better for streaming and large datasets
 */
export class JSONLinesExporter extends BaseExporter {
  constructor(options: Partial<ExportOptions> = {}) {
    super({ ...options, format: 'jsonl' });
  }

  getFormat(): string {
    return 'jsonl';
  }

  getMimeType(): string {
    return 'application/x-ndjson';
  }

  getFileExtension(): string {
    return 'jsonl';
  }

  async export(pois: NormalizedPOI[]): Promise<ExportResult> {
    const lines: string[] = [];

    // Add metadata line if requested
    if (this.options.includeMetadata) {
      const metadata = {
        _type: 'metadata',
        exportedAt: new Date().toISOString(),
        recordCount: pois.length,
        format: this.getFormat(),
        fields: this.options.fields || this.getDefaultFields(),
      };
      lines.push(JSON.stringify(metadata));
    }

    // Add each POI as a separate line
    for (const poi of pois) {
      const transformed = this.transformPOI(poi);
      lines.push(JSON.stringify(transformed));
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
        fields: this.options.fields || this.getDefaultFields(),
        options: this.options,
      },
    };
  }
}

// Register exporters
registerExporter('json', JSONExporter);
registerExporter('jsonl', JSONLinesExporter);

export { JSONExporter as default };
