import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Itinerary Drafts - Auto-save functionality for itinerary editing
 *
 * Features:
 * - Auto-save drafts while editing
 * - Multi-device sync with optimistic locking
 * - Draft expiration and cleanup
 * - Restore from drafts
 */

// Default draft expiration: 30 days
const DRAFT_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000;

// Validators for draft content
const transportModeValidator = v.union(
  v.literal("walking"),
  v.literal("driving"),
  v.literal("transit"),
  v.literal("cycling"),
  v.literal("taxi"),
);

const poiCategoryValidator = v.union(
  v.literal("attraction"),
  v.literal("restaurant"),
  v.literal("hotel"),
  v.literal("shopping"),
  v.literal("other"),
);

const visibilityValidator = v.union(
  v.literal("private"),
  v.literal("team"),
  v.literal("public"),
);

const draftItemValidator = v.object({
  poiId: v.optional(v.id("pois")),
  orderIndex: v.number(),
  startTime: v.optional(v.string()),
  endTime: v.optional(v.string()),
  transportMode: v.optional(transportModeValidator),
  notes: v.optional(v.string()),
  inlinePoi: v.optional(
    v.object({
      name: v.string(),
      category: poiCategoryValidator,
      address: v.optional(v.string()),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
    }),
  ),
});

const draftDayValidator = v.object({
  dayNumber: v.number(),
  date: v.optional(v.string()),
  items: v.array(draftItemValidator),
});

/**
 * List drafts for a user
 */
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

    const drafts = await ctx.db
      .query("itineraryDrafts")
      .withIndex("by_user_modified", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    // Filter out expired drafts
    const now = Date.now();
    const validDrafts = drafts.filter((d) => d.expiresAt > now);

    const total = validDrafts.length;
    const data = validDrafts.slice(offset, offset + pageSize);

    // Enrich with city data
    const enriched = await Promise.all(
      data.map(async (draft) => {
        const city = draft.cityId ? await ctx.db.get(draft.cityId) : null;
        return {
          ...draft,
          cityName: city?.name,
        };
      }),
    );

    return { data: enriched, total };
  },
});

/**
 * Get a specific draft by ID
 */
export const getById = query({
  args: { id: v.id("itineraryDrafts") },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.id);
    if (!draft) return null;

    // Check if expired
    if (draft.expiresAt < Date.now()) {
      return null;
    }

    const city = draft.cityId ? await ctx.db.get(draft.cityId) : null;

    return {
      ...draft,
      cityName: city?.name,
    };
  },
});

/**
 * Get draft for a specific itinerary (for editing existing itinerary)
 */
export const getByItinerary = query({
  args: {
    userId: v.string(),
    itineraryId: v.id("itineraries"),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db
      .query("itineraryDrafts")
      .withIndex("by_user_itinerary", (q) =>
        q.eq("userId", args.userId).eq("itineraryId", args.itineraryId),
      )
      .first();

    if (!draft || draft.expiresAt < Date.now()) {
      return null;
    }

    const city = draft.cityId ? await ctx.db.get(draft.cityId) : null;

    return {
      ...draft,
      cityName: city?.name,
    };
  },
});

/**
 * Save or update a draft (auto-save)
 * Uses optimistic locking via syncVersion for multi-device sync
 */
