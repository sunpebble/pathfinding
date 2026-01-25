/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
/**
 * WiFi Spots - Public WiFi hotspot queries and mutations
 */
// WiFi spot type validator
const wifiSpotTypeValidator = v.union(v.literal('hotel'), v.literal('restaurant'), v.literal('cafe'), v.literal('airport'), v.literal('train_station'), v.literal('shopping_mall'), v.literal('library'), v.literal('coworking'), v.literal('public'), v.literal('other'));
// WiFi quality rating validator (1-5)
const _qualityRatingValidator = v.number();
// List WiFi spots with optional filters
export const list = query({
    args: {
        cityId: v.optional(v.id('cities')),
        type: v.optional(wifiSpotTypeValidator),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let results;
        if (args.cityId && args.type) {
            results = await ctx.db
                .query('wifiSpots')
                .withIndex('by_city_type', (q) => q.eq('cityId', args.cityId).eq('type', args.type))
                .collect();
        }
        else if (args.cityId) {
            results = await ctx.db
                .query('wifiSpots')
                .withIndex('by_city', (q) => q.eq('cityId', args.cityId))
                .collect();
        }
        else if (args.type) {
            results = await ctx.db
                .query('wifiSpots')
                .withIndex('by_type', (q) => q.eq('type', args.type))
                .collect();
        }
        else {
            results = await ctx.db.query('wifiSpots').collect();
        }
        // Filter only verified spots
        results = results.filter((spot) => spot.isVerified);
        return args.limit ? results.slice(0, args.limit) : results;
    },
});
// Get a WiFi spot by ID
export const getById = query({
    args: { id: v.id('wifiSpots') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
// Get nearby WiFi spots
export const getNearby = query({
    args: {
        latitude: v.number(),
        longitude: v.number(),
        radiusKm: v.number(),
        type: v.optional(wifiSpotTypeValidator),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const maxFetch = Math.min((args.limit ?? 50) * 20, 2000);
        let spots;
        if (args.type) {
            spots = await ctx.db
                .query('wifiSpots')
                .withIndex('by_type', (q) => q.eq('type', args.type))
                .take(maxFetch);
        }
        else {
            spots = await ctx.db.query('wifiSpots').take(maxFetch);
        }
        // Filter only verified spots
        spots = spots.filter((spot) => spot.isVerified);
        // Calculate distance and filter
        const spotsWithDistance = spots
            .map((spot) => ({
            ...spot,
            distance: calculateDistanceKm(args.latitude, args.longitude, spot.latitude, spot.longitude),
        }))
            .filter((spot) => spot.distance <= args.radiusKm)
            .sort((a, b) => a.distance - b.distance);
        const limit = args.limit ?? 50;
        return spotsWithDistance.slice(0, limit);
    },
});
// Search WiFi spots by name or location
export const search = query({
    args: {
        query: v.string(),
        cityId: v.optional(v.id('cities')),
        type: v.optional(wifiSpotTypeValidator),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const maxResults = args.limit ?? 50;
        const fetchLimit = maxResults * 10;
        let spots;
        if (args.cityId && args.type) {
            spots = await ctx.db
                .query('wifiSpots')
                .withIndex('by_city_type', (q) => q.eq('cityId', args.cityId).eq('type', args.type))
                .take(fetchLimit);
        }
        else if (args.cityId) {
            spots = await ctx.db
                .query('wifiSpots')
                .withIndex('by_city', (q) => q.eq('cityId', args.cityId))
                .take(fetchLimit);
        }
        else if (args.type) {
            spots = await ctx.db
                .query('wifiSpots')
                .withIndex('by_type', (q) => q.eq('type', args.type))
                .take(fetchLimit);
        }
        else {
            spots = await ctx.db.query('wifiSpots').take(fetchLimit);
        }
        // Filter only verified spots
        spots = spots.filter((spot) => spot.isVerified);
        // Search by name
        const searchLower = args.query.toLowerCase();
        spots = spots.filter((spot) => spot.name.toLowerCase().includes(searchLower) ||
            spot.nameEn?.toLowerCase().includes(searchLower) ||
            spot.address?.toLowerCase().includes(searchLower));
        // Sort by average rating (descending)
        spots.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
        return spots.slice(0, maxResults);
    },
});
// Create a new WiFi spot
export const create = mutation({
    args: {
        name: v.string(),
        nameEn: v.optional(v.string()),
        type: wifiSpotTypeValidator,
        cityId: v.id('cities'),
        address: v.optional(v.string()),
        latitude: v.number(),
        longitude: v.number(),
        ssid: v.optional(v.string()),
        requiresPassword: v.boolean(),
        isFree: v.boolean(),
        speedMbps: v.optional(v.number()),
        openingHours: v.optional(v.string()),
        description: v.optional(v.string()),
        imageUrls: v.optional(v.array(v.string())),
        poiId: v.optional(v.id('pois')),
        submittedBy: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert('wifiSpots', {
            ...args,
            averageRating: 0,
            ratingCount: 0,
            isVerified: false, // Requires moderation
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});
// Update a WiFi spot
export const update = mutation({
    args: {
        id: v.id('wifiSpots'),
        name: v.optional(v.string()),
        nameEn: v.optional(v.string()),
        type: v.optional(wifiSpotTypeValidator),
        address: v.optional(v.string()),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        ssid: v.optional(v.string()),
        requiresPassword: v.optional(v.boolean()),
        isFree: v.optional(v.boolean()),
        speedMbps: v.optional(v.number()),
        openingHours: v.optional(v.string()),
        description: v.optional(v.string()),
        imageUrls: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const filteredUpdates = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
        await ctx.db.patch(id, { ...filteredUpdates, updatedAt: Date.now() });
        return await ctx.db.get(id);
    },
});
// Verify/approve a WiFi spot (admin action)
export const verify = mutation({
    args: {
        id: v.id('wifiSpots'),
        verifiedBy: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            isVerified: true,
            verifiedBy: args.verifiedBy,
            verifiedAt: Date.now(),
            updatedAt: Date.now(),
        });
        return await ctx.db.get(args.id);
    },
});
// Delete a WiFi spot
export const remove = mutation({
    args: { id: v.id('wifiSpots') },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
// Rate a WiFi spot (update average rating)
export const updateRating = mutation({
    args: {
        id: v.id('wifiSpots'),
        averageRating: v.number(),
        ratingCount: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            averageRating: args.averageRating,
            ratingCount: args.ratingCount,
            updatedAt: Date.now(),
        });
        return await ctx.db.get(args.id);
    },
});
// Helper function for distance calculation (Haversine formula)
function calculateDistanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
