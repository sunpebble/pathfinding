/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Itineraries - Travel Plan Queries and Mutations
 */

const visibilityValidator = v.union(
  v.literal('private'),
  v.literal('team'),
  v.literal('public')
);

/**
 * Permission checking helpers
 */

// Check if user can edit itinerary (owner or editor)
async function checkEditPermission(ctx: any, itineraryId: any, userId: string) {
  const itinerary = await ctx.db.get(itineraryId);
  if (!itinerary) {
    throw new Error('Itinerary not found');
  }

  // Check if user is the owner (via itinerary.userId)
  if (itinerary.userId === userId) {
    return true;
  }

  // Check if user is a collaborator with edit permissions
  const collab = await ctx.db
    .query('itineraryCollaborators')
    .withIndex('by_itinerary_user', (q) =>
      q.eq('itineraryId', itineraryId).eq('userId', userId)
    )
    .first();

  if (!collab) {
    throw new Error('You do not have access to this itinerary');
  }

  if (collab.role === 'viewer') {
    throw new Error('You do not have edit permissions for this itinerary');
  }

  return true;
}

// Check if user is the owner
async function checkOwnerPermission(ctx: any, itineraryId: any, userId: string) {
  const itinerary = await ctx.db.get(itineraryId);
  if (!itinerary) {
    throw new Error('Itinerary not found');
  }

  // Check if user is the owner (via itinerary.userId)
  if (itinerary.userId === userId) {
    return true;
  }

  // Check if user is a collaborator with owner role
  const collab = await ctx.db
    .query('itineraryCollaborators')
    .withIndex('by_itinerary_user', (q) =>
      q.eq('itineraryId', itineraryId).eq('userId', userId)
    )
    .first();

  if (!collab || collab.role !== 'owner') {
    throw new Error('Only the owner can perform this action');
  }

  return true;
}

// List itineraries for a user
export const listByUser = query({
  args: {
    userId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    const itineraries = await ctx.db
      .query('itineraries')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .collect();

    const total = itineraries.length;
    const data = itineraries.slice(offset, offset + pageSize);

    // Enrich with city data
    const enriched = await Promise.all(
      data.map(async (itinerary) => {
        const city = await ctx.db.get(itinerary.cityId);
        const daysCount = calculateDaysCount(
          itinerary.startDate,
          itinerary.endDate
        );
        return {
          ...itinerary,
          cityName: city?.name,
          daysCount,
        };
      })
    );

    return { data: enriched, total };
  },
});

// List public itineraries
export const listPublic = query({
  args: {
    cityId: v.optional(v.id('cities')),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    let itineraries = await ctx.db
      .query('itineraries')
      .withIndex('by_visibility', (q) => q.eq('visibility', 'public'))
      .order('desc')
      .collect();

    if (args.cityId) {
      itineraries = itineraries.filter((i) => i.cityId === args.cityId);
    }

    const total = itineraries.length;
    const data = itineraries.slice(offset, offset + pageSize);

    const enriched = await Promise.all(
      data.map(async (itinerary) => {
        const city = await ctx.db.get(itinerary.cityId);
        return {
          ...itinerary,
          cityName: city?.name,
          daysCount: calculateDaysCount(itinerary.startDate, itinerary.endDate),
        };
      })
    );

    return { data: enriched, total };
  },
});

// Get itinerary by ID with full details (days and items) - optimized to avoid N+1
export const getById = query({
  args: { id: v.id('itineraries') },
  handler: async (ctx, args) => {
    const itinerary = await ctx.db.get(args.id);
    if (!itinerary) return null;

    const city = await ctx.db.get(itinerary.cityId);

    // Get days
    const days = await ctx.db
      .query('itineraryDays')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.id))
      .collect();

    // Sort days by dayNumber
    days.sort((a, b) => a.dayNumber - b.dayNumber);

    // Get all items for all days in a single batch
    const allItems = await Promise.all(
      days.map((day) =>
        ctx.db
          .query('itineraryItems')
          .withIndex('by_day', (q) => q.eq('dayId', day._id))
          .collect()
      )
    );

    // Collect all unique POI IDs
    const poiIds = new Set<string>();
    allItems.flat().forEach((item) => poiIds.add(item.poiId));

    // Batch load all POIs at once (single query per POI, but parallel)
    const poiMap = new Map();
    const pois = await Promise.all(
      Array.from(poiIds).map((id) => ctx.db.get(id as any))
    );
    Array.from(poiIds).forEach((id, idx) => {
      poiMap.set(id, pois[idx]);
    });

    // Build the response with pre-loaded POI data
    const daysWithItems = days.map((day, dayIdx) => {
      const items = allItems[dayIdx];
      items.sort((a, b) => a.orderIndex - b.orderIndex);

      const enrichedItems = items.map((item) => {
        const poi = poiMap.get(item.poiId);
        return {
          ...item,
          poi: poi
            ? {
                id: poi._id,
                name: poi.name,
                category: poi.category,
                address: poi.address,
                latitude: poi.latitude,
                longitude: poi.longitude,
                rating: poi.rating,
              }
            : null,
        };
      });

      return {
        ...day,
        items: enrichedItems,
      };
    });

    return {
      ...itinerary,
      cityName: city?.name,
      daysCount: calculateDaysCount(itinerary.startDate, itinerary.endDate),
      days: daysWithItems,
    };
  },
});

