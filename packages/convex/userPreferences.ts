/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * User Preferences - Learning and Personalization
 * Tracks user behavior and preferences for personalized recommendations
 */

// Preference category types
const preferenceCategories = v.union(
  v.literal('food'),           // Food & Dining
  v.literal('culture'),        // Culture & History
  v.literal('nature'),         // Nature & Outdoors
  v.literal('shopping'),       // Shopping
  v.literal('nightlife'),      // Nightlife & Entertainment
  v.literal('adventure'),      // Adventure & Sports
  v.literal('relaxation'),     // Spa & Relaxation
  v.literal('photography'),    // Photography spots
  v.literal('family'),         // Family-friendly
  v.literal('budget'),         // Budget travel
  v.literal('luxury')          // Luxury travel
);

// Get user preferences
export const getUserPreferences = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query('userPreferences')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!preferences) {
      return null;
    }

    return preferences;
  },
});

// Get or create user preferences (returns default if none exists)
export const getOrCreatePreferences = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('userPreferences')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (existing) {
      return existing;
    }

    // Return default preferences (not persisted until explicit action)
    return {
      _id: null,
      userId: args.userId,
      categoryScores: {},
      explicitPreferences: [],
      travelStyle: 'balanced',
      budgetLevel: 'moderate',
      pacePreference: 'moderate',
      preferLocalFood: true,
      preferOffBeatPlaces: false,
      accessibilityNeeds: false,
      totalInteractions: 0,
      lastUpdated: Date.now(),
    };
  },
});

// Initialize or update user preferences
export const upsertPreferences = mutation({
  args: {
    userId: v.string(),
    explicitPreferences: v.optional(
      v.array(preferenceCategories)
    ),
    travelStyle: v.optional(
      v.union(
        v.literal('adventurous'),
        v.literal('relaxed'),
        v.literal('cultural'),
        v.literal('balanced')
      )
    ),
    budgetLevel: v.optional(
      v.union(
        v.literal('budget'),
        v.literal('moderate'),
        v.literal('luxury')
      )
    ),
    pacePreference: v.optional(
      v.union(
        v.literal('slow'),      // 1-2 activities per day
        v.literal('moderate'),  // 3-4 activities per day
        v.literal('fast')       // 5+ activities per day
      )
    ),
    preferLocalFood: v.optional(v.boolean()),
    preferOffBeatPlaces: v.optional(v.boolean()),
    accessibilityNeeds: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('userPreferences')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing preferences
      const updateData: Record<string, unknown> = {
        lastUpdated: now,
      };

      if (args.explicitPreferences !== undefined) {
        updateData.explicitPreferences = args.explicitPreferences;
      }
      if (args.travelStyle !== undefined) {
        updateData.travelStyle = args.travelStyle;
      }
      if (args.budgetLevel !== undefined) {
        updateData.budgetLevel = args.budgetLevel;
      }
      if (args.pacePreference !== undefined) {
        updateData.pacePreference = args.pacePreference;
      }
      if (args.preferLocalFood !== undefined) {
        updateData.preferLocalFood = args.preferLocalFood;
      }
      if (args.preferOffBeatPlaces !== undefined) {
        updateData.preferOffBeatPlaces = args.preferOffBeatPlaces;
      }
      if (args.accessibilityNeeds !== undefined) {
        updateData.accessibilityNeeds = args.accessibilityNeeds;
      }

      await ctx.db.patch(existing._id, updateData);
      return existing._id;
    }

    // Create new preferences
    return await ctx.db.insert('userPreferences', {
      userId: args.userId,
      categoryScores: {},
      explicitPreferences: args.explicitPreferences ?? [],
      travelStyle: args.travelStyle ?? 'balanced',
      budgetLevel: args.budgetLevel ?? 'moderate',
      pacePreference: args.pacePreference ?? 'moderate',
      preferLocalFood: args.preferLocalFood ?? true,
      preferOffBeatPlaces: args.preferOffBeatPlaces ?? false,
      accessibilityNeeds: args.accessibilityNeeds ?? false,
      totalInteractions: 0,
      createdAt: now,
      lastUpdated: now,
    });
  },
});

