import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
/**
 * WiFi Reviews - User reviews and quality ratings for WiFi spots
 */
// List reviews for a WiFi spot
export const listBySpot = query({
    args: {
        wifiSpotId: v.id('wifiSpots'),
        limit: v.optional(v.number()),
        offset: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const results = await ctx.db
            .query('wifiReviews')
            .withIndex('by_spot', (q) => q.eq('wifiSpotId', args.wifiSpotId))
            .collect();
        // Sort by most recent
        results.sort((a, b) => b.createdAt - a.createdAt);
        const offset = args.offset ?? 0;
        const limit = args.limit ?? 20;
        return results.slice(offset, offset + limit);
    },
});
// List reviews by a user
export const listByUser = query({
    args: {
        userId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const results = await ctx.db
            .query('wifiReviews')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .collect();
        // Sort by most recent
        results.sort((a, b) => b.createdAt - a.createdAt);
        return args.limit ? results.slice(0, args.limit) : results;
    },
});
// Get a review by ID
export const getById = query({
    args: { id: v.id('wifiReviews') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
// Check if user has already reviewed a spot
export const getUserReview = query({
    args: {
        userId: v.string(),
        wifiSpotId: v.id('wifiSpots'),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('wifiReviews')
            .withIndex('by_user_spot', (q) => q.eq('userId', args.userId).eq('wifiSpotId', args.wifiSpotId))
            .first();
    },
});
// Create a new review
export const create = mutation({
    args: {
        userId: v.string(),
        wifiSpotId: v.id('wifiSpots'),
        // Quality ratings (1-5)
        speedRating: v.number(),
        stabilityRating: v.number(),
        easeOfAccessRating: v.number(),
        overallRating: v.number(),
        // Optional details
        comment: v.optional(v.string()),
        speedTestResult: v.optional(v.number()), // Mbps
        connectionTime: v.optional(v.string()), // How long they used it
        deviceType: v.optional(v.string()), // Phone, laptop, etc.
        visitDate: v.optional(v.string()), // When they visited
    },
    handler: async (ctx, args) => {
        // Check if user already reviewed this spot
        const existing = await ctx.db
            .query('wifiReviews')
            .withIndex('by_user_spot', (q) => q.eq('userId', args.userId).eq('wifiSpotId', args.wifiSpotId))
            .first();
        if (existing) {
            // Update existing review
            const { userId, wifiSpotId, ...updates } = args;
            await ctx.db.patch(existing._id, {
                ...updates,
                updatedAt: Date.now(),
            });
            // Recalculate spot average rating
            await recalculateSpotRating(ctx, args.wifiSpotId);
            return existing._id;
        }
        // Create new review
        const reviewId = await ctx.db.insert('wifiReviews', {
            ...args,
            helpfulCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        // Update spot average rating
        await recalculateSpotRating(ctx, args.wifiSpotId);
        return reviewId;
    },
});
// Update a review
export const update = mutation({
    args: {
        id: v.id('wifiReviews'),
        speedRating: v.optional(v.number()),
        stabilityRating: v.optional(v.number()),
        easeOfAccessRating: v.optional(v.number()),
        overallRating: v.optional(v.number()),
        comment: v.optional(v.string()),
        speedTestResult: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const review = await ctx.db.get(id);
        if (!review)
            return null;
        const filteredUpdates = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
        await ctx.db.patch(id, { ...filteredUpdates, updatedAt: Date.now() });
        // Recalculate spot average rating
        await recalculateSpotRating(ctx, review.wifiSpotId);
        return await ctx.db.get(id);
    },
});
// Delete a review
export const remove = mutation({
    args: { id: v.id('wifiReviews') },
    handler: async (ctx, args) => {
        const review = await ctx.db.get(args.id);
        if (!review)
            return;
        await ctx.db.delete(args.id);
        // Recalculate spot average rating
        await recalculateSpotRating(ctx, review.wifiSpotId);
    },
});
// Mark a review as helpful
export const markHelpful = mutation({
    args: {
        id: v.id('wifiReviews'),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const review = await ctx.db.get(args.id);
        if (!review)
            return null;
        // Check if user already marked this review as helpful
        const existing = await ctx.db
            .query('wifiReviewHelpful')
            .withIndex('by_review_user', (q) => q.eq('reviewId', args.id).eq('userId', args.userId))
            .first();
        if (existing) {
            // Remove helpful mark
            await ctx.db.delete(existing._id);
            await ctx.db.patch(args.id, {
                helpfulCount: Math.max(0, review.helpfulCount - 1),
            });
        }
        else {
            // Add helpful mark
            await ctx.db.insert('wifiReviewHelpful', {
                reviewId: args.id,
                userId: args.userId,
                createdAt: Date.now(),
            });
            await ctx.db.patch(args.id, {
                helpfulCount: review.helpfulCount + 1,
            });
        }
        return await ctx.db.get(args.id);
    },
});
// Helper function to recalculate spot average rating
async function recalculateSpotRating(ctx, wifiSpotId) {
    const reviews = await ctx.db
        .query('wifiReviews')
        .withIndex('by_spot', (q) => q.eq('wifiSpotId', wifiSpotId))
        .collect();
    if (reviews.length === 0) {
        await ctx.db.patch(wifiSpotId, {
            averageRating: 0,
            ratingCount: 0,
            updatedAt: Date.now(),
        });
        return;
    }
    const totalRating = reviews.reduce((sum, review) => sum + review.overallRating, 0);
    const averageRating = totalRating / reviews.length;
    await ctx.db.patch(wifiSpotId, {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        ratingCount: reviews.length,
        updatedAt: Date.now(),
    });
}
