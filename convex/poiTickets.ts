/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * POI Tickets - Ticket Information Queries and Mutations
 * Manages ticket prices, types, and purchase information for POIs
 */

const ticketTypeValidator = v.union(
  v.literal('adult'),
  v.literal('student'),
  v.literal('senior'),
  v.literal('child'),
  v.literal('group'),
  v.literal('family'),
  v.literal('vip'),
  v.literal('free'),
  v.literal('other'),
);

const stockStatusValidator = v.union(
  v.literal('in_stock'),
  v.literal('low_stock'),
  v.literal('sold_out'),
  v.literal('unknown'),
);

// ============================================
// POI Tickets Queries
// ============================================

/**
 * List tickets for a specific POI
 */
export const listByPoi = query({
  args: {
    poiId: v.id('pois'),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let tickets;

    if (args.activeOnly) {
      tickets = await ctx.db
        .query('poiTickets')
        .withIndex('by_poi_active', q =>
          q.eq('poiId', args.poiId).eq('isActive', true))
        .collect();
    }
    else {
      tickets = await ctx.db
        .query('poiTickets')
        .withIndex('by_poi', q => q.eq('poiId', args.poiId))
        .collect();
    }

    // Sort by sortOrder
    return tickets.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/**
 * Get a ticket by ID
 */
export const getById = query({
  args: { id: v.id('poiTickets') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * List tickets by type for a POI
 */
export const listByType = query({
  args: {
    poiId: v.id('pois'),
    ticketType: ticketTypeValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('poiTickets')
      .withIndex('by_poi_type', q =>
        q.eq('poiId', args.poiId).eq('ticketType', args.ticketType))
      .collect();
  },
});

/**
 * Get recommended tickets for a POI (marked as recommended and active)
 */
export const getRecommended = query({
  args: {
    poiId: v.id('pois'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tickets = await ctx.db
      .query('poiTickets')
      .withIndex('by_poi_active', q =>
        q.eq('poiId', args.poiId).eq('isActive', true))
      .collect();

    const recommended = tickets
      .filter(t => t.isRecommended)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const limit = args.limit ?? 5;
    return recommended.slice(0, limit);
  },
});

/**
 * Get ticket price range for a POI
 */
export const getPriceRange = query({
  args: { poiId: v.id('pois') },
  handler: async (ctx, args) => {
    const tickets = await ctx.db
      .query('poiTickets')
      .withIndex('by_poi_active', q =>
        q.eq('poiId', args.poiId).eq('isActive', true))
      .collect();

    if (tickets.length === 0) {
      return null;
    }

    const prices = tickets.map(t => t.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const currency = tickets[0].currency ?? 'CNY';

    // Check if there are free tickets
    const hasFreeTickets = tickets.some(
      t => t.ticketType === 'free' || t.price === 0,
    );

    return {
      minPrice,
      maxPrice,
      currency,
      hasFreeTickets,
      ticketCount: tickets.length,
    };
  },
});

// ============================================
// POI Tickets Mutations
// ============================================

/**
 * Create a new ticket
 */
export const create = mutation({
  args: {
    poiId: v.id('pois'),
    ticketName: v.string(),
    ticketType: ticketTypeValidator,
    price: v.number(),
    originalPrice: v.optional(v.number()),
    currency: v.optional(v.string()),
    discountInfo: v.optional(v.string()),
    discountPercentage: v.optional(v.number()),
    eligibilityRequirements: v.optional(v.string()),
    ageRange: v.optional(
      v.object({
        minAge: v.optional(v.number()),
        maxAge: v.optional(v.number()),
      }),
    ),
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    validDays: v.optional(v.number()),
    purchaseUrl: v.optional(v.string()),
    purchasePlatform: v.optional(v.string()),
    requiresReservation: v.boolean(),
    reservationUrl: v.optional(v.string()),
    reservationTips: v.optional(v.string()),
    advanceBookingDays: v.optional(v.number()),
    usageInstructions: v.optional(v.string()),
    includedServices: v.optional(v.array(v.string())),
    excludedServices: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
    stockStatus: v.optional(stockStatusValidator),
    sortOrder: v.optional(v.number()),
    isRecommended: v.optional(v.boolean()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get max sortOrder for this POI
    const existingTickets = await ctx.db
      .query('poiTickets')
      .withIndex('by_poi', q => q.eq('poiId', args.poiId))
      .collect();

    const maxSortOrder
      = existingTickets.length > 0
        ? Math.max(...existingTickets.map(t => t.sortOrder))
        : 0;

    return await ctx.db.insert('poiTickets', {
      ...args,
      isActive: args.isActive ?? true,
      sortOrder: args.sortOrder ?? maxSortOrder + 1,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a ticket
 */
export const update = mutation({
  args: {
    id: v.id('poiTickets'),
    ticketName: v.optional(v.string()),
    ticketType: v.optional(ticketTypeValidator),
    price: v.optional(v.number()),
    originalPrice: v.optional(v.number()),
    currency: v.optional(v.string()),
    discountInfo: v.optional(v.string()),
    discountPercentage: v.optional(v.number()),
    eligibilityRequirements: v.optional(v.string()),
    ageRange: v.optional(
      v.object({
        minAge: v.optional(v.number()),
        maxAge: v.optional(v.number()),
      }),
    ),
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    validDays: v.optional(v.number()),
    purchaseUrl: v.optional(v.string()),
    purchasePlatform: v.optional(v.string()),
    requiresReservation: v.optional(v.boolean()),
    reservationUrl: v.optional(v.string()),
    reservationTips: v.optional(v.string()),
    advanceBookingDays: v.optional(v.number()),
    usageInstructions: v.optional(v.string()),
    includedServices: v.optional(v.array(v.string())),
    excludedServices: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
    stockStatus: v.optional(stockStatusValidator),
    sortOrder: v.optional(v.number()),
    isRecommended: v.optional(v.boolean()),
    source: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
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

/**
 * Delete a ticket
 */
export const remove = mutation({
  args: { id: v.id('poiTickets') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/**
 * Bulk create tickets for a POI
 */
export const bulkCreate = mutation({
  args: {
    poiId: v.id('pois'),
    tickets: v.array(
      v.object({
        ticketName: v.string(),
        ticketType: ticketTypeValidator,
        price: v.number(),
        originalPrice: v.optional(v.number()),
        currency: v.optional(v.string()),
        discountInfo: v.optional(v.string()),
        discountPercentage: v.optional(v.number()),
        eligibilityRequirements: v.optional(v.string()),
        ageRange: v.optional(
          v.object({
            minAge: v.optional(v.number()),
            maxAge: v.optional(v.number()),
          }),
        ),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        validDays: v.optional(v.number()),
        purchaseUrl: v.optional(v.string()),
        purchasePlatform: v.optional(v.string()),
        requiresReservation: v.boolean(),
        reservationUrl: v.optional(v.string()),
        reservationTips: v.optional(v.string()),
        advanceBookingDays: v.optional(v.number()),
        usageInstructions: v.optional(v.string()),
        includedServices: v.optional(v.array(v.string())),
        excludedServices: v.optional(v.array(v.string())),
        isActive: v.optional(v.boolean()),
        stockStatus: v.optional(stockStatusValidator),
        sortOrder: v.optional(v.number()),
        isRecommended: v.optional(v.boolean()),
        source: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ids: Id<'poiTickets'>[] = [];

    for (let i = 0; i < args.tickets.length; i++) {
      const ticket = args.tickets[i];
      const id = await ctx.db.insert('poiTickets', {
        poiId: args.poiId,
        ...ticket,
        isActive: ticket.isActive ?? true,
        sortOrder: ticket.sortOrder ?? i + 1,
        createdAt: now,
        updatedAt: now,
      });
      ids.push(id);
    }

    return ids;
  },
});

/**
 * Deactivate all tickets for a POI (soft delete)
 */
export const deactivateByPoi = mutation({
  args: { poiId: v.id('pois') },
  handler: async (ctx, args) => {
    const tickets = await ctx.db
      .query('poiTickets')
      .withIndex('by_poi', q => q.eq('poiId', args.poiId))
      .collect();

    const now = Date.now();
    for (const ticket of tickets) {
      await ctx.db.patch(ticket._id, {
        isActive: false,
        updatedAt: now,
      });
    }

    return tickets.length;
  },
});
