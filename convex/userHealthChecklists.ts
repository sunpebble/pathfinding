/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * User Health Checklists - Personal Health Preparation Tracking
 * 用户健康清单
 */

// Get user's health checklist for a destination
export const getByUserAndDestination = query({
  args: {
    userId: v.string(),
    destinationId: v.id('cities'),
  },
  handler: async (ctx, args) => {
    const checklists = await ctx.db
      .query('userHealthChecklists')
      .withIndex('by_user_destination', q =>
        q.eq('userId', args.userId).eq('destinationId', args.destinationId))
      .collect();

    return checklists[0] ?? null;
  },
});

// Get user's health checklist for an itinerary
export const getByItinerary = query({
  args: {
    userId: v.string(),
    itineraryId: v.id('itineraries'),
  },
  handler: async (ctx, args) => {
    const checklists = await ctx.db
      .query('userHealthChecklists')
      .withIndex('by_itinerary', q => q.eq('itineraryId', args.itineraryId))
      .collect();

    return checklists.find(c => c.userId === args.userId) ?? null;
  },
});

// List all user's health checklists
export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('userHealthChecklists')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect();
  },
});

// Get a single checklist by ID
export const getById = query({
  args: { id: v.id('userHealthChecklists') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new health checklist
export const create = mutation({
  args: {
    userId: v.string(),
    itineraryId: v.optional(v.id('itineraries')),
    destinationId: v.id('cities'),
    completedVaccines: v.optional(v.array(v.id('vaccineRequirements'))),
    packedMedications: v.optional(v.array(v.id('recommendedMedications'))),
    customItems: v.optional(
      v.array(
        v.object({
          name: v.string(),
          category: v.string(),
          isCompleted: v.boolean(),
        }),
      ),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert('userHealthChecklists', {
      userId: args.userId,
      itineraryId: args.itineraryId,
      destinationId: args.destinationId,
      completedVaccines: args.completedVaccines ?? [],
      packedMedications: args.packedMedications ?? [],
      customItems: args.customItems,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a health checklist
export const update = mutation({
  args: {
    id: v.id('userHealthChecklists'),
    completedVaccines: v.optional(v.array(v.id('vaccineRequirements'))),
    packedMedications: v.optional(v.array(v.id('recommendedMedications'))),
    customItems: v.optional(
      v.array(
        v.object({
          name: v.string(),
          category: v.string(),
          isCompleted: v.boolean(),
        }),
      ),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

// Toggle vaccine completion status
export const toggleVaccine = mutation({
  args: {
    id: v.id('userHealthChecklists'),
    vaccineId: v.id('vaccineRequirements'),
  },
  handler: async (ctx, args) => {
    const checklist = await ctx.db.get(args.id);
    if (!checklist) {
      throw new Error('Checklist not found');
    }

    const currentVaccines = checklist.completedVaccines ?? [];
    const isCompleted = currentVaccines.includes(args.vaccineId);

    const updatedVaccines = isCompleted
      ? currentVaccines.filter(v => v !== args.vaccineId)
      : [...currentVaccines, args.vaccineId];

    await ctx.db.patch(args.id, {
      completedVaccines: updatedVaccines,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

// Toggle medication packed status
export const toggleMedication = mutation({
  args: {
    id: v.id('userHealthChecklists'),
    medicationId: v.id('recommendedMedications'),
  },
  handler: async (ctx, args) => {
    const checklist = await ctx.db.get(args.id);
    if (!checklist) {
      throw new Error('Checklist not found');
    }

    const currentMedications = checklist.packedMedications ?? [];
    const isPacked = currentMedications.includes(args.medicationId);

    const updatedMedications = isPacked
      ? currentMedications.filter(m => m !== args.medicationId)
      : [...currentMedications, args.medicationId];

    await ctx.db.patch(args.id, {
      packedMedications: updatedMedications,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

// Add custom item
export const addCustomItem = mutation({
  args: {
    id: v.id('userHealthChecklists'),
    name: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const checklist = await ctx.db.get(args.id);
    if (!checklist) {
      throw new Error('Checklist not found');
    }

    const currentItems = checklist.customItems ?? [];
    const newItem = {
      name: args.name,
      category: args.category,
      isCompleted: false,
    };

    await ctx.db.patch(args.id, {
      customItems: [...currentItems, newItem],
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

// Toggle custom item completion
export const toggleCustomItem = mutation({
  args: {
    id: v.id('userHealthChecklists'),
    itemName: v.string(),
  },
  handler: async (ctx, args) => {
    const checklist = await ctx.db.get(args.id);
    if (!checklist) {
      throw new Error('Checklist not found');
    }

    const currentItems = checklist.customItems ?? [];
    const updatedItems = currentItems.map(item =>
      item.name === args.itemName
        ? { ...item, isCompleted: !item.isCompleted }
        : item,
    );

    await ctx.db.patch(args.id, {
      customItems: updatedItems,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

// Remove custom item
export const removeCustomItem = mutation({
  args: {
    id: v.id('userHealthChecklists'),
    itemName: v.string(),
  },
  handler: async (ctx, args) => {
    const checklist = await ctx.db.get(args.id);
    if (!checklist) {
      throw new Error('Checklist not found');
    }

    const currentItems = checklist.customItems ?? [];
    const updatedItems = currentItems.filter(
      item => item.name !== args.itemName,
    );

    await ctx.db.patch(args.id, {
      customItems: updatedItems,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

// Delete a health checklist
export const remove = mutation({
  args: { id: v.id('userHealthChecklists') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
