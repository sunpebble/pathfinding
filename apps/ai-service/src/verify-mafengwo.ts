import { crawlMafengwo } from './lib/crawlers/mafengwo.js';

async function verifyMafengwoExtraction() {
  console.log('=== Mafengwo Crawler Verification ===\n');

  const city = '杭州'; // Test with Hangzhou
  console.log(`Testing crawler for: ${city}`);
  console.log('Fetching 10 guides (maxPages: 1)...\n');

  const results = await crawlMafengwo(city, { maxPages: 1 });

  console.log(`\n=== Results: ${results.length} guides extracted ===\n`);

  // Field extraction statistics
  const stats = {
    total: results.length,
    hasContent: 0,
    contentLength: { min: Infinity, max: 0, avg: 0 },
    hasImages: 0,
    imageCount: { min: Infinity, max: 0, avg: 0 },
    hasAuthor: 0,
    hasPublishDate: 0,
    hasViews: 0,
    hasLikes: 0,
    hasSaves: 0,
    hasComments: 0,
    isPlaceholder: 0,
  };

  let totalContentLength = 0;
  let totalImageCount = 0;

  for (const guide of results) {
    // Content check
    const contentLen = guide.content?.length || 0;
    const isPlaceholder =
      guide.content?.includes('旅游攻略') && contentLen < 200;

    if (isPlaceholder) {
      stats.isPlaceholder++;
    }

    if (contentLen >= 100 && !isPlaceholder) {
      stats.hasContent++;
      totalContentLength += contentLen;
      stats.contentLength.min = Math.min(stats.contentLength.min, contentLen);
      stats.contentLength.max = Math.max(stats.contentLength.max, contentLen);
    }

    // Image check
    const imageCount = guide.imageUrls?.length || 0;
    if (imageCount > 0) {
      stats.hasImages++;
      totalImageCount += imageCount;
      stats.imageCount.min = Math.min(stats.imageCount.min, imageCount);
      stats.imageCount.max = Math.max(stats.imageCount.max, imageCount);
    }

    // Author check (not just default)
    if (guide.authorName && guide.authorName !== '马蜂窝用户') {
      stats.hasAuthor++;
    }

    // Date check
    if (guide.publishedAt) {
      stats.hasPublishDate++;
    }

    // Engagement metrics check
    if (guide.viewsCount && guide.viewsCount > 0) stats.hasViews++;
    if (guide.likesCount && guide.likesCount > 0) stats.hasLikes++;
    if (guide.savesCount && guide.savesCount > 0) stats.hasSaves++;
    if (guide.commentsCount && guide.commentsCount > 0) stats.hasComments++;
  }

  // Calculate averages
  if (stats.hasContent > 0) {
    stats.contentLength.avg = Math.round(totalContentLength / stats.hasContent);
  }
  if (stats.hasImages > 0) {
    stats.imageCount.avg = Math.round(totalImageCount / stats.hasImages);
  }

  // Print summary
  console.log('=== Field Extraction Summary ===\n');
  console.log(`Total guides: ${stats.total}`);
  console.log(
    `Placeholder content (BAD): ${stats.isPlaceholder} (${pct(stats.isPlaceholder, stats.total)})`
  );
  console.log(
    `Real content (>100 chars): ${stats.hasContent} (${pct(stats.hasContent, stats.total)})`
  );
  if (stats.hasContent > 0) {
    console.log(
      `  Content length: min=${stats.contentLength.min}, max=${stats.contentLength.max}, avg=${stats.contentLength.avg}`
    );
  }
  console.log(
    `Has images: ${stats.hasImages} (${pct(stats.hasImages, stats.total)})`
  );
  if (stats.hasImages > 0) {
    console.log(
      `  Image count: min=${stats.imageCount.min}, max=${stats.imageCount.max}, avg=${stats.imageCount.avg}`
    );
  }
  console.log(
    `Has author (not default): ${stats.hasAuthor} (${pct(stats.hasAuthor, stats.total)})`
  );
  console.log(
    `Has publish date: ${stats.hasPublishDate} (${pct(stats.hasPublishDate, stats.total)})`
  );
  console.log(
    `Has views: ${stats.hasViews} (${pct(stats.hasViews, stats.total)})`
  );
  console.log(
    `Has likes: ${stats.hasLikes} (${pct(stats.hasLikes, stats.total)})`
  );
  console.log(
    `Has saves: ${stats.hasSaves} (${pct(stats.hasSaves, stats.total)})`
  );
  console.log(
    `Has comments: ${stats.hasComments} (${pct(stats.hasComments, stats.total)})`
  );

  // Print sample guide
  if (results.length > 0) {
    console.log('\n=== Sample Guide (first result) ===\n');
    const sample = results[0];
    console.log(`Title: ${sample.title}`);
    console.log(`URL: ${sample.sourceUrl}`);
    console.log(`Content length: ${sample.content?.length || 0} chars`);
    console.log(`Content preview: ${sample.content?.substring(0, 200)}...`);
    console.log(`Images: ${sample.imageUrls?.length || 0}`);
    console.log(`Cover: ${sample.coverImageUrl || 'none'}`);
    console.log(`Author: ${sample.authorName}`);
    console.log(`Avatar: ${sample.authorAvatar || 'none'}`);
    console.log(`Published: ${sample.publishedAt || 'unknown'}`);
    console.log(
      `Views: ${sample.viewsCount}, Likes: ${sample.likesCount}, Saves: ${sample.savesCount}, Comments: ${sample.commentsCount}`
    );
    console.log(`Quality Score: ${sample.qualityScore}`);
  }

  // Final verdict
  console.log('\n=== Verification Verdict ===\n');

  const passed =
    stats.hasContent >= stats.total * 0.5 && stats.isPlaceholder === 0;

  if (passed) {
    console.log(
      '✅ PASSED: Mafengwo crawler extracts real content from detail pages'
    );
  } else {
    console.log('❌ FAILED: Issues detected');
    if (stats.isPlaceholder > 0) {
      console.log(
        `  - ${stats.isPlaceholder} guides still have placeholder content`
      );
    }
    if (stats.hasContent < stats.total * 0.5) {
      console.log(
        `  - Only ${stats.hasContent}/${stats.total} guides have sufficient content`
      );
    }
  }

  return { passed, stats };
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

verifyMafengwoExtraction().catch(console.error);
