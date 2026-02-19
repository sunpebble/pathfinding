import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Favorite Collections - User-managed folders for organizing saved itineraries
 */

// Create a new collection
export const create = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get the next sort order
    const existingCollections = await ctx.db
      .query("favoriteCollections")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const maxSortOrder = existingCollections.reduce(
      (max, c) => Math.max(max, c.sortOrder),
      0,
    );

    // If setting as default, unset existing default
    if (args.isDefault) {
      const existingDefault = await ctx.db
        .query("favoriteCollections")
        .withIndex("by_user_default", (q) =>
          q.eq("userId", args.userId).eq("isDefault", true),
        )
        .first();

      if (existingDefault) {
        await ctx.db.patch(existingDefault._id, { isDefault: false });
      }
    }

    const collectionId = await ctx.db.insert("favoriteCollections", {
      userId: args.userId,
      name: args.name,
      description: args.description,
      coverImageUrl: args.coverImageUrl,
      isDefault: args.isDefault ?? false,
      sortOrder: maxSortOrder + 1,
      createdAt: now,
      updatedAt: now,
    });

    return collectionId;
  },
});

// Get or create default collection for a user
export const getOrCreateDefault = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Try to find existing default
    const existing = await ctx.db
      .query("favoriteCollections")
      .withIndex("by_user_default", (q) =>
        q.eq("userId", args.userId).eq("isDefault", true),
      )
      .first();

    if (existing) {
      return existing;
    }

    // Create default collection
    const now = Date.now();
    const collectionId = await ctx.db.insert("favoriteCollections", {
      userId: args.userId,
      name: "我的收藏",
      description: "默认收藏夹",
      isDefault: true,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(collectionId);
  },
});

// List user's collections
export const listByUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const collections = await ctx.db
      .query("favoriteCollections")
      .withIndex("by_user_sort", (q) => q.eq("userId", args.userId))
      .collect();

    // Sort by sortOrder
    collections.sort((a, b) => a.sortOrder - b.sortOrder);

    // Get favorite counts for each collection
    const enriched = await Promise.all(
      collections.map(async (collection) => {
        const favorites = await ctx.db
          .query("itineraryFavorites")
          .withIndex("by_collection", (q) =>
            q.eq("collectionId", collection._id),
          )
          .collect();

        return {
          ...collection,
          itemCount: favorites.length,
        };
      }),
    );

    return enriched;
  },
});

// Get a single collection with its items
export const getById = query({
  args: {
    id: v.id("favoriteCollections"),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const collection = await ctx.db.get(args.id);
    if (!collection) return null;

    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    // Get favorites in this collection
    const favorites = await ctx.db
      .query("itineraryFavorites")
      .withIndex("by_collection", (q) => q.eq("collectionId", args.id))
      .order("desc")
      .collect();

    const total = favorites.length;
    const paginatedFavorites = favorites.slice(offset, offset + pageSize);

    // Fetch itinerary details for each favorite
    const enrichedFavorites = await Promise.all(
      paginatedFavorites.map(async (fav) => {
        const itinerary = await ctx.db.get(fav.itineraryId);
        if (!itinerary) return null;

        const city = await ctx.db.get(itinerary.cityId);
        return {
          ...fav,
          itinerary: {
            ...itinerary,
            cityName: city?.name,
          },
        };
      }),
    );

    const items = enrichedFavorites.filter((item) => item !== null);

    return {
      ...collection,
      items,
      total,
    };
  },
});

// Update a collection
export const update = mutation({
  args: {
    id: v.id("favoriteCollections"),
    userId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const collection = await ctx.db.get(args.id);
    if (!collection) {
      throw new Error("Collection not found");
    }

    if (collection.userId !== args.userId) {
      throw new Error("Not authorized to update this collection");
    }

    // If setting as default, unset existing default
    if (args.isDefault && !collection.isDefault) {
      const existingDefault = await ctx.db
        .query("favoriteCollections")
        .withIndex("by_user_default", (q) =>
          q.eq("userId", args.userId).eq("isDefault", true),
        )
        .first();

      if (existingDefault) {
        await ctx.db.patch(existingDefault._id, { isDefault: false });
      }
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.coverImageUrl !== undefined)
      updates.coverImageUrl = args.coverImageUrl;
    if (args.isDefault !== undefined) updates.isDefault = args.isDefault;

    await ctx.db.patch(args.id, updates);
    return await ctx.db.get(args.id);
  },
});

// Delete a collection (also deletes all favorites in it)
export const remove = mutation({
  args: {
    id: v.id("favoriteCollections"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const collection = await ctx.db.get(args.id);
    if (!collection) {
      throw new Error("Collection not found");
    }

    if (collection.userId !== args.userId) {
      throw new Error("Not authorized to delete this collection");
    }

    // Prevent deleting default collection if it has items
    if (collection.isDefault) {
      const favorites = await ctx.db
        .query("itineraryFavorites")
        .withIndex("by_collection", (q) => q.eq("collectionId", args.id))
        .first();

      if (favorites) {
        throw new Error(
          "Cannot delete default collection while it contains items",
        );
      }
    }

    // Delete all favorites in this collection
    const favorites = await ctx.db
      .query("itineraryFavorites")
      .withIndex("by_collection", (q) => q.eq("collectionId", args.id))
      .collect();

    for (const fav of favorites) {
      await ctx.db.delete(fav._id);
    }

    // Delete the collection
    await ctx.db.delete(args.id);
  },
});

// Reorder collections
export const reorder = mutation({
  args: {
    userId: v.string(),
    orderedIds: v.array(v.id("favoriteCollections")),
  },
  handler: async (ctx, args) => {
    for (let i = 0; i < args.orderedIds.length; i++) {
      const collection = await ctx.db.get(args.orderedIds[i]);
      if (collection && collection.userId === args.userId) {
        await ctx.db.patch(args.orderedIds[i], { sortOrder: i });
      }
    }
  },
});
