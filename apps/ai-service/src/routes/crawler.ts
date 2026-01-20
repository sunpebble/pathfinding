/**
 * Crawler Router
 * Handles crawl job execution for travel guide platforms
 */

import type { Id } from '../../../../convex/_generated/dataModel.js';
import type {CrawlResult} from '../lib/crawlers/index.js';
import { Hono } from 'hono';
import { api } from '../../../../convex/_generated/api.js';
import { convex } from '../lib/convex.js';
import { crawlPlatform  } from '../lib/crawlers/index.js';

export const crawlerRouter = new Hono();

// Active jobs tracking
const activeJobs = new Map<string, { status: string; startedAt: Date }>();

/**
 * POST /execute
 * Execute a crawl job
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
 */
async function executeJob(jobId: string, job: any) {
  const startTime = Date.now();
  const statistics = {
    requests_total: 0,
    requests_success: 0,
    requests_failed: 0,
    records_extracted: 0,
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

    // Save guides to database
    console.log(`[Crawler] Saving ${results.length} guides to database`);

    for (const guide of results) {
      try {
        await convex.mutation(api.travelGuides.upsert, {
          sourcePlatform: job.platform,
          sourceExternalId: guide.sourceExternalId,
          sourceUrl: guide.sourceUrl,
          title: guide.title,
          content: guide.content,
          authorName: guide.authorName,
          coverImageUrl: guide.coverImageUrl,
          imageUrls: guide.imageUrls || [],
          destinations: guide.destinations || [],
          tags: guide.tags || [],
          likesCount: guide.likesCount || 0,
          savesCount: guide.savesCount || 0,
          commentsCount: guide.commentsCount || 0,
          viewsCount: guide.viewsCount || 0,
          qualityScore: guide.qualityScore || 50,
          crawledAt: Date.now(),
        });
      } catch (error) {
        console.error(`[Crawler] Error saving guide:`, error);
      }
    }

    // Complete the job
    statistics.duration_seconds = Math.floor((Date.now() - startTime) / 1000);
    await convex.mutation(api.crawlJobs.complete, {
      id: jobId as Id<'crawlJobs'>,
      statistics,
    });

    console.log(
      `[Crawler] Job ${jobId} completed. Extracted ${results.length} guides.`
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
