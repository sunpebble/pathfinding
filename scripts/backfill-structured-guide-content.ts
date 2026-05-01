/**
 * Backfills structured rich-content fields for existing travel guides.
 *
 * Usage:
 *   DATABASE_URL="mysql://root@127.0.0.1:4000/pathfinding" pnpm exec tsx scripts/backfill-structured-guide-content.ts
 *
 * Options:
 *   BATCH_SIZE=1000            Rows to scan per batch.
 *   BACKFILL_LIMIT=0           Max eligible rows to process, 0 = unlimited.
 *   BACKFILL_FORCE=false       Rebuild even when contentMarkdown already exists.
 *   DRY_RUN=false              Generate and count updates without writing.
 *   PLATFORM=mafengwo          Optional platform filter.
 *   UPDATE_CONTENT=false       Also replace the plain content column with cleaned text.
 *   UPDATE_CONCURRENCY=10      Concurrent row updates per batch.
 */

import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { buildStructuredGuideContent, cleanGuidePlainText } from '../packages/api/src/services/guide-content';
import { createPool } from '../packages/database/src/index';

interface GuideRow extends RowDataPacket {
  id: number;
  title: string | null;
  content: string | null;
  image_urls: unknown;
  enriched_data: unknown;
}

interface BackfillStats {
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
}

const CONFIG = {
  batchSize: Math.max(1, Number(process.env.BATCH_SIZE) || 1000),
  limit: Math.max(0, Number(process.env.BACKFILL_LIMIT) || 0),
  force: process.env.BACKFILL_FORCE === 'true',
  dryRun: process.env.DRY_RUN === 'true',
  platform: process.env.PLATFORM?.trim() || '',
  updateContent: process.env.UPDATE_CONTENT === 'true',
  updateConcurrency: Math.max(1, Number(process.env.UPDATE_CONCURRENCY) || 10),
};

function log(message: string) {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.warn(`[${timestamp}] ${message}`);
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  }
  catch {
    return undefined;
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  const parsed = typeof value === 'string' ? parseJson(value) : value;
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
    return { ...parsed as Record<string, unknown> };
  return {};
}

function normalizeImageUrls(value: unknown): string[] {
  const parsed = typeof value === 'string' ? parseJson(value) : value;
  if (!Array.isArray(parsed))
    return [];

  return parsed
    .filter((url): url is string => typeof url === 'string')
    .map(url => url.trim())
    .filter(Boolean);
}

function hasMarkdown(enrichedData: Record<string, unknown>): boolean {
  return typeof enrichedData.contentMarkdown === 'string'
    && enrichedData.contentMarkdown.trim().length > 0;
}

async function fetchBatch(
  pool: ReturnType<typeof createPool>,
  lastId: number,
  limit: number,
): Promise<GuideRow[]> {
  const conditions = [
    'id > ?',
    'content IS NOT NULL',
    'TRIM(content) <> \'\'',
  ];
  const params: Array<number | string> = [lastId];

  if (CONFIG.platform) {
    conditions.push('platform = ?');
    params.push(CONFIG.platform);
  }

  if (!CONFIG.force) {
    conditions.push(
      '(enriched_data IS NULL OR JSON_EXTRACT(enriched_data, \'$.contentMarkdown\') IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(enriched_data, \'$.contentMarkdown\')) = \'\')',
    );
  }

  params.push(limit);

  const [rows] = await pool.query<GuideRow[]>(
    `
      SELECT id, title, content, image_urls, enriched_data
      FROM travel_guides
      WHERE ${conditions.join(' AND ')}
      ORDER BY id ASC
      LIMIT ?
    `,
    params,
  );

  return rows;
}

