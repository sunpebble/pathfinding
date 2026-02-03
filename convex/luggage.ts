import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Luggage - Luggage Tracking and Management (行李追踪)
 */

// Luggage status enum
const luggageStatusValidator = v.union(
  v.literal('checked_in'),
  v.literal('in_transit'),
  v.literal('arrived'),
  v.literal('claimed'),
  v.literal('delayed'),
  v.literal('lost'),
  v.literal('found'),
  v.literal('damaged'),
);

// Luggage size enum
const luggageSizeValidator = v.union(
  v.literal('cabin'),
  v.literal('medium'),
  v.literal('large'),
  v.literal('oversized'),
);

/**
 * Permission checking helpers
 */
async function checkLuggageOwnership(
  ctx: QueryCtx | MutationCtx,
  luggageId: Id<'luggage'>,
  userId: string,
): Promise<boolean> {
  const luggage = await ctx.db.get(luggageId);
  if (!luggage) {
    throw new Error('Luggage not found');
  }
  if (luggage.userId !== userId) {
    throw new Error('You do not have access to this luggage');
  }
  return true;
}

// ============================================
// Luggage Queries
// ============================================

/**
 * List luggage for a user with pagination
 */
export const list = query({
  args: {
    userId: v.string(),
    status: v.optional(luggageStatusValidator),
    flightBookingId: v.optional(v.id('flightBookings')),
    itineraryId: v.optional(v.id('itineraries')),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    let luggageItems = await ctx.db
      .query('luggage')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .order('desc')
      .collect();

    // Apply filters
    if (args.status) {
      luggageItems = luggageItems.filter(l => l.status === args.status);
    }

    if (args.flightBookingId) {
      luggageItems = luggageItems.filter(
        l => l.flightBookingId === args.flightBookingId,
      );
    }

    if (args.itineraryId) {
      luggageItems = luggageItems.filter(
        l => l.itineraryId === args.itineraryId,
      );
    }

    const total = luggageItems.length;
    const data = luggageItems.slice(offset, offset + pageSize);

    return { data, total };
  },
});

/**
 * Get luggage by ID
 */
export const getById = query({
  args: { id: v.id('luggage') },
  handler: async (ctx, args) => {
    const luggage = await ctx.db.get(args.id);
    if (!luggage)
      return null;

    // If linked to a flight booking, fetch flight info
    let flightBooking = null;
    if (luggage.flightBookingId) {
      flightBooking = await ctx.db.get(luggage.flightBookingId);
    }

    return {
      ...luggage,
      flightBooking,
    };
  },
});

/**
 * Get luggage by tag number
 */
export const getByTagNumber = query({
  args: {
    tagNumber: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const luggage = await ctx.db
      .query('luggage')
      .withIndex('by_tag_number', q =>
        q.eq('tagNumber', args.tagNumber.toUpperCase()))
      .first();

    if (!luggage || luggage.userId !== args.userId) {
      return null;
    }

    return luggage;
  },
});

/**
 * Get luggage by flight booking
 */
export const getByFlightBooking = query({
  args: {
    flightBookingId: v.id('flightBookings'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const luggageItems = await ctx.db
      .query('luggage')
      .withIndex('by_flight_booking', q =>
        q.eq('flightBookingId', args.flightBookingId))
      .collect();

    // Filter by user
    return luggageItems.filter(l => l.userId === args.userId);
  },
});

/**
 * Get luggage by itinerary
 */
export const getByItinerary = query({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const luggageItems = await ctx.db
      .query('luggage')
      .withIndex('by_itinerary', q => q.eq('itineraryId', args.itineraryId))
      .collect();

    // Filter by user
    return luggageItems.filter(l => l.userId === args.userId);
  },
});

/**
 * Get luggage with active status (not claimed)
 */
export const getActive = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const luggageItems = await ctx.db
      .query('luggage')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .order('desc')
      .collect();

    // Filter active items (not claimed)
    const active = luggageItems.filter(l => l.status !== 'claimed');

    return active.slice(0, limit);
  },
});

/**
 * Get luggage statistics for a user
 */
export const getStats = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const luggageItems = await ctx.db
      .query('luggage')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect();

    const stats = {
      total: luggageItems.length,
      checkedIn: 0,
      inTransit: 0,
      arrived: 0,
      claimed: 0,
      delayed: 0,
      lost: 0,
      found: 0,
      damaged: 0,
    };

    for (const luggage of luggageItems) {
      switch (luggage.status) {
        case 'checked_in':
          stats.checkedIn++;
          break;
        case 'in_transit':
          stats.inTransit++;
          break;
        case 'arrived':
          stats.arrived++;
          break;
        case 'claimed':
          stats.claimed++;
          break;
        case 'delayed':
          stats.delayed++;
          break;
        case 'lost':
          stats.lost++;
          break;
        case 'found':
          stats.found++;
          break;
        case 'damaged':
          stats.damaged++;
          break;
      }
    }

    return stats;
  },
});

