import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Itinerary Likes - User like/unlike operations for public itineraries
 */

// Toggle like status for an itinerary
export const toggle = mutation({
  args: {
    userId: v.string(),
    itineraryId: v.id("itineraries"),
  },
  handler: async (ctx, args) => {
    // Check if itinerary exists and is public
    const itinerary = await ctx.db.get(args.itineraryId);
    if (!itinerary) {
      throw new Error("Itinerary not found");
    }

    if (itinerary.visibility !== "public" && itinerary.userId !== args.userId) {
      throw new Error("Cannot like a private itinerary");
    }

    // Check if already liked
    const existing = await ctx.db
      .query("itineraryLikes")
      .withIndex("by_user_itinerary", (q) =>
        q.eq("userId", args.userId).eq("itineraryId", args.itineraryId),
      )
      .first();

    if (existing) {
      // Unlike - remove the like
      await ctx.db.delete(existing._id);
      return { liked: false };
    } else {
      // Like - add new like
      await ctx.db.insert("itineraryLikes", {
        userId: args.userId,
        itineraryId: args.itineraryId,
        createdAt: Date.now(),
      });
      return { liked: true };
    }
  },
});

// Check if user has liked an itinerary
export const isLiked = query({
  args: {
    userId: v.string(),
    itineraryId: v.id("itineraries"),
  },
  handler: async (ctx, args) => {
    const like = await ctx.db
      .query("itineraryLikes")
      .withIndex("by_user_itinerary", (q) =>
        q.eq("userId", args.userId).eq("itineraryId", args.itineraryId),
      )
      .first();

    return { liked: !!like };
  },
});

// Get like count for an itinerary
export const getCount = query({
  args: {
    itineraryId: v.id("itineraries"),
  },
  handler: async (ctx, args) => {
    const likes = await ctx.db
      .query("itineraryLikes")
      .withIndex("by_itinerary", (q) => q.eq("itineraryId", args.itineraryId))
      .collect();

    return { count: likes.length };
  },
});

// Get user's liked itineraries with pagination
export const listByUser = query({
  args: {
    userId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const likes = await ctx.db
      .query("itineraryLikes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const total = likes.length;
    const paginatedLikes = likes.slice(offset, offset + pageSize);

    // Fetch itinerary details for each like
    const enriched = await Promise.all(
      paginatedLikes.map(async (like) => {
        const itinerary = await ctx.db.get(like.itineraryId);
        if (!itinerary) return null;

        const city = await ctx.db.get(itinerary.cityId);
        return {
          ...like,
          itinerary: {
            ...itinerary,
            cityName: city?.name,
          },
        };
      }),
    );

    // Filter out null results (deleted itineraries)
    const data = enriched.filter((item) => item !== null);

    return { data, total };
  },
});

// Batch check likes for multiple itineraries (for list views)
export const batchCheckLikes = query({
  args: {
    userId: v.string(),
    itineraryIds: v.array(v.id("itineraries")),
  },
  handler: async (ctx, args) => {
    const results: Record<string, boolean> = {};

    await Promise.all(
      args.itineraryIds.map(async (itineraryId) => {
        const like = await ctx.db
          .query("itineraryLikes")
          .withIndex("by_user_itinerary", (q) =>
            q.eq("userId", args.userId).eq("itineraryId", itineraryId),
          )
          .first();

        results[itineraryId] = !!like;
      }),
    );

    return results;
  },
});

// Get batch like counts for multiple itineraries
export const batchGetCounts = query({
  args: {
    itineraryIds: v.array(v.id("itineraries")),
  },
  handler: async (ctx, args) => {
    const results: Record<string, number> = {};

    await Promise.all(
      args.itineraryIds.map(async (itineraryId) => {
        const likes = await ctx.db
          .query("itineraryLikes")
          .withIndex("by_itinerary", (q) => q.eq("itineraryId", itineraryId))
          .collect();

        results[itineraryId] = likes.length;
      }),
    );

    return results;
  },
});
