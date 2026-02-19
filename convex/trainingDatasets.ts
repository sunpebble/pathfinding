/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
/**
 * Training Datasets - Convex Functions
 * CRUD operations for ML training datasets
 */

import { v } from "convex/values";
import {
  trainingGenerationParamsValidator,
  trainingStatisticsValidator,
  trainingStoragePathsValidator,
} from "../packages/convex-client/src/validators/index.js";
import { mutation, query } from "./_generated/server";

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("generating"),
  v.literal("completed"),
  v.literal("failed"),
);

// List training datasets with filters
export const list = query({
  args: {
    name: v.optional(v.string()),
    status: v.optional(statusValidator),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let datasets = await ctx.db
      .query("trainingDatasets")
      .order("desc")
      .collect();

    if (args.name) {
      const nameLower = args.name.toLowerCase();
      datasets = datasets.filter((d) =>
        d.name.toLowerCase().includes(nameLower),
      );
    }

    if (args.status) {
      datasets = datasets.filter((d) => d.status === args.status);
    }

    const total = datasets.length;
    const offset = args.offset || 0;
    const limit = args.limit || 20;

    return {
      data: datasets.slice(offset, offset + limit),
      pagination: {
        total,
        limit,
        offset,
      },
    };
  },
});

// Get a dataset by ID
export const getById = query({
  args: { id: v.id("trainingDatasets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new training dataset
export const create = mutation({
  args: {
    name: v.string(),
    version: v.string(),
    generationParams: trainingGenerationParamsValidator,
    outputFormats: v.array(v.string()),
    status: v.optional(statusValidator),
    statistics: v.optional(trainingStatisticsValidator),
  },
  handler: async (ctx, args) => {
    // Check for duplicate name+version
    const existing = await ctx.db
      .query("trainingDatasets")
      .filter((q) =>
        q.and(
          q.eq(q.field("name"), args.name),
          q.eq(q.field("version"), args.version),
        ),
      )
      .first();

    if (existing) {
      throw new Error(
        `Dataset ${args.name} version ${args.version} already exists`,
      );
    }

    const id = await ctx.db.insert("trainingDatasets", {
      name: args.name,
      version: args.version,
      generationParams: args.generationParams,
      outputFormats: args.outputFormats,
      status: args.status || "pending",
      statistics: args.statistics,
      storagePaths: {},
      generatedAt: undefined,
    });

    return await ctx.db.get(id);
  },
});

// Update a training dataset
export const update = mutation({
  args: {
    id: v.id("trainingDatasets"),
    status: v.optional(statusValidator),
    statistics: v.optional(trainingStatisticsValidator),
    storagePaths: v.optional(trainingStoragePathsValidator),
    generatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // Remove undefined values
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    await ctx.db.patch(id, cleanUpdates);
    return await ctx.db.get(id);
  },
});

// Delete a training dataset
export const remove = mutation({
  args: { id: v.id("trainingDatasets") },
  handler: async (ctx, args) => {
    // Also delete associated quality reports
    const reports = await ctx.db
      .query("dataQualityReports")
      .filter((q) => q.eq(q.field("datasetId"), args.id))
      .collect();

    for (const report of reports) {
      await ctx.db.delete(report._id);
    }

    await ctx.db.delete(args.id);
  },
});

// Check if name+version exists
export const checkExists = query({
  args: {
    name: v.string(),
    version: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("trainingDatasets")
      .filter((q) =>
        q.and(
          q.eq(q.field("name"), args.name),
          q.eq(q.field("version"), args.version),
        ),
      )
      .first();

    return existing !== null;
  },
});
