import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Food Recommendations Convex Functions
 * Handles restaurant discovery, food reviews, and cuisine recommendations
 */

// ============================================
// Restaurant Queries
// ============================================

/**
 * List restaurants with filters
 */
export const listRestaurants = query({
  args: {
    cityId: v.optional(v.id('cities')),
    cuisineType: v.optional(v.string()),
    priceLevel: v.optional(v.number()),
    minRating: v.optional(v.number()),
    isLocalFavorite: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const query = ctx.db
      .query('pois')
      .withIndex('by_category', q => q.eq('category', 'restaurant'));

    const pois = await query.collect();

    // Apply filters
    let filtered = pois;

    if (args.cityId) {
      filtered = filtered.filter(p => p.cityId === args.cityId);
    }

    if (args.cuisineType) {
      filtered = filtered.filter(p => p.cuisineType === args.cuisineType);
    }

    if (args.priceLevel) {
      filtered = filtered.filter(p => p.priceLevel === args.priceLevel);
    }

    if (args.minRating) {
      filtered = filtered.filter(
        p => p.rating && p.rating >= args.minRating!,
      );
    }

    if (args.isLocalFavorite) {
      filtered = filtered.filter(p => p.isLocalFavorite === true);
    }

    return filtered.slice(0, limit);
  },
});

/**
 * Search restaurants by keyword
 */
export const searchRestaurants = query({
  args: {
    query: v.string(),
    cityId: v.optional(v.id('cities')),
    cuisineType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const searchQuery = args.query.toLowerCase();

    const dbQuery = ctx.db
      .query('pois')
      .withIndex('by_category', q => q.eq('category', 'restaurant'));

    const pois = await dbQuery.collect();

    // Filter by search query
    let filtered = pois.filter(
      p =>
        p.name.toLowerCase().includes(searchQuery)
        || p.nameEn?.toLowerCase().includes(searchQuery)
        || p.address?.toLowerCase().includes(searchQuery)
        || p.cuisineType?.toLowerCase().includes(searchQuery)
        || p.signatureDishes?.some(d => d.toLowerCase().includes(searchQuery)),
    );

    if (args.cityId) {
      filtered = filtered.filter(p => p.cityId === args.cityId);
    }

    if (args.cuisineType) {
      filtered = filtered.filter(p => p.cuisineType === args.cuisineType);
    }

    return filtered.slice(0, limit);
  },
});

/**
 * Get restaurant by ID
 */
export const getRestaurantById = query({
  args: {
    id: v.id('pois'),
  },
  handler: async (ctx, args) => {
    const poi = await ctx.db.get(args.id);
    if (!poi || poi.category !== 'restaurant') {
      return null;
    }
    return poi;
  },
});

/**
 * Get nearby restaurants
 */
export const getNearbyRestaurants = query({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    radiusKm: v.optional(v.number()),
    cuisineType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const radiusKm = args.radiusKm ?? 5;
    const limit = args.limit ?? 20;

    const pois = await ctx.db
      .query('pois')
      .withIndex('by_category', q => q.eq('category', 'restaurant'))
      .collect();

    // Calculate distance and filter
    const withDistance = pois
      .map((poi) => {
        const distance = haversineDistance(
          args.latitude,
          args.longitude,
          poi.latitude,
          poi.longitude,
        );
        return { ...poi, distance };
      })
      .filter(p => p.distance <= radiusKm);

    // Apply cuisine filter
    let filtered = withDistance;
    if (args.cuisineType) {
      filtered = filtered.filter(p => p.cuisineType === args.cuisineType);
    }

    // Sort by distance
    filtered.sort((a, b) => a.distance - b.distance);

    return filtered.slice(0, limit);
  },
});

/**
 * Get local favorite restaurants
 */
export const getLocalFavorites = query({
  args: {
    cityId: v.id('cities'),
    cuisineType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const pois = await ctx.db
      .query('pois')
      .withIndex('by_city_category', q =>
        q.eq('cityId', args.cityId).eq('category', 'restaurant'))
      .collect();

    let filtered = pois.filter(p => p.isLocalFavorite === true);

    if (args.cuisineType) {
      filtered = filtered.filter(p => p.cuisineType === args.cuisineType);
    }

    // Sort by rating
    filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    return filtered.slice(0, limit);
  },
});

/**
 * Get restaurants by cuisine type
 */
