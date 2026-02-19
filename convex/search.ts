import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Search - Global search queries and mutations for smart search functionality
 */

// Search result type validator
const searchResultTypeValidator = v.union(
  v.literal("poi"),
  v.literal("itinerary"),
  v.literal("guide"),
  v.literal("user"),
);

/**
 * Global search across POIs, itineraries, guides, and users
 */
export const globalSearch = query({
  args: {
    query: v.string(),
    types: v.optional(v.array(searchResultTypeValidator)),
    cityId: v.optional(v.id("cities")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const searchQuery = args.query.toLowerCase().trim();
    const limit = args.limit ?? 20;
    const types = args.types ?? ["poi", "itinerary", "guide", "user"];

    const results: Array<{
      id: string;
      type: "poi" | "itinerary" | "guide" | "user";
      score: number;
      data:
        | Doc<"pois">
        | Doc<"itineraries">
        | Doc<"travelGuides">
        | Doc<"profiles">
        | Record<string, unknown>;
    }> = [];

    // Search POIs
    if (types.includes("poi")) {
      let pois = await ctx.db.query("pois").take(500);

      if (args.cityId) {
        pois = pois.filter((p) => p.cityId === args.cityId);
      }

      for (const poi of pois) {
        const matchedFields: string[] = [];
        let score = 0;

        // Name match (highest priority)
        if (poi.name.toLowerCase().includes(searchQuery)) {
          matchedFields.push("name");
          score += poi.name.toLowerCase() === searchQuery ? 1.0 : 0.8;
        }
        if (poi.nameEn?.toLowerCase().includes(searchQuery)) {
          matchedFields.push("nameEn");
          score += 0.7;
        }
        // Address match
        if (poi.address?.toLowerCase().includes(searchQuery)) {
          matchedFields.push("address");
          score += 0.4;
        }

        if (matchedFields.length > 0) {
          // Boost by rating
          if (poi.rating) {
            score += poi.rating * 0.1;
          }

          results.push({
            id: poi._id,
            type: "poi",
            score: Math.min(score, 1.0),
            data: {
              name: poi.name,
              nameEn: poi.nameEn,
              category: poi.category,
              cityId: poi.cityId,
              address: poi.address,
              latitude: poi.latitude,
              longitude: poi.longitude,
              rating: poi.rating,
              imageUrl: poi.imageUrls?.[0],
              matchedFields,
            },
          });
        }
      }
    }

    // Search Itineraries
    if (types.includes("itinerary")) {
      let itineraries = await ctx.db
        .query("itineraries")
        .withIndex("by_visibility", (q) => q.eq("visibility", "public"))
        .take(200);

      if (args.cityId) {
        itineraries = itineraries.filter((i) => i.cityId === args.cityId);
      }

      for (const itinerary of itineraries) {
        const matchedFields: string[] = [];
        let score = 0;

        if (itinerary.title.toLowerCase().includes(searchQuery)) {
          matchedFields.push("title");
          score += itinerary.title.toLowerCase() === searchQuery ? 1.0 : 0.8;
        }

        if (matchedFields.length > 0) {
          const city = await ctx.db.get(itinerary.cityId);
          const daysCount = calculateDaysCount(
            itinerary.startDate,
            itinerary.endDate,
          );

          results.push({
            id: itinerary._id,
            type: "itinerary",
            score: Math.min(score, 1.0),
            data: {
              title: itinerary.title,
              cityId: itinerary.cityId,
              cityName: city?.name,
              startDate: itinerary.startDate,
              endDate: itinerary.endDate,
              daysCount,
              coverImageUrl: itinerary.coverImageUrl,
              visibility: itinerary.visibility,
              userId: itinerary.userId,
              matchedFields,
            },
          });
        }
      }
    }

    // Search Travel Guides
    if (types.includes("guide")) {
      const guides = await ctx.db.query("travelGuides").take(300);

      for (const guide of guides) {
        const matchedFields: string[] = [];
        let score = 0;

        if (guide.title?.toLowerCase().includes(searchQuery)) {
          matchedFields.push("title");
          score += guide.title.toLowerCase() === searchQuery ? 1.0 : 0.8;
        }
        if (
          guide.destinations.some((d) => d.toLowerCase().includes(searchQuery))
        ) {
          matchedFields.push("destinations");
          score += 0.7;
        }
        if (guide.tags.some((t) => t.toLowerCase().includes(searchQuery))) {
          matchedFields.push("tags");
          score += 0.5;
        }
        if (guide.authorName?.toLowerCase().includes(searchQuery)) {
          matchedFields.push("authorName");
          score += 0.3;
        }

        if (matchedFields.length > 0) {
          // Boost by quality score and engagement
          score += guide.qualityScore * 0.1;
          score += Math.min((guide.likesCount || 0) / 1000, 0.1);

          results.push({
            id: guide._id,
            type: "guide",
            score: Math.min(score, 1.0),
            data: {
              title: guide.title,
              authorName: guide.authorName,
              summary: guide.aiSummary || guide.content?.substring(0, 200),
              coverImageUrl: guide.coverImageUrl,
              sourcePlatform: guide.sourcePlatform,
              destinations: guide.destinations,
              tags: guide.tags,
              qualityScore: guide.qualityScore,
              likesCount: guide.likesCount || 0,
              viewsCount: guide.viewsCount || 0,
              matchedFields,
            },
          });
        }
      }
    }

    // Search Users
    if (types.includes("user")) {
      const profiles = await ctx.db.query("profiles").take(200);

      for (const profile of profiles) {
        const matchedFields: string[] = [];
        let score = 0;

        if (profile.displayName?.toLowerCase().includes(searchQuery)) {
          matchedFields.push("displayName");
          score +=
            profile.displayName.toLowerCase() === searchQuery ? 1.0 : 0.8;
        }
        if (profile.email.toLowerCase().includes(searchQuery)) {
          matchedFields.push("email");
          score += 0.5;
        }
        if (profile.bio?.toLowerCase().includes(searchQuery)) {
          matchedFields.push("bio");
          score += 0.3;
        }

        if (matchedFields.length > 0) {
          // Boost by follower count
          score += Math.min((profile.followersCount || 0) / 1000, 0.1);

          results.push({
            id: profile._id,
            type: "user",
            score: Math.min(score, 1.0),
            data: {
              email: profile.email,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl,
              bio: profile.bio,
              followersCount: profile.followersCount || 0,
              followingCount: profile.followingCount || 0,
              matchedFields,
            },
          });
        }
      }
    }

    // Sort by score and limit
    results.sort((a, b) => b.score - a.score);

    // Calculate totals by type
    const totalByType: Record<string, number> = {
      poi: 0,
      itinerary: 0,
      guide: 0,
      user: 0,
    };
    for (const r of results) {
      totalByType[r.type]++;
    }

    return {
      results: results.slice(0, limit),
      totalByType,
      total: results.length,
    };
  },
});

/**
 * Get search suggestions based on partial query
 */
export const getSuggestions = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const searchQuery = args.query.toLowerCase().trim();
    const limit = args.limit ?? 10;

    if (searchQuery.length < 2) {
      return { suggestions: [] };
    }

    const suggestions: Array<{
      id: string;
      text: string;
      type: "suggestion";
      resultType: "poi" | "itinerary" | "guide" | "user";
      metadata?: {
        resultId: string;
        category?: string;
        cityName?: string;
      };
    }> = [];

    // Get matching POI names
    const pois = await ctx.db.query("pois").take(100);
    for (const poi of pois) {
      if (poi.name.toLowerCase().startsWith(searchQuery)) {
        suggestions.push({
          id: `poi-${poi._id}`,
          text: poi.name,
          type: "suggestion",
          resultType: "poi",
          metadata: {
            resultId: poi._id,
            category: poi.category,
          },
        });
      }
    }

    // Get matching destination names from guides
    const guides = await ctx.db.query("travelGuides").take(100);
    const seenDestinations = new Set<string>();
    for (const guide of guides) {
      for (const dest of guide.destinations) {
        if (
          dest.toLowerCase().startsWith(searchQuery) &&
          !seenDestinations.has(dest.toLowerCase())
        ) {
          seenDestinations.add(dest.toLowerCase());
          suggestions.push({
            id: `dest-${dest}`,
            text: dest,
            type: "suggestion",
            resultType: "guide",
          });
        }
      }
    }

    // Sort and limit
    suggestions.sort((a, b) => a.text.length - b.text.length);
    return { suggestions: suggestions.slice(0, limit) };
  },
});

