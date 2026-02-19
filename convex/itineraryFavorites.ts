import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Itinerary Favorites - Save itineraries to collections
 */

// Add itinerary to a collection (favorite)
export const add = mutation({
  args: {
    userId: v.string(),
    itineraryId: v.id("itineraries"),
    collectionId: v.optional(v.id("favoriteCollections")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if itinerary exists and is accessible
    const itinerary = await ctx.db.get(args.itineraryId);
    if (!itinerary) {
      throw new Error("Itinerary not found");
    }

    if (itinerary.visibility !== "public" && itinerary.userId !== args.userId) {
      throw new Error("Cannot favorite a private itinerary");
    }

    // Get or create default collection if not specified
    let collectionId = args.collectionId;
    if (!collectionId) {
      // Find default collection
      const defaultCollection = await ctx.db
        .query("favoriteCollections")
        .withIndex("by_user_default", (q) =>
          q.eq("userId", args.userId).eq("isDefault", true),
        )
        .first();

      if (defaultCollection) {
        collectionId = defaultCollection._id;
      } else {
        // Create default collection
        const now = Date.now();
        collectionId = await ctx.db.insert("favoriteCollections", {
          userId: args.userId,
          name: "我的收藏",
          description: "默认收藏夹",
          isDefault: true,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        });
      }
    } else {
      // Verify collection belongs to user
      const collection = await ctx.db.get(collectionId);
      if (!collection || collection.userId !== args.userId) {
        throw new Error("Collection not found");
      }
    }

    // Check if already favorited in this collection
    const existing = await ctx.db
      .query("itineraryFavorites")
      .withIndex("by_user_itinerary", (q) =>
        q.eq("userId", args.userId).eq("itineraryId", args.itineraryId),
      )
      .first();

    if (existing) {
      // If in same collection, just update notes
      if (existing.collectionId === collectionId) {
        if (args.notes !== undefined) {
          await ctx.db.patch(existing._id, { notes: args.notes });
        }
        return existing._id;
      }
      // Move to new collection
      await ctx.db.patch(existing._id, {
        collectionId,
        notes: args.notes,
      });
      return existing._id;
    }

    // Add new favorite
    const favoriteId = await ctx.db.insert("itineraryFavorites", {
      userId: args.userId,
      itineraryId: args.itineraryId,
      collectionId,
      notes: args.notes,
      createdAt: Date.now(),
    });

    return favoriteId;
  },
});

// Remove itinerary from favorites
export const remove = mutation({
  args: {
    userId: v.string(),
    itineraryId: v.id("itineraries"),
  },
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query("itineraryFavorites")
      .withIndex("by_user_itinerary", (q) =>
        q.eq("userId", args.userId).eq("itineraryId", args.itineraryId),
      )
      .first();

    if (favorite) {
      await ctx.db.delete(favorite._id);
      return { removed: true };
    }

    return { removed: false };
  },
});

// Toggle favorite status (add to default collection or remove)
export const toggle = mutation({
  args: {
    userId: v.string(),
    itineraryId: v.id("itineraries"),
  },
  handler: async (ctx, args) => {
    // Check if already favorited
    const existing = await ctx.db
      .query("itineraryFavorites")
      .withIndex("by_user_itinerary", (q) =>
        q.eq("userId", args.userId).eq("itineraryId", args.itineraryId),
      )
      .first();

    if (existing) {
      // Remove favorite
      await ctx.db.delete(existing._id);
      return { favorited: false };
    }

    // Check if itinerary exists and is accessible
    const itinerary = await ctx.db.get(args.itineraryId);
    if (!itinerary) {
      throw new Error("Itinerary not found");
    }

    if (itinerary.visibility !== "public" && itinerary.userId !== args.userId) {
      throw new Error("Cannot favorite a private itinerary");
    }

    // Get or create default collection
    let defaultCollection = await ctx.db
      .query("favoriteCollections")
      .withIndex("by_user_default", (q) =>
        q.eq("userId", args.userId).eq("isDefault", true),
      )
      .first();

    if (!defaultCollection) {
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
      defaultCollection = await ctx.db.get(collectionId);
    }

    // Add favorite
    await ctx.db.insert("itineraryFavorites", {
      userId: args.userId,
      itineraryId: args.itineraryId,
      collectionId: defaultCollection!._id,
      createdAt: Date.now(),
    });

    return { favorited: true };
  },
});

