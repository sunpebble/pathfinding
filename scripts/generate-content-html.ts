/* eslint-disable no-console */
import { ConvexHttpClient } from 'convex/browser';
import * as dotenv from 'dotenv';
import { marked } from 'marked';
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
  console.log('Starting HTML content generation...');

  try {
    // 1. Get all guides without contentHtml
    // We can't query for "missing" fields easily, so we'll fetch recent ones and check
    const guides = await client.query(api.travelGuides.list, { limit: 100 });
    console.log(`Fetched ${guides.length} guides`);

    let updatedCount = 0;

    for (const guide of guides) {
      // @ts-expect-error - accessing internal fields
      if (guide.content && !guide.contentHtml) {
        console.log(`Generating HTML for guide: ${guide._id}`);

        // Convert Markdown to HTML
        const html = await marked(guide.content);

        // Update the guide
        // @ts-expect-error - internal mutation not exposed in types potentially
        await client.mutation(api.travelGuides.update, {
          id: guide._id,
          // @ts-expect-error - adding field
          contentHtml: html,
        });

        updatedCount++;
      }
    }

    console.log(`Updated ${updatedCount} guides with HTML content`);
  }
  catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
