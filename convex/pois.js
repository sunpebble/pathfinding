import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
/**
 * POIs - Points of Interest Queries and Mutations
 */
const poiCategoryValidator = v.union(v.literal('attraction'), v.literal('restaurant'), v.literal('hotel'), v.literal('shopping'), v.literal('other'));
// List POIs with optional filters
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
                .withIndex('by_city_category', (q) => q.eq('cityId', args.cityId).eq('category', args.category))
                .collect();
        }
        else if (args.cityId) {
            results = await ctx.db
                .query('pois')
                .withIndex('by_city', (q) => q.eq('cityId', args.cityId))
                .collect();
        }
        else if (args.category) {
            results = await ctx.db
                .query('pois')
                .withIndex('by_category', (q) => q.eq('category', args.category))
                .collect();
        }
        else {
            results = await ctx.db.query('pois').collect();
        }
        return args.limit ? results.slice(0, args.limit) : results;
    },
});
// Get a POI by ID
export const getById = query({
    args: { id: v.id('pois') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
// Search POIs by name - optimized to use indexes first
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
                .withIndex('by_city_category', (q) => q.eq('cityId', args.cityId).eq('category', args.category))
                .take(fetchLimit);
        }
        else if (args.cityId) {
            pois = await ctx.db
                .query('pois')
                .withIndex('by_city', (q) => q.eq('cityId', args.cityId))
                .take(fetchLimit);
        }
        else if (args.category) {
            pois = await ctx.db
                .query('pois')
                .withIndex('by_category', (q) => q.eq('category', args.category))
                .take(fetchLimit);
        }
        else {
            pois = await ctx.db.query('pois').take(fetchLimit);
        }
        // Filter by minimum rating
        if (args.minRating !== undefined) {
            pois = pois.filter((poi) => poi.rating !== undefined && poi.rating >= args.minRating);
        }
        // Search by name (in-memory, but on pre-filtered data)
        const searchLower = args.query.toLowerCase();
        pois = pois.filter((poi) => poi.name.toLowerCase().includes(searchLower) ||
            poi.nameEn?.toLowerCase().includes(searchLower));
        // Sort by rating (descending)
        pois.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        return pois.slice(0, maxResults);
    },
});
// Get nearby POIs - optimized with index and early limit
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
                .withIndex('by_category', (q) => q.eq('category', args.category))
                .take(maxFetch);
        }
        else {
            pois = await ctx.db.query('pois').take(maxFetch);
        }
        // Calculate distance and filter
        const poisWithDistance = pois
            .map((poi) => ({
            ...poi,
            distance: calculateDistanceKm(args.latitude, args.longitude, poi.latitude, poi.longitude),
        }))
            .filter((poi) => poi.distance <= args.radiusKm)
            .sort((a, b) => a.distance - b.distance);
        const limit = args.limit ?? 50;
        return poisWithDistance.slice(0, limit);
    },
});
// Get recommendations (top-rated POIs)
export const getRecommendations = query({
    args: {
        cityId: v.id('cities'),
        category: v.optional(poiCategoryValidator),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let pois = await ctx.db
            .query('pois')
            .withIndex('by_city', (q) => q.eq('cityId', args.cityId))
            .collect();
        if (args.category) {
            pois = pois.filter((poi) => poi.category === args.category);
        }
        // Sort by rating descending
        pois.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        const limit = args.limit ?? 10;
        return pois.slice(0, limit);
    },
});
// Create a new POI
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
        businessHours: v.optional(v.any()),
        phone: v.optional(v.string()),
        imageUrls: v.optional(v.array(v.string())),
        source: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert('pois', {
            ...args,
            ratingCount: args.ratingCount ?? 0,
        });
    },
});
// Update a POI
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
        businessHours: v.optional(v.any()),
        phone: v.optional(v.string()),
        imageUrls: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const filteredUpdates = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
        await ctx.db.patch(id, filteredUpdates);
        return await ctx.db.get(id);
    },
});
// Delete a POI
export const remove = mutation({
    args: { id: v.id('pois') },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
// Bulk insert POIs (for crawling)
export const bulkInsert = mutation({
    args: {
        pois: v.array(v.object({
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
            businessHours: v.optional(v.any()),
            phone: v.optional(v.string()),
            imageUrls: v.optional(v.array(v.string())),
            source: v.string(),
        })),
    },
    handler: async (ctx, args) => {
        const ids = [];
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