// Create a new itinerary with auto-generated days
export const create = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
    cityId: v.id('cities'),
    startDate: v.string(),
    endDate: v.string(),
    visibility: v.optional(visibilityValidator),
    coverImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Create itinerary
    const itineraryId = await ctx.db.insert('itineraries', {
      userId: args.userId,
      title: args.title,
      cityId: args.cityId,
      startDate: args.startDate,
      endDate: args.endDate,
      visibility: args.visibility ?? 'private',
      coverImageUrl: args.coverImageUrl,
    });

    // Generate days
    const dates = getDateRange(args.startDate, args.endDate);
    for (let i = 0; i < dates.length; i++) {
      await ctx.db.insert('itineraryDays', {
        itineraryId,
        dayNumber: i + 1,
        date: dates[i],
      });
    }

    return itineraryId;
  },
});

// Update an itinerary
export const update = mutation({
  args: {
    id: v.id('itineraries'),
    userId: v.string(),
    title: v.optional(v.string()),
    cityId: v.optional(v.id('cities')),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    visibility: v.optional(visibilityValidator),
    coverImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check edit permission
    await checkEditPermission(ctx, args.id, args.userId);

    const { id, userId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filteredUpdates);
    return await ctx.db.get(id);
  },
});

// Delete an itinerary (cascades to days and items)
export const remove = mutation({
  args: {
    id: v.id('itineraries'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check owner permission (only owner can delete)
    await checkOwnerPermission(ctx, args.id, args.userId);

    // Get all days
    const days = await ctx.db
      .query('itineraryDays')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.id))
      .collect();

    // Delete all items for each day
    for (const day of days) {
      const items = await ctx.db
        .query('itineraryItems')
        .withIndex('by_day', (q) => q.eq('dayId', day._id))
        .collect();
      for (const item of items) {
        await ctx.db.delete(item._id);
      }
      await ctx.db.delete(day._id);
    }

    // Delete all collaborators
    const collaborators = await ctx.db
      .query('itineraryCollaborators')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.id))
      .collect();
    for (const collab of collaborators) {
      await ctx.db.delete(collab._id);
    }

    // Delete itinerary
    await ctx.db.delete(args.id);
  },
});

// Copy an itinerary
export const copy = mutation({
  args: {
    itineraryId: v.id('itineraries'),
    userId: v.string(),
    newStartDate: v.string(),
  },
  handler: async (ctx, args) => {
    const original = await ctx.db.get(args.itineraryId);
    if (!original) throw new Error('Itinerary not found');

    // Calculate new end date
    const daysCount = calculateDaysCount(original.startDate, original.endDate);
    const newStart = new Date(args.newStartDate);
    const newEnd = new Date(newStart);
    newEnd.setDate(newEnd.getDate() + daysCount - 1);
    const newEndDate = newEnd.toISOString().split('T')[0];

    // Create new itinerary
    const newItineraryId = await ctx.db.insert('itineraries', {
      userId: args.userId,
      title: original.title,
      cityId: original.cityId,
      startDate: args.newStartDate,
      endDate: newEndDate,
      visibility: 'private',
      coverImageUrl: original.coverImageUrl,
      copiedFromId: args.itineraryId,
    });

    // Get original days
    const originalDays = await ctx.db
      .query('itineraryDays')
      .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
      .collect();
    originalDays.sort((a, b) => a.dayNumber - b.dayNumber);

    // Create new days with copied items
    const newDates = getDateRange(args.newStartDate, newEndDate);
    for (let i = 0; i < newDates.length; i++) {
      const newDayId = await ctx.db.insert('itineraryDays', {
        itineraryId: newItineraryId,
        dayNumber: i + 1,
        date: newDates[i],
      });

      // Copy items from original day if it exists
      if (i < originalDays.length) {
        const originalItems = await ctx.db
          .query('itineraryItems')
          .withIndex('by_day', (q) => q.eq('dayId', originalDays[i]._id))
          .collect();

        for (const item of originalItems) {
          await ctx.db.insert('itineraryItems', {
            dayId: newDayId,
            poiId: item.poiId,
            orderIndex: item.orderIndex,
            startTime: item.startTime,
            endTime: item.endTime,
            transportMode: item.transportMode,
            notes: item.notes,
          });
        }
      }
    }

    return newItineraryId;
  },
});

// Helper functions
function calculateDaysCount(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
}

function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
