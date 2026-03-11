/**
 * Historical guide cleanup script.
 * Reads guides from TiDB, cleans their content, and writes updates back.
 */

import { createDb, travelGuides } from '@pathfinding/database';
import { asc, eq } from 'drizzle-orm';
import { cleanContent } from '../packages/crawler-types/src/content-cleaner.js';

const BATCH_SIZE = 50;

async function main() {
  console.warn('Starting historical guide cleanup...');

  const db = createDb();
  let offset = 0;
  let totalProcessed = 0;
  let totalCleaned = 0;
  let totalSkipped = 0;

  while (true) {
    const guides = await db
      .select({
        id: travelGuides.id,
        title: travelGuides.title,
        externalId: travelGuides.externalId,
        content: travelGuides.content,
      })
      .from(travelGuides)
      .orderBy(asc(travelGuides.id))
      .limit(BATCH_SIZE)
      .offset(offset);

    if (guides.length === 0) {
      break;
    }

    for (const guide of guides) {
      totalProcessed++;

      try {
        if (!guide.content) {
          totalSkipped++;
          continue;
        }

        const cleanResult = cleanContent(guide.content, {
          categories: ['ad', 'promotion', 'personal', 'platform', 'copyright', 'boilerplate', 'whitespace'],
          preserveParagraphs: true,
        });

        if (cleanResult.cleanedLength === cleanResult.originalLength) {
          totalSkipped++;
          if (totalProcessed % 20 === 0) {
            console.warn(`[${totalProcessed}] skipped unchanged guide`);
          }
          continue;
        }

        await db
          .update(travelGuides)
          .set({ content: cleanResult.content })
          .where(eq(travelGuides.id, guide.id));

        totalCleaned++;
        const pct = Math.round((1 - cleanResult.cleanedLength / cleanResult.originalLength) * 100);
        console.warn(
          `[${totalProcessed}] cleaned ${guide.title?.slice(0, 30) || guide.externalId || guide.id} (${cleanResult.originalLength} -> ${cleanResult.cleanedLength}, ${pct}% removed)`,
        );
      }
      catch (error) {
        console.error(`[${totalProcessed}] guide ${guide.id} failed:`, error);
      }
    }

    offset += guides.length;
  }

  console.warn('Cleanup complete');
  console.warn(`Processed: ${totalProcessed}`);
  console.warn(`Cleaned:   ${totalCleaned}`);
  console.warn(`Skipped:   ${totalSkipped}`);
}

main().catch(console.error);