/**
 * Record search history for a user
 */
export const recordSearchHistory = mutation({
  args: {
    userId: v.string(),
    query: v.string(),
    resultType: v.optional(searchResultTypeValidator),
    resultId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if this query already exists for the user
    const existing = await ctx.db
      .query("searchHistory")
      .withIndex("by_user_query", (q) =>
        q.eq("userId", args.userId).eq("query", args.query),
      )
      .first();

    if (existing) {
      // Update timestamp
      await ctx.db.patch(existing._id, {
        searchedAt: Date.now(),
        resultType: args.resultType,
        resultId: args.resultId,
      });
      return existing._id;
    }

    // Create new history entry
    return await ctx.db.insert("searchHistory", {
      userId: args.userId,
      query: args.query,
      resultType: args.resultType,
      resultId: args.resultId,
      searchedAt: Date.now(),
    });
  },
});

/**
 * Get search history for a user
 */
export const getSearchHistory = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const history = await ctx.db
      .query("searchHistory")
      .withIndex("by_user_searched", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    return {
      history: history.map((h) => ({
        id: h._id,
        query: h.query,
        resultType: h.resultType,
        resultId: h.resultId,
        searchedAt: h.searchedAt,
      })),
    };
  },
});

/**
 * Clear search history for a user
 */
