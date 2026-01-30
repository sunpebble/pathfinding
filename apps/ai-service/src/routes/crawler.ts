/**
 * Crawler Router
 * Handles crawl job execution for travel guide platforms
 * Now includes LLM-based content cleaning before storage
 */

// @ts-expect-error - Convex generated files may not exist during type checking
import type { Id } from '../../../../convex/_generated/dataModel.js';
import type { CrawlResult } from '../lib/crawlers/index.js';
import { Hono } from 'hono';
// @ts-expect-error - Convex generated files may not exist during type checking
import { api } from '../../../../convex/_generated/api.js';
import { cleanContentWithLLM } from '../lib/content-cleaner.js';
import { convex } from '../lib/convex.js';
import { crawlPlatform } from '../lib/crawlers/index.js';

export const crawlerRouter = new Hono();

// Active jobs tracking
const activeJobs = new Map<string, { status: string; startedAt: Date }>();

/**
 * POST /clean-all
 * Clean all existing guides in the database using LLM
 * Supports cursor-based pagination for processing large datasets
 */
crawlerRouter.post('/clean-all', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { limit = 100, cursor = null } = body;

  try {
    // Get guide IDs using cursor-based pagination
    console.log(
      `[CleanAll] Fetching guides (limit=${limit}, cursor=${cursor || 'start'})...`
    );

    const listResult = await convex.query(api.travelGuides.listIds, {
      limit,
      cursor: cursor || undefined,
    });

    if (!listResult.items || listResult.items.length === 0) {
      return c.json({
        success: true,
        message: 'No guides to clean',
        cleaned: 0,
        nextCursor: null,
        isDone: true,
      });
    }

    console.log(`[CleanAll] Found ${listResult.items.length} guides to clean`);

    const results = {
      total: listResult.items.length,
      cleaned: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{
        id: string;
        title: string;
        status: string;
        reduction?: number;
      }>,
    };

    // Process each guide
    for (const guideInfo of listResult.items) {
      try {
        // Fetch full guide content
        const guide = await convex.query(api.travelGuides.getById, {
          id: guideInfo._id,
        });
        if (!guide) {
          results.skipped++;
          results.details.push({
            id: guideInfo._id,
            title: guideInfo.title || '',
            status: 'skipped',
          });
          continue;
        }

        console.log(`[CleanAll] Cleaning: ${guide.title?.substring(0, 30)}...`);

        const cleaned = await cleanContentWithLLM({
          title: guide.title || '',
          content: guide.content || '',
          sourceUrl: guide.sourceUrl || '',
          platform: guide.sourcePlatform || 'unknown',
        });

        // Skip if no significant change
        if (cleaned.cleanedLength >= cleaned.originalLength * 0.95) {
          results.skipped++;
          results.details.push({
            id: guide._id,
            title: guide.title || '',
            status: 'skipped',
          });
          continue;
        }

        // Update the guide in database
        await convex.mutation(api.travelGuides.update, {
          id: guide._id,
          content: cleaned.content,
          title: cleaned.title || guide.title,
          aiSummary: cleaned.summary || guide.aiSummary,
        });

        const reduction = Math.round(
          (1 - cleaned.cleanedLength / cleaned.originalLength) * 100
        );
        results.cleaned++;
        results.details.push({
          id: guide._id,
          title: guide.title || '',
          status: 'cleaned',
          reduction,
        });

        console.log(`[CleanAll] ✓ Cleaned ${guide._id}: ${reduction}% reduced`);

        // Rate limiting
        await sleep(300);
      } catch (error) {
        console.error(`[CleanAll] Error cleaning ${guideInfo._id}:`, error);
        results.failed++;
        results.details.push({
          id: guideInfo._id,
          title: guideInfo.title || '',
          status: 'failed',
        });
      }
    }

    console.log(
      `[CleanAll] Batch complete: ${results.cleaned} cleaned, ${results.skipped} skipped, ${results.failed} failed`
    );

    return c.json({
      success: true,
      results,
      nextCursor: listResult.cursor,
      isDone: listResult.isDone,
    });
  } catch (error) {
    console.error('[CleanAll] Error:', error);
    return c.json(
      { error: 'Failed to clean guides', details: String(error) },
      500
    );
  }
});

/**
 * POST /clean
 * Clean raw crawled content using LLM
 * This endpoint receives raw content and returns cleaned content
 */
crawlerRouter.post('/clean', async (c) => {
  const body = await c.req.json();
  const { title, content, sourceUrl, platform } = body;

  if (!content) {
    return c.json({ error: 'Missing content' }, 400);
  }

  try {
    console.log(
      `[Cleaner] Cleaning content from ${platform}: ${title?.substring(0, 50)}...`
    );

    const cleaned = await cleanContentWithLLM({
      title: title || '',
      content,
      sourceUrl: sourceUrl || '',
      platform: platform || 'unknown',
    });

    console.log(
      `[Cleaner] Cleaned: ${cleaned.originalLength} -> ${cleaned.cleanedLength} chars (${Math.round((1 - cleaned.cleanedLength / cleaned.originalLength) * 100)}% reduced)`
    );

    return c.json({
      success: true,
      data: cleaned,
    });
  } catch (error) {
    console.error('[Cleaner] Error:', error);
    return c.json({ error: 'Content cleaning failed' }, 500);
  }
});

