import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Itinerary Items - POIs within a day
 */

const transportModeValidator = v.union(
  v.literal("walking"),
  v.literal("driving"),
  v.literal("transit"),
  v.literal("cycling"),
  v.literal("taxi"),
);

/**
 * Permission checking helper for items
 */

// Check if user can edit items in a day (checks itinerary permission)
async function checkItemEditPermission(
  ctx: QueryCtx | MutationCtx,
  dayId: Id<"itineraryDays">,
  userId: string,
): Promise<boolean> {
  const day = await ctx.db.get(dayId);
  if (!day) {
    throw new Error("Day not found");
  }

  const itinerary = await ctx.db.get(day.itineraryId);
  if (!itinerary) {
    throw new Error("Itinerary not found");
  }

  // Check if user is the owner (via itinerary.userId)
  if (itinerary.userId === userId) {
    return true;
  }

  // Check if user is a collaborator with edit permissions
  const collab = await ctx.db
    .query("itineraryCollaborators")
    .withIndex("by_itinerary_user", (q) =>
      q.eq("itineraryId", day.itineraryId).eq("userId", userId),
    )
    .first();

  if (!collab) {
    throw new Error("You do not have access to this itinerary");
  }

  if (collab.role === "viewer") {
    throw new Error("You do not have edit permissions for this itinerary");
  }

  return true;
}

// List items for a day
export const listByDay = query({
  args: { dayId: v.id("itineraryDays") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("itineraryItems")
      .withIndex("by_day", (q) => q.eq("dayId", args.dayId))
      .collect();

    // Sort by orderIndex
    items.sort((a, b) => a.orderIndex - b.orderIndex);

    // Enrich with POI data
    return await Promise.all(
      items.map(async (item) => {
        const poi = await ctx.db.get(item.poiId);
        return {
          ...item,
          poi: poi
            ? {
                id: poi._id,
                name: poi.name,
                nameEn: poi.nameEn,
                category: poi.category,
                address: poi.address,
                latitude: poi.latitude,
                longitude: poi.longitude,
                rating: poi.rating,
              }
            : null,
        };
      }),
    );
  },
});

// Get an item by ID
export const getById = query({
  args: { id: v.id("itineraryItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return null;

    const poi = await ctx.db.get(item.poiId);
    return {
      ...item,
      poi,
    };
  },
});

// Add an item to a day
export const create = mutation({
  args: {
    dayId: v.id("itineraryDays"),
    userId: v.string(),
    poiId: v.id("pois"),
    orderIndex: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    transportMode: v.optional(transportModeValidator),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check edit permission
    await checkItemEditPermission(ctx, args.dayId, args.userId);

    // If no orderIndex provided, add at the end
    let orderIndex = args.orderIndex;
    if (orderIndex === undefined) {
      const existingItems = await ctx.db
        .query("itineraryItems")
        .withIndex("by_day", (q) => q.eq("dayId", args.dayId))
        .collect();
      orderIndex =
        existingItems.length > 0
          ? Math.max(...existingItems.map((i) => i.orderIndex)) + 1
          : 0;
    }

    return await ctx.db.insert("itineraryItems", {
      dayId: args.dayId,
      poiId: args.poiId,
      orderIndex,
      startTime: args.startTime,
      endTime: args.endTime,
      transportMode: args.transportMode ?? "walking",
      notes: args.notes,
    });
  },
});

// Update an item
export const update = mutation({
  args: {
    id: v.id("itineraryItems"),
    userId: v.string(),
    orderIndex: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    transportMode: v.optional(transportModeValidator),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get item to check permissions
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item not found");

    // Check edit permission
    await checkItemEditPermission(ctx, item.dayId, args.userId);

    const { id, userId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(id, filteredUpdates);
    return await ctx.db.get(id);
  },
});

// Delete an item
export const remove = mutation({
  args: {
    id: v.id("itineraryItems"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get item to check permissions
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item not found");

    // Check edit permission
    await checkItemEditPermission(ctx, item.dayId, args.userId);

    await ctx.db.delete(args.id);
  },
});

// Reorder items within a day
export const reorder = mutation({
  args: {
    itemId: v.id("itineraryItems"),
    userId: v.string(),
    newOrderIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    // Check edit permission
    await checkItemEditPermission(ctx, item.dayId, args.userId);

    const oldOrder = item.orderIndex;
    const newOrder = args.newOrderIndex;

    if (oldOrder === newOrder) return;

    // Get all items in the same day
    const items = await ctx.db
      .query("itineraryItems")
      .withIndex("by_day", (q) => q.eq("dayId", item.dayId))
      .collect();

    // Reorder items
    for (const i of items) {
      if (i._id === args.itemId) {
        await ctx.db.patch(i._id, { orderIndex: newOrder });
      } else if (newOrder < oldOrder) {
        // Moving up: shift items between newOrder and oldOrder down
        if (i.orderIndex >= newOrder && i.orderIndex < oldOrder) {
          await ctx.db.patch(i._id, { orderIndex: i.orderIndex + 1 });
        }
      } else {
        // Moving down: shift items between oldOrder and newOrder up
        if (i.orderIndex > oldOrder && i.orderIndex <= newOrder) {
          await ctx.db.patch(i._id, { orderIndex: i.orderIndex - 1 });
        }
      }
    }
  },
});

// Move item to a different day
export const moveToDay = mutation({
  args: {
    itemId: v.id("itineraryItems"),
    userId: v.string(),
    newDayId: v.id("itineraryDays"),
    orderIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    // Check edit permission for the source day
    await checkItemEditPermission(ctx, item.dayId, args.userId);

    // Check edit permission for the destination day
    await checkItemEditPermission(ctx, args.newDayId, args.userId);

    // Calculate new order index if not provided
    let orderIndex = args.orderIndex;
    if (orderIndex === undefined) {
      const existingItems = await ctx.db
        .query("itineraryItems")
        .withIndex("by_day", (q) => q.eq("dayId", args.newDayId))
        .collect();
      orderIndex =
        existingItems.length > 0
          ? Math.max(...existingItems.map((i) => i.orderIndex)) + 1
          : 0;
    }

    await ctx.db.patch(args.itemId, {
      dayId: args.newDayId,
      orderIndex,
    });

    return await ctx.db.get(args.itemId);
  },
});
