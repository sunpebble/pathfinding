/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Timezones - User timezone settings and timezone utilities
 */

// ============================================
// User Timezone Settings
// ============================================

// Get user's timezone settings
export const getUserSettings = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query('userTimezoneSettings')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .first();
    return settings;
  },
});

// Create or update user timezone settings
export const upsertUserSettings = mutation({
  args: {
    userId: v.string(),
    homeTimezone: v.string(),
    homeCityId: v.optional(v.id('cities')),
    displayFormat: v.union(v.literal('12h'), v.literal('24h')),
    showSeconds: v.boolean(),
    autoDetect: v.boolean(),
    savedClocks: v.array(
      v.object({
        cityId: v.id('cities'),
        label: v.optional(v.string()),
        sortOrder: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('userTimezoneSettings')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    }
    else {
      return await ctx.db.insert('userTimezoneSettings', {
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Update only the home timezone
export const updateHomeTimezone = mutation({
  args: {
    userId: v.string(),
    homeTimezone: v.string(),
    homeCityId: v.optional(v.id('cities')),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('userTimezoneSettings')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        homeTimezone: args.homeTimezone,
        homeCityId: args.homeCityId,
        updatedAt: now,
      });
      return existing._id;
    }
    else {
      // Create with defaults
      return await ctx.db.insert('userTimezoneSettings', {
        userId: args.userId,
        homeTimezone: args.homeTimezone,
        homeCityId: args.homeCityId,
        displayFormat: '24h',
        showSeconds: false,
        autoDetect: true,
        savedClocks: [],
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Update display format preference
export const updateDisplayFormat = mutation({
  args: {
    userId: v.string(),
    displayFormat: v.union(v.literal('12h'), v.literal('24h')),
    showSeconds: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('userTimezoneSettings')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .first();

    if (!existing) {
      throw new Error(
        'User timezone settings not found. Please set home timezone first.',
      );
    }

    const updates: Record<string, unknown> = {
      displayFormat: args.displayFormat,
      updatedAt: Date.now(),
    };

    if (args.showSeconds !== undefined) {
      updates.showSeconds = args.showSeconds;
    }

    await ctx.db.patch(existing._id, updates);
    return existing._id;
  },
});

// ============================================
// World Clock Management
// ============================================

// Add a city to saved clocks
export const addSavedClock = mutation({
  args: {
    userId: v.string(),
    cityId: v.id('cities'),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('userTimezoneSettings')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .first();

    if (!existing) {
      throw new Error(
        'User timezone settings not found. Please set home timezone first.',
      );
    }

    // Check if city is already saved
    const alreadySaved = existing.savedClocks.some(
      clock => clock.cityId === args.cityId,
    );
    if (alreadySaved) {
      throw new Error('City is already in your world clock.');
    }

    // Add to the end with next sort order
    const maxOrder = existing.savedClocks.reduce(
      (max, clock) => Math.max(max, clock.sortOrder),
      0,
    );

    const newClock = {
      cityId: args.cityId,
      label: args.label,
      sortOrder: maxOrder + 1,
    };

    await ctx.db.patch(existing._id, {
      savedClocks: [...existing.savedClocks, newClock],
      updatedAt: Date.now(),
    });

    return existing._id;
  },
});

// Remove a city from saved clocks
export const removeSavedClock = mutation({
  args: {
    userId: v.string(),
    cityId: v.id('cities'),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('userTimezoneSettings')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .first();

    if (!existing) {
      throw new Error('User timezone settings not found.');
    }

    const filteredClocks = existing.savedClocks.filter(
      clock => clock.cityId !== args.cityId,
    );

    await ctx.db.patch(existing._id, {
      savedClocks: filteredClocks,
      updatedAt: Date.now(),
    });

    return existing._id;
  },
});

// Update saved clock label
export const updateSavedClockLabel = mutation({
  args: {
    userId: v.string(),
    cityId: v.id('cities'),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('userTimezoneSettings')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .first();

    if (!existing) {
      throw new Error('User timezone settings not found.');
    }

    const updatedClocks = existing.savedClocks.map(clock =>
      clock.cityId === args.cityId ? { ...clock, label: args.label } : clock,
    );

    await ctx.db.patch(existing._id, {
      savedClocks: updatedClocks,
      updatedAt: Date.now(),
    });

    return existing._id;
  },
});

// Reorder saved clocks
export const reorderSavedClocks = mutation({
  args: {
    userId: v.string(),
    orderedCityIds: v.array(v.id('cities')),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('userTimezoneSettings')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .first();

    if (!existing) {
      throw new Error('User timezone settings not found.');
    }

    // Rebuild clocks with new order
    const clockMap = new Map(
      existing.savedClocks.map(clock => [clock.cityId, clock]),
    );

    const reorderedClocks = args.orderedCityIds
      .map((cityId, index) => {
        const clock = clockMap.get(cityId);
        return clock ? { ...clock, sortOrder: index } : null;
      })
      .filter(clock => clock !== null);

    await ctx.db.patch(existing._id, {
      savedClocks: reorderedClocks,
      updatedAt: Date.now(),
    });

    return existing._id;
  },
});

// ============================================
// World Clock Query with City Details
// ============================================

// Get user's world clock with full city details
export const getWorldClock = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query('userTimezoneSettings')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .first();

    if (!settings) {
      return {
        settings: null,
        homeCity: null,
        clocks: [],
      };
    }

    // Fetch home city if set
    let homeCity = null;
    if (settings.homeCityId) {
      homeCity = await ctx.db.get(settings.homeCityId);
    }

    // Fetch all saved clock cities
    const clockCities = await Promise.all(
      settings.savedClocks.map(async (clock) => {
        const city = await ctx.db.get(clock.cityId);
        return city
          ? {
              city,
              label: clock.label,
              sortOrder: clock.sortOrder,
            }
          : null;
      }),
    );

    // Filter out null results and sort by order
    const validClocks = clockCities
      .filter(c => c !== null)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      settings: {
        homeTimezone: settings.homeTimezone,
        displayFormat: settings.displayFormat,
        showSeconds: settings.showSeconds,
        autoDetect: settings.autoDetect,
      },
      homeCity,
      clocks: validClocks,
    };
  },
});
