/**
 * Weather Cache Convex Functions
 * Handles caching and retrieval of weather data
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Type definition for weather data
const weatherDataValidator = v.object({
  latitude: v.number(),
  longitude: v.number(),
  timezone: v.string(),
  timezoneOffset: v.number(),
  current: v.optional(
    v.object({
      date: v.string(),
      timestamp: v.number(),
      condition: v.string(),
      conditionDescription: v.string(),
      icon: v.string(),
      tempMin: v.number(),
      tempMax: v.number(),
      tempMorning: v.number(),
      tempDay: v.number(),
      tempEvening: v.number(),
      tempNight: v.number(),
      feelsLikeDay: v.number(),
      humidity: v.number(),
      windSpeed: v.number(),
      windDirection: v.number(),
      precipitation: v.number(),
      precipitationProbability: v.number(),
      uvIndex: v.number(),
      sunrise: v.number(),
      sunset: v.number(),
      cloudiness: v.number(),
      pressure: v.number(),
    }),
  ),
  daily: v.array(
    v.object({
      date: v.string(),
      timestamp: v.number(),
      condition: v.string(),
      conditionDescription: v.string(),
      icon: v.string(),
      tempMin: v.number(),
      tempMax: v.number(),
      tempMorning: v.number(),
      tempDay: v.number(),
      tempEvening: v.number(),
      tempNight: v.number(),
      feelsLikeDay: v.number(),
      humidity: v.number(),
      windSpeed: v.number(),
      windDirection: v.number(),
      precipitation: v.number(),
      precipitationProbability: v.number(),
      uvIndex: v.number(),
      sunrise: v.number(),
      sunset: v.number(),
      cloudiness: v.number(),
      pressure: v.number(),
    }),
  ),
  alerts: v.array(
    v.object({
      event: v.string(),
      sender: v.string(),
      start: v.number(),
      end: v.number(),
      description: v.string(),
      severity: v.string(),
    }),
  ),
  fetchedAt: v.number(),
});

/**
 * Get cached weather data for a location
 */
export const get = query({
  args: {
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    // Round coordinates to 2 decimal places for cache lookup
    const lat = Math.round(args.latitude * 100) / 100;
    const lon = Math.round(args.longitude * 100) / 100;

    const cached = await ctx.db
      .query("weatherCache")
      .withIndex("by_location", (q) =>
        q.eq("latitude", lat).eq("longitude", lon),
      )
      .first();

    return cached;
  },
});

/**
 * Upsert weather data for a location
 */
export const upsert = mutation({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    data: weatherDataValidator,
    fetchedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Round coordinates to 2 decimal places
    const lat = Math.round(args.latitude * 100) / 100;
    const lon = Math.round(args.longitude * 100) / 100;

    // Check if entry already exists
    const existing = await ctx.db
      .query("weatherCache")
      .withIndex("by_location", (q) =>
        q.eq("latitude", lat).eq("longitude", lon),
      )
      .first();

    if (existing) {
      // Update existing entry
      await ctx.db.patch(existing._id, {
        data: args.data,
        fetchedAt: args.fetchedAt,
      });
      return existing._id;
    }

    // Create new entry
    return await ctx.db.insert("weatherCache", {
      latitude: lat,
      longitude: lon,
      data: args.data,
      fetchedAt: args.fetchedAt,
    });
  },
});

/**
 * Delete old cache entries (older than specified hours)
 */
export const cleanup = mutation({
  args: {
    maxAgeHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxAgeMs = (args.maxAgeHours || 24) * 60 * 60 * 1000;
    const cutoffTime = Date.now() - maxAgeMs;

    const oldEntries = await ctx.db
      .query("weatherCache")
      .withIndex("by_fetched_at")
      .filter((q) => q.lt(q.field("fetchedAt"), cutoffTime))
      .collect();

    let deleted = 0;
    for (const entry of oldEntries) {
      await ctx.db.delete(entry._id);
      deleted++;
    }

    return { deleted };
  },
});

/**
 * Get weather cache statistics
 */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("weatherCache").collect();

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    let recentCount = 0;
    let staleCount = 0;

    for (const entry of entries) {
      if (entry.fetchedAt > oneHourAgo) {
        recentCount++;
      } else if (entry.fetchedAt < oneDayAgo) {
        staleCount++;
      }
    }

    return {
      totalEntries: entries.length,
      recentEntries: recentCount, // Less than 1 hour old
      staleEntries: staleCount, // More than 24 hours old
    };
  },
});
