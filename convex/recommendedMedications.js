/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
/**
 * Recommended Medications - Travel Medicine Checklist
 * 药品清单建议
 */
// List all active recommended medications (global recommendations)
export const listGlobal = query({
    args: {},
    handler: async (ctx) => {
        const medications = await ctx.db
            .query('recommendedMedications')
            .withIndex('by_active', (q) => q.eq('isActive', true))
            .collect();
        // Filter for global recommendations (no destinationId)
        return medications.filter((m) => !m.destinationId);
    },
});
// List medications for a specific destination (includes global recommendations)
export const listByDestination = query({
    args: { destinationId: v.id('cities') },
    handler: async (ctx, args) => {
        const allMedications = await ctx.db
            .query('recommendedMedications')
            .withIndex('by_active', (q) => q.eq('isActive', true))
            .collect();
        // Include both global and destination-specific medications
        return allMedications.filter((m) => !m.destinationId || m.destinationId === args.destinationId);
    },
});
// List medications by category
export const listByCategory = query({
    args: {
        category: v.union(v.literal('pain_relief'), v.literal('digestive'), v.literal('allergy'), v.literal('motion_sickness'), v.literal('skin'), v.literal('cold_flu'), v.literal('first_aid'), v.literal('prescription'), v.literal('other')),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('recommendedMedications')
            .withIndex('by_category', (q) => q.eq('category', args.category))
            .filter((q) => q.eq(q.field('isActive'), true))
            .collect();
    },
});
// List medications by priority
export const listByPriority = query({
    args: {
        priority: v.union(v.literal('essential'), v.literal('recommended'), v.literal('optional')),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('recommendedMedications')
            .withIndex('by_priority', (q) => q.eq('priority', args.priority))
            .filter((q) => q.eq(q.field('isActive'), true))
            .collect();
    },
});
// Get a single medication by ID
export const getById = query({
    args: { id: v.id('recommendedMedications') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
// Create a new recommended medication
export const create = mutation({
    args: {
        destinationId: v.optional(v.id('cities')),
        name: v.string(),
        nameEn: v.optional(v.string()),
        category: v.union(v.literal('pain_relief'), v.literal('digestive'), v.literal('allergy'), v.literal('motion_sickness'), v.literal('skin'), v.literal('cold_flu'), v.literal('first_aid'), v.literal('prescription'), v.literal('other')),
        description: v.string(),
        usage: v.string(),
        dosage: v.optional(v.string()),
        warnings: v.optional(v.array(v.string())),
        contraindications: v.optional(v.array(v.string())),
        prescription: v.boolean(),
        priority: v.union(v.literal('essential'), v.literal('recommended'), v.literal('optional')),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert('recommendedMedications', {
            ...args,
            isActive: true,
        });
    },
});
// Update a recommended medication
export const update = mutation({
    args: {
        id: v.id('recommendedMedications'),
        name: v.optional(v.string()),
        nameEn: v.optional(v.string()),
        category: v.optional(v.union(v.literal('pain_relief'), v.literal('digestive'), v.literal('allergy'), v.literal('motion_sickness'), v.literal('skin'), v.literal('cold_flu'), v.literal('first_aid'), v.literal('prescription'), v.literal('other'))),
        description: v.optional(v.string()),
        usage: v.optional(v.string()),
        dosage: v.optional(v.string()),
        warnings: v.optional(v.array(v.string())),
        contraindications: v.optional(v.array(v.string())),
        prescription: v.optional(v.boolean()),
        priority: v.optional(v.union(v.literal('essential'), v.literal('recommended'), v.literal('optional'))),
        notes: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const filteredUpdates = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
        await ctx.db.patch(id, filteredUpdates);
        return await ctx.db.get(id);
    },
});
// Delete a recommended medication (soft delete)
export const remove = mutation({
    args: { id: v.id('recommendedMedications') },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { isActive: false });
    },
});
