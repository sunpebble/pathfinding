/**
 * Crawler Router
 * Handles crawl job execution for travel guide platforms
 * Now includes LLM-based content cleaning before storage
 */

import type { Id } from '@pathfinding/convex-client/dataModel';
import type { GuideValidationInput } from '@pathfinding/crawler-types';
import type { FunctionArgs } from 'convex/server';
import type { CrawlResult } from '../lib/crawlers/index.js';
import { api } from '@pathfinding/convex-client/api';
import { validateGuides } from '@pathfinding/crawler-types';
import { Hono } from 'hono';
import { ALL_CITIES, isValidCity, isValidPlatform, SUPPORTED_PLATFORMS } from '../config/cities.js';
import { cleanContentWithLLM } from '../lib/content-cleaner.js';
import { convex } from '../lib/convex.js';
import { crawlPlatform } from '../lib/crawlers/index.js';
import { parallelCrawlerManager } from '../lib/crawlers/parallel-crawler.js';
import { loggers } from '../lib/logger.js';

interface CrawlJobConfig {
  geographic_scope?: {
    cities?: string[];
  };
  max_pages?: number;
  rate_limit?: {
    requests_per_second?: number;
  };
}

interface CrawlJob {
  _id: Id<'crawlJobs'>;
  platform: string;
  config?: CrawlJobConfig;
}

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
    loggers.crawler.info(
      { limit, cursor: cursor || 'start' },
      '[CleanAll] Fetching guides',
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

    loggers.crawler.info(
      { count: listResult.items.length },
      '[CleanAll] Found guides to clean',
    );

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

        loggers.crawler.info(
          { guideId: guide._id, title: guide.title?.substring(0, 30) },
          '[CleanAll] Cleaning guide',
        );

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
          (1 - cleaned.cleanedLength / cleaned.originalLength) * 100,
        );
        results.cleaned++;
        results.details.push({
          id: guide._id,
          title: guide.title || '',
          status: 'cleaned',
          reduction,
        });

        loggers.crawler.info(
          { guideId: guide._id, reduction },
          '[CleanAll] ✓ Cleaned guide',
        );

        // Rate limiting
        await sleep(300);
      }
      catch (error) {
        loggers.crawler.error(
          { guideId: guideInfo._id, error },
          '[CleanAll] Error cleaning guide',
        );
        results.failed++;
        results.details.push({
          id: guideInfo._id,
          title: guideInfo.title || '',
          status: 'failed',
        });
      }
    }

    loggers.crawler.info(
      {
        cleaned: results.cleaned,
        skipped: results.skipped,
        failed: results.failed,
      },
      '[CleanAll] Batch complete',
    );

    return c.json({
      success: true,
      results,
      nextCursor: listResult.cursor,
      isDone: listResult.isDone,
    });
  }
  catch (error) {
    loggers.crawler.error({ error }, '[CleanAll] Error');
    return c.json(
      { error: 'Failed to clean guides', details: String(error) },
      500,
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
    loggers.crawler.info(
      { platform, title: title?.substring(0, 50) },
      '[Cleaner] Cleaning content',
    );

    const cleaned = await cleanContentWithLLM({
      title: title || '',
      content,
      sourceUrl: sourceUrl || '',
      platform: platform || 'unknown',
    });

    const reduction = Math.round(
      (1 - cleaned.cleanedLength / cleaned.originalLength) * 100,
    );
    loggers.crawler.info(
      {
        originalLength: cleaned.originalLength,
        cleanedLength: cleaned.cleanedLength,
        reduction,
      },
      '[Cleaner] Cleaned content',
    );

    return c.json({
      success: true,
      data: cleaned,
    });
  }
  catch (error) {
    loggers.crawler.error({ error }, '[Cleaner] Error');
    return c.json({ error: 'Content cleaning failed' }, 500);
  }
});

/**
 * POST /process
 * Process raw crawled data: validate, clean with LLM and save to database
 * This is the main endpoint for the Python crawler to send data
 */
