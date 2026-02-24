/* eslint-disable no-console */
import { ConvexClient } from 'convex/browser';
import * as dotenv from 'dotenv';
import { api } from '../convex/_generated/api.js';

dotenv.config({ path: '.env.local' });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error('Error: NEXT_PUBLIC_CONVEX_URL is not defined');
  process.exit(1);
}

const client = new ConvexClient(CONVEX_URL);

async function cleanHistoricalGuides() {
  console.log('Starting cleanup of historical guides...');

  try {
    // 1. Get all guides
    const guides = await client.query(api.travelGuides.list, { limit: 1000 });
    console.log(`Found ${guides.length} guides total`);

    // 2. Identify guides to remove
    // Remove guides that don't have a platform (old test data)
    const noPlatform = guides.filter(g => !g.sourcePlatform);
    console.log(`Found ${noPlatform.length} guides without platform`);

    // Remove guides with very short content (likely test data)
    const shortContent = guides.filter(g => g.content.length < 50);
    console.log(`Found ${shortContent.length} guides with short content (<50 chars)`);

    // Remove duplicates (same external ID and platform)
    const seen = new Set<string>();
    const duplicates = [];
    for (const guide of guides) {
      if (guide.sourcePlatform && guide.sourceExternalId) {
        const key = `${guide.sourcePlatform}:${guide.sourceExternalId}`;
        if (seen.has(key)) {
          duplicates.push(guide);
        }
        else {
          seen.add(key);
        }
      }
    }
    console.log(`Found ${duplicates.length} duplicate guides`);

    // 3. Delete them
    const toDelete = [...noPlatform, ...shortContent, ...duplicates];
    const uniqueIds = new Set(toDelete.map(g => g._id));

    console.log(`Total unique guides to delete: ${uniqueIds.size}`);

    if (uniqueIds.size > 0) {
      console.log('Deleting...');
      let deletedCount = 0;

      for (const id of uniqueIds) {
        try {
          await client.mutation(api.editOperations.deleteGuide, { id });
          deletedCount++;
          if (deletedCount % 10 === 0) {
            process.stdout.write('.');
          }
        }
        catch (e) {
          console.error(`Failed to delete guide ${id}:`, e);
        }
      }
      console.log('\nDone!');
    }
    else {
      console.log('No guides to delete');
    }
  }
  catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

cleanHistoricalGuides();
