import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
/**
 * Charging Stations - Queries and Mutations for EV Charging Stations
 */
// Validators
const stationTypeValidator = v.union(v.literal('public'), v.literal('private'), v.literal('destination'), v.literal('highway'));
const stationStatusValidator = v.union(v.literal('operational'), v.literal('maintenance'), v.literal('offline'), v.literal('coming_soon'));
const chargerTypeValidator = v.union(v.literal('ac_slow'), v.literal('ac_fast'), v.literal('dc_fast'), v.literal('dc_superfast'));
const amenityValidator = v.union(v.literal('restroom'), v.literal('convenience_store'), v.literal('restaurant'), v.literal('wifi'), v.literal('lounge'), v.literal('car_wash'), v.literal('covered'), v.literal('lighting'), v.literal('security'));
const paymentMethodValidator = v.union(v.literal('app'), v.literal('wechat'), v.literal('alipay'), v.literal('card'), v.literal('membership'));
// ============================================
// Query Functions
// ============================================
/**
 * List charging stations with optional filters
 */
export const list = query({
    args: {
        cityId: v.optional(v.id('cities')),
        stationType: v.optional(stationTypeValidator),
        status: v.optional(stationStatusValidator),
        limit: v.optional(v.number()),
        offset: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 50;
        const offset = args.offset ?? 0;
        let results;
        if (args.cityId && args.status) {
            results = await ctx.db
                .query('chargingStations')
                .withIndex('by_city_status', (q) => q.eq('cityId', args.cityId).eq('status', args.status))
                .collect();
        }
        else if (args.cityId) {
            results = await ctx.db
                .query('chargingStations')
                .withIndex('by_city', (q) => q.eq('cityId', args.cityId))
                .collect();
        }
        else if (args.status) {
            results = await ctx.db
                .query('chargingStations')
                .withIndex('by_status', (q) => q.eq('status', args.status))
                .collect();
        }
        else if (args.stationType) {
            results = await ctx.db
                .query('chargingStations')
                .withIndex('by_type', (q) => q.eq('stationType', args.stationType))
                .collect();
        }
        else {
            results = await ctx.db.query('chargingStations').collect();
        }
        // Apply offset and limit
        const paginatedResults = results.slice(offset, offset + limit);
        return {
            data: paginatedResults,
            total: results.length,
            limit,
            offset,
        };
    },
});
/**
 * Get a charging station by ID
 */
