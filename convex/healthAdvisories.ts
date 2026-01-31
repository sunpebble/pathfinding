/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Health Advisories - Destination Health Risk Information
 * 目的地健康风险提示
 */

// List health advisories for a destination
export const listByDestination = query({
  args: { destinationId: v.id('cities') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('healthAdvisories')
      .withIndex('by_destination', q =>
        q.eq('destinationId', args.destinationId))
      .filter(q => q.eq(q.field('isActive'), true))
      .collect();
  },
});

// Get all active health advisories
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('healthAdvisories')
      .withIndex('by_active', q => q.eq('isActive', true))
      .collect();
  },
});

// Get health advisories by risk level
export const listByRiskLevel = query({
  args: {
    riskLevel: v.union(
      v.literal('low'),
      v.literal('moderate'),
      v.literal('high'),
      v.literal('extreme'),
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('healthAdvisories')
      .withIndex('by_risk_level', q => q.eq('riskLevel', args.riskLevel))
      .filter(q => q.eq(q.field('isActive'), true))
      .collect();
  },
});

// Get health advisories by category
export const listByCategory = query({
  args: {
    category: v.union(
      v.literal('disease_outbreak'),
      v.literal('environmental'),
      v.literal('food_water'),
      v.literal('insect_borne'),
      v.literal('altitude'),
      v.literal('climate'),
      v.literal('general'),
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('healthAdvisories')
      .withIndex('by_category', q => q.eq('category', args.category))
      .filter(q => q.eq(q.field('isActive'), true))
      .collect();
  },
});

// Get a single health advisory by ID
export const getById = query({
  args: { id: v.id('healthAdvisories') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new health advisory
export const create = mutation({
  args: {
    destinationId: v.id('cities'),
    destinationName: v.string(),
    riskLevel: v.union(
      v.literal('low'),
      v.literal('moderate'),
      v.literal('high'),
      v.literal('extreme'),
    ),
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal('disease_outbreak'),
      v.literal('environmental'),
      v.literal('food_water'),
      v.literal('insect_borne'),
      v.literal('altitude'),
      v.literal('climate'),
      v.literal('general'),
    ),
    symptoms: v.optional(v.array(v.string())),
    preventionTips: v.array(v.string()),
    treatmentAdvice: v.optional(v.string()),
    seasonalRisk: v.optional(
      v.object({
        peakMonths: v.array(v.number()),
        notes: v.optional(v.string()),
      }),
    ),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('healthAdvisories', {
      ...args,
      lastUpdated: Date.now(),
      isActive: true,
    });
  },
});

// Update a health advisory
export const update = mutation({
  args: {
    id: v.id('healthAdvisories'),
    riskLevel: v.optional(
      v.union(
        v.literal('low'),
        v.literal('moderate'),
        v.literal('high'),
        v.literal('extreme'),
      ),
    ),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal('disease_outbreak'),
        v.literal('environmental'),
        v.literal('food_water'),
        v.literal('insect_borne'),
        v.literal('altitude'),
        v.literal('climate'),
        v.literal('general'),
      ),
    ),
    symptoms: v.optional(v.array(v.string())),
    preventionTips: v.optional(v.array(v.string())),
    treatmentAdvice: v.optional(v.string()),
    seasonalRisk: v.optional(
      v.object({
        peakMonths: v.array(v.number()),
        notes: v.optional(v.string()),
      }),
    ),
    sourceUrl: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(id, {
      ...filteredUpdates,
      lastUpdated: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

// Delete a health advisory (soft delete by setting isActive to false)
export const remove = mutation({
  args: { id: v.id('healthAdvisories') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: false });
  },
});
