/**
 * Backfill the guide_destinations auxiliary table from existing
 * travel_guides.destinations JSON (design D9, data-pipeline overhaul).
 *
 * The auxiliary table powers destination gap analysis and substring-free
 * city filtering, but historically had no writer. This script replays the
 * existing JSON into one (guide_id, destination) row per destination name,
 * skipping pairs that already exist.
 *
 * Usage:
 *   DATABASE_URL="mysql://root@127.0.0.1:4000/pathfinding" npx tsx scripts/backfill-guide-destinations.ts          # dry-run (default)
 *   DATABASE_URL="mysql://root@127.0.0.1:4000/pathfinding" npx tsx scripts/backfill-guide-destinations.ts --apply  # actually insert
 */

import { and, asc, gt, inArray, isNotNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, guideDestinations, travelGuides } from '../packages/database/src/index';

const BATCH_SIZE = 500;
const INSERT_CHUNK_SIZE = 200;
/** guide_destinations.destination is varchar(255). */
const MAX_DESTINATION_LENGTH = 255;

const pool = createPool();
const db = drizzle(pool, { mode: 'default' });

interface BackfillStats {
  scanned: number;
  guidesWithDestinations: number;
  malformedRows: number;
  skippedNames: number;
  existingPairs: number;
  insertedPairs: number;
}

/**
 * Extract clean destination names from one destinations JSON value.
 * Malformed entries are reported via the returned `skipped` count so
 * failures stay visible instead of silently shrinking the result.
 */
function extractDestinationNames(value: unknown): { names: string[]; skipped: number } {
  if (!Array.isArray(value))
    return { names: [], skipped: 0 };

  const names = new Set<string>();
  let skipped = 0;
  for (const entry of value) {
    const name = typeof entry === 'object' && entry !== null
      ? (entry as { name?: unknown }).name
      : entry;
    if (typeof name !== 'string' || name.trim() === '' || name.trim().length > MAX_DESTINATION_LENGTH) {
      skipped++;
      continue;
    }
    names.add(name.trim());
  }
  return { names: Array.from(names), skipped };
}

async function fetchExistingPairs(guideIds: number[]): Promise<Set<string>> {
  if (guideIds.length === 0)
    return new Set();
  const rows = await db
    .select({ guideId: guideDestinations.guideId, destination: guideDestinations.destination })
    .from(guideDestinations)
    .where(inArray(guideDestinations.guideId, guideIds));
  return new Set(rows.map(row => `${row.guideId}␟${row.destination}`));
}

async function main() {
  const apply = process.argv.includes('--apply');
  console.warn(`Backfill guide_destinations — mode: ${apply ? 'APPLY (rows will be inserted)' : 'dry-run (pass --apply to insert)'}`);

  const stats: BackfillStats = {
    scanned: 0,
    guidesWithDestinations: 0,
    malformedRows: 0,
    skippedNames: 0,
    existingPairs: 0,
    insertedPairs: 0,
  };

  try {
    let lastId = 0;
    for (;;) {
      const guides = await db
        .select({ id: travelGuides.id, destinations: travelGuides.destinations })
        .from(travelGuides)
        .where(and(isNotNull(travelGuides.destinations), gt(travelGuides.id, lastId)))
        .orderBy(asc(travelGuides.id))
        .limit(BATCH_SIZE);

      if (guides.length === 0)
        break;
      lastId = guides[guides.length - 1]!.id;
      stats.scanned += guides.length;

      const pending: Array<{ guideId: number; destination: string }> = [];
      for (const guide of guides) {
        if (guide.destinations === null)
          continue;
        if (!Array.isArray(guide.destinations)) {
          stats.malformedRows++;
          console.warn(`  guide id=${guide.id}: destinations JSON is not an array — skipped (fix at source)`);
          continue;
        }
        const { names, skipped } = extractDestinationNames(guide.destinations);
        stats.skippedNames += skipped;
        if (skipped > 0)
          console.warn(`  guide id=${guide.id}: skipped ${skipped} malformed/oversized destination entries`);
        if (names.length === 0)
          continue;
        stats.guidesWithDestinations++;
        for (const name of names)
          pending.push({ guideId: guide.id, destination: name });
      }

      if (pending.length === 0)
        continue;

      const existing = await fetchExistingPairs(Array.from(new Set(pending.map(p => p.guideId))));
      const missing = pending.filter(p => !existing.has(`${p.guideId}␟${p.destination}`));
      stats.existingPairs += pending.length - missing.length;

      for (const pair of missing)
        console.warn(`  ${apply ? 'insert' : 'would insert'} guide_id=${pair.guideId} destination=${pair.destination}`);

      if (apply) {
        for (let i = 0; i < missing.length; i += INSERT_CHUNK_SIZE) {
          await db.insert(guideDestinations).values(missing.slice(i, i + INSERT_CHUNK_SIZE));
        }
      }
      stats.insertedPairs += missing.length;
    }
  }
  finally {
    await pool.end();
  }

  console.warn('\n=== Summary ===');
  console.warn(`Scanned guides:             ${stats.scanned}`);
  console.warn(`Guides with destinations:   ${stats.guidesWithDestinations}`);
  console.warn(`Malformed destinations:     ${stats.malformedRows} rows, ${stats.skippedNames} entries`);
  console.warn(`Pairs already present:      ${stats.existingPairs}`);
  console.warn(`Pairs ${apply ? 'inserted' : 'to insert (dry-run)'}: ${stats.insertedPairs}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