export const getById = query({
    args: { id: v.id('chargingStations') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
/**
 * Get nearby charging stations
 */
export const getNearby = query({
    args: {
        latitude: v.number(),
        longitude: v.number(),
        radiusKm: v.number(),
        stationType: v.optional(stationTypeValidator),
        status: v.optional(stationStatusValidator),
        hasAvailablePorts: v.optional(v.boolean()),
        chargerType: v.optional(chargerTypeValidator),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const maxFetch = Math.min((args.limit ?? 50) * 20, 2000);
        // Get all operational stations (or filtered by status)
        let stations;
        if (args.status) {
            stations = await ctx.db
                .query('chargingStations')
                .withIndex('by_status', (q) => q.eq('status', args.status))
                .take(maxFetch);
        }
        else {
            // Default to only operational stations
            stations = await ctx.db
                .query('chargingStations')
                .withIndex('by_status', (q) => q.eq('status', 'operational'))
                .take(maxFetch);
        }
        // Filter by station type if specified
        if (args.stationType) {
            stations = stations.filter((s) => s.stationType === args.stationType);
        }
        // Filter by available ports
        if (args.hasAvailablePorts) {
            stations = stations.filter((s) => s.availablePorts > 0);
        }
        // Filter by charger type
        if (args.chargerType) {
            stations = stations.filter((s) => s.chargerTypes.some((ct) => ct.type === args.chargerType && ct.available > 0));
        }
        // Calculate distance and filter by radius
        const stationsWithDistance = stations
            .map((station) => ({
            ...station,
            distance: calculateDistanceKm(args.latitude, args.longitude, station.latitude, station.longitude),
        }))
            .filter((station) => station.distance <= args.radiusKm)
            .sort((a, b) => a.distance - b.distance);
        const limit = args.limit ?? 50;
        return stationsWithDistance.slice(0, limit);
    },
});
/**
 * Search charging stations by name or operator
 */
export const search = query({
    args: {
        query: v.string(),
        cityId: v.optional(v.id('cities')),
        stationType: v.optional(stationTypeValidator),
        status: v.optional(stationStatusValidator),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const maxResults = args.limit ?? 50;
        const fetchLimit = maxResults * 10;
        let stations;
        if (args.cityId) {
            stations = await ctx.db
                .query('chargingStations')
                .withIndex('by_city', (q) => q.eq('cityId', args.cityId))
                .take(fetchLimit);
        }
        else {
            stations = await ctx.db.query('chargingStations').take(fetchLimit);
        }
        // Filter by station type
        if (args.stationType) {
            stations = stations.filter((s) => s.stationType === args.stationType);
        }
        // Filter by status
        if (args.status) {
            stations = stations.filter((s) => s.status === args.status);
        }
        // Search by name and operator
        const searchLower = args.query.toLowerCase();
        stations = stations.filter((s) => s.name.toLowerCase().includes(searchLower) ||
            s.nameEn?.toLowerCase().includes(searchLower) ||
            s.operatorName?.toLowerCase().includes(searchLower) ||
            s.address.toLowerCase().includes(searchLower));
        // Sort by rating
        stations.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        return stations.slice(0, maxResults);
    },
});
/**
 * Get charging stations by operator
 */
export const getByOperator = query({
    args: {
        operatorName: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 100;
        const stations = await ctx.db
            .query('chargingStations')
            .withIndex('by_operator', (q) => q.eq('operatorName', args.operatorName))
            .take(limit);
        return stations;
    },
});
/**
 * Get station statistics (for dashboard)
 */
export const getStats = query({
    args: {
        cityId: v.optional(v.id('cities')),
    },
    handler: async (ctx, args) => {
        let stations;
        if (args.cityId) {
            stations = await ctx.db
                .query('chargingStations')
                .withIndex('by_city', (q) => q.eq('cityId', args.cityId))
                .collect();
        }
        else {
            stations = await ctx.db.query('chargingStations').collect();
        }
        const total = stations.length;
        const operational = stations.filter((s) => s.status === 'operational').length;
        const maintenance = stations.filter((s) => s.status === 'maintenance').length;
        const offline = stations.filter((s) => s.status === 'offline').length;
        const totalPorts = stations.reduce((sum, s) => sum + s.totalPorts, 0);
        const availablePorts = stations.reduce((sum, s) => sum + s.availablePorts, 0);
        // Count by type
        const byType = {
            public: stations.filter((s) => s.stationType === 'public').length,
            private: stations.filter((s) => s.stationType === 'private').length,
            destination: stations.filter((s) => s.stationType === 'destination')
                .length,
            highway: stations.filter((s) => s.stationType === 'highway').length,
        };
        // Count by charger type
        const chargerCounts = {
            ac_slow: 0,
            ac_fast: 0,
            dc_fast: 0,
            dc_superfast: 0,
        };
        for (const station of stations) {
            for (const charger of station.chargerTypes) {
                chargerCounts[charger.type] += charger.count;
            }
        }
        // Top operators
        const operatorCounts = {};
        for (const station of stations) {
            if (station.operatorName) {
                operatorCounts[station.operatorName] =
                    (operatorCounts[station.operatorName] || 0) + 1;
            }
        }
        const topOperators = Object.entries(operatorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));
        return {
            total,
            byStatus: { operational, maintenance, offline },
            byType,
            byChargerType: chargerCounts,
            totalPorts,
            availablePorts,
            utilizationRate: totalPorts > 0 ? 1 - availablePorts / totalPorts : 0,
            topOperators,
        };
    },
});
// ============================================
// Mutation Functions
// ============================================
/**
 * Create a new charging station
 */
export const create = mutation({
    args: {
        externalId: v.optional(v.string()),
        name: v.string(),
        nameEn: v.optional(v.string()),
        operatorName: v.optional(v.string()),
        operatorId: v.optional(v.string()),
        address: v.string(),
        cityId: v.optional(v.id('cities')),
        latitude: v.number(),
        longitude: v.number(),
        stationType: stationTypeValidator,
        totalPorts: v.number(),
        availablePorts: v.number(),
        chargerTypes: v.array(v.object({
            type: chargerTypeValidator,
            powerKw: v.number(),
            count: v.number(),
            available: v.number(),
            connectorType: v.optional(v.string()),
        })),
        pricingInfo: v.optional(v.object({
            electricityPrice: v.optional(v.number()),
            serviceFee: v.optional(v.number()),
            parkingFee: v.optional(v.number()),
            peakPrice: v.optional(v.number()),
            valleyPrice: v.optional(v.number()),
            flatPrice: v.optional(v.number()),
            pricingNotes: v.optional(v.string()),
        })),
        operatingHours: v.optional(v.string()),
        is24Hours: v.boolean(),
        amenities: v.optional(v.array(amenityValidator)),
        status: stationStatusValidator,
        phone: v.optional(v.string()),
        website: v.optional(v.string()),
        imageUrls: v.optional(v.array(v.string())),
        source: v.string(),
        sourceUrl: v.optional(v.string()),
        paymentMethods: v.optional(v.array(paymentMethodValidator)),
        supportedBrands: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        return await ctx.db.insert('chargingStations', {
            ...args,
            crawledAt: now,
            updatedAt: now,
            lastStatusUpdate: now,
        });
    },
});
/**
 * Update a charging station
 */
export const update = mutation({
    args: {
        id: v.id('chargingStations'),
        name: v.optional(v.string()),
        nameEn: v.optional(v.string()),
        operatorName: v.optional(v.string()),
        address: v.optional(v.string()),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        stationType: v.optional(stationTypeValidator),
        totalPorts: v.optional(v.number()),
        availablePorts: v.optional(v.number()),
        chargerTypes: v.optional(v.array(v.object({
            type: chargerTypeValidator,
            powerKw: v.number(),
            count: v.number(),
            available: v.number(),
            connectorType: v.optional(v.string()),
        }))),
        pricingInfo: v.optional(v.object({
            electricityPrice: v.optional(v.number()),
            serviceFee: v.optional(v.number()),
            parkingFee: v.optional(v.number()),
            peakPrice: v.optional(v.number()),
            valleyPrice: v.optional(v.number()),
            flatPrice: v.optional(v.number()),
            pricingNotes: v.optional(v.string()),
        })),
        operatingHours: v.optional(v.string()),
        is24Hours: v.optional(v.boolean()),
        amenities: v.optional(v.array(amenityValidator)),
        status: v.optional(stationStatusValidator),
        rating: v.optional(v.number()),
        ratingCount: v.optional(v.number()),
        phone: v.optional(v.string()),
        website: v.optional(v.string()),
        imageUrls: v.optional(v.array(v.string())),
        paymentMethods: v.optional(v.array(paymentMethodValidator)),
        supportedBrands: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const filteredUpdates = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
        // Add updatedAt timestamp
        filteredUpdates.updatedAt = Date.now();
        // Update lastStatusUpdate if status is changed
        if (updates.status !== undefined) {
            filteredUpdates.lastStatusUpdate = Date.now();
        }
        await ctx.db.patch(id, filteredUpdates);
        return await ctx.db.get(id);
    },
});
/**
 * Update station availability (real-time status update)
 */
export const updateAvailability = mutation({
    args: {
        id: v.id('chargingStations'),
        availablePorts: v.number(),
        chargerTypes: v.optional(v.array(v.object({
            type: chargerTypeValidator,
            powerKw: v.number(),
            count: v.number(),
            available: v.number(),
            connectorType: v.optional(v.string()),
        }))),
        status: v.optional(stationStatusValidator),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const now = Date.now();
        await ctx.db.patch(id, {
            ...updates,
            lastStatusUpdate: now,
            updatedAt: now,
        });
        return await ctx.db.get(id);
    },
});
/**
 * Delete a charging station
 */
export const remove = mutation({
    args: { id: v.id('chargingStations') },
    handler: async (ctx, args) => {
        // Delete associated reviews first
        const reviews = await ctx.db
            .query('chargingStationReviews')
            .withIndex('by_station', (q) => q.eq('stationId', args.id))
            .collect();
        for (const review of reviews) {
            await ctx.db.delete(review._id);
        }
        // Delete favorites
        const favorites = await ctx.db
            .query('favoriteChargingStations')
            .withIndex('by_station', (q) => q.eq('stationId', args.id))
            .collect();
        for (const favorite of favorites) {
            await ctx.db.delete(favorite._id);
        }
        // Delete the station
        await ctx.db.delete(args.id);
    },
});
/**
 * Upsert a charging station (for crawler)
 */
export const upsert = mutation({
    args: {
        externalId: v.string(),
        source: v.string(),
        name: v.string(),
        nameEn: v.optional(v.string()),
        operatorName: v.optional(v.string()),
        operatorId: v.optional(v.string()),
        address: v.string(),
        cityId: v.optional(v.id('cities')),
        latitude: v.number(),
        longitude: v.number(),
        stationType: stationTypeValidator,
        totalPorts: v.number(),
        availablePorts: v.number(),
        chargerTypes: v.array(v.object({
            type: chargerTypeValidator,
            powerKw: v.number(),
            count: v.number(),
            available: v.number(),
            connectorType: v.optional(v.string()),
        })),
        pricingInfo: v.optional(v.object({
            electricityPrice: v.optional(v.number()),
            serviceFee: v.optional(v.number()),
            parkingFee: v.optional(v.number()),
            peakPrice: v.optional(v.number()),
            valleyPrice: v.optional(v.number()),
            flatPrice: v.optional(v.number()),
            pricingNotes: v.optional(v.string()),
        })),
        operatingHours: v.optional(v.string()),
        is24Hours: v.boolean(),
        amenities: v.optional(v.array(amenityValidator)),
        status: stationStatusValidator,
        rating: v.optional(v.number()),
        ratingCount: v.optional(v.number()),
        phone: v.optional(v.string()),
        website: v.optional(v.string()),
        imageUrls: v.optional(v.array(v.string())),
        sourceUrl: v.optional(v.string()),
        paymentMethods: v.optional(v.array(paymentMethodValidator)),
        supportedBrands: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        // Check if station already exists
        const existing = await ctx.db
            .query('chargingStations')
            .withIndex('by_external', (q) => q.eq('externalId', args.externalId).eq('source', args.source))
            .first();
        if (existing) {
            // Update existing station
            await ctx.db.patch(existing._id, {
                ...args,
                updatedAt: now,
                lastStatusUpdate: now,
            });
            return existing._id;
        }
        else {
            // Create new station
            return await ctx.db.insert('chargingStations', {
                ...args,
                crawledAt: now,
                updatedAt: now,
                lastStatusUpdate: now,
            });
        }
    },
});
/**
 * Bulk insert charging stations
 */
export const bulkInsert = mutation({
    args: {
        stations: v.array(v.object({
            externalId: v.optional(v.string()),
            name: v.string(),
            nameEn: v.optional(v.string()),
            operatorName: v.optional(v.string()),
            operatorId: v.optional(v.string()),
            address: v.string(),
            cityId: v.optional(v.id('cities')),
            latitude: v.number(),
            longitude: v.number(),
            stationType: stationTypeValidator,
            totalPorts: v.number(),
            availablePorts: v.number(),
            chargerTypes: v.array(v.object({
                type: chargerTypeValidator,
                powerKw: v.number(),
                count: v.number(),
                available: v.number(),
                connectorType: v.optional(v.string()),
            })),
            pricingInfo: v.optional(v.object({
                electricityPrice: v.optional(v.number()),
                serviceFee: v.optional(v.number()),
                parkingFee: v.optional(v.number()),
                peakPrice: v.optional(v.number()),
                valleyPrice: v.optional(v.number()),
                flatPrice: v.optional(v.number()),
                pricingNotes: v.optional(v.string()),
            })),
            operatingHours: v.optional(v.string()),
            is24Hours: v.boolean(),
            amenities: v.optional(v.array(amenityValidator)),
            status: stationStatusValidator,
            rating: v.optional(v.number()),
            ratingCount: v.optional(v.number()),
            phone: v.optional(v.string()),
            website: v.optional(v.string()),
            imageUrls: v.optional(v.array(v.string())),
            source: v.string(),
            sourceUrl: v.optional(v.string()),
            paymentMethods: v.optional(v.array(paymentMethodValidator)),
            supportedBrands: v.optional(v.array(v.string())),
        })),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const ids = [];
        for (const station of args.stations) {
            const id = await ctx.db.insert('chargingStations', {
                ...station,
                crawledAt: now,
                updatedAt: now,
                lastStatusUpdate: now,
            });
            ids.push(id);
        }
        return ids;
    },
});
// ============================================
// Review Functions
// ============================================
/**
 * Get reviews for a charging station
 */
export const getReviews = query({
    args: {
        stationId: v.id('chargingStations'),
        limit: v.optional(v.number()),
        offset: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 20;
        const offset = args.offset ?? 0;
        const reviews = await ctx.db
            .query('chargingStationReviews')
            .withIndex('by_station', (q) => q.eq('stationId', args.stationId))
            .collect();
        // Sort by createdAt descending
        reviews.sort((a, b) => b.createdAt - a.createdAt);
        return {
            data: reviews.slice(offset, offset + limit),
            total: reviews.length,
            limit,
            offset,
        };
    },
});
/**
 * Add a review
 */
export const addReview = mutation({
    args: {
        stationId: v.id('chargingStations'),
        userId: v.optional(v.string()),
        authorName: v.optional(v.string()),
        content: v.string(),
        rating: v.number(),
        chargerType: v.optional(v.string()),
        chargingDuration: v.optional(v.number()),
        energyCharged: v.optional(v.number()),
        totalCost: v.optional(v.number()),
        vehicleModel: v.optional(v.string()),
        visitDate: v.optional(v.string()),
        pros: v.optional(v.array(v.string())),
        cons: v.optional(v.array(v.string())),
        imageUrls: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const reviewId = await ctx.db.insert('chargingStationReviews', {
            ...args,
            isVerified: false,
            createdAt: Date.now(),
        });
        // Update station rating
        const reviews = await ctx.db
            .query('chargingStationReviews')
            .withIndex('by_station', (q) => q.eq('stationId', args.stationId))
            .collect();
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = totalRating / reviews.length;
        await ctx.db.patch(args.stationId, {
            rating: avgRating,
            ratingCount: reviews.length,
            reviewCount: reviews.length,
            updatedAt: Date.now(),
        });
        return reviewId;
    },
});
// ============================================
// Favorite Functions
// ============================================
/**
 * Get user's favorite charging stations
 */
export const getUserFavorites = query({
    args: {
        userId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 50;
        const favorites = await ctx.db
            .query('favoriteChargingStations')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .take(limit);
        // Get the actual station data
        const stationsWithNotes = await Promise.all(favorites.map(async (fav) => {
            const station = await ctx.db.get(fav.stationId);
            return {
                ...station,
                favoriteId: fav._id,
                notes: fav.notes,
                addedAt: fav.createdAt,
            };
        }));
        return stationsWithNotes.filter((s) => s !== null);
    },
});
/**
 * Add station to favorites
 */
export const addToFavorites = mutation({
    args: {
        userId: v.string(),
        stationId: v.id('chargingStations'),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Check if already favorited
        const existing = await ctx.db
            .query('favoriteChargingStations')
            .withIndex('by_user_station', (q) => q.eq('userId', args.userId).eq('stationId', args.stationId))
            .first();
        if (existing) {
            return existing._id;
        }
        return await ctx.db.insert('favoriteChargingStations', {
            userId: args.userId,
            stationId: args.stationId,
            notes: args.notes,
            createdAt: Date.now(),
        });
    },
});
/**
 * Remove station from favorites
 */
export const removeFromFavorites = mutation({
    args: {
        userId: v.string(),
        stationId: v.id('chargingStations'),
    },
    handler: async (ctx, args) => {
        const favorite = await ctx.db
            .query('favoriteChargingStations')
            .withIndex('by_user_station', (q) => q.eq('userId', args.userId).eq('stationId', args.stationId))
            .first();
        if (favorite) {
            await ctx.db.delete(favorite._id);
        }
    },
});
/**
 * Check if station is in favorites
 */
export const isFavorite = query({
    args: {
        userId: v.string(),
        stationId: v.id('chargingStations'),
    },
    handler: async (ctx, args) => {
        const favorite = await ctx.db
            .query('favoriteChargingStations')
            .withIndex('by_user_station', (q) => q.eq('userId', args.userId).eq('stationId', args.stationId))
            .first();
        return favorite !== null;
    },
});
// ============================================
// Helper Functions
// ============================================
/**
 * Calculate distance between two coordinates (Haversine formula)
 */
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
