/**
 * Dedupe crawler tables on their business keys (design D1, data-pipeline overhaul).
 *
 * IMPORTANT: this script MUST run BEFORE `pnpm db:push` applies the new
 * unique indexes (travel_guides_platform_ext_idx, mafengwo_* business keys).
 * Pushing the unique indexes against duplicated data will fail.
 *
 * For every business-key group the script keeps the row with the most
 * non-empty fields (tie-break: newest updatedAt/crawledAt, then highest id)
 * and deletes the rest:
 *   - travel_guides           (platform, external_id)  — NULL external_id skipped
 *   - mafengwo_guides         (guide_id)
 *   - mafengwo_destinations   (mdd_id)
 *   - mafengwo_pois           (poi_id)
 *   - mafengwo_qa             (question_id)
 *   - mafengwo_rankings       (destination_id, ranking_type) — NULL destination_id skipped
 *
 * Usage:
 *   DATABASE_URL="mysql://root@127.0.0.1:4000/pathfinding" npx tsx scripts/dedupe-travel-guides.ts          # dry-run (default)
 *   DATABASE_URL="mysql://root@127.0.0.1:4000/pathfinding" npx tsx scripts/dedupe-travel-guides.ts --apply  # actually delete
 */

import { asc, gt, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import {
  createPool,
  mafengwoDestinations,
  mafengwoGuides,
  mafengwoPois,
  mafengwoQa,
  mafengwoRankings,
  travelGuides,
} from '../packages/database/src/index';

const BATCH_SIZE = 500;
const DELETE_CHUNK_SIZE = 500;
/** Separator that cannot occur inside business-key values. */
const KEY_SEP = '␟';

const pool = createPool();
const db = drizzle(pool, { mode: 'default' });

// ============================================================================
// Generic dedupe machinery
// ============================================================================

/** Compact per-row stats — full rows are discarded after scoring. */
interface RowStat {
  id: number;
  key: string;
  filledCount: number;
  recency: number;
}

interface DedupeTarget {
  label: string;
  /** Fetch the next keyset-paginated batch, already mapped to stats (null key = exempt from dedupe). */
  fetchBatch: (lastId: number) => Promise<Array<{ id: number; stat: RowStat | null }>>;
  deleteIds: (ids: number[]) => Promise<unknown>;
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined)
    return true;
  if (typeof value === 'string')
    return value.trim() === '';
  if (Array.isArray(value))
    return value.length === 0;
  if (typeof value === 'object' && !(value instanceof Date))
    return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

/** Count non-empty fields, excluding the surrogate primary key. */
function countFilledFields(row: Record<string, unknown>): number {
  let count = 0;
  for (const [field, value] of Object.entries(row)) {
    if (field === 'id')
      continue;
    if (!isEmptyValue(value))
      count++;
  }
  return count;
}

/** Keep rule: most filled fields, then newest, then highest id (deterministic). */
function isBetter(candidate: RowStat, current: RowStat): boolean {
  if (candidate.filledCount !== current.filledCount)
    return candidate.filledCount > current.filledCount;
  if (candidate.recency !== current.recency)
    return candidate.recency > current.recency;
  return candidate.id > current.id;
}

/** Build a DedupeTarget from a typed table accessor set. */
function defineTarget<TRow extends Record<string, unknown> & { id: number }>(options: {
  label: string;
  fetch: (lastId: number) => Promise<TRow[]>;
  key: (row: TRow) => string | null;
  recency: (row: TRow) => Date | null;
  deleteIds: (ids: number[]) => Promise<unknown>;
}): DedupeTarget {
  return {
    label: options.label,
    fetchBatch: async (lastId) => {
      const rows = await options.fetch(lastId);
      return rows.map((row) => {
        const key = options.key(row);
        if (key === null)
          return { id: row.id, stat: null };
        return {
          id: row.id,
          stat: {
            id: row.id,
            key,
            filledCount: countFilledFields(row),
            recency: options.recency(row)?.getTime() ?? 0,
          },
        };
      });
    },
    deleteIds: options.deleteIds,
  };
}

interface TargetReport {
  label: string;
  scanned: number;
  duplicateGroups: number;
  deletedIds: number[];
}

async function dedupeTarget(target: DedupeTarget, apply: boolean): Promise<TargetReport> {
  const bestByKey = new Map<string, RowStat>();
  const removedByKey = new Map<string, number[]>();
  let scanned = 0;
  let lastId = 0;

  for (;;) {
    const batch = await target.fetchBatch(lastId);
    if (batch.length === 0)
      break;
    lastId = batch[batch.length - 1]!.id;
    scanned += batch.length;

    for (const { stat } of batch) {
      if (stat === null)
        continue;
      const current = bestByKey.get(stat.key);
      if (!current) {
        bestByKey.set(stat.key, stat);
        continue;
      }
      const loser = isBetter(stat, current) ? current : stat;
      if (loser !== stat)
        bestByKey.set(stat.key, stat);
      const removed = removedByKey.get(stat.key) ?? [];
      removed.push(loser.id);
      removedByKey.set(stat.key, removed);
    }
  }

  const deletedIds: number[] = [];
  for (const [key, ids] of removedByKey) {
    const kept = bestByKey.get(key)!;
    console.warn(`  key=${key.replaceAll(KEY_SEP, ' / ')} keep id=${kept.id} delete ids=[${ids.join(', ')}]`);
    deletedIds.push(...ids);
  }

  if (apply && deletedIds.length > 0) {
    for (let i = 0; i < deletedIds.length; i += DELETE_CHUNK_SIZE) {
      await target.deleteIds(deletedIds.slice(i, i + DELETE_CHUNK_SIZE));
    }
  }

  return {
    label: target.label,
    scanned,
    duplicateGroups: removedByKey.size,
    deletedIds,
  };
}

// ============================================================================
// Table targets
// ============================================================================

const targets: DedupeTarget[] = [
  defineTarget({
    label: 'travel_guides (platform, external_id)',
    fetch: lastId => db.select().from(travelGuides).where(gt(travelGuides.id, lastId)).orderBy(asc(travelGuides.id)).limit(BATCH_SIZE),
    // NULL external_id (manual records) is exempt: MySQL unique indexes allow multiple NULLs.
    key: row => row.externalId === null ? null : `${row.platform}${KEY_SEP}${row.externalId}`,
    recency: row => row.updatedAt ?? row.crawledAt ?? row.createdAt,
    deleteIds: ids => db.delete(travelGuides).where(inArray(travelGuides.id, ids)),
  }),
  defineTarget({
    label: 'mafengwo_guides (guide_id)',
    fetch: lastId => db.select().from(mafengwoGuides).where(gt(mafengwoGuides.id, lastId)).orderBy(asc(mafengwoGuides.id)).limit(BATCH_SIZE),
    key: row => row.guideId,
    recency: row => row.updatedAt ?? row.crawledAt,
    deleteIds: ids => db.delete(mafengwoGuides).where(inArray(mafengwoGuides.id, ids)),
  }),
  defineTarget({
    label: 'mafengwo_destinations (mdd_id)',
    fetch: lastId => db.select().from(mafengwoDestinations).where(gt(mafengwoDestinations.id, lastId)).orderBy(asc(mafengwoDestinations.id)).limit(BATCH_SIZE),
    key: row => row.mddId,
    recency: row => row.updatedAt ?? row.crawledAt,
    deleteIds: ids => db.delete(mafengwoDestinations).where(inArray(mafengwoDestinations.id, ids)),
  }),
  defineTarget({
    label: 'mafengwo_pois (poi_id)',
    fetch: lastId => db.select().from(mafengwoPois).where(gt(mafengwoPois.id, lastId)).orderBy(asc(mafengwoPois.id)).limit(BATCH_SIZE),
    key: row => row.poiId,
    recency: row => row.updatedAt ?? row.crawledAt,
    deleteIds: ids => db.delete(mafengwoPois).where(inArray(mafengwoPois.id, ids)),
  }),
  defineTarget({
    label: 'mafengwo_qa (question_id)',
    fetch: lastId => db.select().from(mafengwoQa).where(gt(mafengwoQa.id, lastId)).orderBy(asc(mafengwoQa.id)).limit(BATCH_SIZE),
    key: row => row.questionId,
    recency: row => row.crawledAt,
    deleteIds: ids => db.delete(mafengwoQa).where(inArray(mafengwoQa.id, ids)),
  }),
  defineTarget({
    label: 'mafengwo_rankings (destination_id, ranking_type)',
    fetch: lastId => db.select().from(mafengwoRankings).where(gt(mafengwoRankings.id, lastId)).orderBy(asc(mafengwoRankings.id)).limit(BATCH_SIZE),
    // NULL destination_id is exempt from the composite unique index.
    key: row => row.destinationId === null ? null : `${row.destinationId}${KEY_SEP}${row.rankingType}`,
    recency: row => row.updatedAt ?? row.crawledAt,
    deleteIds: ids => db.delete(mafengwoRankings).where(inArray(mafengwoRankings.id, ids)),
  }),
];

// ============================================================================
// Main
// ============================================================================

async function main() {
  const apply = process.argv.includes('--apply');
  console.warn(`Dedupe crawler tables — mode: ${apply ? 'APPLY (rows will be deleted)' : 'dry-run (pass --apply to delete)'}`);

  const reports: TargetReport[] = [];
  try {
    for (const target of targets) {
      console.warn(`\nScanning ${target.label} ...`);
      reports.push(await dedupeTarget(target, apply));
    }
  }
  finally {
    await pool.end();
  }

  console.warn('\n=== Summary ===');
  for (const report of reports) {
    const action = apply ? 'deleted' : 'would delete';
    console.warn(
      `${report.label}: scanned=${report.scanned}, duplicateGroups=${report.duplicateGroups}, ${action}=${report.deletedIds.length}`,
    );
  }
  if (!apply && reports.some(r => r.deletedIds.length > 0)) {
    console.warn('\nDry-run only. Re-run with --apply to delete the rows listed above.');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
