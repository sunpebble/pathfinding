/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Travel Footprints - User's visited cities and countries tracking
 */

// ============================================
// Visited Cities
// ============================================

// List user's visited cities
export const listVisitedCities = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('visitedCities')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();
  },
});

// Get visited city by ID
export const getVisitedCityById = query({
  args: { id: v.id('visitedCities') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Add a visited city
export const addVisitedCity = mutation({
  args: {
    userId: v.string(),
    cityName: v.string(),
    cityNameEn: v.optional(v.string()),
    countryCode: v.string(),
    countryName: v.string(),
    countryNameEn: v.optional(v.string()),
    latitude: v.number(),
    longitude: v.number(),
    visitedAt: v.number(), // Unix timestamp
    notes: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
    rating: v.optional(v.number()), // 1-5
    travelGuideId: v.optional(v.id('travelGuides')),
    itineraryId: v.optional(v.id('itineraries')),
  },
  handler: async (ctx, args) => {
    // Check if city already exists for this user
    const existing = await ctx.db
      .query('visitedCities')
      .withIndex('by_user_city', (q) =>
        q.eq('userId', args.userId).eq('cityName', args.cityName)
      )
      .first();

    if (existing) {
      // Update existing record with new visit
      const visitCount = (existing.visitCount || 1) + 1;
      await ctx.db.patch(existing._id, {
        visitCount,
        lastVisitedAt: args.visitedAt,
        notes: args.notes || existing.notes,
        photos: args.photos
          ? [...(existing.photos || []), ...args.photos]
          : existing.photos,
        rating: args.rating || existing.rating,
      });
      return existing._id;
    }

    // Create new visited city record
    return await ctx.db.insert('visitedCities', {
      ...args,
      visitCount: 1,
      firstVisitedAt: args.visitedAt,
      lastVisitedAt: args.visitedAt,
      createdAt: Date.now(),
    });
  },
});

// Update visited city
export const updateVisitedCity = mutation({
  args: {
    id: v.id('visitedCities'),
    notes: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filteredUpdates);
    return await ctx.db.get(id);
  },
});

// Remove visited city
export const removeVisitedCity = mutation({
  args: { id: v.id('visitedCities') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ============================================
// Visited Countries (aggregated from cities)
// ============================================

// List user's visited countries
export const listVisitedCountries = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('visitedCountries')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();
  },
});

// Update or create visited country (called internally when adding cities)
export const upsertVisitedCountry = mutation({
  args: {
    userId: v.string(),
    countryCode: v.string(),
    countryName: v.string(),
    countryNameEn: v.optional(v.string()),
    firstVisitedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('visitedCountries')
      .withIndex('by_user_country', (q) =>
        q.eq('userId', args.userId).eq('countryCode', args.countryCode)
      )
      .first();

    if (existing) {
      // Update city count
      const cities = await ctx.db
        .query('visitedCities')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .collect();

      const countryCities = cities.filter(
        (c) => c.countryCode === args.countryCode
      );
      await ctx.db.patch(existing._id, {
        citiesCount: countryCities.length,
        lastVisitedAt: Math.max(
          ...countryCities.map((c) => c.lastVisitedAt || c.visitedAt)
        ),
      });
      return existing._id;
    }

    return await ctx.db.insert('visitedCountries', {
      userId: args.userId,
      countryCode: args.countryCode,
      countryName: args.countryName,
      countryNameEn: args.countryNameEn,
      citiesCount: 1,
      firstVisitedAt: args.firstVisitedAt,
      lastVisitedAt: args.firstVisitedAt,
      createdAt: Date.now(),
    });
  },
});

// ============================================
// Travel Statistics
// ============================================

// Get user's travel statistics
export const getTravelStats = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const stats = await ctx.db
      .query('travelStats')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!stats) {
      // Return default stats
      return {
        userId: args.userId,
        totalCities: 0,
        totalCountries: 0,
        totalTrips: 0,
        totalDistance: 0,
        mostVisitedCity: null,
        mostVisitedCountry: null,
        firstTripDate: null,
        lastTripDate: null,
        goalCities: 100,
        goalCountries: 50,
        yearlyStats: {},
      };
    }

    return stats;
  },
});