// ============================================
// Luggage Mutations
// ============================================

/**
 * Create a new luggage entry
 */
export const create = mutation({
  args: {
    userId: v.string(),
    flightBookingId: v.optional(v.id('flightBookings')),
    itineraryId: v.optional(v.id('itineraries')),
    tagNumber: v.optional(v.string()),
    description: v.string(),
    color: v.optional(v.string()),
    brand: v.optional(v.string()),
    size: v.optional(luggageSizeValidator),
    weight: v.optional(v.number()),
    dimensions: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    tagPhotoUrl: v.optional(v.string()),
    luggagePhotoUrls: v.optional(v.array(v.string())),
    status: v.optional(luggageStatusValidator),
    airlineCode: v.optional(v.string()),
    airlineName: v.optional(v.string()),
    airlineTrackingUrl: v.optional(v.string()),
    airlineContactPhone: v.optional(v.string()),
    airlineContactEmail: v.optional(v.string()),
    reminderEnabled: v.optional(v.boolean()),
    reminderTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const luggageId = await ctx.db.insert('luggage', {
      userId: args.userId,
      flightBookingId: args.flightBookingId,
      itineraryId: args.itineraryId,
      tagNumber: args.tagNumber?.toUpperCase(),
      description: args.description,
      color: args.color,
      brand: args.brand,
      size: args.size,
      weight: args.weight,
      dimensions: args.dimensions,
      features: args.features,
      tagPhotoUrl: args.tagPhotoUrl,
      luggagePhotoUrls: args.luggagePhotoUrls,
      status: args.status ?? 'checked_in',
      airlineCode: args.airlineCode?.toUpperCase(),
      airlineName: args.airlineName,
      airlineTrackingUrl: args.airlineTrackingUrl,
      airlineContactPhone: args.airlineContactPhone,
      airlineContactEmail: args.airlineContactEmail,
      reminderEnabled: args.reminderEnabled,
      reminderTime: args.reminderTime,
      createdAt: now,
      updatedAt: now,
    });

    return luggageId;
  },
});

/**
 * Update a luggage entry
 */
