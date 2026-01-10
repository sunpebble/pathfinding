/**
 * Parquet Exporter
 * Export POIs to Apache Parquet format for efficient ML training
 *
 * Parquet is a columnar storage format that provides:
 * - Efficient compression and encoding
 * - Schema evolution support
 * - Native support in ML frameworks (PyTorch, TensorFlow, Spark)
 */

import type { NormalizedPOI } from '@pathfinding/crawler-types';
import type { ExportOptions, ExportResult } from './base.exporter.js';
import { BaseExporter, Buffer, registerExporter } from './base.exporter.js';

/**
 * Parquet library interface (optional dependency)
 * Using dynamic import to make parquet-wasm optional
 */
interface ParquetLib {
  writeParquet: (
    table: unknown,
    options?: { compression?: string; writerVersion?: string }
  ) => Uint8Array;
  Table: {
    fromArrays: (data: Record<string, unknown>) => unknown;
  };
}

// Dynamic import for parquet-wasm (optional dependency)
let parquet: ParquetLib | null = null;

/**
 * Initialize parquet-wasm library
 */
async function initParquet(): Promise<ParquetLib> {
  if (parquet) return parquet;

  try {
    // Dynamic import for optional parquet-wasm dependency
    // @ts-expect-error - parquet-wasm is an optional peer dependency
    const mod = await import('parquet-wasm');
    parquet = mod as unknown as ParquetLib;
    return parquet;
  } catch {
    throw new Error(
      'parquet-wasm is not installed. Install it with: pnpm add parquet-wasm'
    );
  }
}

/**
 * Parquet schema field types
 */
interface ParquetField {
  name: string;
  type: 'utf8' | 'int32' | 'int64' | 'float' | 'double' | 'bool' | 'binary';
  nullable: boolean;
}

/**
 * Parquet Exporter - exports as Apache Parquet format
 * Optimized for ML training pipelines
 */
export class ParquetExporter extends BaseExporter {
  constructor(options: Partial<ExportOptions> = {}) {
    super({ ...options, format: 'parquet', flatten: true });
  }

  getFormat(): string {
    return 'parquet';
  }

  getMimeType(): string {
    return 'application/vnd.apache.parquet';
  }

  getFileExtension(): string {
    return 'parquet';
  }

  /**
   * Define the Parquet schema for POI data
   */
  private getSchema(): ParquetField[] {
    return [
      { name: 'id', type: 'utf8', nullable: false },
      { name: 'name', type: 'utf8', nullable: false },
      { name: 'name_en', type: 'utf8', nullable: true },
      { name: 'description', type: 'utf8', nullable: true },
      { name: 'category', type: 'utf8', nullable: false },
      { name: 'subcategory', type: 'utf8', nullable: true },
      { name: 'tags', type: 'utf8', nullable: true }, // JSON array as string
      { name: 'location_lat', type: 'double', nullable: false },
      { name: 'location_lng', type: 'double', nullable: false },
      { name: 'address', type: 'utf8', nullable: true },
      { name: 'city', type: 'utf8', nullable: true },
      { name: 'district', type: 'utf8', nullable: true },
      { name: 'country', type: 'utf8', nullable: true },
      { name: 'rating_overall', type: 'float', nullable: true },
      { name: 'rating_count', type: 'int32', nullable: true },
      { name: 'price_range', type: 'utf8', nullable: true },
      { name: 'price_avg', type: 'float', nullable: true },
      { name: 'phone', type: 'utf8', nullable: true },
      { name: 'website', type: 'utf8', nullable: true },
      { name: 'photo_urls', type: 'utf8', nullable: true }, // JSON array as string
      { name: 'quality_score', type: 'float', nullable: true },
      { name: 'completeness_score', type: 'float', nullable: true },
      { name: 'sources', type: 'utf8', nullable: true }, // JSON array as string
      { name: 'created_at', type: 'utf8', nullable: true },
      { name: 'updated_at', type: 'utf8', nullable: true },
    ];
  }

