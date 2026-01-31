/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Favorite SIM Cards - User's saved SIM card products
 */

// List user's favorite SIM cards
export const listByUser = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query('favoriteSimCards')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect();

    // Sort by creation date (newest first)
    favorites.sort((a, b) => b.createdAt - a.createdAt);

    const offset = args.offset ?? 0;
    const limit = args.limit ?? 50;
    const paginatedFavorites = favorites.slice(offset, offset + limit);

    // Fetch SIM card details for each favorite
    const favoritesWithDetails = await Promise.all(
      paginatedFavorites.map(async (fav) => {
        const simCard = await ctx.db.get(fav.simCardId);
        return {
          ...fav,
          simCard,
        };
      }),
    );

    return favoritesWithDetails;
  },
});

// Check if a SIM card is favorited by user
export const isFavorited = query({
  args: {
    userId: v.string(),
    simCardId: v.id('simCards'),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query('favoriteSimCards')
      .withIndex('by_user_sim_card', q =>
        q.eq('userId', args.userId).eq('simCardId', args.simCardId))
      .collect();

    return favorites.length > 0;
  },
});

// Get favorite record
export const getFavorite = query({
  args: {
    userId: v.string(),
    simCardId: v.id('simCards'),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query('favoriteSimCards')
      .withIndex('by_user_sim_card', q =>
        q.eq('userId', args.userId).eq('simCardId', args.simCardId))
      .collect();

    return favorites[0] ?? null;
  },
});

// Add a SIM card to favorites
export const add = mutation({
  args: {
    userId: v.string(),
    simCardId: v.id('simCards'),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already favorited
    const existing = await ctx.db
      .query('favoriteSimCards')
      .withIndex('by_user_sim_card', q =>
        q.eq('userId', args.userId).eq('simCardId', args.simCardId))
      .collect();

    if (existing.length > 0) {
      throw new Error('SIM card is already in favorites');
    }

    // Verify SIM card exists
    const simCard = await ctx.db.get(args.simCardId);
    if (!simCard) {
      throw new Error('SIM card not found');
    }

    return await ctx.db.insert('favoriteSimCards', {
      userId: args.userId,
      simCardId: args.simCardId,
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

// Update favorite notes
export const updateNotes = mutation({
  args: {
    id: v.id('favoriteSimCards'),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const favorite = await ctx.db.get(args.id);
    if (!favorite) {
      throw new Error('Favorite not found');
    }

    await ctx.db.patch(args.id, {
      notes: args.notes,
    });

    return await ctx.db.get(args.id);
  },
});

// Remove a SIM card from favorites
export const remove = mutation({
  args: {
    userId: v.string(),
    simCardId: v.id('simCards'),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query('favoriteSimCards')
      .withIndex('by_user_sim_card', q =>
        q.eq('userId', args.userId).eq('simCardId', args.simCardId))
      .collect();

    if (favorites.length === 0) {
      throw new Error('SIM card is not in favorites');
    }

    await ctx.db.delete(favorites[0]._id);
  },
});

// Toggle favorite status
export const toggle = mutation({
  args: {
    userId: v.string(),
    simCardId: v.id('simCards'),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query('favoriteSimCards')
      .withIndex('by_user_sim_card', q =>
        q.eq('userId', args.userId).eq('simCardId', args.simCardId))
      .collect();

    if (favorites.length > 0) {
      // Remove from favorites
      await ctx.db.delete(favorites[0]._id);
      return { isFavorited: false };
    }
    else {
      // Verify SIM card exists
      const simCard = await ctx.db.get(args.simCardId);
      if (!simCard) {
        throw new Error('SIM card not found');
      }

      // Add to favorites
      await ctx.db.insert('favoriteSimCards', {
        userId: args.userId,
        simCardId: args.simCardId,
        createdAt: Date.now(),
      });
      return { isFavorited: true };
    }
  },
});

// Get favorite count for a SIM card
export const getFavoriteCount = query({
  args: {
    simCardId: v.id('simCards'),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query('favoriteSimCards')
      .withIndex('by_sim_card', q => q.eq('simCardId', args.simCardId))
      .collect();

    return favorites.length;
  },
});