/**
 * POST /process
 * Process raw crawled data: clean with LLM and save to database
 * This is the main endpoint for the Python crawler to send data
 */
crawlerRouter.post('/process', async (c) => {
  const body = await c.req.json();
  const { guides, platform, city } = body;

  if (!guides || !Array.isArray(guides)) {
    return c.json({ error: 'Missing or invalid guides array' }, 400);
  }

  const results = {
    total: guides.length,
    cleaned: 0,
    saved: 0,
    failed: 0,
    details: [] as Array<{ id: string; status: string; error?: string }>,
  };

  console.log(
    `[Processor] Processing ${guides.length} guides from ${platform}/${city}`
  );

  for (const guide of guides) {
    try {
      // Step 1: Clean content with LLM
      console.log(`[Processor] Cleaning: ${guide.title?.substring(0, 30)}...`);

      const cleaned = await cleanContentWithLLM({
        title: guide.title || '',
        content: guide.content || '',
        sourceUrl: guide.sourceUrl || '',
        platform: platform || 'unknown',
      });

      results.cleaned++;

      // Skip if content is too short after cleaning
      if (cleaned.cleanedLength < 100) {
        console.log(
          `[Processor] Skipped (too short after cleaning): ${guide.sourceExternalId}`
        );
        results.details.push({
          id: guide.sourceExternalId,
          status: 'skipped',
          error: 'Content too short after cleaning',
        });
        continue;
      }

      // Step 2: Save to Convex with cleaned content
      console.log(`[Processor] Saving: ${guide.sourceExternalId}`);

      const upsertArgs: Record<string, unknown> = {
        sourcePlatform: platform,
        sourceExternalId: guide.sourceExternalId,
        sourceUrl: guide.sourceUrl,
        title: cleaned.title || guide.title,
        content: cleaned.content,
        authorName: guide.authorName || `${platform}用户`,
        imageUrls: guide.imageUrls || [],
        destinations: guide.destinations || (city ? [city] : []),
        tags: guide.tags || [],
        likesCount: guide.likesCount || 0,
        savesCount: guide.savesCount || 0,
        commentsCount: guide.commentsCount || 0,
        viewsCount: guide.viewsCount || 0,
        qualityScore: guide.qualityScore || 50,
      };

      // Only add coverImageUrl if it exists (Convex v.optional issue)
      if (guide.coverImageUrl) {
        upsertArgs.coverImageUrl = guide.coverImageUrl;
      }

      // Add AI-generated summary if available
      if (cleaned.summary) {
        upsertArgs.aiSummary = cleaned.summary;
      }

      await convex.mutation(api.travelGuides.upsert, upsertArgs as any);
      results.saved++;
      results.details.push({
        id: guide.sourceExternalId,
        status: 'saved',
      });

      // Rate limiting between saves
      await sleep(200);
    } catch (error) {
      console.error(
        `[Processor] Error processing ${guide.sourceExternalId}:`,
        error
      );
      results.failed++;
      results.details.push({
        id: guide.sourceExternalId,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(
    `[Processor] Complete: ${results.saved} saved, ${results.failed} failed out of ${results.total}`
  );

  return c.json({
    success: results.failed === 0,
    results,
  });
});

/**
 * POST /execute
 * Execute a crawl job (legacy endpoint, now with LLM cleaning)
 */
crawlerRouter.post('/execute', async (c) => {
  const body = await c.req.json();
  const { jobId } = body;

  if (!jobId) {
    return c.json({ error: 'Missing jobId' }, 400);
  }

  // Check if job is already running
  if (activeJobs.has(jobId)) {
    return c.json(
      { error: 'Job is already running', status: activeJobs.get(jobId) },
      409
    );
  }

  try {
    // Get job details from Convex
    const job = await convex.query(api.crawlJobs.getById, {
      id: jobId as Id<'crawlJobs'>,
    });

    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    // Mark job as running in local tracking
    activeJobs.set(jobId, { status: 'running', startedAt: new Date() });

    // Start async execution (don't await)
    executeJob(jobId, job).catch((error) => {
      console.error(`Job ${jobId} failed:`, error);
    });

    return c.json({
      message: 'Job execution started',
      jobId,
      platform: job.platform,
    });
  } catch (error) {
    activeJobs.delete(jobId);
    console.error('Error starting job:', error);
    return c.json({ error: 'Failed to start job' }, 500);
  }
});

/**
 * GET /status
 * Get crawler service status
 */
crawlerRouter.get('/status', (c) => {
  const jobs = Array.from(activeJobs.entries()).map(([id, info]) => ({
    id,
    ...info,
    runningFor: Date.now() - info.startedAt.getTime(),
  }));

  return c.json({
    activeJobs: jobs,
    totalActive: activeJobs.size,
  });
});

/**
 * POST /cancel/:jobId
 * Cancel a running job
 */
crawlerRouter.post('/cancel/:jobId', async (c) => {
  const jobId = c.req.param('jobId');

  if (activeJobs.has(jobId)) {
    activeJobs.delete(jobId);
    // Update job status in Convex
    await convex.mutation(api.crawlJobs.cancel, {
      id: jobId as Id<'crawlJobs'>,
    });
    return c.json({ message: 'Job cancelled', jobId });
  }

  return c.json({ error: 'Job not found or not running' }, 404);
});

/**
 * Execute a crawl job asynchronously
 * Now includes LLM-based content cleaning
 */
async function executeJob(jobId: string, job: any) {
  const startTime = Date.now();
  const statistics = {
    requests_total: 0,
    requests_success: 0,
    requests_failed: 0,
    records_extracted: 0,
    records_cleaned: 0,
    bytes_downloaded: 0,
    duration_seconds: 0,
  };

  try {
    console.log(
      `[Crawler] Starting job ${jobId} for platform: ${job.platform}`
    );

    // Get cities from config
    const cities = job.config?.geographic_scope?.cities || ['北京', '上海'];

    // Execute crawl for the platform
    const results: CrawlResult[] = [];

    for (const city of cities) {
      // Check if job was cancelled
      if (!activeJobs.has(jobId)) {
        console.log(`[Crawler] Job ${jobId} was cancelled`);
        return;
      }

      console.log(`[Crawler] Crawling ${job.platform} for city: ${city}`);

      try {
        const cityResults = await crawlPlatform(job.platform, city, {
          maxPages: job.config?.max_pages || 5,
          rateLimit: job.config?.rate_limit?.requests_per_second || 0.5,
        });

        results.push(...cityResults);
        statistics.requests_success += 1;
        statistics.records_extracted += cityResults.length;

        // Update statistics periodically
        statistics.duration_seconds = Math.floor(
          (Date.now() - startTime) / 1000
        );
        await convex.mutation(api.crawlJobs.updateStatistics, {
          id: jobId as Id<'crawlJobs'>,
          statistics,
        });
      } catch (error) {
        console.error(`[Crawler] Error crawling ${city}:`, error);
        statistics.requests_failed += 1;
      }

      statistics.requests_total += 1;

      // Rate limiting
      await sleep(2000);
    }

    // Clean and save guides to database
    console.log(
      `[Crawler] Cleaning and saving ${results.length} guides to database`
    );

    for (const guide of results) {
      try {
        // Clean content with LLM
        const cleaned = await cleanContentWithLLM({
          title: guide.title || '',
          content: guide.content || '',
          sourceUrl: guide.sourceUrl || '',
          platform: job.platform || 'unknown',
        });

        statistics.records_cleaned++;

        // Skip if content is too short after cleaning
        if (cleaned.cleanedLength < 100) {
          console.log(
            `[Crawler] Skipped (too short): ${guide.sourceExternalId}`
          );
          continue;
        }

        // Build upsert args
        const upsertArgs: Record<string, unknown> = {
          sourcePlatform: job.platform,
          sourceExternalId: guide.sourceExternalId,
          sourceUrl: guide.sourceUrl,
          title: cleaned.title || guide.title,
          content: cleaned.content,
          authorName: guide.authorName,
          imageUrls: guide.imageUrls || [],
          destinations: guide.destinations || [],
          tags: guide.tags || [],
          likesCount: guide.likesCount || 0,
          savesCount: guide.savesCount || 0,
          commentsCount: guide.commentsCount || 0,
          viewsCount: guide.viewsCount || 0,
          qualityScore: guide.qualityScore || 50,
        };

        // Only add optional fields if they exist
        if (guide.coverImageUrl) {
          upsertArgs.coverImageUrl = guide.coverImageUrl;
        }
        if (cleaned.summary) {
          upsertArgs.aiSummary = cleaned.summary;
        }

        await convex.mutation(api.travelGuides.upsert, upsertArgs as any);
      } catch (error) {
        console.error(`[Crawler] Error saving guide:`, error);
      }

      // Rate limiting between LLM calls
      await sleep(500);
    }

    // Complete the job
    statistics.duration_seconds = Math.floor((Date.now() - startTime) / 1000);
    await convex.mutation(api.crawlJobs.complete, {
      id: jobId as Id<'crawlJobs'>,
      statistics,
    });

    console.log(
      `[Crawler] Job ${jobId} completed. Extracted ${results.length}, cleaned ${statistics.records_cleaned} guides.`
    );
  } catch (error) {
    console.error(`[Crawler] Job ${jobId} failed:`, error);

    statistics.duration_seconds = Math.floor((Date.now() - startTime) / 1000);
    await convex.mutation(api.crawlJobs.fail, {
      id: jobId as Id<'crawlJobs'>,
      errorMessage: error instanceof Error ? error.message : String(error),
      statistics,
    });
  } finally {
    activeJobs.delete(jobId);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
