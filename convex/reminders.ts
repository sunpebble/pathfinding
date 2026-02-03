/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Reminders - Notification scheduling for itinerary items
 */

// List reminders for a user
export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const reminders = await ctx.db
      .query('reminders')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect();

    // Sort by reminder time
    reminders.sort((a, b) => a.reminderTime - b.reminderTime);

    return reminders;
  },
});

// Get reminders for an itinerary
export const listByItinerary = query({
  args: { itineraryId: v.id('itineraries') },
  handler: async (ctx, args) => {
    const reminders = await ctx.db
      .query('reminders')
      .withIndex('by_itinerary', q => q.eq('itineraryId', args.itineraryId))
      .collect();

    return reminders;
  },
});

// Get a reminder by ID
export const getById = query({
  args: { id: v.id('reminders') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get reminder by item ID
export const getByItemId = query({
  args: {
    userId: v.string(),
    itemId: v.id('itineraryItems'),
  },
  handler: async (ctx, args) => {
    const reminders = await ctx.db
      .query('reminders')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect();

    return reminders.find(r => r.itemId === args.itemId) ?? null;
  },
});

// Create a new reminder
export const create = mutation({
  args: {
    userId: v.string(),
    itineraryId: v.id('itineraries'),
    itemId: v.optional(v.id('itineraryItems')),
    reminderTime: v.number(), // Unix timestamp
    message: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('reminders', {
      userId: args.userId,
      itineraryId: args.itineraryId,
      itemId: args.itemId,
      reminderTime: args.reminderTime,
      message: args.message,
      isTriggered: false,
    });
  },
});

// Update a reminder
export const update = mutation({
  args: {
    id: v.id('reminders'),
    reminderTime: v.optional(v.number()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(id, filteredUpdates);
    return await ctx.db.get(id);
  },
});

// Mark reminder as triggered
export const markTriggered = mutation({
  args: { id: v.id('reminders') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isTriggered: true,
      triggeredAt: Date.now(),
    });
  },
});

// Delete a reminder
export const remove = mutation({
  args: { id: v.id('reminders') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Get pending reminders (for cron job)
export const getPending = query({
  args: { beforeTime: v.number() },
  handler: async (ctx, args) => {
    const reminders = await ctx.db
      .query('reminders')
      .withIndex('by_reminder_time')
      .collect();

    return reminders.filter(
      r => !r.isTriggered && r.reminderTime <= args.beforeTime,
    );
  },
});
