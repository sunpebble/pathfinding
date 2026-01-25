import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
/**
 * SIM Card Reviews - User reviews for SIM card products
 */
// Signal quality validator
const signalQualityValidator = v.union(v.literal('excellent'), v.literal('good'), v.literal('average'), v.literal('poor'), v.literal('very_poor'));
// Review status validator
const reviewStatusValidator = v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected'));
// List reviews for a SIM card product
export const listBySimCard = query({
    args: {
        simCardId: v.id('simCards'),
        status: v.optional(reviewStatusValidator),
        limit: v.optional(v.number()),
        offset: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let reviews = await ctx.db
            .query('simCardReviews')
            .withIndex('by_sim_card', (q) => q.eq('simCardId', args.simCardId))
            .collect();
        // Filter by status (default to approved)
        const status = args.status ?? 'approved';
        reviews = reviews.filter((r) => r.status === status);
        // Sort by helpful count and creation date
        reviews.sort((a, b) => {
            const scoreA = (a.helpfulCount ?? 0) * 2 + a.createdAt;
            const scoreB = (b.helpfulCount ?? 0) * 2 + b.createdAt;
            return scoreB - scoreA;
        });
        const offset = args.offset ?? 0;
        const limit = args.limit ?? 20;
        return reviews.slice(offset, offset + limit);
    },
});
// List reviews by a user
export const listByUser = query({
    args: {
        userId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const reviews = await ctx.db
            .query('simCardReviews')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .collect();
        // Sort by creation date (newest first)
        reviews.sort((a, b) => b.createdAt - a.createdAt);
        return args.limit ? reviews.slice(0, args.limit) : reviews;
    },
});
// Get review by ID
export const getById = query({
    args: { id: v.id('simCardReviews') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
// Get user's review for a specific SIM card
export const getUserReview = query({
    args: {
        userId: v.string(),
        simCardId: v.id('simCards'),
    },
    handler: async (ctx, args) => {
        const reviews = await ctx.db
            .query('simCardReviews')
            .withIndex('by_sim_card', (q) => q.eq('simCardId', args.simCardId))
            .filter((q) => q.eq(q.field('userId'), args.userId))
            .collect();
        return reviews[0] ?? null;
    },
});
// Get top reviews (most helpful)
export const getTopReviews = query({
    args: {
        simCardId: v.optional(v.id('simCards')),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let reviews = await ctx.db
            .query('simCardReviews')
            .withIndex('by_helpful', (q) => q)
            .collect();
        // Filter by SIM card if provided
        if (args.simCardId) {
            reviews = reviews.filter((r) => r.simCardId === args.simCardId);
        }
        // Only approved reviews
        reviews = reviews.filter((r) => r.status === 'approved');
        // Sort by helpful count
        reviews.sort((a, b) => b.helpfulCount - a.helpfulCount);
        const limit = args.limit ?? 10;
        return reviews.slice(0, limit);
    },
});
// Create a new review
export const create = mutation({
    args: {
        simCardId: v.id('simCards'),
        userId: v.optional(v.string()),
        authorName: v.optional(v.string()),
        // Ratings (1-5 scale)
        overallRating: v.number(),
        signalRating: v.optional(v.number()),
        speedRating: v.optional(v.number()),
        valueRating: v.optional(v.number()),
        serviceRating: v.optional(v.number()),
        // Review content
        title: v.optional(v.string()),
        content: v.string(),
        // Usage details
        destination: v.optional(v.string()),
        usageDuration: v.optional(v.number()),
        actualDataUsed: v.optional(v.string()),
        deviceUsed: v.optional(v.string()),
        // Pros and cons
        pros: v.optional(v.array(v.string())),
        cons: v.optional(v.array(v.string())),
        // Experience details
        activationExperience: v.optional(v.string()),
        signalQuality: v.optional(signalQualityValidator),
        speedTestResult: v.optional(v.string()),
        // Would recommend
        wouldRecommend: v.boolean(),
        // Media
        imageUrls: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        // Check if user already reviewed this SIM card (if userId provided)
        if (args.userId) {
            const existingReviews = await ctx.db
                .query('simCardReviews')
                .withIndex('by_sim_card', (q) => q.eq('simCardId', args.simCardId))
                .filter((q) => q.eq(q.field('userId'), args.userId))
                .collect();
            if (existingReviews.length > 0) {
                throw new Error('User has already reviewed this SIM card');
            }
        }
        const reviewId = await ctx.db.insert('simCardReviews', {
            ...args,
            helpfulCount: 0,
            reportCount: 0,
            isVerified: false,
            purchaseVerified: false,
            status: 'pending',
            createdAt: Date.now(),
        });
        // Update SIM card average rating
        await updateSimCardRating(ctx, args.simCardId);
        return reviewId;
    },
});
// Update a review
export const update = mutation({
    args: {
        id: v.id('simCardReviews'),
        overallRating: v.optional(v.number()),
        signalRating: v.optional(v.number()),
        speedRating: v.optional(v.number()),
        valueRating: v.optional(v.number()),
        serviceRating: v.optional(v.number()),
        title: v.optional(v.string()),
        content: v.optional(v.string()),
        destination: v.optional(v.string()),
        usageDuration: v.optional(v.number()),
        actualDataUsed: v.optional(v.string()),
        deviceUsed: v.optional(v.string()),
        pros: v.optional(v.array(v.string())),
        cons: v.optional(v.array(v.string())),
        activationExperience: v.optional(v.string()),
        signalQuality: v.optional(signalQualityValidator),
        speedTestResult: v.optional(v.string()),
        wouldRecommend: v.optional(v.boolean()),
        imageUrls: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const review = await ctx.db.get(id);
        if (!review) {
            throw new Error('Review not found');
        }
        const filteredUpdates = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
        await ctx.db.patch(id, {
            ...filteredUpdates,
            updatedAt: Date.now(),
            // Reset to pending if content changed
            ...(updates.content || updates.title ? { status: 'pending' } : {}),
        });
        // Update SIM card average rating if rating changed
        if (updates.overallRating ||
            updates.signalRating ||
            updates.speedRating ||
            updates.valueRating ||
            updates.serviceRating) {
            await updateSimCardRating(ctx, review.simCardId);
        }
        return await ctx.db.get(id);
    },
});
// Update review status (admin/moderation)
export const updateStatus = mutation({
    args: {
        id: v.id('simCardReviews'),
        status: reviewStatusValidator,
    },
    handler: async (ctx, args) => {
        const review = await ctx.db.get(args.id);
        if (!review) {
            throw new Error('Review not found');
        }
        await ctx.db.patch(args.id, {
            status: args.status,
            updatedAt: Date.now(),
        });
        // Recalculate rating when status changes
        await updateSimCardRating(ctx, review.simCardId);
        return await ctx.db.get(args.id);
    },
});
// Vote on a review (helpful/not helpful)
export const vote = mutation({
    args: {
        reviewId: v.id('simCardReviews'),
        userId: v.string(),
        voteType: v.union(v.literal('helpful'), v.literal('not_helpful')),
    },
    handler: async (ctx, args) => {
        const review = await ctx.db.get(args.reviewId);
        if (!review) {
            throw new Error('Review not found');
        }
        // Check if user already voted
        const existingVotes = await ctx.db
            .query('simCardReviewVotes')
            .withIndex('by_review_user', (q) => q.eq('reviewId', args.reviewId).eq('userId', args.userId))
            .collect();
        if (existingVotes.length > 0) {
            const existingVote = existingVotes[0];
            if (existingVote.voteType === args.voteType) {
                // Remove vote if same type (toggle)
                await ctx.db.delete(existingVote._id);
                // Update helpful count
                if (args.voteType === 'helpful') {
                    await ctx.db.patch(args.reviewId, {
                        helpfulCount: Math.max(0, review.helpfulCount - 1),
                    });
                }
            }
            else {
                // Change vote type
                await ctx.db.patch(existingVote._id, {
                    voteType: args.voteType,
                    createdAt: Date.now(),
                });
                // Update helpful count
                if (args.voteType === 'helpful') {
                    await ctx.db.patch(args.reviewId, {
                        helpfulCount: review.helpfulCount + 1,
                    });
                }
                else {
                    await ctx.db.patch(args.reviewId, {
                        helpfulCount: Math.max(0, review.helpfulCount - 1),
                    });
                }
            }
        }
        else {
            // Create new vote
            await ctx.db.insert('simCardReviewVotes', {
                reviewId: args.reviewId,
                userId: args.userId,
                voteType: args.voteType,
                createdAt: Date.now(),
            });
            // Update helpful count
            if (args.voteType === 'helpful') {
                await ctx.db.patch(args.reviewId, {
                    helpfulCount: review.helpfulCount + 1,
                });
            }
        }
        return await ctx.db.get(args.reviewId);
    },
});
// Get user's vote for a review
export const getUserVote = query({
    args: {
        reviewId: v.id('simCardReviews'),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const votes = await ctx.db
            .query('simCardReviewVotes')
            .withIndex('by_review_user', (q) => q.eq('reviewId', args.reviewId).eq('userId', args.userId))
            .collect();
        return votes[0] ?? null;
    },
});
// Report a review
export const report = mutation({
    args: {
        id: v.id('simCardReviews'),
    },
    handler: async (ctx, args) => {
        const review = await ctx.db.get(args.id);
        if (!review) {
            throw new Error('Review not found');
        }
        await ctx.db.patch(args.id, {
            reportCount: review.reportCount + 1,
        });
        return await ctx.db.get(args.id);
    },
});
// Delete a review
export const remove = mutation({
    args: { id: v.id('simCardReviews') },
    handler: async (ctx, args) => {
        const review = await ctx.db.get(args.id);
        if (!review) {
            throw new Error('Review not found');
        }
        const simCardId = review.simCardId;
        // Delete votes for this review
        const votes = await ctx.db
            .query('simCardReviewVotes')
            .withIndex('by_review', (q) => q.eq('reviewId', args.id))
            .collect();
        for (const vote of votes) {
            await ctx.db.delete(vote._id);
        }
        // Delete the review
        await ctx.db.delete(args.id);
        // Update SIM card average rating
        await updateSimCardRating(ctx, simCardId);
    },
});
// Helper function to update SIM card rating
async function updateSimCardRating(ctx, simCardId) {
    const reviews = await ctx.db
        .query('simCardReviews')
        .withIndex('by_sim_card', (q) => q.eq('simCardId', simCardId))
        .collect();
    // Only count approved reviews
    const approvedReviews = reviews.filter((r) => r.status === 'approved');
    if (approvedReviews.length === 0) {
        await ctx.db.patch(simCardId, {
            rating: undefined,
            reviewCount: 0,
            updatedAt: Date.now(),
        });
        return;
    }
    const totalRating = approvedReviews.reduce((sum, review) => sum + review.overallRating, 0);
    const averageRating = totalRating / approvedReviews.length;
    await ctx.db.patch(simCardId, {
        rating: Math.round(averageRating * 10) / 10,
        reviewCount: approvedReviews.length,
        updatedAt: Date.now(),
    });
}
