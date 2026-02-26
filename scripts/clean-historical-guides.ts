/* eslint-disable no-console */
import { ConvexHttpClient } from 'convex/browser';
import * as dotenv from 'dotenv';
import { api } from '../convex/_generated/api.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const CONVEX_URL = process.env.CONVEX_URL;
if (!CONVEX_URL) {
  console.error('Error: CONVEX_URL is not defined in .env.local');
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
  console.log('Starting cleanup of historical guides...');

  try {
    // 1. Remove duplicates
    console.log('\n--- Removing duplicates ---');
    // For each platform, run deduplication
    const platforms = [
      'xiaohongshu',
      'weibo',
      'ctrip',
      'douyin',
      'tripadvisor',
      'qunar',
      'tongcheng',
      'mafengwo',
      'qyer',
    ];

    for (const platform of platforms) {
      console.log(`Processing platform: ${platform}`);
      // @ts-expect-error - using any for simplicity in script
      const result = await client.mutation(api.travelGuides.removeDuplicates, {
        platform,
      });
      console.log(`  Removed ${result.removedCount} duplicates`);
      console.log(`  Total remaining: ${result.totalAfter}`);
    }

    // 2. Remove short/truncated content
    console.log('\n--- Removing short/truncated content ---');
    // @ts-expect-error - using any for simplicity in script
    const shortResult = await client.mutation(
      api.travelGuides.removeShortContent,
      {
        minLength: 100, // Very short content
      },
    );
    console.log(`Removed ${shortResult.removedCount} guides with short content`);

    console.log('\nCleanup completed successfully!');
  }
  catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

main();
