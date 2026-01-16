/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Crawl Jobs - Data Collection Management
 */

// List all crawl jobs with optional filters
export const list = query({
  args: {
    status: v.optional(v.string()),
    platform: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let jobs;

    if (args.status) {
      jobs = await ctx.db
        .query('crawlJobs')
        .withIndex('by_status', (q) => q.eq('status', args.status!))
        .order('desc')
        .collect();
    } else if (args.platform) {
      jobs = await ctx.db
        .query('crawlJobs')
        .withIndex('by_platform', (q) => q.eq('platform', args.platform!))
        .order('desc')
        .collect();
    } else {
      jobs = await ctx.db.query('crawlJobs').order('desc').collect();
    }

    return args.limit ? jobs.slice(0, args.limit) : jobs;
  },
});

// Get a crawl job by ID
export const getById = query({
  args: { id: v.id('crawlJobs') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get jobs that are due to run (nextRunAt <= now)
export const getDueJobs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const jobs = await ctx.db
      .query('crawlJobs')
      .withIndex('by_nextRunAt')
      .filter((q) => q.lte(q.field('nextRunAt'), now))
      .collect();

    return args.limit ? jobs.slice(0, args.limit) : jobs;
  },
});

// Get jobs needing incremental crawl (completed jobs idle for >24h with schedule)
export const getJobsForIncrementalCrawl = query({
  args: {
    staleThresholdHours: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const thresholdHours = args.staleThresholdHours ?? 24;
    const thresholdMs = thresholdHours * 60 * 60 * 1000;
    const now = Date.now();
    const staleTimestamp = now - thresholdMs;

    // Get all completed jobs
    const completedJobs = await ctx.db
      .query('crawlJobs')
      .withIndex('by_status', (q) => q.eq('status', 'completed'))
      .collect();

    // Filter for stale jobs with schedule (candidates for incremental crawl)
    const staleJobs = completedJobs.filter(
      (job) =>
        job.completedAt &&
        job.completedAt < staleTimestamp &&
        job.scheduleCron !== undefined &&
        job.jobType === 'full' // Only full crawls can trigger incremental updates
    );

    // Sort by completedAt (oldest first) to prioritize most stale jobs
    staleJobs.sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0));

    return args.limit ? staleJobs.slice(0, args.limit) : staleJobs;
  },
});

// Create a new crawl job
export const create = mutation({
  args: {
    name: v.string(),
    platform: v.string(),
    jobType: v.optional(v.string()),
    config: v.any(),
    scheduleCron: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('crawlJobs', {
      name: args.name,
      platform: args.platform,
      jobType: args.jobType ?? 'full',
      config: args.config,
      scheduleCron: args.scheduleCron,
      status: 'pending',
      retryCount: 0,
    });
  },
});

// Start a crawl job
export const start = mutation({
  args: { id: v.id('crawlJobs') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'running',
      startedAt: Date.now(),
    });
    return await ctx.db.get(args.id);
  },
});

// Complete a crawl job
export const complete = mutation({
  args: {
    id: v.id('crawlJobs'),
    statistics: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'completed',
      completedAt: Date.now(),
      statistics: args.statistics,
    });
    return await ctx.db.get(args.id);
  },
});

// Fail a crawl job
export const fail = mutation({
  args: {
    id: v.id('crawlJobs'),
    errorMessage: v.string(),
    statistics: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (!job) {
      throw new Error(`Job ${args.id} not found`);
    }

    await ctx.db.patch(args.id, {
      status: 'failed',
      completedAt: Date.now(),
      errorMessage: args.errorMessage,
      statistics: args.statistics,
      lastFailureAt: Date.now(),
      lastFailureReason: args.errorMessage,
    });
    return await ctx.db.get(args.id);
  },
});

// Cancel a crawl job
export const cancel = mutation({
  args: { id: v.id('crawlJobs') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'cancelled',
      completedAt: Date.now(),
    });
    return await ctx.db.get(args.id);
  },
});

// Update crawl job status (generic status update)
export const updateStatus = mutation({
  args: {
    id: v.id('crawlJobs'),
    status: v.string(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const update: Record<string, unknown> = { status: args.status };

    if (args.startedAt !== undefined) {
      update.startedAt = args.startedAt;
    }
    if (args.completedAt !== undefined) {
      update.completedAt = args.completedAt;
    }
    if (args.errorMessage !== undefined) {
      update.errorMessage = args.errorMessage;
    }

    await ctx.db.patch(args.id, update);
    return await ctx.db.get(args.id);
  },
});

// Update crawl job statistics (during running)
export const updateStatistics = mutation({
  args: {
    id: v.id('crawlJobs'),
    statistics: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      statistics: args.statistics,
    });
  },
});

// Update next run time for scheduled jobs
export const updateNextRunAt = mutation({
  args: {
    id: v.id('crawlJobs'),
    nextRunAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      nextRunAt: args.nextRunAt,
    });
    return await ctx.db.get(args.id);
  },
});

// Increment retry count
export const incrementRetryCount = mutation({
  args: { id: v.id('crawlJobs') },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (!job) {
      throw new Error(`Job ${args.id} not found`);
    }

    await ctx.db.patch(args.id, {
      retryCount: (job.retryCount ?? 0) + 1,
    });
    return await ctx.db.get(args.id);
  },
});

// Delete a crawl job
export const remove = mutation({
  args: { id: v.id('crawlJobs') },
  handler: async (ctx, args) => {
    // First delete all raw records for this job
    const records = await ctx.db
      .query('rawCrawlRecords')
      .withIndex('by_job', (q) => q.eq('jobId', args.id))
      .collect();

    for (const record of records) {
      await ctx.db.delete(record._id);
    }

    await ctx.db.delete(args.id);
  },
});
