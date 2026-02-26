import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Itinerary Templates - 行程模板查询和变更
 */

const visibilityValidator = v.union(
  v.literal("private"),
  v.literal("public"),
  v.literal("unlisted"),
);

const templateTypeValidator = v.union(v.literal("preset"), v.literal("user"));

const poiTypeValidator = v.union(
  v.literal("attraction"),
  v.literal("restaurant"),
  v.literal("hotel"),
  v.literal("transportation"),
  v.literal("activity"),
  v.literal("shopping"),
);

const templatePoiValidator = v.object({
  name: v.string(),
  type: poiTypeValidator,
  description: v.optional(v.string()),
  suggestedDuration: v.optional(v.number()),
  suggestedTime: v.optional(v.string()),
  notes: v.optional(v.string()),
  latitude: v.optional(v.number()),
  longitude: v.optional(v.number()),
  address: v.optional(v.string()),
});

const _templateDayValidator = v.object({
  dayNumber: v.number(),
  theme: v.optional(v.string()),
  pois: v.array(templatePoiValidator),
});

const estimatedBudgetValidator = v.object({
  min: v.number(),
  max: v.number(),
  currency: v.string(),
});

// ============================================
// Template Categories
// ============================================

// List all active categories
export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("templateCategories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Get category by ID
export const getCategoryById = query({
  args: { id: v.id("templateCategories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new category (admin only)
export const createCategory = mutation({
  args: {
    name: v.string(),
    nameEn: v.optional(v.string()),
    icon: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("templateCategories", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a category
export const updateCategory = mutation({
  args: {
    id: v.id("templateCategories"),
    name: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
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

// ============================================
// Templates - Queries
// ============================================

// List public templates with optional filters
export const listPublicTemplates = query({
  args: {
    categoryId: v.optional(v.id("templateCategories")),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    sortBy: v.optional(
      v.union(
        v.literal("popular"),
        v.literal("newest"),
        v.literal("most_used"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const sortBy = args.sortBy ?? "popular";

    let templates = await ctx.db
      .query("itineraryTemplates")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .collect();

    // Filter by category if specified
    if (args.categoryId) {
      templates = templates.filter((t) => t.categoryId === args.categoryId);
    }

    // Sort
    switch (sortBy) {
      case "popular":
        templates.sort((a, b) => b.likeCount - a.likeCount);
        break;
      case "newest":
        templates.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "most_used":
        templates.sort((a, b) => b.useCount - a.useCount);
        break;
    }

    const total = templates.length;
    const data = templates.slice(offset, offset + pageSize);

    // Enrich with category info
    const enriched = await Promise.all(
      data.map(async (template) => {
        const category = await ctx.db.get(template.categoryId);
        return {
          ...template,
          categoryName: category?.name,
          categoryIcon: category?.icon,
        };
      }),
    );

    return { data: enriched, total };
  },
});

// List user's own templates
export const listUserTemplates = query({
  args: {
    userId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const templates = await ctx.db
      .query("itineraryTemplates")
      .withIndex("by_creator", (q) => q.eq("creatorId", args.userId))
      .order("desc")
      .collect();

    const total = templates.length;
    const data = templates.slice(offset, offset + pageSize);

    // Enrich with category info
    const enriched = await Promise.all(
      data.map(async (template) => {
        const category = await ctx.db.get(template.categoryId);
        return {
          ...template,
          categoryName: category?.name,
          categoryIcon: category?.icon,
        };
      }),
    );

    return { data: enriched, total };
  },
});

// Get template by ID with full details
export const getTemplateById = query({
  args: { id: v.id("itineraryTemplates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (!template) return null;

    const category = await ctx.db.get(template.categoryId);

    return {
      ...template,
      categoryName: category?.name,
      categoryIcon: category?.icon,
    };
  },
});

// Get template with user interaction status
export const getTemplateWithUserStatus = query({
  args: {
    id: v.id("itineraryTemplates"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (!template) return null;

    const category = await ctx.db.get(template.categoryId);

    let isLiked = false;
    let isSaved = false;

    if (args.userId) {
      const like = await ctx.db
        .query("templateLikes")
        .withIndex("by_template_user", (q) =>
          q.eq("templateId", args.id).eq("userId", args.userId!),
        )
        .first();
      isLiked = !!like;

      const save = await ctx.db
        .query("templateSaves")
        .withIndex("by_template_user", (q) =>
          q.eq("templateId", args.id).eq("userId", args.userId!),
        )
        .first();
      isSaved = !!save;
    }

    return {
      ...template,
      categoryName: category?.name,
      categoryIcon: category?.icon,
      isLiked,
      isSaved,
    };
  },
});

// List saved templates for a user
export const listSavedTemplates = query({
  args: {
    userId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const saves = await ctx.db
      .query("templateSaves")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const total = saves.length;
    const paginatedSaves = saves.slice(offset, offset + pageSize);

    // Get template details
    const templates = await Promise.all(
      paginatedSaves.map(async (save) => {
        const template = await ctx.db.get(save.templateId);
        if (!template) return null;

        const category = await ctx.db.get(template.categoryId);
        return {
          ...template,
          categoryName: category?.name,
          categoryIcon: category?.icon,
          savedAt: save.createdAt,
        };
      }),
    );

    return {
      data: templates.filter((t) => t !== null),
      total,
    };
  },
});

// Search templates
export const searchTemplates = query({
  args: {
    query: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchQuery = args.query.toLowerCase();

    const templates = await ctx.db
      .query("itineraryTemplates")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .collect();

    // Filter by search query
    const filtered = templates.filter((t) => {
      const titleMatch = t.title.toLowerCase().includes(searchQuery);
      const descMatch = t.description?.toLowerCase().includes(searchQuery);
      const tagMatch = t.tags?.some((tag) =>
        tag.toLowerCase().includes(searchQuery),
      );
      const destMatch = t.destinations?.some((dest) =>
        dest.toLowerCase().includes(searchQuery),
      );
      return titleMatch || descMatch || tagMatch || destMatch;
    });

    const total = filtered.length;
    const data = filtered.slice(offset, offset + pageSize);

    // Enrich with category info
    const enriched = await Promise.all(
      data.map(async (template) => {
        const category = await ctx.db.get(template.categoryId);
        return {
          ...template,
          categoryName: category?.name,
          categoryIcon: category?.icon,
        };
      }),
    );

    return { data: enriched, total };
  },
});

// Get recommended templates (popular + diverse categories)
export const getRecommendedTemplates = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    // Get all published templates
    const templates = await ctx.db
      .query("itineraryTemplates")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .collect();

    // Sort by a combination of likes and uses
    templates.sort((a, b) => {
      const scoreA = a.likeCount * 2 + a.useCount;
      const scoreB = b.likeCount * 2 + b.useCount;
      return scoreB - scoreA;
    });

    // Take top templates ensuring category diversity
    const selectedTemplates: typeof templates = [];
    const usedCategories = new Set<string>();

    for (const template of templates) {
      if (selectedTemplates.length >= limit) break;

      // Prioritize diversity in first half
      if (selectedTemplates.length < limit / 2) {
        if (!usedCategories.has(template.categoryId)) {
          selectedTemplates.push(template);
          usedCategories.add(template.categoryId);
        }
      } else {
        selectedTemplates.push(template);
      }
    }

    // Enrich with category info
    const enriched = await Promise.all(
      selectedTemplates.map(async (template) => {
        const category = await ctx.db.get(template.categoryId);
        return {
          ...template,
          categoryName: category?.name,
          categoryIcon: category?.icon,
        };
      }),
    );

    return enriched;
  },
});

// ============================================
// Templates - Mutations
// ============================================

// Create a new template
export const createTemplate = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    categoryId: v.id("templateCategories"),
    templateType: templateTypeValidator,
    creatorId: v.optional(v.string()),
    creatorName: v.optional(v.string()),
    daysCount: v.number(),
    days: v.array(_templateDayValidator),
    destinations: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    estimatedBudget: v.optional(estimatedBudgetValidator),
    suitableFor: v.optional(v.array(v.string())),
    bestSeasons: v.optional(v.array(v.string())),
    visibility: v.optional(visibilityValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const visibility = args.visibility ?? "private";

    return await ctx.db.insert("itineraryTemplates", {
      title: args.title,
      description: args.description,
      coverImageUrl: args.coverImageUrl,
      categoryId: args.categoryId,
      templateType: args.templateType,
      creatorId: args.creatorId,
      creatorName: args.creatorName,
      daysCount: args.daysCount,
      days: args.days,
      destinations: args.destinations,
      tags: args.tags,
      estimatedBudget: args.estimatedBudget,
      suitableFor: args.suitableFor,
      bestSeasons: args.bestSeasons,
      visibility,
      isPublished: visibility === "public",
      viewCount: 0,
      likeCount: 0,
      saveCount: 0,
      useCount: 0,
      createdAt: now,
      updatedAt: now,
      publishedAt: visibility === "public" ? now : undefined,
    });
  },
});

// Update a template
export const updateTemplate = mutation({
  args: {
    id: v.id("itineraryTemplates"),
    userId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    categoryId: v.optional(v.id("templateCategories")),
    daysCount: v.optional(v.number()),
    days: v.optional(v.array(_templateDayValidator)),
    destinations: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    estimatedBudget: v.optional(estimatedBudgetValidator),
    suitableFor: v.optional(v.array(v.string())),
    bestSeasons: v.optional(v.array(v.string())),
    visibility: v.optional(visibilityValidator),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (!template) {
      throw new Error("Template not found");
    }

    // Check ownership (only creator can update user templates)
    if (
      template.templateType === "user" &&
      template.creatorId !== args.userId
    ) {
      throw new Error("You do not have permission to update this template");
    }

    const { id, userId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );

    // Handle visibility change
    if (updates.visibility === "public" && template.visibility !== "public") {
      (filteredUpdates as Record<string, unknown>).isPublished = true;
      (filteredUpdates as Record<string, unknown>).publishedAt = Date.now();
    } else if (updates.visibility !== "public") {
      (filteredUpdates as Record<string, unknown>).isPublished = false;
    }

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

// Delete a template
export const deleteTemplate = mutation({
  args: {
    id: v.id("itineraryTemplates"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (!template) {
      throw new Error("Template not found");
    }

    // Check ownership
    if (
      template.templateType === "user" &&
      template.creatorId !== args.userId
    ) {
      throw new Error("You do not have permission to delete this template");
    }

    // Delete associated likes
    const likes = await ctx.db
      .query("templateLikes")
      .withIndex("by_template", (q) => q.eq("templateId", args.id))
      .collect();
    for (const like of likes) {
      await ctx.db.delete(like._id);
    }

    // Delete associated saves
    const saves = await ctx.db
      .query("templateSaves")
      .withIndex("by_template", (q) => q.eq("templateId", args.id))
      .collect();
    for (const save of saves) {
      await ctx.db.delete(save._id);
    }

    // Delete template
    await ctx.db.delete(args.id);
  },
});

// Increment view count
export const incrementViewCount = mutation({
  args: { id: v.id("itineraryTemplates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (!template) return;

    await ctx.db.patch(args.id, {
      viewCount: template.viewCount + 1,
    });
  },
});

// Increment use count (when creating itinerary from template)
export const incrementUseCount = mutation({
  args: { id: v.id("itineraryTemplates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (!template) return;

    await ctx.db.patch(args.id, {
      useCount: template.useCount + 1,
    });
  },
});

// ============================================
// Likes & Saves
// ============================================

// Toggle like on a template
export const toggleLike = mutation({
  args: {
    templateId: v.id("itineraryTemplates"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("templateLikes")
      .withIndex("by_template_user", (q) =>
        q.eq("templateId", args.templateId).eq("userId", args.userId),
      )
      .first();

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    if (existing) {
      // Unlike
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.templateId, {
        likeCount: Math.max(0, template.likeCount - 1),
      });
      return { liked: false };
    } else {
      // Like
      await ctx.db.insert("templateLikes", {
        templateId: args.templateId,
        userId: args.userId,
        createdAt: Date.now(),
      });
      await ctx.db.patch(args.templateId, {
        likeCount: template.likeCount + 1,
      });
      return { liked: true };
    }
  },
});

// Toggle save on a template
export const toggleSave = mutation({
  args: {
    templateId: v.id("itineraryTemplates"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("templateSaves")
      .withIndex("by_template_user", (q) =>
        q.eq("templateId", args.templateId).eq("userId", args.userId),
      )
      .first();

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    if (existing) {
      // Unsave
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.templateId, {
        saveCount: Math.max(0, template.saveCount - 1),
      });
      return { saved: false };
    } else {
      // Save
      await ctx.db.insert("templateSaves", {
        templateId: args.templateId,
        userId: args.userId,
        createdAt: Date.now(),
      });
      await ctx.db.patch(args.templateId, {
        saveCount: template.saveCount + 1,
      });
      return { saved: true };
    }
  },
});

// ============================================
// Create Itinerary from Template
// ============================================

// This creates an itinerary based on a template
export const createItineraryFromTemplate = mutation({
  args: {
    templateId: v.id("itineraryTemplates"),
    userId: v.string(),
    title: v.string(),
    cityId: v.id("cities"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Create the itinerary
    const itineraryId = await ctx.db.insert("itineraries", {
      userId: args.userId,
      title: args.title,
      cityId: args.cityId,
      startDate: args.startDate,
      endDate: args.endDate,
      visibility: "private",
      coverImageUrl: template.coverImageUrl,
    });

    // Create days based on template
    const dates = getDateRange(args.startDate, args.endDate);
    for (let i = 0; i < dates.length && i < template.days.length; i++) {
      const _templateDay = template.days[i];

      await ctx.db.insert("itineraryDays", {
        itineraryId,
        dayNumber: i + 1,
        date: dates[i],
      });

      // Note: POIs from template are suggestions only
      // User needs to search and add actual POIs to their itinerary
    }

    // Increment template use count
    await ctx.db.patch(args.templateId, {
      useCount: template.useCount + 1,
    });

    return itineraryId;
  },
});

// Helper function
function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// ============================================
// Save Itinerary as Template
// ============================================

export const saveItineraryAsTemplate = mutation({
  args: {
    itineraryId: v.id("itineraries"),
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    categoryId: v.id("templateCategories"),
    tags: v.optional(v.array(v.string())),
    visibility: v.optional(visibilityValidator),
  },
  handler: async (ctx, args) => {
    const itinerary = await ctx.db.get(args.itineraryId);
    if (!itinerary) {
      throw new Error("Itinerary not found");
    }

    // Check ownership
    if (itinerary.userId !== args.userId) {
      throw new Error("You can only save your own itineraries as templates");
    }

    // Get days and items
    const days = await ctx.db
      .query("itineraryDays")
      .withIndex("by_itinerary", (q) => q.eq("itineraryId", args.itineraryId))
      .collect();
    days.sort((a, b) => a.dayNumber - b.dayNumber);

    // Build template days structure
    const _templateDays = await Promise.all(
      days.map(async (day) => {
        const items = await ctx.db
          .query("itineraryItems")
          .withIndex("by_day", (q) => q.eq("dayId", day._id))
          .collect();
        items.sort((a, b) => a.orderIndex - b.orderIndex);

        // Get POI details for each item
        const pois = await Promise.all(
          items.map(async (item) => {
            const poi = await ctx.db.get(item.poiId as Id<"pois">);
            return {
              name: poi?.name ?? "Unknown",
              type: (poi?.category ?? "attraction") as
                | "attraction"
                | "restaurant"
                | "hotel"
                | "transportation"
                | "activity"
                | "shopping",
              description: item.notes,
              suggestedDuration:
                item.startTime && item.endTime
                  ? calculateDuration(item.startTime, item.endTime)
                  : undefined,
              suggestedTime: item.startTime,
              latitude: poi?.latitude,
              longitude: poi?.longitude,
              address: poi?.address,
            };
          }),
        );

        return {
          dayNumber: day.dayNumber,
          theme: undefined,
          pois,
        };
      }),
    );

    const now = Date.now();
    const visibility = args.visibility ?? "private";

    // Create template
    return await ctx.db.insert("itineraryTemplates", {
      title: args.title,
      description: args.description,
      coverImageUrl: itinerary.coverImageUrl,
      categoryId: args.categoryId,
      templateType: "user",
      creatorId: args.userId,
      daysCount: days.length,
      days: _templateDays,
      tags: args.tags,
      visibility,
      isPublished: visibility === "public",
      viewCount: 0,
      likeCount: 0,
      saveCount: 0,
      useCount: 0,
      createdAt: now,
      updatedAt: now,
      publishedAt: visibility === "public" ? now : undefined,
    });
  },
});

// Helper to calculate duration in minutes from time strings
function calculateDuration(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  return endHour * 60 + endMin - (startHour * 60 + startMin);
}
