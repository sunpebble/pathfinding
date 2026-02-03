/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Vaccine Requirements - Destination Vaccination Recommendations
 * 疫苗接种建议
 */

// List vaccine requirements for a destination
export const listByDestination = query({
  args: { destinationId: v.id('cities') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('vaccineRequirements')
      .withIndex('by_destination', q =>
        q.eq('destinationId', args.destinationId))
      .filter(q => q.eq(q.field('isActive'), true))
      .collect();
  },
});

// Get all active vaccine requirements
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('vaccineRequirements')
      .withIndex('by_active', q => q.eq('isActive', true))
      .collect();
  },
});

// Get vaccine requirements by requirement level
export const listByRequirement = query({
  args: {
    requirement: v.union(
      v.literal('required'),
      v.literal('recommended'),
      v.literal('consider'),
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('vaccineRequirements')
      .withIndex('by_requirement', q => q.eq('requirement', args.requirement))
      .filter(q => q.eq(q.field('isActive'), true))
      .collect();
  },
});

// Get vaccine requirements by vaccine name
export const listByVaccineName = query({
  args: { vaccineName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('vaccineRequirements')
      .withIndex('by_vaccine', q => q.eq('vaccineName', args.vaccineName))
      .filter(q => q.eq(q.field('isActive'), true))
      .collect();
  },
});

// Get a single vaccine requirement by ID
export const getById = query({
  args: { id: v.id('vaccineRequirements') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new vaccine requirement
export const create = mutation({
  args: {
    destinationId: v.id('cities'),
    destinationName: v.string(),
    vaccineName: v.string(),
    vaccineNameEn: v.optional(v.string()),
    requirement: v.union(
      v.literal('required'),
      v.literal('recommended'),
      v.literal('consider'),
    ),
    description: v.string(),
    recommendedTiming: v.optional(v.string()),
    boosterInfo: v.optional(v.string()),
    validityPeriod: v.optional(v.string()),
    sideEffects: v.optional(v.array(v.string())),
    contraindications: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('vaccineRequirements', {
      ...args,
      lastUpdated: Date.now(),
      isActive: true,
    });
  },
});

// Update a vaccine requirement
export const update = mutation({
  args: {
    id: v.id('vaccineRequirements'),
    vaccineName: v.optional(v.string()),
    vaccineNameEn: v.optional(v.string()),
    requirement: v.optional(
      v.union(
        v.literal('required'),
        v.literal('recommended'),
        v.literal('consider'),
      ),
    ),
    description: v.optional(v.string()),
    recommendedTiming: v.optional(v.string()),
    boosterInfo: v.optional(v.string()),
    validityPeriod: v.optional(v.string()),
    sideEffects: v.optional(v.array(v.string())),
    contraindications: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
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

// Delete a vaccine requirement (soft delete)
export const remove = mutation({
  args: { id: v.id('vaccineRequirements') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: false });
  },
});
