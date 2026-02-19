/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Hidden Gems - Queries and Mutations for discovering off-the-beaten-path POIs
 */

const poiCategoryValidator = v.union(
  v.literal("attraction"),
  v.literal("restaurant"),
  v.literal("hotel"),
  v.literal("shopping"),
  v.literal("other"),
);

const popularityLevelValidator = v.union(
  v.literal("hidden"),
  v.literal("emerging"),
  v.literal("moderate"),
  v.literal("popular"),
  v.literal("crowded"),
);

const userSubmittedPoiStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("merged"),
);

// ============================================
// Hidden Gems POI Queries
// ============================================

/**
 * List hidden gem POIs with optional filters
 */
export const listHiddenGems = query({
  args: {
    cityId: v.optional(v.id("cities")),
    category: v.optional(poiCategoryValidator),
    popularityLevel: v.optional(popularityLevelValidator),
    minHiddenGemRating: v.optional(v.number()),
    onlyLocalRecommended: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let pois;

    // Use index if city and hidden gem filter provided
    if (args.cityId) {
      pois = await ctx.db
        .query("pois")
        .withIndex("by_city_hidden_gem", (q) =>
          q.eq("cityId", args.cityId!).eq("isHiddenGem", true),
        )
        .collect();
    } else {
      pois = await ctx.db
        .query("pois")
        .withIndex("by_hidden_gem", (q) => q.eq("isHiddenGem", true))
        .collect();
    }

    // Apply filters
    if (args.category) {
      pois = pois.filter((poi) => poi.category === args.category);
    }

    if (args.popularityLevel) {
      pois = pois.filter((poi) => poi.popularityLevel === args.popularityLevel);
    }

    if (args.minHiddenGemRating !== undefined) {
      pois = pois.filter(
        (poi) =>
          poi.hiddenGemRating !== undefined &&
          poi.hiddenGemRating >= args.minHiddenGemRating!,
      );
    }

    if (args.onlyLocalRecommended) {
      pois = pois.filter(
        (poi) => poi.localRecommendation?.isLocalRecommended === true,
      );
    }

    // Sort by hidden gem score (higher is more hidden)
    pois.sort((a, b) => (b.hiddenGemScore ?? 0) - (a.hiddenGemScore ?? 0));

    return pois.slice(0, limit);
  },
});

/**
 * Get hidden gems by popularity level
 */