crawlerRouter.post('/process', async (c) => {
  const body = await c.req.json();
  const { guides, platform, city } = body;

  if (!guides || !Array.isArray(guides)) {
    return c.json({ error: 'Missing or invalid guides array' }, 400);
  }

  // === Step 0: Validate all guides before processing ===
  const guidesWithPlatform = guides.map((guide: Record<string, unknown>) => ({
    ...guide,
    sourcePlatform: platform as string,
    destinations: (guide.destinations as string[] | undefined) || (city ? [city] : []),
  } as GuideValidationInput));

  const validationResult = validateGuides(guidesWithPlatform);

  if (!validationResult.valid) {
    loggers.crawler.warn(
      { totalErrors: validationResult.totalErrors, invalidCount: validationResult.results.length },
      '[Processor] Validation failed for batch',
    );

    return c.json({
      error: 'Validation failed',
      validationErrors: validationResult.results.map(r => ({
        index: r.index,
        errors: r.result.errors,
      })),
      totalErrors: validationResult.totalErrors,
    }, 400);
  }

  const results = {
    total: guides.length,
    cleaned: 0,
    saved: 0,
    failed: 0,
    details: [] as Array<{ id: string; status: string; error?: string }>,
  };

  loggers.crawler.info(
    { count: guides.length, platform, city },
    '[Processor] Processing guides',
  );

  for (const guide of guides) {
    try {
      // Step 1: Clean content with LLM
      loggers.crawler.info(
        { title: guide.title?.substring(0, 30) },
        '[Processor] Cleaning guide',
      );

      const cleaned = await cleanContentWithLLM({
        title: guide.title || '',
        content: guide.content || '',
        sourceUrl: guide.sourceUrl || '',
        platform: platform || 'unknown',
      });

      results.cleaned++;

      // Skip if content is too short after cleaning
      if (cleaned.cleanedLength < 100) {
        loggers.crawler.info(
          { sourceExternalId: guide.sourceExternalId },
          '[Processor] Skipped (too short after cleaning)',
        );
        results.details.push({
          id: guide.sourceExternalId,
          status: 'skipped',
          error: 'Content too short after cleaning',
        });
        continue;
      }

      // Step 2: Save to Convex with cleaned content
      loggers.crawler.info(
        { sourceExternalId: guide.sourceExternalId },
        '[Processor] Saving guide',
      );

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

      await convex.mutation(
        api.travelGuides.upsert,
        upsertArgs as FunctionArgs<typeof api.travelGuides.upsert>,
      );
      results.saved++;
      results.details.push({
        id: guide.sourceExternalId,
        status: 'saved',
      });

      // Rate limiting between saves
      await sleep(200);
    }
    catch (error) {
      loggers.crawler.error(
        { sourceExternalId: guide.sourceExternalId, error },
        '[Processor] Error processing guide',
      );
      results.failed++;
      results.details.push({
        id: guide.sourceExternalId,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  loggers.crawler.info(
    { saved: results.saved, failed: results.failed, total: results.total },
    '[Processor] Complete',
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
      409,
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
      loggers.crawler.error({ jobId, error }, 'Job failed');
    });

    return c.json({
      message: 'Job execution started',
      jobId,
      platform: job.platform,
    });
  }
  catch (error) {
    activeJobs.delete(jobId);
    loggers.crawler.error({ jobId, error }, 'Error starting job');
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
 * POST /crawl-all
 * Trigger a full crawl of all platforms × all cities
 * Returns jobId for progress tracking
 */
crawlerRouter.post('/crawl-all', async (c) => {
  try {
    // Check if a job is already running
    if (parallelCrawlerManager.isJobRunning()) {
      const activeJobId = parallelCrawlerManager.getActiveJobId();
      return c.json(
        {
          error: 'A crawl job is already running',
          activeJobId,
          message: 'Wait for the current job to complete or cancel it first',
        },
        409,
      );
    }

    const body = await c.req.json().catch(() => ({}));
    const { concurrency = 2 } = body;

    const jobId = parallelCrawlerManager.generateJobId();
    const platforms = [...SUPPORTED_PLATFORMS];
    const cities = [...ALL_CITIES];

    loggers.crawler.info(
      { jobId, platformCount: platforms.length, cityCount: cities.length, concurrency },
      '[CrawlAll] Starting full crawl job',
    );

    // Start the job asynchronously (don't await)
    parallelCrawlerManager
      .startJob(jobId, platforms, cities, {
        concurrencyPerPlatform: concurrency,
        maxPages: 5,
        rateLimit: 0.5,
      })
      .catch((error) => {
        loggers.crawler.error({ jobId, error }, '[CrawlAll] Job failed');
      });

    return c.json({
      success: true,
      jobId,
      message: 'Full crawl job started',
      config: {
        platforms,
        cities: cities.length,
        concurrency,
        estimatedTasks: platforms.length * cities.length,
      },
    });
  }
  catch (error) {
    loggers.crawler.error({ error }, '[CrawlAll] Error starting job');
    return c.json({ error: 'Failed to start crawl-all job' }, 500);
  }
});

/**
 * POST /crawl-batch
 * Trigger a crawl for specific platforms and/or cities
 * Returns jobId for progress tracking
 */
crawlerRouter.post('/crawl-batch', async (c) => {
  try {
    // Check if a job is already running
    if (parallelCrawlerManager.isJobRunning()) {
      const activeJobId = parallelCrawlerManager.getActiveJobId();
      return c.json(
        {
          error: 'A crawl job is already running',
          activeJobId,
          message: 'Wait for the current job to complete or cancel it first',
        },
        409,
      );
    }

    const body = await c.req.json().catch(() => ({}));
    const {
      platforms: requestedPlatforms,
      cities: requestedCities,
      concurrency = 2,
    } = body;

    // Validate and set defaults
    const platforms: string[] = requestedPlatforms?.length
      ? requestedPlatforms
      : [...SUPPORTED_PLATFORMS];
    const cities: string[] = requestedCities?.length
      ? requestedCities
      : [...ALL_CITIES];

    // Validate platforms
    const invalidPlatforms = platforms.filter((p: string) => !isValidPlatform(p));
    if (invalidPlatforms.length > 0) {
      return c.json(
        {
          error: 'Invalid platforms specified',
          invalidPlatforms,
          validPlatforms: SUPPORTED_PLATFORMS,
        },
        400,
      );
    }

    // Validate cities
    const invalidCities = cities.filter((city: string) => !isValidCity(city));
    if (invalidCities.length > 0) {
      return c.json(
        {
          error: 'Invalid cities specified',
          invalidCities,
          message: 'Some cities are not in the supported list',
        },
        400,
      );
    }

    // Ensure at least one platform and one city
    if (platforms.length === 0 || cities.length === 0) {
      return c.json(
        { error: 'At least one platform and one city must be specified' },
        400,
      );
    }

    const jobId = parallelCrawlerManager.generateJobId();

    loggers.crawler.info(
      { jobId, platforms, cityCount: cities.length, concurrency },
      '[CrawlBatch] Starting batch crawl job',
    );

    // Start the job asynchronously (don't await)
    parallelCrawlerManager
      .startJob(jobId, platforms, cities, {
        concurrencyPerPlatform: concurrency,
        maxPages: 5,
        rateLimit: 0.5,
      })
      .catch((error) => {
        loggers.crawler.error({ jobId, error }, '[CrawlBatch] Job failed');
      });

    return c.json({
      success: true,
      jobId,
      message: 'Batch crawl job started',
      config: {
        platforms,
        cities,
        concurrency,
        estimatedTasks: platforms.length * cities.length,
      },
    });
  }
  catch (error) {
    loggers.crawler.error({ error }, '[CrawlBatch] Error starting job');
    return c.json({ error: 'Failed to start crawl-batch job' }, 500);
  }
});

/**
 * GET /progress/:jobId
 * Get progress for a specific crawl job
 */
crawlerRouter.get('/progress/:jobId', (c) => {
  const jobId = c.req.param('jobId');
  const progress = parallelCrawlerManager.getProgress(jobId);

  if (!progress) {
    return c.json({ error: 'Job not found', jobId }, 404);
  }

  return c.json({
    success: true,
    progress,
  });
});

/**
 * GET /jobs
 * List all crawl jobs (active and recent)
 */
crawlerRouter.get('/jobs', (c) => {
  const jobs = parallelCrawlerManager.listJobs();
  const activeJobId = parallelCrawlerManager.getActiveJobId();

  return c.json({
    success: true,
    activeJobId,
    jobs: jobs.map(job => ({
      jobId: job.jobId,
      status: job.status,
      summary: job.summary,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      totalResults: job.totalResults,
    })),
    totalJobs: jobs.length,
  });
});

/**
 * POST /cancel-parallel/:jobId
 * Cancel a running parallel crawl job
 */
crawlerRouter.post('/cancel-parallel/:jobId', (c) => {
  const jobId = c.req.param('jobId');
  const cancelled = parallelCrawlerManager.cancelJob(jobId);

  if (cancelled) {
    loggers.crawler.info({ jobId }, '[CancelParallel] Job cancelled');
    return c.json({ success: true, message: 'Job cancelled', jobId });
  }

  return c.json({ error: 'Job not found or not running', jobId }, 404);
});

/**
 * Execute a crawl job asynchronously
 * Now includes LLM-based content cleaning
 */
async function executeJob(jobId: string, job: CrawlJob) {
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
    loggers.crawler.info(
      { jobId, platform: job.platform },
      '[Crawler] Starting job',
    );

    // Get cities from config
    const cities = job.config?.geographic_scope?.cities || ['北京', '上海'];

    // Execute crawl for the platform
    const results: CrawlResult[] = [];

    for (const city of cities) {
      // Check if job was cancelled
      if (!activeJobs.has(jobId)) {
        loggers.crawler.info({ jobId }, '[Crawler] Job was cancelled');
        return;
      }

      loggers.crawler.info(
        { platform: job.platform, city },
        '[Crawler] Crawling city',
      );

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
          (Date.now() - startTime) / 1000,
        );
        await convex.mutation(api.crawlJobs.updateStatistics, {
          id: jobId as Id<'crawlJobs'>,
          statistics,
        });
      }
      catch (error) {
        loggers.crawler.error({ city, error }, '[Crawler] Error crawling city');
        statistics.requests_failed += 1;
      }

      statistics.requests_total += 1;

      // Rate limiting
      await sleep(2000);
    }

    // Clean and save guides to database
    loggers.crawler.info(
      { count: results.length },
      '[Crawler] Cleaning and saving guides to database',
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
          loggers.crawler.info(
            { sourceExternalId: guide.sourceExternalId },
            '[Crawler] Skipped (too short)',
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

        await convex.mutation(
          api.travelGuides.upsert,
          upsertArgs as FunctionArgs<typeof api.travelGuides.upsert>,
        );
      }
      catch (error) {
        loggers.crawler.error({ error }, '[Crawler] Error saving guide');
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

    loggers.crawler.info(
      {
        jobId,
        extractedCount: results.length,
        cleanedCount: statistics.records_cleaned,
      },
      'Job completed',
    );
  }
  catch (error) {
    loggers.crawler.error({ jobId, error }, 'Job failed');

    statistics.duration_seconds = Math.floor((Date.now() - startTime) / 1000);
    await convex.mutation(api.crawlJobs.fail, {
      id: jobId as Id<'crawlJobs'>,
      errorMessage: error instanceof Error ? error.message : String(error),
      statistics,
    });
  }
  finally {
    activeJobs.delete(jobId);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