// Update travel statistics
export const updateTravelStats = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Aggregate stats from visited cities and countries
    const cities = await ctx.db
      .query('visitedCities')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const countries = await ctx.db
      .query('visitedCountries')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const totalCities = cities.length;
    const totalCountries = countries.length;

    // Find most visited city
    const mostVisitedCity = cities.reduce(
      (max, city) =>
        (city.visitCount || 1) > (max?.visitCount || 0) ? city : max,
      null as (typeof cities)[0] | null
    );

    // Find most visited country (by cities count)
    const mostVisitedCountry = countries.reduce(
      (max, country) =>
        (country.citiesCount || 1) > (max?.citiesCount || 0) ? country : max,
      null as (typeof countries)[0] | null
    );

    // Get date range
    const allDates = cities.map((c) => c.firstVisitedAt || c.visitedAt);
    const firstTripDate = allDates.length > 0 ? Math.min(...allDates) : null;
    const lastTripDate = allDates.length > 0 ? Math.max(...allDates) : null;

    // Calculate yearly stats
    const yearlyStats: Record<string, { cities: number; countries: Set<string> }> = {};
    for (const city of cities) {
      const year = new Date(city.firstVisitedAt || city.visitedAt).getFullYear().toString();
      if (!yearlyStats[year]) {
        yearlyStats[year] = { cities: 0, countries: new Set() };
      }
      yearlyStats[year].cities++;
      yearlyStats[year].countries.add(city.countryCode);
    }

    const yearlyStatsFormatted = Object.fromEntries(
      Object.entries(yearlyStats).map(([year, data]) => [
        year,
        { cities: data.cities, countries: data.countries.size },
      ])
    );

    const statsData = {
      userId: args.userId,
      totalCities,
      totalCountries,
      totalTrips: cities.reduce((sum, c) => sum + (c.visitCount || 1), 0),
      totalDistance: 0, // TODO: Calculate based on coordinates
      mostVisitedCity: mostVisitedCity
        ? { name: mostVisitedCity.cityName, count: mostVisitedCity.visitCount || 1 }
        : null,
      mostVisitedCountry: mostVisitedCountry
        ? { name: mostVisitedCountry.countryName, count: mostVisitedCountry.citiesCount || 1 }
        : null,
      firstTripDate,
      lastTripDate,
      goalCities: 100,
      goalCountries: 50,
      yearlyStats: yearlyStatsFormatted,
      updatedAt: Date.now(),
    };

    // Upsert stats
    const existing = await ctx.db
      .query('travelStats')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, statsData);
      return existing._id;
    }

    return await ctx.db.insert('travelStats', {
      ...statsData,
      createdAt: Date.now(),
    });
  },
});

// Set travel goals
export const setTravelGoals = mutation({
  args: {
    userId: v.string(),
    goalCities: v.optional(v.number()),
    goalCountries: v.optional(v.number()),
    nextGoalCity: v.optional(
      v.object({
        cityName: v.string(),
        countryCode: v.string(),
        countryName: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        plannedDate: v.optional(v.number()),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;

    const existing = await ctx.db
      .query('travelStats')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...filteredUpdates,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert('travelStats', {
      userId,
      totalCities: 0,
      totalCountries: 0,
      totalTrips: 0,
      totalDistance: 0,
      mostVisitedCity: null,
      mostVisitedCountry: null,
      firstTripDate: null,
      lastTripDate: null,
      goalCities: updates.goalCities || 100,
      goalCountries: updates.goalCountries || 50,
      nextGoalCity: updates.nextGoalCity,
      yearlyStats: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// Timeline / Travel History
// ============================================

// Get travel timeline (chronological list of visits)
export const getTravelTimeline = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allCities = await ctx.db
      .query('visitedCities')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    // Sort by visit date descending
    const sorted = allCities.sort(
      (a, b) => (b.lastVisitedAt || b.visitedAt) - (a.lastVisitedAt || a.visitedAt)
    );

    const limit = args.limit || 20;
    const offset = args.offset || 0;

    return {
      data: sorted.slice(offset, offset + limit),
      total: sorted.length,
      hasMore: offset + limit < sorted.length,
    };
  },
});