// Record a user behavior event (view, save, like, etc.)
export const recordBehavior = mutation({
  args: {
    userId: v.string(),
    behaviorType: v.union(
      v.literal('view'),        // Viewed content
      v.literal('save'),        // Saved/favorited
      v.literal('unsave'),      // Removed from favorites
      v.literal('copy'),        // Copied itinerary
      v.literal('share'),       // Shared content
      v.literal('like'),        // Liked content
      v.literal('unlike'),      // Removed like
      v.literal('search'),      // Searched for term
      v.literal('poi_click'),   // Clicked on POI
      v.literal('poi_add')      // Added POI to itinerary
    ),
    targetType: v.union(
      v.literal('guide'),
      v.literal('itinerary'),
      v.literal('poi'),
      v.literal('city'),
      v.literal('search')
    ),
    targetId: v.string(),
    categories: v.optional(v.array(preferenceCategories)), // Associated categories
    metadata: v.optional(v.object({
      duration: v.optional(v.number()),  // Time spent viewing (seconds)
      scrollDepth: v.optional(v.number()), // 0-100 percent scrolled
      searchQuery: v.optional(v.string()),
      cityName: v.optional(v.string()),
      poiCategory: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Record the behavior event
    const eventId = await ctx.db.insert('userBehaviorEvents', {
      userId: args.userId,
      behaviorType: args.behaviorType,
      targetType: args.targetType,
      targetId: args.targetId,
      categories: args.categories ?? [],
      metadata: args.metadata ?? {},
      createdAt: now,
    });

    // Update category scores based on behavior
    if (args.categories && args.categories.length > 0) {
      const preferences = await ctx.db
        .query('userPreferences')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .first();

      // Behavior type weights
      const weights: Record<string, number> = {
        view: 1,
        save: 5,
        unsave: -3,
        copy: 8,
        share: 6,
        like: 4,
        unlike: -2,
        search: 2,
        poi_click: 2,
        poi_add: 7,
      };

      const weight = weights[args.behaviorType] ?? 1;

      if (preferences) {
        // Update existing scores
        const currentScores = (preferences.categoryScores as Record<string, number>) || {};

        for (const category of args.categories) {
          currentScores[category] = (currentScores[category] || 0) + weight;
        }

        await ctx.db.patch(preferences._id, {
          categoryScores: currentScores,
          totalInteractions: (preferences.totalInteractions ?? 0) + 1,
          lastUpdated: now,
        });
      } else {
        // Create new preferences with initial scores
        const initialScores: Record<string, number> = {};
        for (const category of args.categories) {
          initialScores[category] = weight;
        }

        await ctx.db.insert('userPreferences', {
          userId: args.userId,
          categoryScores: initialScores,
          explicitPreferences: [],
          travelStyle: 'balanced',
          budgetLevel: 'moderate',
          pacePreference: 'moderate',
          preferLocalFood: true,
          preferOffBeatPlaces: false,
          accessibilityNeeds: false,
          totalInteractions: 1,
          createdAt: now,
          lastUpdated: now,
        });
      }
    }

    return eventId;
  },
});

// Get user's top preference categories based on behavior
export const getTopCategories = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query('userPreferences')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!preferences || !preferences.categoryScores) {
      return [];
    }

    const scores = preferences.categoryScores as Record<string, number>;
    const sorted = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, args.limit ?? 5);

    return sorted.map(([category, score]) => ({
      category,
      score,
      normalized: Math.min(1, score / 50), // Normalize to 0-1 range
    }));
  },
});

// Get recent behavior events for a user
export const getRecentBehaviors = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    behaviorType: v.optional(
      v.union(
        v.literal('view'),
        v.literal('save'),
        v.literal('unsave'),
        v.literal('copy'),
        v.literal('share'),
        v.literal('like'),
        v.literal('unlike'),
        v.literal('search'),
        v.literal('poi_click'),
        v.literal('poi_add')
      )
    ),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('userBehaviorEvents')
      .withIndex('by_user', (q) => q.eq('userId', args.userId));

    const events = await query.order('desc').take(args.limit ?? 50);

    if (args.behaviorType) {
      return events.filter((e) => e.behaviorType === args.behaviorType);
    }

    return events;
  },
});

// Reset user preferences (clear learned data)
export const resetPreferences = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Find and update preferences (keep explicit settings, reset learned)
    const preferences = await ctx.db
      .query('userPreferences')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (preferences) {
      await ctx.db.patch(preferences._id, {
        categoryScores: {},
        totalInteractions: 0,
        lastUpdated: Date.now(),
      });
    }

    // Delete all behavior events
    const events = await ctx.db
      .query('userBehaviorEvents')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    for (const event of events) {
      await ctx.db.delete(event._id);
    }

    return { success: true, deletedEvents: events.length };
  },
});

// Get personalized recommendations based on preferences
export const getRecommendedCategories = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query('userPreferences')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!preferences) {
      // Return default recommendations for new users
      return {
        topCategories: ['culture', 'food', 'nature'],
        style: 'balanced',
        isLearned: false,
      };
    }

    const scores = (preferences.categoryScores as Record<string, number>) || {};
    const explicit = preferences.explicitPreferences ?? [];

    // Combine learned and explicit preferences
    const combined: Record<string, number> = { ...scores };
    for (const cat of explicit) {
      combined[cat] = (combined[cat] || 0) + 20; // Boost explicit preferences
    }

    const topCategories = Object.entries(combined)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat]) => cat);

    return {
      topCategories: topCategories.length > 0 ? topCategories : ['culture', 'food', 'nature'],
      style: preferences.travelStyle,
      budgetLevel: preferences.budgetLevel,
      pacePreference: preferences.pacePreference,
      isLearned: preferences.totalInteractions > 10,
      totalInteractions: preferences.totalInteractions,
    };
  },
});
