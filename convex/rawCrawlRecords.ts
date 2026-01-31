/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { rawCrawlDataValidator } from '../packages/convex/src/validators/index.js';
import { mutation, query } from './_generated/server';

/**
 * Raw Crawl Records - Storage for crawled data
 */

// List records for a job
export const listByJob = query({
  args: {
    jobId: v.id('crawlJobs'),
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let records = await ctx.db
      .query('rawCrawlRecords')
      .withIndex('by_job', q => q.eq('jobId', args.jobId))
      .collect();

    if (args.status) {
      records = records.filter(r => r.processingStatus === args.status);
    }

    return args.limit ? records.slice(0, args.limit) : records;
  },
});

// Get a record by ID
export const getById = query({
  args: { id: v.id('rawCrawlRecords') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a raw crawl record
export const create = mutation({
  args: {
    jobId: v.id('crawlJobs'),
    sourceUrl: v.string(),
    rawData: rawCrawlDataValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('rawCrawlRecords', {
      jobId: args.jobId,
      sourceUrl: args.sourceUrl,
      rawData: args.rawData,
      crawledAt: Date.now(),
      processingStatus: 'pending',
    });
  },
});

// Bulk insert records
export const bulkInsert = mutation({
  args: {
    records: v.array(
      v.object({
        jobId: v.id('crawlJobs'),
        sourceUrl: v.string(),
        rawData: rawCrawlDataValidator,
      }),
    ),
  },
  handler: async (ctx, args) => {
    const ids: Id<'rawCrawlRecords'>[] = [];

    for (const record of args.records) {
      const id = await ctx.db.insert('rawCrawlRecords', {
        ...record,
        crawledAt: Date.now(),
        processingStatus: 'pending',
      });
      ids.push(id);
    }

    return ids;
  },
});

// Update record status
export const updateStatus = mutation({
  args: {
    id: v.id('rawCrawlRecords'),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { processingStatus: args.status });
  },
});

// Delete a record
export const remove = mutation({
  args: { id: v.id('rawCrawlRecords') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Delete all records for a job
export const removeByJob = mutation({
  args: { jobId: v.id('crawlJobs') },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query('rawCrawlRecords')
      .withIndex('by_job', q => q.eq('jobId', args.jobId))
      .collect();

    for (const record of records) {
      await ctx.db.delete(record._id);
    }

    return records.length;
  },
});
