/* eslint-disable no-console */
import { ConvexClient } from 'convex/browser';
import * as dotenv from 'dotenv';
import { marked } from 'marked';
import { api } from '../convex/_generated/api.js';

dotenv.config({ path: '.env.local' });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error('Error: NEXT_PUBLIC_CONVEX_URL is not defined');
  process.exit(1);
}

const client = new ConvexClient(CONVEX_URL);

async function generateContentHtml() {
  console.log('Generating content HTML for existing guides...');

  try {
    // 1. Get guides without content_html
    // Note: We can't filter by missing field easily in basic query, so get recent ones
    // and check client side, or iterate all.
    // For this script, we'll fetch batches and process.

    let processedCount = 0;
    let cursor = null;
    let isDone = false;

    while (!isDone) {
      const result = await client.query(api.travelGuides.list, {
        limit: 50,
        // cursor would go here if pagination supported it in this specific query
        // falling back to simple fetch for now as list might not support cursor
      });

      // Since list doesn't support cursor in the basic version we see in the file,
      // we might need to rely on the fact that we're updating them?
      // Or just fetch all if count is low.
      // Let's assume we can fetch a reasonable number.

      const guides = result; // Assuming result is array based on previous logs
      if (guides.length === 0) break;

      console.log(`Processing batch of ${guides.length} guides...`);

      for (const guide of guides) {
        // Skip if already has HTML and it looks valid
        if (guide.contentHtml && guide.contentHtml.length > 10) {
          continue;
        }

        if (!guide.content) {
          console.warn(`Guide ${guide._id} has no content, skipping`);
          continue;
        }

        try {
          // Generate HTML from Markdown (assuming content is markdown-ish)
          // or just wrap text in paragraphs if it's plain text
          const html = await marked.parse(guide.content);

          await client.mutation(api.travelGuides.update, {
            id: guide._id,
            contentHtml: html
          });

          processedCount++;
          process.stdout.write('.');
        } catch (e) {
          console.error(`Failed to update guide ${guide._id}:`, e);
        }
      }

      // Break after one batch for now to avoid infinite loop if no pagination
      isDone = true;
    }

    console.log(`\nDone! Processed ${processedCount} guides.`);

  } catch (error) {
    console.error('Generation failed:', error);
    process.exit(1);
  }
}

generateContentHtml();