export const save = mutation({
  args: {
    userId: v.string(),
    draftId: v.optional(v.id("itineraryDrafts")),
    itineraryId: v.optional(v.id("itineraries")),
    title: v.string(),
    cityId: v.optional(v.id("cities")),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    visibility: v.optional(visibilityValidator),
    coverImageUrl: v.optional(v.string()),
    days: v.optional(v.array(draftDayValidator)),
    deviceId: v.optional(v.string()),
    expectedVersion: v.optional(v.number()), // For optimistic locking
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + DRAFT_EXPIRATION_MS;

    // If updating existing draft
    if (args.draftId) {
      const existing = await ctx.db.get(args.draftId);
      if (!existing) {
        throw new Error("Draft not found");
      }

      // Check ownership
      if (existing.userId !== args.userId) {
        throw new Error("You do not have permission to update this draft");
      }

      // Optimistic locking check
      if (
        args.expectedVersion !== undefined &&
        existing.syncVersion !== args.expectedVersion
      ) {
        throw new Error(
          "Draft has been modified by another device. Please refresh and try again.",
        );
      }

      await ctx.db.patch(args.draftId, {
        title: args.title,
        cityId: args.cityId,
        startDate: args.startDate,
        endDate: args.endDate,
        visibility: args.visibility,
        coverImageUrl: args.coverImageUrl,
        days: args.days,
        lastModifiedAt: now,
        expiresAt,
        deviceId: args.deviceId,
        syncVersion: existing.syncVersion + 1,
      });

      return args.draftId;
    }

    // Check if draft already exists for this itinerary
    if (args.itineraryId) {
      const existingDraft = await ctx.db
        .query("itineraryDrafts")
        .withIndex("by_user_itinerary", (q) =>
          q.eq("userId", args.userId).eq("itineraryId", args.itineraryId),
        )
        .first();

      if (existingDraft) {
        // Update existing draft
        await ctx.db.patch(existingDraft._id, {
          title: args.title,
          cityId: args.cityId,
          startDate: args.startDate,
          endDate: args.endDate,
          visibility: args.visibility,
          coverImageUrl: args.coverImageUrl,
          days: args.days,
          lastModifiedAt: now,
          expiresAt,
          deviceId: args.deviceId,
          syncVersion: existingDraft.syncVersion + 1,
        });

        return existingDraft._id;
      }
    }

    // Create new draft
    const draftId = await ctx.db.insert("itineraryDrafts", {
      userId: args.userId,
      itineraryId: args.itineraryId,
      title: args.title,
      cityId: args.cityId,
      startDate: args.startDate,
      endDate: args.endDate,
      visibility: args.visibility,
      coverImageUrl: args.coverImageUrl,
      days: args.days,
      lastModifiedAt: now,
      expiresAt,
      deviceId: args.deviceId,
      syncVersion: 1,
    });

    return draftId;
  },
});

/**
 * Delete a draft
 */
export const remove = mutation({
  args: {
    id: v.id("itineraryDrafts"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.id);
    if (!draft) {
      throw new Error("Draft not found");
    }

    if (draft.userId !== args.userId) {
      throw new Error("You do not have permission to delete this draft");
    }

    await ctx.db.delete(args.id);
  },
});

/**
 * Delete draft for a specific itinerary (called after successful save)
 */
export const removeByItinerary = mutation({
  args: {
    userId: v.string(),
    itineraryId: v.id("itineraries"),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db
      .query("itineraryDrafts")
      .withIndex("by_user_itinerary", (q) =>
        q.eq("userId", args.userId).eq("itineraryId", args.itineraryId),
      )
      .first();

    if (draft) {
      await ctx.db.delete(draft._id);
    }
  },
});

/**
 * Clean up expired drafts (should be called periodically via cron)
 */
export const cleanupExpired = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;
    const now = Date.now();

    const expiredDrafts = await ctx.db
      .query("itineraryDrafts")
      .withIndex("by_expires")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .take(batchSize);

    let deletedCount = 0;
    for (const draft of expiredDrafts) {
      await ctx.db.delete(draft._id);
      deletedCount++;
    }

    return { deletedCount, hasMore: expiredDrafts.length === batchSize };
  },
});

/**
 * Get draft count for a user (for UI badge)
 */
export const countByUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const drafts = await ctx.db
      .query("itineraryDrafts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Count only non-expired drafts
    return drafts.filter((d) => d.expiresAt > now).length;
  },
});

/**
 * Extend draft expiration (user wants to keep it longer)
 */
export const extendExpiration = mutation({
  args: {
    id: v.id("itineraryDrafts"),
    userId: v.string(),
    additionalDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.id);
    if (!draft) {
      throw new Error("Draft not found");
    }

    if (draft.userId !== args.userId) {
      throw new Error("You do not have permission to modify this draft");
    }

    const additionalMs = (args.additionalDays ?? 30) * 24 * 60 * 60 * 1000;
    const newExpiresAt = Math.max(draft.expiresAt, Date.now()) + additionalMs;

    await ctx.db.patch(args.id, {
      expiresAt: newExpiresAt,
    });

    return { expiresAt: newExpiresAt };
  },
});