// Check if user has favorited an itinerary
export const isFavorited = query({
  args: {
    userId: v.string(),
    itineraryId: v.id("itineraries"),
  },
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query("itineraryFavorites")
      .withIndex("by_user_itinerary", (q) =>
        q.eq("userId", args.userId).eq("itineraryId", args.itineraryId),
      )
      .first();

    return {
      favorited: !!favorite,
      collectionId: favorite?.collectionId,
    };
  },
});

// Get favorite count for an itinerary
export const getCount = query({
  args: {
    itineraryId: v.id("itineraries"),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("itineraryFavorites")
      .withIndex("by_itinerary", (q) => q.eq("itineraryId", args.itineraryId))
      .collect();

    return { count: favorites.length };
  },
});

// Get all user's favorites with pagination
export const listByUser = query({
  args: {
    userId: v.string(),
    collectionId: v.optional(v.id("favoriteCollections")),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    let favorites;
    if (args.collectionId) {
      favorites = await ctx.db
        .query("itineraryFavorites")
        .withIndex("by_user_collection", (q) =>
          q.eq("userId", args.userId).eq("collectionId", args.collectionId),
        )
        .order("desc")
        .collect();
    } else {
      favorites = await ctx.db
        .query("itineraryFavorites")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .order("desc")
        .collect();
    }

    const total = favorites.length;
    const paginatedFavorites = favorites.slice(offset, offset + pageSize);

    // Fetch itinerary and collection details
    const enriched = await Promise.all(
      paginatedFavorites.map(async (fav) => {
        const itinerary = (await ctx.db.get(
          fav.itineraryId,
        )) as Doc<"itineraries"> | null;
        if (!itinerary) return null;

        const city = (await ctx.db.get(
          itinerary.cityId,
        )) as Doc<"cities"> | null;
        const collection = fav.collectionId
          ? ((await ctx.db.get(
              fav.collectionId,
            )) as Doc<"favoriteCollections"> | null)
          : null;

        return {
          ...fav,
          itinerary: {
            ...itinerary,
            cityName: city?.name,
          },
          collectionName: collection?.name,
        };
      }),
    );

    const data = enriched.filter((item) => item !== null);

    return { data, total };
  },
});

// Move favorite to different collection
export const moveToCollection = mutation({
  args: {
    userId: v.string(),
    favoriteId: v.id("itineraryFavorites"),
    newCollectionId: v.id("favoriteCollections"),
  },
  handler: async (ctx, args) => {
    const favorite = await ctx.db.get(args.favoriteId);
    if (!favorite) {
      throw new Error("Favorite not found");
    }

    if (favorite.userId !== args.userId) {
      throw new Error("Not authorized");
    }

    // Verify new collection belongs to user
    const collection = await ctx.db.get(args.newCollectionId);
    if (!collection || collection.userId !== args.userId) {
      throw new Error("Collection not found");
    }

    await ctx.db.patch(args.favoriteId, {
      collectionId: args.newCollectionId,
    });

    return await ctx.db.get(args.favoriteId);
  },
});

// Update favorite notes
export const updateNotes = mutation({
  args: {
    userId: v.string(),
    favoriteId: v.id("itineraryFavorites"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const favorite = await ctx.db.get(args.favoriteId);
    if (!favorite) {
      throw new Error("Favorite not found");
    }

    if (favorite.userId !== args.userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.favoriteId, { notes: args.notes });
    return await ctx.db.get(args.favoriteId);
  },
});

// Batch check favorites for multiple itineraries
export const batchCheckFavorites = query({
  args: {
    userId: v.string(),
    itineraryIds: v.array(v.id("itineraries")),
  },
  handler: async (ctx, args) => {
    const results: Record<string, boolean> = {};

    await Promise.all(
      args.itineraryIds.map(async (itineraryId) => {
        const favorite = await ctx.db
          .query("itineraryFavorites")
          .withIndex("by_user_itinerary", (q) =>
            q.eq("userId", args.userId).eq("itineraryId", itineraryId),
          )
          .first();

        results[itineraryId] = !!favorite;
      }),
    );

    return results;
  },
});

// Batch get favorite counts for multiple itineraries
export const batchGetCounts = query({
  args: {
    itineraryIds: v.array(v.id("itineraries")),
  },
  handler: async (ctx, args) => {
    const results: Record<string, number> = {};

    await Promise.all(
      args.itineraryIds.map(async (itineraryId) => {
        const favorites = await ctx.db
          .query("itineraryFavorites")
          .withIndex("by_itinerary", (q) => q.eq("itineraryId", itineraryId))
          .collect();

        results[itineraryId] = favorites.length;
      }),
    );

    return results;
  },
});
