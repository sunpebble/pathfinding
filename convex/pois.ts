/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import type { Id } from './_generated/dataModel';
import { ConvexError, v } from 'convex/values';
import { businessHoursValidator } from '../packages/convex/src/validators/index.js';
import { mutation, query } from './_generated/server';

/**
 * POIs - Points of Interest Queries and Mutations
 *
 * This module provides CRUD operations for Points of Interest (POIs),
 * including search, nearby queries, and bulk operations for crawling.
 */

/** Validator for POI category types */
const poiCategoryValidator = v.union(
  v.literal('attraction'),
  v.literal('restaurant'),
  v.literal('hotel'),
  v.literal('shopping'),
  v.literal('other'),
);

/**
 * Lists POIs with optional filters by city, category, and limit.
 * @param args.cityId - Optional city ID to filter by
 * @param args.category - Optional category to filter by
 * @param args.limit - Optional maximum number of results
 * @returns Array of POI documents
 */
export const list = query({
  args: {
    cityId: v.optional(v.id('cities')),
    category: v.optional(poiCategoryValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let results;

    if (args.cityId && args.category) {
      results = await ctx.db
        .query('pois')
        .withIndex('by_city_category', q =>
          q.eq('cityId', args.cityId!).eq('category', args.category!))
        .collect();
    }
    else if (args.cityId) {
      results = await ctx.db
        .query('pois')
        .withIndex('by_city', q => q.eq('cityId', args.cityId!))
        .collect();
    }
    else if (args.category) {
      results = await ctx.db
        .query('pois')
        .withIndex('by_category', q => q.eq('category', args.category!))
        .collect();
    }
    else {
      results = await ctx.db.query('pois').collect();
    }

    return args.limit ? results.slice(0, args.limit) : results;
  },
});

/**
 * Gets a POI by its ID.
 * @param args.id - The POI document ID
 * @returns The POI document or null if not found
 */
export const getById = query({
  args: { id: v.id('pois') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Searches POIs by name with optional filters.
 * Uses indexes for efficient filtering before in-memory text search.
 * @param args.query - Search query string
 * @param args.cityId - Optional city ID filter
 * @param args.category - Optional category filter
 * @param args.minRating - Optional minimum rating filter
 * @param args.limit - Maximum results (default 100)
 * @returns Array of matching POIs sorted by rating
 */
export const search = query({
  args: {
    query: v.string(),
    cityId: v.optional(v.id('cities')),
    category: v.optional(poiCategoryValidator),
    minRating: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Use .take() to limit results early if no text search needed
    const maxResults = args.limit ?? 100;
    const fetchLimit = maxResults * 10; // Fetch more for filtering

    let pois;

    // Apply index-based filters first
    if (args.cityId && args.category) {
      pois = await ctx.db
        .query('pois')
        .withIndex('by_city_category', q =>
          q.eq('cityId', args.cityId!).eq('category', args.category!))
        .take(fetchLimit);
    }
    else if (args.cityId) {
      pois = await ctx.db
        .query('pois')
        .withIndex('by_city', q => q.eq('cityId', args.cityId!))
        .take(fetchLimit);
    }
    else if (args.category) {
      pois = await ctx.db
        .query('pois')
        .withIndex('by_category', q => q.eq('category', args.category!))
        .take(fetchLimit);
    }
    else {
      pois = await ctx.db.query('pois').take(fetchLimit);
    }

    // Filter by minimum rating
    if (args.minRating !== undefined) {
      pois = pois.filter(
        poi => poi.rating !== undefined && poi.rating >= args.minRating!,
      );
    }

    // Search by name (in-memory, but on pre-filtered data)
    const searchLower = args.query.toLowerCase();
    pois = pois.filter(
      poi =>
        poi.name.toLowerCase().includes(searchLower)
        || poi.nameEn?.toLowerCase().includes(searchLower),
    );

    // Sort by rating (descending)
    pois.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    return pois.slice(0, maxResults);
  },
});

/**
 * Gets nearby POIs within a radius using Haversine distance calculation.
 * @param args.latitude - Center point latitude
 * @param args.longitude - Center point longitude
 * @param args.radiusKm - Search radius in kilometers
 * @param args.category - Optional category filter
 * @param args.limit - Maximum results (default 50)
 * @returns Array of POIs with distance, sorted by proximity
 */
export const getNearby = query({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    radiusKm: v.number(),
    category: v.optional(poiCategoryValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Limit initial fetch to reduce memory usage
    const maxFetch = Math.min((args.limit ?? 50) * 20, 2000);

    // Use index if category is provided
    let pois;
    if (args.category) {
      pois = await ctx.db
        .query('pois')
        .withIndex('by_category', q => q.eq('category', args.category!))
        .take(maxFetch);
    }
    else {
      pois = await ctx.db.query('pois').take(maxFetch);
    }

    // Calculate distance and filter
    const poisWithDistance = pois
      .map(poi => ({
        ...poi,
        distance: calculateDistanceKm(
          args.latitude,
          args.longitude,
          poi.latitude,
          poi.longitude,
        ),
      }))
      .filter(poi => poi.distance <= args.radiusKm)
      .sort((a, b) => a.distance - b.distance);

    const limit = args.limit ?? 50;
    return poisWithDistance.slice(0, limit);
  },
});

/**
 * Gets top-rated POI recommendations for a city.
 * @param args.cityId - The city to get recommendations for
 * @param args.category - Optional category filter
 * @param args.limit - Maximum results (default 10)
 * @returns Array of POIs sorted by rating descending
 */
export const getRecommendations = query({
  args: {
    cityId: v.id('cities'),
    category: v.optional(poiCategoryValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let pois = await ctx.db
      .query('pois')
      .withIndex('by_city', q => q.eq('cityId', args.cityId))
      .collect();

    if (args.category) {
      pois = pois.filter(poi => poi.category === args.category);
    }

    // Sort by rating descending
    pois.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    const limit = args.limit ?? 10;
    return pois.slice(0, limit);
  },
});

/**
 * Creates a new POI.
 * @param args - POI data including name, category, location, etc.
 * @returns The ID of the created POI
 * @throws {ConvexError} If the referenced city does not exist
 */
export const create = mutation({
  args: {
    externalId: v.optional(v.string()),
    name: v.string(),
    nameEn: v.optional(v.string()),
    category: poiCategoryValidator,
    cityId: v.id('cities'),
    address: v.optional(v.string()),
    latitude: v.number(),
    longitude: v.number(),
    rating: v.optional(v.number()),
    ratingCount: v.optional(v.number()),
    priceLevel: v.optional(v.number()),
    businessHours: v.optional(businessHoursValidator),
    phone: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const city = await ctx.db.get(args.cityId);
    if (!city) {
      throw new ConvexError('City not found');
    }

    return await ctx.db.insert('pois', {
      ...args,
      ratingCount: args.ratingCount ?? 0,
    });
  },
});

/**
 * Updates an existing POI.
 * @param args.id - The POI ID to update
 * @param args - Fields to update
 * @returns The updated POI document
 * @throws {ConvexError} If the POI does not exist
 */
export const update = mutation({
  args: {
    id: v.id('pois'),
    name: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    category: v.optional(poiCategoryValidator),
    address: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    rating: v.optional(v.number()),
    ratingCount: v.optional(v.number()),
    priceLevel: v.optional(v.number()),
    businessHours: v.optional(businessHoursValidator),
    phone: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new ConvexError('POI not found');
    }

    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(id, filteredUpdates);
    return await ctx.db.get(id);
  },
});

/**
 * Deletes a POI by ID.
 * @param args.id - The POI ID to delete
 * @throws {ConvexError} If the POI does not exist
 */
export const remove = mutation({
  args: { id: v.id('pois') },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new ConvexError('POI not found');
    }

    await ctx.db.delete(args.id);
  },
});

/**
 * Bulk inserts multiple POIs (for crawling operations).
 * @param args.pois - Array of POI data to insert
 * @returns Array of created POI IDs
 */
export const bulkInsert = mutation({
  args: {
    pois: v.array(
      v.object({
        externalId: v.optional(v.string()),
        name: v.string(),
        nameEn: v.optional(v.string()),
        category: poiCategoryValidator,
        cityId: v.id('cities'),
        address: v.optional(v.string()),
        latitude: v.number(),
        longitude: v.number(),
        rating: v.optional(v.number()),
        ratingCount: v.optional(v.number()),
        priceLevel: v.optional(v.number()),
        businessHours: v.optional(businessHoursValidator),
        phone: v.optional(v.string()),
        imageUrls: v.optional(v.array(v.string())),
        source: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const ids: Id<'pois'>[] = [];
    for (const poi of args.pois) {
      const id = await ctx.db.insert('pois', {
        ...poi,
        ratingCount: poi.ratingCount ?? 0,
      });
      ids.push(id);
    }
    return ids;
  },
});

/** Calculates distance between two coordinates using Haversine formula */
function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a
    = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos((lat1 * Math.PI) / 180)
      * Math.cos((lat2 * Math.PI) / 180)
      * Math.sin(dLng / 2)
      * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
