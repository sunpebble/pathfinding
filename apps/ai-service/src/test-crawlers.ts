/**
 * Crawler Test Script
 * Tests the crawlers for various platforms
 */

import { crawlCtrip } from './lib/crawlers/ctrip.js';
import { crawlPlatform } from './lib/crawlers/index.js';
import { disconnect } from './lib/crawlers/mcp-client.js';

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
        console.log(
          `  Views: ${guide.viewsCount}, Likes: ${guide.likesCount || 0}`
        );
        console.log(`  Cover: ${guide.coverImageUrl?.substring(0, 50)}...`);
      }
    }

    return results;
  } catch (error) {
    console.error(`[${platform}] Error:`, error);
    return [];
  }
}

async function verifyCtripExtraction() {
  console.log('\n=== Ctrip Extraction Verification ===\n');

  const results = await crawlCtrip('上海', { maxPages: 1 });

  console.log(`Total guides extracted: ${results.length}`);

  // Field completeness tracking
  const fieldStats = {
    content: 0,
    imageUrls: 0,
    highResImages: 0,
    authorName: 0,
    authorAvatar: 0,
    publishedAt: 0,
    likesCount: 0,
    savesCount: 0,
    commentsCount: 0,
    viewsCount: 0,
  };

  for (const result of results) {
    // Content check (CTRIP-01)
    if (result.content && result.content.length > 100) {
      fieldStats.content++;
    }

    // Image check (CTRIP-02)
    if (result.imageUrls && result.imageUrls.length > 0) {
      fieldStats.imageUrls++;
      // Check for high-res pattern
      const hasHighRes = result.imageUrls.some(
        (url) => url.includes('_W_0_0_Q100') || !url.includes('_W_')
      );
      if (hasHighRes) fieldStats.highResImages++;
    }

    // Author check (CTRIP-03)
    if (result.authorName && result.authorName !== '携程用户') {
      fieldStats.authorName++;
    }
    if (result.authorAvatar) {
      fieldStats.authorAvatar++;
    }

    // Date check (CTRIP-04)
    if (result.publishedAt) {
      fieldStats.publishedAt++;
    }

    // Engagement check (CTRIP-05)
    if (result.likesCount && result.likesCount > 0) fieldStats.likesCount++;
    if (result.savesCount && result.savesCount > 0) fieldStats.savesCount++;
    if (result.commentsCount && result.commentsCount > 0)
      fieldStats.commentsCount++;
    if (result.viewsCount && result.viewsCount > 0) fieldStats.viewsCount++;
  }

  // Print results
  console.log('\nField Extraction Rates:');
  console.log('------------------------');
  for (const [field, count] of Object.entries(fieldStats)) {
    const rate =
      results.length > 0 ? Math.round((count / results.length) * 100) : 0;
    const status = rate >= 50 ? '✓' : rate >= 20 ? '~' : '✗';
    console.log(`${status} ${field}: ${count}/${results.length} (${rate}%)`);
  }

  // Sample output
  if (results.length > 0) {
    console.log('\n--- Sample Result ---');
    const sample = results[0];
    console.log(`Title: ${sample.title}`);
    console.log(`Content length: ${sample.content?.length || 0} chars`);
    console.log(`Images: ${sample.imageUrls?.length || 0}`);
    console.log(`Author: ${sample.authorName}`);
    console.log(`Avatar: ${sample.authorAvatar || 'N/A'}`);
    console.log(`Published: ${sample.publishedAt || 'N/A'}`);
    console.log(`Likes: ${sample.likesCount}, Views: ${sample.viewsCount}`);
    console.log(
      `Saves: ${sample.savesCount}, Comments: ${sample.commentsCount}`
    );
    if (sample.imageUrls?.[0]) {
      console.log(
        `First image URL: ${sample.imageUrls[0].substring(0, 80)}...`
      );
    }
  }

  // Success criteria check
  const passed =
    fieldStats.content >= 3 &&
    fieldStats.highResImages >= 3 &&
    (fieldStats.likesCount >= 1 || fieldStats.viewsCount >= 1);

  console.log(`\n=== VERIFICATION ${passed ? 'PASSED' : 'NEEDS REVIEW'} ===`);

  return { results, fieldStats, passed };
}

async function main() {
  // Check for verification mode
  if (process.argv.includes('--verify-ctrip')) {
    await verifyCtripExtraction();
    await disconnect();
    return;
  }

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

  // Close MCP client
  await disconnect();
  console.log('\nDone!');
}

main().catch(console.error);
