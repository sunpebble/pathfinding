/**
 * Crawler Test Script
 * Tests the crawlers for various platforms
 */

import { crawlPlatform } from './lib/crawlers/index.js';
import { closeBrowser } from './lib/crawlers/browser.js';

async function testCrawler(platform: string, city: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${platform} crawler for ${city}`);
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    const results = await crawlPlatform(platform, city, { maxPages: 1 });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n[${platform}] Results:`);
    console.log(`- Total guides found: ${results.length}`);
    console.log(`- Duration: ${duration}s`);

    if (results.length > 0) {
      console.log('\nSample guides:');
      for (const guide of results.slice(0, 3)) {
        console.log(`\n  Title: ${guide.title?.substring(0, 50)}...`);
        console.log(`  URL: ${guide.sourceUrl}`);
        console.log(`  Author: ${guide.authorName}`);
        console.log(`  Tags: ${guide.tags?.join(', ')}`);
        console.log(`  Views: ${guide.viewsCount}, Likes: ${guide.likesCount || 0}`);
        console.log(`  Cover: ${guide.coverImageUrl?.substring(0, 50)}...`);
      }
    }

    return results;
  } catch (error) {
    console.error(`[${platform}] Error:`, error);
    return [];
  }
}

async function main() {
  const city = process.argv[2] || '杭州';
  const platforms = process.argv[3]
    ? [process.argv[3]]
    : ['mafengwo', 'tongcheng', 'xiaohongshu', 'ctrip'];

  console.log(`\nTesting crawlers for city: ${city}`);
  console.log(`Platforms: ${platforms.join(', ')}`);

  const allResults: Record<string, number> = {};

  for (const platform of platforms) {
    const results = await testCrawler(platform, city);
    allResults[platform] = results.length;
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('Summary');
  console.log('='.repeat(60));
  for (const [platform, count] of Object.entries(allResults)) {
    console.log(`${platform}: ${count} guides`);
  }

  // Close browser
  await closeBrowser();
  console.log('\nDone!');
}

main().catch(console.error);