export const clearSearchHistory = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("searchHistory")
      .withIndex("by_user_searched", (q) => q.eq("userId", args.userId))
      .collect();

    for (const h of history) {
      await ctx.db.delete(h._id);
    }

    return { deleted: history.length };
  },
});

/**
 * Delete a single search history item
 */
export const deleteSearchHistoryItem = mutation({
  args: {
    id: v.id("searchHistory"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item || item.userId !== args.userId) {
      throw new Error("Search history item not found");
    }

    await ctx.db.delete(args.id);
  },
});

/**
 * Record search for trending analytics
 */
export const recordSearchTrend = mutation({
  args: {
    query: v.string(),
    resultType: v.optional(searchResultTypeValidator),
  },
  handler: async (ctx, args) => {
    const normalizedQuery = args.query.toLowerCase().trim();
    const today = new Date().toISOString().split("T")[0];

    // Find existing trend record for today
    const existing = await ctx.db
      .query("searchTrends")
      .withIndex("by_query_date", (q) =>
        q.eq("query", normalizedQuery).eq("date", today),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        searchCount: existing.searchCount + 1,
      });
      return existing._id;
    }

    return await ctx.db.insert("searchTrends", {
      query: normalizedQuery,
      date: today,
      searchCount: 1,
      resultType: args.resultType,
    });
  },
});

/**
 * Get trending searches
 */
export const getTrendingSearches = query({
  args: {
    limit: v.optional(v.number()),
    daysBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const daysBack = args.daysBack ?? 7;

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startDateStr = startDate.toISOString().split("T")[0];

    // Get all trends in date range
    const trends = await ctx.db
      .query("searchTrends")
      .withIndex("by_date", (q) => q.gte("date", startDateStr))
      .collect();

    // Aggregate by query
    const aggregated = new Map<
      string,
      { query: string; searchCount: number; resultType?: string }
    >();
    for (const t of trends) {
      const existing = aggregated.get(t.query);
      if (existing) {
        existing.searchCount += t.searchCount;
      } else {
        aggregated.set(t.query, {
          query: t.query,
          searchCount: t.searchCount,
          resultType: t.resultType,
        });
      }
    }

    // Sort by search count and return top results
    const sorted = Array.from(aggregated.values())
      .sort((a, b) => b.searchCount - a.searchCount)
      .slice(0, limit);

    return {
      trending: sorted.map((t, i) => ({
        id: `trend-${i}`,
        query: t.query,
        searchCount: t.searchCount,
        trend: "stable" as const,
        category: t.resultType,
      })),
      updatedAt: Date.now(),
    };
  },
});

// Helper function
function calculateDaysCount(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
}
