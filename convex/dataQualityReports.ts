/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
/**
 * Data Quality Reports - Convex Functions
 * CRUD operations for data quality analysis reports
 */

import type { RegisteredMutation } from 'convex/server';
import { v } from 'convex/values';
import {
  dataQualityIssueValidator,
  dataQualityMetricsValidator,
} from '../packages/convex-client/src/validators/index.js';
import { internalMutation, mutation, query } from './_generated/server';

// List data quality reports with pagination
export const list = query({
  args: {
    datasetId: v.optional(v.id('trainingDatasets')),
    reportType: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let reports = await ctx.db
      .query('dataQualityReports')
      .order('desc')
      .collect();

    if (args.datasetId) {
      reports = reports.filter(r => r.datasetId === args.datasetId);
    }

    if (args.reportType) {
      reports = reports.filter(r => r.reportType === args.reportType);
    }

    const total = reports.length;
    const offset = args.offset || 0;
    const limit = args.limit || 20;

    return {
      data: reports.slice(offset, offset + limit),
      pagination: {
        total,
        limit,
        offset,
      },
    };
  },
});

// Get a report by ID
export const getById = query({
  args: { id: v.id('dataQualityReports') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get reports for a specific dataset
export const getByDataset = query({
  args: { datasetId: v.id('trainingDatasets') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('dataQualityReports')
      .withIndex('by_dataset', q => q.eq('datasetId', args.datasetId))
      .collect();
  },
});

// Create a new quality report
export const create = mutation({
  args: {
    datasetId: v.optional(v.id('trainingDatasets')),
    reportType: v.string(),
    metrics: dataQualityMetricsValidator,
    issues: v.optional(v.array(dataQualityIssueValidator)),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('dataQualityReports', {
      datasetId: args.datasetId,
      reportType: args.reportType,
      metrics: args.metrics,
      issues: args.issues,
      generatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

// Delete a quality report
export const remove = mutation({
  args: { id: v.id('dataQualityReports') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Generate a summary of all quality reports
export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    const reports = await ctx.db.query('dataQualityReports').collect();

    const byType: Record<string, number> = {};
    for (const report of reports) {
      byType[report.reportType] = (byType[report.reportType] || 0) + 1;
    }

    return {
      total: reports.length,
      byType,
      latestAt:
        reports.length > 0
          ? Math.max(...reports.map(r => r.generatedAt))
          : null,
    };
  },
});

/**
 * Clean up old quality reports (internal, called by cron)
 * Deletes reports older than 90 days
 */
export const cleanupOld: RegisteredMutation<
  'internal',
  Record<string, never>,
  Promise<{ deletedCount: number }>
> = internalMutation({
  handler: async (ctx): Promise<{ deletedCount: number }> => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

    // Find old reports
    const oldReports = await ctx.db
      .query('dataQualityReports')
      .filter(q => q.lt(q.field('generatedAt'), ninetyDaysAgo))
      .collect();

    // Delete them
    let deletedCount = 0;
    for (const report of oldReports) {
      await ctx.db.delete(report._id);
      deletedCount++;
    }

    return { deletedCount };
  },
}) as unknown as RegisteredMutation<
  'internal',
  Record<string, never>,
  Promise<{ deletedCount: number }>
>;