export const getByCuisineType = query({
  args: {
    cuisineType: v.string(),
    cityId: v.optional(v.id('cities')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const pois = await ctx.db
      .query('pois')
      .withIndex('by_category', q => q.eq('category', 'restaurant'))
      .collect();

    let filtered = pois.filter(p => p.cuisineType === args.cuisineType);

    if (args.cityId) {
      filtered = filtered.filter(p => p.cityId === args.cityId);
    }

    // Sort by rating
    filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    return filtered.slice(0, limit);
  },
});

// ============================================
// Food Review Queries & Mutations
// ============================================

/**
 * Get reviews for a restaurant
 */
export const getRestaurantReviews = query({
  args: {
    restaurantId: v.id('pois'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const reviews = await ctx.db
      .query('foodReviews')
      .withIndex('by_restaurant', q =>
        q.eq('restaurantId', args.restaurantId))
      .order('desc')
      .take(limit);

    return reviews;
  },
});

/**
 * Get user's review for a restaurant
 */
export const getUserReview = query({
  args: {
    restaurantId: v.id('pois'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const review = await ctx.db
      .query('foodReviews')
      .withIndex('by_restaurant_user', q =>
        q.eq('restaurantId', args.restaurantId).eq('userId', args.userId))
      .first();

    return review;
  },
});

/**
 * Create or update a food review
 */
export const createFoodReview = mutation({
  args: {
    restaurantId: v.id('pois'),
    userId: v.string(),
    rating: v.number(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    dishesOrdered: v.optional(v.array(v.string())),
    recommendedDishes: v.optional(v.array(v.string())),
    pricePerPerson: v.optional(v.number()),
    visitDate: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    wouldRecommend: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if user already has a review
    const existingReview = await ctx.db
      .query('foodReviews')
      .withIndex('by_restaurant_user', q =>
        q.eq('restaurantId', args.restaurantId).eq('userId', args.userId))
      .first();

    const now = Date.now();

    if (existingReview) {
      // Update existing review
      await ctx.db.patch(existingReview._id, {
        rating: args.rating,
        title: args.title,
        content: args.content,
        dishesOrdered: args.dishesOrdered,
        recommendedDishes: args.recommendedDishes,
        pricePerPerson: args.pricePerPerson,
        visitDate: args.visitDate,
        imageUrls: args.imageUrls,
        tags: args.tags,
        wouldRecommend: args.wouldRecommend,
        updatedAt: now,
      });

      // Update restaurant rating
      await updateRestaurantRating(ctx, args.restaurantId);

      return existingReview._id;
    }

    // Create new review
    const reviewId = await ctx.db.insert('foodReviews', {
      restaurantId: args.restaurantId,
      userId: args.userId,
      rating: args.rating,
      title: args.title,
      content: args.content,
      dishesOrdered: args.dishesOrdered,
      recommendedDishes: args.recommendedDishes,
      pricePerPerson: args.pricePerPerson,
      visitDate: args.visitDate,
      imageUrls: args.imageUrls,
      tags: args.tags,
      wouldRecommend: args.wouldRecommend,
      helpfulCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Update restaurant rating
    await updateRestaurantRating(ctx, args.restaurantId);

    return reviewId;
  },
});

/**
 * Delete a food review
 */
export const deleteFoodReview = mutation({
  args: {
    reviewId: v.id('foodReviews'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error('Review not found');
    }

    if (review.userId !== args.userId) {
      throw new Error('Not authorized to delete this review');
    }

    const restaurantId = review.restaurantId;
    await ctx.db.delete(args.reviewId);

    // Update restaurant rating
    await updateRestaurantRating(ctx, restaurantId);
  },
});

/**
 * Mark a review as helpful
 */
export const markReviewHelpful = mutation({
  args: {
    reviewId: v.id('foodReviews'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already marked this review
    const existingMark = await ctx.db
      .query('foodReviewHelpful')
      .withIndex('by_review_user', q =>
        q.eq('reviewId', args.reviewId).eq('userId', args.userId))
      .first();

    if (existingMark) {
      // Remove the mark
      await ctx.db.delete(existingMark._id);

      // Decrement helpful count
      const review = await ctx.db.get(args.reviewId);
      if (review) {
        await ctx.db.patch(args.reviewId, {
          helpfulCount: Math.max(0, (review.helpfulCount ?? 0) - 1),
        });
      }

      return { action: 'removed' };
    }

    // Add the mark
    await ctx.db.insert('foodReviewHelpful', {
      reviewId: args.reviewId,
      userId: args.userId,
      createdAt: Date.now(),
    });

    // Increment helpful count
    const review = await ctx.db.get(args.reviewId);
    if (review) {
      await ctx.db.patch(args.reviewId, {
        helpfulCount: (review.helpfulCount ?? 0) + 1,
      });
    }

    return { action: 'added' };
  },
});

// ============================================
// Food Collection (Favorites) Mutations
// ============================================

/**
 * Add restaurant to favorites
 */
export const addToFavorites = mutation({
  args: {
    restaurantId: v.id('pois'),
    userId: v.string(),
    collectionId: v.optional(v.id('foodCollections')),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already in favorites
    const existing = await ctx.db
      .query('foodFavorites')
      .withIndex('by_user_restaurant', q =>
        q.eq('userId', args.userId).eq('restaurantId', args.restaurantId))
      .first();

    if (existing) {
      // Update notes if provided
      if (args.notes !== undefined) {
        await ctx.db.patch(existing._id, { notes: args.notes });
      }
      return existing._id;
    }

    const favoriteId = await ctx.db.insert('foodFavorites', {
      userId: args.userId,
      restaurantId: args.restaurantId,
      collectionId: args.collectionId,
      notes: args.notes,
      createdAt: Date.now(),
    });

    return favoriteId;
  },
});

/**
 * Remove restaurant from favorites
 */
export const removeFromFavorites = mutation({
  args: {
    restaurantId: v.id('pois'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query('foodFavorites')
      .withIndex('by_user_restaurant', q =>
        q.eq('userId', args.userId).eq('restaurantId', args.restaurantId))
      .first();

    if (favorite) {
      await ctx.db.delete(favorite._id);
    }
  },
});

/**
 * Get user's favorite restaurants
 */
export const getUserFavorites = query({
  args: {
    userId: v.string(),
    collectionId: v.optional(v.id('foodCollections')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let favorites = await ctx.db
      .query('foodFavorites')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .order('desc')
      .collect();

    if (args.collectionId) {
      favorites = favorites.filter(f => f.collectionId === args.collectionId);
    }

    // Get restaurant details
    const results = await Promise.all(
      favorites.slice(0, limit).map(async (fav) => {
        const restaurant = await ctx.db.get(fav.restaurantId);
        return {
          ...fav,
          restaurant,
        };
      }),
    );

    return results.filter(r => r.restaurant !== null);
  },
});

/**
 * Check if restaurant is in favorites
 */
export const isInFavorites = query({
  args: {
    restaurantId: v.id('pois'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query('foodFavorites')
      .withIndex('by_user_restaurant', q =>
        q.eq('userId', args.userId).eq('restaurantId', args.restaurantId))
      .first();

    return favorite !== null;
  },
});

// ============================================
// Food Collections
// ============================================

/**
 * Create a food collection
 */
export const createCollection = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const collectionId = await ctx.db.insert('foodCollections', {
      userId: args.userId,
      name: args.name,
      description: args.description,
      coverImageUrl: args.coverImageUrl,
      isPublic: args.isPublic ?? false,
      itemCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return collectionId;
  },
});

/**
 * Get user's collections
 */
export const getUserCollections = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const collections = await ctx.db
      .query('foodCollections')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .order('desc')
      .collect();

    return collections;
  },
});

/**
 * Delete a collection
 */
export const deleteCollection = mutation({
  args: {
    collectionId: v.id('foodCollections'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const collection = await ctx.db.get(args.collectionId);
    if (!collection) {
      throw new Error('Collection not found');
    }

    if (collection.userId !== args.userId) {
      throw new Error('Not authorized to delete this collection');
    }

    // Remove collection reference from favorites
    const favorites = await ctx.db
      .query('foodFavorites')
      .withIndex('by_collection', q =>
        q.eq('collectionId', args.collectionId))
      .collect();

    for (const fav of favorites) {
      await ctx.db.patch(fav._id, { collectionId: undefined });
    }

    await ctx.db.delete(args.collectionId);
  },
});

// ============================================
// Cuisine Types
// ============================================

/**
 * Get available cuisine types for a city
 */
export const getCuisineTypes = query({
  args: {
    cityId: v.optional(v.id('cities')),
  },
  handler: async (ctx, args) => {
    let pois;
    if (args.cityId) {
      pois = await ctx.db
        .query('pois')
        .withIndex('by_city_category', q =>
          q.eq('cityId', args.cityId!).eq('category', 'restaurant'))
        .collect();
    }
    else {
      pois = await ctx.db
        .query('pois')
        .withIndex('by_category', q => q.eq('category', 'restaurant'))
        .collect();
    }

    // Extract unique cuisine types
    const cuisineTypes = new Map<string, number>();
    for (const poi of pois) {
      if (poi.cuisineType) {
        cuisineTypes.set(
          poi.cuisineType,
          (cuisineTypes.get(poi.cuisineType) ?? 0) + 1,
        );
      }
    }

    // Convert to array and sort by count
    return Array.from(cuisineTypes.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  },
});

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate haversine distance between two points
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a
    = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(toRad(lat1))
      * Math.cos(toRad(lat2))
      * Math.sin(dLon / 2)
      * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Update restaurant's average rating based on reviews
 */
async function updateRestaurantRating(
  ctx: MutationCtx,
  restaurantId: Id<'pois'>,
): Promise<void> {
  const reviews = await ctx.db
    .query('foodReviews')
    .withIndex('by_restaurant', q => q.eq('restaurantId', restaurantId))
    .collect();

  if (reviews.length === 0) {
    await ctx.db.patch(restaurantId, {
      rating: undefined,
      ratingCount: 0,
    });
    return;
  }

  const totalRating = reviews.reduce(
    (sum: number, r: any) => sum + r.rating,
    0,
  );
  const avgRating = totalRating / reviews.length;

  await ctx.db.patch(restaurantId, {
    rating: Math.round(avgRating * 10) / 10,
    ratingCount: reviews.length,
  });
}
