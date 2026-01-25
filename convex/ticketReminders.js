/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
/**
 * Ticket Reminders - Manage ticket booking and visit reminders
 */
const reminderTypeValidator = v.union(v.literal('reservation_open'), v.literal('booking_reminder'), v.literal('visit_reminder'), v.literal('price_drop'), v.literal('stock_available'));
// ============================================
// Ticket Reminders Queries
// ============================================
/**
 * List reminders for a user
 */
export const listByUser = query({
    args: {
        userId: v.string(),
        includeTriggered: v.optional(v.boolean()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let reminders = await ctx.db
            .query('ticketReminders')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .collect();
        if (!args.includeTriggered) {
            reminders = reminders.filter((r) => !r.isTriggered);
        }
        // Sort by reminder time ascending
        reminders.sort((a, b) => a.reminderTime - b.reminderTime);
        const limit = args.limit ?? 50;
        return reminders.slice(0, limit);
    },
});
/**
 * Get a reminder by ID
 */
export const getById = query({
    args: { id: v.id('ticketReminders') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
/**
 * List reminders for a specific POI
 */
export const listByPoi = query({
    args: {
        poiId: v.id('pois'),
        userId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        if (args.userId) {
            return await ctx.db
                .query('ticketReminders')
                .withIndex('by_user_poi', (q) => q.eq('userId', args.userId).eq('poiId', args.poiId))
                .collect();
        }
        return await ctx.db
            .query('ticketReminders')
            .withIndex('by_poi', (q) => q.eq('poiId', args.poiId))
            .collect();
    },
});
/**
 * Get pending reminders (for notification service)
 */
export const getPendingReminders = query({
    args: {
        beforeTime: v.number(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const reminders = await ctx.db
            .query('ticketReminders')
            .withIndex('by_triggered', (q) => q.eq('isTriggered', false))
            .collect();
        // Filter by reminder time
        const pending = reminders
            .filter((r) => r.reminderTime <= args.beforeTime)
            .sort((a, b) => a.reminderTime - b.reminderTime);
        const limit = args.limit ?? 100;
        return pending.slice(0, limit);
    },
});
/**
 * Get unread reminders count for a user
 */
export const getUnreadCount = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        const reminders = await ctx.db
            .query('ticketReminders')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .collect();
        return reminders.filter((r) => r.isTriggered && !r.isRead).length;
    },
});
/**
 * Get upcoming reminders for a user (next 7 days)
 */
export const getUpcoming = query({
    args: {
        userId: v.string(),
        days: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const daysAhead = args.days ?? 7;
        const futureTime = now + daysAhead * 24 * 60 * 60 * 1000;
        const reminders = await ctx.db
            .query('ticketReminders')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .collect();
        return reminders
            .filter((r) => !r.isTriggered &&
            r.reminderTime >= now &&
            r.reminderTime <= futureTime)
            .sort((a, b) => a.reminderTime - b.reminderTime);
    },
});
// ============================================
// Ticket Reminders Mutations
// ============================================
/**
 * Create a new reminder
 */
export const create = mutation({
    args: {
        userId: v.string(),
        poiId: v.id('pois'),
        ticketId: v.optional(v.id('poiTickets')),
        itineraryId: v.optional(v.id('itineraries')),
        reminderType: reminderTypeValidator,
        reminderTime: v.number(),
        message: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        // Check for duplicate reminder
        const existingReminders = await ctx.db
            .query('ticketReminders')
            .withIndex('by_user_poi', (q) => q.eq('userId', args.userId).eq('poiId', args.poiId))
            .collect();
        const duplicate = existingReminders.find((r) => r.reminderType === args.reminderType &&
            !r.isTriggered &&
            Math.abs(r.reminderTime - args.reminderTime) < 60 * 60 * 1000 // Within 1 hour
        );
        if (duplicate) {
            return duplicate._id;
        }
        return await ctx.db.insert('ticketReminders', {
            ...args,
            isTriggered: false,
            isRead: false,
            createdAt: now,
            updatedAt: now,
        });
    },
});
/**
 * Update a reminder
 */
export const update = mutation({
    args: {
        id: v.id('ticketReminders'),
        reminderTime: v.optional(v.number()),
        message: v.optional(v.string()),
        reminderType: v.optional(reminderTypeValidator),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const filteredUpdates = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
        await ctx.db.patch(id, {
            ...filteredUpdates,
            updatedAt: Date.now(),
        });
        return await ctx.db.get(id);
    },
});
/**
 * Mark a reminder as triggered
 */
export const markTriggered = mutation({
    args: { id: v.id('ticketReminders') },
    handler: async (ctx, args) => {
        const now = Date.now();
        await ctx.db.patch(args.id, {
            isTriggered: true,
            triggeredAt: now,
            updatedAt: now,
        });
        return await ctx.db.get(args.id);
    },
});
/**
 * Mark a reminder as read
 */
export const markRead = mutation({
    args: { id: v.id('ticketReminders') },
    handler: async (ctx, args) => {
        const now = Date.now();
        await ctx.db.patch(args.id, {
            isRead: true,
            readAt: now,
            updatedAt: now,
        });
        return await ctx.db.get(args.id);
    },
});
/**
 * Mark all reminders as read for a user
 */
export const markAllRead = mutation({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        const reminders = await ctx.db
            .query('ticketReminders')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .collect();
        const now = Date.now();
        let count = 0;
        for (const reminder of reminders) {
            if (reminder.isTriggered && !reminder.isRead) {
                await ctx.db.patch(reminder._id, {
                    isRead: true,
                    readAt: now,
                    updatedAt: now,
                });
                count++;
            }
        }
        return count;
    },
});
/**
 * Delete a reminder
 */
export const remove = mutation({
    args: { id: v.id('ticketReminders') },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
/**
 * Delete all reminders for a POI (for a specific user)
 */
export const removeByPoi = mutation({
    args: {
        userId: v.string(),
        poiId: v.id('pois'),
    },
    handler: async (ctx, args) => {
        const reminders = await ctx.db
            .query('ticketReminders')
            .withIndex('by_user_poi', (q) => q.eq('userId', args.userId).eq('poiId', args.poiId))
            .collect();
        for (const reminder of reminders) {
            await ctx.db.delete(reminder._id);
        }
        return reminders.length;
    },
});
/**
 * Batch trigger reminders (for scheduled job)
 */
export const batchTrigger = mutation({
    args: {
        ids: v.array(v.id('ticketReminders')),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        for (const id of args.ids) {
            await ctx.db.patch(id, {
                isTriggered: true,
                triggeredAt: now,
                updatedAt: now,
            });
        }
        return args.ids.length;
    },
});