  /**
   * Transform POI to flat record for Parquet
   */
  private transformPOIForParquet(
    poi: NormalizedPOI
  ): Record<string, string | number | boolean | null> {
    const record: Record<string, string | number | boolean | null> = {};
    const poiRecord = poi as unknown as Record<string, unknown>;

    // String fields
    record.id = String(poiRecord.id ?? '');
    record.name = String(poiRecord.name ?? '');
    record.name_en = poiRecord.name_en ? String(poiRecord.name_en) : null;
    record.description = poiRecord.description
      ? String(poiRecord.description)
      : null;
    record.category = String(poiRecord.category ?? 'other');
    record.subcategory = poiRecord.subcategory
      ? String(poiRecord.subcategory)
      : null;

    // Array fields as JSON strings
    record.tags = Array.isArray(poiRecord.tags)
      ? JSON.stringify(poiRecord.tags)
      : null;

    // Location fields
    record.location_lat =
      typeof poiRecord.location_lat === 'number' ? poiRecord.location_lat : 0;
    record.location_lng =
      typeof poiRecord.location_lng === 'number' ? poiRecord.location_lng : 0;

    // Address fields
    record.address = poiRecord.address ? String(poiRecord.address) : null;
    record.city = poiRecord.city ? String(poiRecord.city) : null;
    record.district = poiRecord.district ? String(poiRecord.district) : null;
    record.country = poiRecord.country ? String(poiRecord.country) : null;

    // Rating fields
    record.rating_overall =
      typeof poiRecord.rating_overall === 'number'
        ? poiRecord.rating_overall
        : null;
    record.rating_count =
      typeof poiRecord.rating_count === 'number'
        ? Math.floor(poiRecord.rating_count)
        : null;

    // Price fields
    record.price_range = poiRecord.price_range
      ? String(poiRecord.price_range)
      : null;
    record.price_avg =
      typeof poiRecord.price_avg === 'number' ? poiRecord.price_avg : null;

    // Contact fields
    record.phone = poiRecord.phone ? String(poiRecord.phone) : null;
    record.website = poiRecord.website ? String(poiRecord.website) : null;

    // Photo URLs as JSON string
    record.photo_urls = Array.isArray(poiRecord.photo_urls)
      ? JSON.stringify(poiRecord.photo_urls)
      : null;

    // Quality scores
    record.quality_score =
      typeof poiRecord.quality_score === 'number'
        ? poiRecord.quality_score
        : null;
    record.completeness_score =
      typeof poiRecord.completeness_score === 'number'
        ? poiRecord.completeness_score
        : null;

    // Sources as JSON string
    record.sources = Array.isArray(poiRecord.sources)
      ? JSON.stringify(poiRecord.sources)
      : null;

    // Timestamps
    record.created_at = poiRecord.created_at
      ? String(poiRecord.created_at)
      : null;
    record.updated_at = poiRecord.updated_at
      ? String(poiRecord.updated_at)
      : null;

    return record;
  }

  /**
   * Build Arrow/Parquet table using parquet-wasm
   */
  private async buildParquetBuffer(pois: NormalizedPOI[]): Promise<Uint8Array> {
    const parquetLib = await initParquet();

    // Transform all POIs to flat records
    const records = pois.map((poi) => this.transformPOIForParquet(poi));

    // Build column arrays
    const columns: Record<string, (string | number | boolean | null)[]> = {};
    const schema = this.getSchema();

    for (const field of schema) {
      columns[field.name] = records.map((r) => r[field.name] ?? null);
    }

    // Create Arrow table from columns
    // Note: parquet-wasm uses Arrow format internally
    const tableData: Record<string, unknown> = {};

    for (const field of schema) {
      const values = columns[field.name];

      switch (field.type) {
        case 'utf8':
          tableData[field.name] = values.map((v) =>
            v !== null ? String(v) : null
          );
          break;
        case 'int32':
        case 'int64':
          tableData[field.name] = values.map((v) =>
            v !== null ? Math.floor(Number(v)) : null
          );
          break;
        case 'float':
        case 'double':
          tableData[field.name] = values.map((v) =>
            v !== null ? Number(v) : null
          );
          break;
        case 'bool':
          tableData[field.name] = values.map((v) =>
            v !== null ? Boolean(v) : null
          );
          break;
        default:
          tableData[field.name] = values;
      }
    }

    // Use parquet-wasm to write the data
    // The library provides writeParquet function that takes Arrow table
    const { writeParquet, Table } = parquetLib;

    // Create Arrow table
    const table = Table.fromArrays(tableData);

    // Write to Parquet buffer with compression
    const parquetBuffer = writeParquet(table, {
      compression: 'SNAPPY',
      writerVersion: '2.0',
    });

    return parquetBuffer;
  }

  /**
   * Fallback implementation using JSON-based Parquet simulation
   * Used when parquet-wasm is not available
   */
  private async buildFallbackParquet(pois: NormalizedPOI[]): Promise<Buffer> {
    // Create a simple binary format that can be converted to Parquet later
    // This is a fallback for when parquet-wasm is not installed
    const records = pois.map((poi) => this.transformPOIForParquet(poi));

    const output = {
      format: 'parquet-fallback',
      schema: this.getSchema(),
      data: records,
      metadata: {
        recordCount: pois.length,
        createdAt: new Date().toISOString(),
        version: '1.0',
      },
    };

    return Buffer.from(JSON.stringify(output), 'utf8');
  }

  async export(pois: NormalizedPOI[]): Promise<ExportResult> {
    let content: Buffer;
    let usedFallback = false;

    try {
      // Try to use parquet-wasm for native Parquet export
      const parquetBuffer = await this.buildParquetBuffer(pois);
      content = Buffer.from(parquetBuffer);
    } catch (error) {
      // Fallback to JSON-based format if parquet-wasm is not available
      console.warn(
        'parquet-wasm not available, using fallback format:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      content = await this.buildFallbackParquet(pois);
      usedFallback = true;
    }

    const filename = usedFallback
      ? this.generateFilename('pois').replace('.parquet', '.parquet.json')
      : this.generateFilename('pois');

    const mimeType = usedFallback ? 'application/json' : this.getMimeType();

    return {
      format: usedFallback ? 'parquet-fallback' : this.getFormat(),
      recordCount: pois.length,
      sizeBytes: content.length,
      content,
      filename,
      mimeType,
      metadata: {
        exportedAt: new Date().toISOString(),
        fields: this.getSchema().map((f) => f.name),
        options: this.options,
      },
    };
  }
}

// Register exporter
registerExporter('parquet', ParquetExporter);

export { ParquetExporter as default };