export const getByPopularityLevel = query({
  args: {
    popularityLevel: popularityLevelValidator,
    cityId: v.optional(v.id("cities")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let pois = await ctx.db
      .query("pois")
      .withIndex("by_popularity_level", (q) =>
        q.eq("popularityLevel", args.popularityLevel),
      )
      .take(limit * 2);

    if (args.cityId) {
      pois = pois.filter((poi) => poi.cityId === args.cityId);
    }

    // Sort by hidden gem rating
    pois.sort((a, b) => (b.hiddenGemRating ?? 0) - (a.hiddenGemRating ?? 0));

    return pois.slice(0, limit);
  },
});

/**
 * Get local recommended POIs
 */
export const getLocalRecommendations = query({
  args: {
    cityId: v.id("cities"),
    category: v.optional(poiCategoryValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    let pois = await ctx.db
      .query("pois")
      .withIndex("by_city", (q) => q.eq("cityId", args.cityId))
      .collect();

    // Filter for local recommendations
    pois = pois.filter(
      (poi) => poi.localRecommendation?.isLocalRecommended === true,
    );

    if (args.category) {
      pois = pois.filter((poi) => poi.category === args.category);
    }

    // Sort by rating
    pois.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    return pois.slice(0, limit);
  },
});

/**
 * Search hidden gems by keyword
 */
export const searchHiddenGems = query({
  args: {
    query: v.string(),
    cityId: v.optional(v.id("cities")),
    category: v.optional(poiCategoryValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const searchLower = args.query.toLowerCase();

    let pois;

    if (args.cityId) {
      pois = await ctx.db
        .query("pois")
        .withIndex("by_city_hidden_gem", (q) =>
          q.eq("cityId", args.cityId!).eq("isHiddenGem", true),
        )
        .collect();
    } else {
      pois = await ctx.db
        .query("pois")
        .withIndex("by_hidden_gem", (q) => q.eq("isHiddenGem", true))
        .collect();
    }

    // Filter by search query
    pois = pois.filter(
      (poi) =>
        poi.name.toLowerCase().includes(searchLower) ||
        poi.nameEn?.toLowerCase().includes(searchLower) ||
        poi.address?.toLowerCase().includes(searchLower) ||
        poi.localRecommendation?.localTips?.toLowerCase().includes(searchLower),
    );

    if (args.category) {
      pois = pois.filter((poi) => poi.category === args.category);
    }

    return pois.slice(0, limit);
  },
});

// ============================================
// Hidden Gems POI Mutations
// ============================================

/**
 * Mark a POI as a hidden gem
 */
export const markAsHiddenGem = mutation({
  args: {
    poiId: v.id("pois"),
    hiddenGemScore: v.optional(v.number()),
    popularityLevel: v.optional(popularityLevelValidator),
    localRecommendation: v.optional(
      v.object({
        isLocalRecommended: v.boolean(),
        localTips: v.optional(v.string()),
        bestTimeToVisit: v.optional(v.string()),
        localSecrets: v.optional(v.array(v.string())),
        recommendedBy: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { poiId, ...updates } = args;

    await ctx.db.patch(poiId, {
      isHiddenGem: true,
      ...updates,
    });

    return await ctx.db.get(poiId);
  },
});

/**
 * Update hidden gem metadata
 */
export const updateHiddenGemInfo = mutation({
  args: {
    poiId: v.id("pois"),
    hiddenGemScore: v.optional(v.number()),
    popularityLevel: v.optional(popularityLevelValidator),
    localRecommendation: v.optional(
      v.object({
        isLocalRecommended: v.boolean(),
        localTips: v.optional(v.string()),
        bestTimeToVisit: v.optional(v.string()),
        localSecrets: v.optional(v.array(v.string())),
        recommendedBy: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { poiId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );

    await ctx.db.patch(poiId, filteredUpdates);
    return await ctx.db.get(poiId);
  },
});

// ============================================
// User Submitted POIs
// ============================================

/**
 * Submit a new hidden gem POI
 */
export const submitHiddenGem = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    nameEn: v.optional(v.string()),
    category: poiCategoryValidator,
    cityId: v.id("cities"),
    address: v.optional(v.string()),
    latitude: v.number(),
    longitude: v.number(),
    description: v.string(),
    localTips: v.optional(v.string()),
    bestTimeToVisit: v.optional(v.string()),
    priceRange: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    howDiscovered: v.optional(v.string()),
    localSecrets: v.optional(v.array(v.string())),
    avoidTimes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("userSubmittedPois", {
      ...args,
      status: "pending",
      upvotes: 0,
      downvotes: 0,
      viewCount: 0,
      createdAt: now,
    });
  },
});

/**
 * List user submitted POIs
 */
export const listUserSubmittedPois = query({
  args: {
    cityId: v.optional(v.id("cities")),
    status: v.optional(userSubmittedPoiStatusValidator),
    userId: v.optional(v.string()),
    category: v.optional(poiCategoryValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let pois;

    if (args.cityId && args.status) {
      pois = await ctx.db
        .query("userSubmittedPois")
        .withIndex("by_city_status", (q) =>
          q.eq("cityId", args.cityId!).eq("status", args.status!),
        )
        .take(limit * 2);
    } else if (args.status) {
      pois = await ctx.db
        .query("userSubmittedPois")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .take(limit * 2);
    } else if (args.cityId) {
      pois = await ctx.db
        .query("userSubmittedPois")
        .withIndex("by_city", (q) => q.eq("cityId", args.cityId!))
        .take(limit * 2);
    } else if (args.userId) {
      pois = await ctx.db
        .query("userSubmittedPois")
        .withIndex("by_user", (q) => q.eq("userId", args.userId!))
        .take(limit * 2);
    } else {
      pois = await ctx.db
        .query("userSubmittedPois")
        .order("desc")
        .take(limit * 2);
    }

    // Additional filters
    if (args.userId && !args.cityId && !args.status) {
      // Already filtered by userId index
    } else if (args.userId) {
      pois = pois.filter((poi) => poi.userId === args.userId);
    }

    if (args.category) {
      pois = pois.filter((poi) => poi.category === args.category);
    }

    // Sort by upvotes - downvotes (net votes)
    pois.sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes));

    return pois.slice(0, limit);
  },
});

/**
 * Get a user submitted POI by ID
 */
export const getUserSubmittedPoiById = query({
  args: { id: v.id("userSubmittedPois") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Vote on a user submitted POI
 */
export const voteOnUserSubmittedPoi = mutation({
  args: {
    poiId: v.id("userSubmittedPois"),
    userId: v.string(),
    voteType: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check for existing vote
    const existingVote = await ctx.db
      .query("userSubmittedPoiVotes")
      .withIndex("by_poi_user", (q) =>
        q.eq("poiId", args.poiId).eq("userId", args.userId),
      )
      .first();

    const poi = await ctx.db.get(args.poiId);
    if (!poi) {
      throw new Error("POI not found");
    }

    if (existingVote) {
      // If same vote type, remove the vote
      if (existingVote.voteType === args.voteType) {
        await ctx.db.delete(existingVote._id);
        // Decrement the appropriate counter
        if (args.voteType === "up") {
          await ctx.db.patch(args.poiId, { upvotes: poi.upvotes - 1 });
        } else {
          await ctx.db.patch(args.poiId, { downvotes: poi.downvotes - 1 });
        }
        return { action: "removed", voteType: args.voteType };
      } else {
        // Change vote type
        await ctx.db.patch(existingVote._id, {
          voteType: args.voteType,
          createdAt: now,
        });
        // Update counters
        if (args.voteType === "up") {
          await ctx.db.patch(args.poiId, {
            upvotes: poi.upvotes + 1,
            downvotes: poi.downvotes - 1,
          });
        } else {
          await ctx.db.patch(args.poiId, {
            upvotes: poi.upvotes - 1,
            downvotes: poi.downvotes + 1,
          });
        }
        return { action: "changed", voteType: args.voteType };
      }
    } else {
      // Create new vote
      await ctx.db.insert("userSubmittedPoiVotes", {
        poiId: args.poiId,
        userId: args.userId,
        voteType: args.voteType,
        createdAt: now,
      });
      // Increment the appropriate counter
      if (args.voteType === "up") {
        await ctx.db.patch(args.poiId, { upvotes: poi.upvotes + 1 });
      } else {
        await ctx.db.patch(args.poiId, { downvotes: poi.downvotes + 1 });
      }
      return { action: "added", voteType: args.voteType };
    }
  },
});

/**
 * Update user submitted POI status (for moderation)
 */
export const updateUserSubmittedPoiStatus = mutation({
  args: {
    poiId: v.id("userSubmittedPois"),
    status: userSubmittedPoiStatusValidator,
    reviewedBy: v.string(),
    moderatorNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.poiId, {
      status: args.status,
      reviewedBy: args.reviewedBy,
      reviewedAt: now,
      moderatorNotes: args.moderatorNotes,
      updatedAt: now,
    });

    return await ctx.db.get(args.poiId);
  },
});

/**
 * Increment view count for user submitted POI
 */
export const incrementViewCount = mutation({
  args: { poiId: v.id("userSubmittedPois") },
  handler: async (ctx, args) => {
    const poi = await ctx.db.get(args.poiId);
    if (poi) {
      await ctx.db.patch(args.poiId, { viewCount: poi.viewCount + 1 });
    }
  },
});

// ============================================
// Hidden Gem Ratings
// ============================================

/**
 * Rate a hidden gem POI
 */
export const rateHiddenGem = mutation({
  args: {
    poiId: v.id("pois"),
    userId: v.string(),
    rating: v.number(), // 1-5
    review: v.optional(v.string()),
    visitDate: v.optional(v.string()),
    wouldRecommend: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check for existing rating
    const existingRating = await ctx.db
      .query("hiddenGemRatings")
      .withIndex("by_poi_user", (q) =>
        q.eq("poiId", args.poiId).eq("userId", args.userId),
      )
      .first();

    const poi = await ctx.db.get(args.poiId);
    if (!poi) {
      throw new Error("POI not found");
    }

    let ratingId: Id<"hiddenGemRatings">;

    if (existingRating) {
      // Update existing rating
      await ctx.db.patch(existingRating._id, {
        rating: args.rating,
        review: args.review,
        visitDate: args.visitDate,
        wouldRecommend: args.wouldRecommend,
        updatedAt: now,
      });
      ratingId = existingRating._id;

      // Recalculate average (subtract old, add new)
      const oldTotal =
        (poi.hiddenGemRating ?? 0) * (poi.hiddenGemRatingCount ?? 0);
      const newTotal = oldTotal - existingRating.rating + args.rating;
      const newAverage = newTotal / (poi.hiddenGemRatingCount ?? 1);

      await ctx.db.patch(args.poiId, {
        hiddenGemRating: newAverage,
      });
    } else {
      // Create new rating
      ratingId = await ctx.db.insert("hiddenGemRatings", {
        poiId: args.poiId,
        userId: args.userId,
        rating: args.rating,
        review: args.review,
        visitDate: args.visitDate,
        wouldRecommend: args.wouldRecommend,
        createdAt: now,
      });

      // Update POI average rating
      const currentCount = poi.hiddenGemRatingCount ?? 0;
      const currentTotal = (poi.hiddenGemRating ?? 0) * currentCount;
      const newCount = currentCount + 1;
      const newAverage = (currentTotal + args.rating) / newCount;

      await ctx.db.patch(args.poiId, {
        hiddenGemRating: newAverage,
        hiddenGemRatingCount: newCount,
      });
    }

    return ratingId;
  },
});

/**
 * Get ratings for a hidden gem POI
 */
export const getHiddenGemRatings = query({
  args: {
    poiId: v.id("pois"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const ratings = await ctx.db
      .query("hiddenGemRatings")
      .withIndex("by_poi", (q) => q.eq("poiId", args.poiId))
      .order("desc")
      .take(limit);

    return ratings;
  },
});

/**
 * Get user's rating for a POI
 */
export const getUserRating = query({
  args: {
    poiId: v.id("pois"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("hiddenGemRatings")
      .withIndex("by_poi_user", (q) =>
        q.eq("poiId", args.poiId).eq("userId", args.userId),
      )
      .first();
  },
});

/**
 * Delete a hidden gem rating
 */
export const deleteRating = mutation({
  args: {
    ratingId: v.id("hiddenGemRatings"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const rating = await ctx.db.get(args.ratingId);
    if (!rating) {
      throw new Error("Rating not found");
    }

    if (rating.userId !== args.userId) {
      throw new Error("Not authorized to delete this rating");
    }

    // Update POI average rating
    const poi = await ctx.db.get(rating.poiId);
    if (poi && poi.hiddenGemRatingCount && poi.hiddenGemRatingCount > 0) {
      const currentCount = poi.hiddenGemRatingCount;
      const currentTotal = (poi.hiddenGemRating ?? 0) * currentCount;
      const newCount = currentCount - 1;

      if (newCount > 0) {
        const newAverage = (currentTotal - rating.rating) / newCount;
        await ctx.db.patch(rating.poiId, {
          hiddenGemRating: newAverage,
          hiddenGemRatingCount: newCount,
        });
      } else {
        await ctx.db.patch(rating.poiId, {
          hiddenGemRating: undefined,
          hiddenGemRatingCount: 0,
        });
      }
    }

    await ctx.db.delete(args.ratingId);
  },
});