async function updateGuide(
  pool: ReturnType<typeof createPool>,
  guide: GuideRow,
): Promise<boolean> {
  const existingEnrichedData = toRecord(guide.enriched_data);
  if (!CONFIG.force && hasMarkdown(existingEnrichedData))
    return false;

  const cleanedContent = cleanGuidePlainText(guide.content ?? '', guide.title ?? undefined);
  const structuredContent = buildStructuredGuideContent({
    title: guide.title ?? undefined,
    content: cleanedContent,
    imageUrls: normalizeImageUrls(guide.image_urls),
  });
  const nextEnrichedData = {
    ...existingEnrichedData,
    ...structuredContent,
  };

  if (typeof structuredContent.contentMarkdown !== 'string' || structuredContent.contentMarkdown.length === 0) {
    delete nextEnrichedData.contentMarkdown;
  }
  if (typeof structuredContent.contentHtml !== 'string' || structuredContent.contentHtml.length === 0)
    delete nextEnrichedData.contentHtml;

  if (
    !CONFIG.force
    && !CONFIG.updateContent
    && typeof structuredContent.contentMarkdown !== 'string'
  ) {
    return false;
  }

  if (CONFIG.dryRun)
    return true;

  if (CONFIG.updateContent) {
    await pool.execute<ResultSetHeader>(
      `
        UPDATE travel_guides
        SET content = ?, enriched_data = ?, last_updated_at = NOW(), updated_at = NOW()
        WHERE id = ?
      `,
      [
        cleanedContent || null,
        JSON.stringify(nextEnrichedData),
        guide.id,
      ],
    );
  }
  else {
    await pool.execute<ResultSetHeader>(
      `
        UPDATE travel_guides
        SET enriched_data = ?, last_updated_at = NOW(), updated_at = NOW()
        WHERE id = ?
      `,
      [
        JSON.stringify(nextEnrichedData),
        guide.id,
      ],
    );
  }

  return true;
}

async function processRows(
  pool: ReturnType<typeof createPool>,
  rows: GuideRow[],
  stats: BackfillStats,
): Promise<void> {
  for (let index = 0; index < rows.length; index += CONFIG.updateConcurrency) {
    const chunk = rows.slice(index, index + CONFIG.updateConcurrency);
    const results = await Promise.all(
      chunk.map(async (row) => {
        try {
          const updated = await updateGuide(pool, row);
          return { updated };
        }
        catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { error: `Guide ${row.id} failed: ${message.slice(0, 160)}` };
        }
      }),
    );

    for (const result of results) {
      stats.processed++;
      if ('error' in result) {
        stats.errors++;
        log(result.error);
      }
      else if (result.updated) {
        stats.updated++;
      }
      else {
        stats.skipped++;
      }
    }
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL not set');
    process.exit(1);
  }

  log('Structured content backfill started');
  log(`Batch size: ${CONFIG.batchSize}`);
  log(`Limit: ${CONFIG.limit === 0 ? 'unlimited' : CONFIG.limit}`);
  log(`Force: ${CONFIG.force}`);
  log(`Dry run: ${CONFIG.dryRun}`);
  log(`Update content: ${CONFIG.updateContent}`);
  log(`Update concurrency: ${CONFIG.updateConcurrency}`);
  if (CONFIG.platform)
    log(`Platform: ${CONFIG.platform}`);

  const pool = createPool();
  const stats: BackfillStats = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };
  let lastId = 0;

  try {
    while (CONFIG.limit === 0 || stats.processed < CONFIG.limit) {
      const remaining = CONFIG.limit === 0 ? CONFIG.batchSize : Math.min(CONFIG.batchSize, CONFIG.limit - stats.processed);
      const rows = await fetchBatch(pool, lastId, remaining);

      if (rows.length === 0)
        break;

      lastId = rows[rows.length - 1]!.id;
      await processRows(pool, rows, stats);

      log(`Progress: processed=${stats.processed}, updated=${stats.updated}, skipped=${stats.skipped}, errors=${stats.errors}, lastId=${lastId}`);
    }
  }
  finally {
    await pool.end();
  }

  log('Structured content backfill complete');
  log(`Processed: ${stats.processed}`);
  log(`${CONFIG.dryRun ? 'Would update' : 'Updated'}: ${stats.updated}`);
  log(`Skipped: ${stats.skipped}`);
  log(`Errors: ${stats.errors}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