export const update = mutation({
  args: {
    id: v.id('luggage'),
    userId: v.string(),
    flightBookingId: v.optional(v.id('flightBookings')),
    itineraryId: v.optional(v.id('itineraries')),
    tagNumber: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    brand: v.optional(v.string()),
    size: v.optional(luggageSizeValidator),
    weight: v.optional(v.number()),
    dimensions: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    tagPhotoUrl: v.optional(v.string()),
    luggagePhotoUrls: v.optional(v.array(v.string())),
    status: v.optional(luggageStatusValidator),
    lastKnownLocation: v.optional(v.string()),
    airlineCode: v.optional(v.string()),
    airlineName: v.optional(v.string()),
    airlineTrackingUrl: v.optional(v.string()),
    airlineContactPhone: v.optional(v.string()),
    airlineContactEmail: v.optional(v.string()),
    reminderEnabled: v.optional(v.boolean()),
    reminderTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await checkLuggageOwnership(ctx, args.id, args.userId);

    const { id, userId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );

    // Normalize tag number and airline code
    if (filteredUpdates.tagNumber) {
      filteredUpdates.tagNumber = (
        filteredUpdates.tagNumber as string
      ).toUpperCase();
    }
    if (filteredUpdates.airlineCode) {
      filteredUpdates.airlineCode = (
        filteredUpdates.airlineCode as string
      ).toUpperCase();
    }

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

/**
 * Update luggage status
 */
export const updateStatus = mutation({
  args: {
    id: v.id('luggage'),
    userId: v.string(),
    status: luggageStatusValidator,
    lastKnownLocation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await checkLuggageOwnership(ctx, args.id, args.userId);

    await ctx.db.patch(args.id, {
      status: args.status,
      lastKnownLocation: args.lastKnownLocation,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * File a loss report
 */
export const fileLossReport = mutation({
  args: {
    id: v.id('luggage'),
    userId: v.string(),
    lossReportNumber: v.optional(v.string()),
    lossReportNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await checkLuggageOwnership(ctx, args.id, args.userId);

    await ctx.db.patch(args.id, {
      status: 'lost',
      lossReportFiled: true,
      lossReportNumber: args.lossReportNumber,
      lossReportDate: Date.now(),
      lossReportNotes: args.lossReportNotes,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Mark luggage as found
 */
export const markAsFound = mutation({
  args: {
    id: v.id('luggage'),
    userId: v.string(),
    lastKnownLocation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await checkLuggageOwnership(ctx, args.id, args.userId);

    await ctx.db.patch(args.id, {
      status: 'found',
      lastKnownLocation: args.lastKnownLocation,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Mark luggage as claimed
 */
export const markAsClaimed = mutation({
  args: {
    id: v.id('luggage'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await checkLuggageOwnership(ctx, args.id, args.userId);

    await ctx.db.patch(args.id, {
      status: 'claimed',
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Link luggage to a flight booking
 */
export const linkToFlightBooking = mutation({
  args: {
    id: v.id('luggage'),
    flightBookingId: v.id('flightBookings'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await checkLuggageOwnership(ctx, args.id, args.userId);

    // Optionally fetch airline info from booking
    const flightBooking = await ctx.db.get(args.flightBookingId);
    let airlineUpdates = {};

    if (flightBooking) {
      const flight = await ctx.db.get(flightBooking.flightId);
      if (flight) {
        airlineUpdates = {
          airlineCode: flight.airlineCode,
          airlineName: flight.airline,
        };
      }
    }

    await ctx.db.patch(args.id, {
      flightBookingId: args.flightBookingId,
      ...airlineUpdates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Unlink luggage from flight booking
 */
export const unlinkFromFlightBooking = mutation({
  args: {
    id: v.id('luggage'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await checkLuggageOwnership(ctx, args.id, args.userId);

    await ctx.db.patch(args.id, {
      flightBookingId: undefined,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Link luggage to itinerary
 */
export const linkToItinerary = mutation({
  args: {
    id: v.id('luggage'),
    itineraryId: v.id('itineraries'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await checkLuggageOwnership(ctx, args.id, args.userId);

    await ctx.db.patch(args.id, {
      itineraryId: args.itineraryId,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Unlink luggage from itinerary
 */
export const unlinkFromItinerary = mutation({
  args: {
    id: v.id('luggage'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await checkLuggageOwnership(ctx, args.id, args.userId);

    await ctx.db.patch(args.id, {
      itineraryId: undefined,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Delete a luggage entry
 */
export const remove = mutation({
  args: {
    id: v.id('luggage'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await checkLuggageOwnership(ctx, args.id, args.userId);
    await ctx.db.delete(args.id);
  },
});

/**
 * Add photos to luggage
 */
export const addPhotos = mutation({
  args: {
    id: v.id('luggage'),
    userId: v.string(),
    photoUrls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await checkLuggageOwnership(ctx, args.id, args.userId);

    const luggage = await ctx.db.get(args.id);
    if (!luggage) {
      throw new Error('Luggage not found');
    }

    const existingPhotos = luggage.luggagePhotoUrls ?? [];
    const newPhotos = [...existingPhotos, ...args.photoUrls];

    await ctx.db.patch(args.id, {
      luggagePhotoUrls: newPhotos,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Set tag photo
 */
export const setTagPhoto = mutation({
  args: {
    id: v.id('luggage'),
    userId: v.string(),
    tagPhotoUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await checkLuggageOwnership(ctx, args.id, args.userId);

    await ctx.db.patch(args.id, {
      tagPhotoUrl: args.tagPhotoUrl,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

// ============================================
// Loss Report Template Queries
// ============================================

/**
 * Get loss report template by airline code
 */
export const getLossReportTemplate = query({
  args: {
    airlineCode: v.string(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query('luggageLossReportTemplates')
      .withIndex('by_airline_code', q =>
        q.eq('airlineCode', args.airlineCode.toUpperCase()))
      .first();

    return template;
  },
});

/**
 * List all loss report templates
 */
export const listLossReportTemplates = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db
      .query('luggageLossReportTemplates')
      .collect();

    return templates;
  },
});

// ============================================
// Loss Report Template Mutations (Admin)
// ============================================

/**
 * Create or update loss report template
 */
export const upsertLossReportTemplate = mutation({
  args: {
    airlineCode: v.string(),
    airlineName: v.string(),
    airlineNameEn: v.optional(v.string()),
    baggageServicePhone: v.optional(v.string()),
    baggageServiceEmail: v.optional(v.string()),
    baggageServiceUrl: v.optional(v.string()),
    trackingUrl: v.optional(v.string()),
    reportInstructions: v.optional(v.string()),
    reportInstructionsEn: v.optional(v.string()),
    requiredDocuments: v.optional(v.array(v.string())),
    compensationPolicy: v.optional(v.string()),
    compensationPolicyEn: v.optional(v.string()),
    maxCompensationAmount: v.optional(v.number()),
    claimDeadlineDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const airlineCode = args.airlineCode.toUpperCase();

    const existing = await ctx.db
      .query('luggageLossReportTemplates')
      .withIndex('by_airline_code', q => q.eq('airlineCode', airlineCode))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        airlineCode,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('luggageLossReportTemplates', {
      ...args,
      airlineCode,
      createdAt: now,
      updatedAt: now,
    });
  },
});
