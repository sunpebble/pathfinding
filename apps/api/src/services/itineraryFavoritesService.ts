/**
 * Itinerary Favorites Service - Convex Implementation
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';

export const ItineraryFavoritesService = {
  /**
   * Add itinerary to a collection
   */
  async add(
    userId: string,
    itineraryId: string,
    collectionId?: string,
    notes?: string
  ) {
    const favoriteId = await convex.mutation(api.itineraryFavorites.add, {
      userId,
      itineraryId: itineraryId as Id<'itineraries'>,
      collectionId: collectionId as Id<'favoriteCollections'> | undefined,
      notes,
    });
    return favoriteId;
  },

  /**
   * Remove itinerary from favorites
   */
  async remove(userId: string, itineraryId: string) {
    const result = await convex.mutation(api.itineraryFavorites.remove, {
      userId,
      itineraryId: itineraryId as Id<'itineraries'>,
    });
    return result;
  },

  /**
   * Toggle favorite status
   */
  async toggle(userId: string, itineraryId: string) {
    const result = await convex.mutation(api.itineraryFavorites.toggle, {
      userId,
      itineraryId: itineraryId as Id<'itineraries'>,
    });
    return result;
  },

  /**
   * Check if user has favorited an itinerary
   */
  async isFavorited(userId: string, itineraryId: string) {
    const result = await convex.query(api.itineraryFavorites.isFavorited, {
      userId,
      itineraryId: itineraryId as Id<'itineraries'>,
    });
    return result;
  },

  /**
   * Get favorite count for an itinerary
   */
  async getCount(itineraryId: string) {
    const result = await convex.query(api.itineraryFavorites.getCount, {
      itineraryId: itineraryId as Id<'itineraries'>,
    });
    return result;
  },

  /**
   * Get user's favorites
   */
  async listByUser(
    userId: string,
    collectionId?: string,
    page: number = 1,
    pageSize: number = 20
  ) {
    const result = await convex.query(api.itineraryFavorites.listByUser, {
      userId,
      collectionId: collectionId as Id<'favoriteCollections'> | undefined,
      page,
      pageSize,
    });
    return result;
  },

  /**
   * Move favorite to different collection
   */
  async moveToCollection(
    userId: string,
    favoriteId: string,
    newCollectionId: string
  ) {
    const result = await convex.mutation(
      api.itineraryFavorites.moveToCollection,
      {
        userId,
        favoriteId: favoriteId as Id<'itineraryFavorites'>,
        newCollectionId: newCollectionId as Id<'favoriteCollections'>,
      }
    );
    return result;
  },

  /**
   * Update favorite notes
   */
  async updateNotes(userId: string, favoriteId: string, notes?: string) {
    const result = await convex.mutation(api.itineraryFavorites.updateNotes, {
      userId,
      favoriteId: favoriteId as Id<'itineraryFavorites'>,
      notes,
    });
    return result;
  },

  /**
   * Batch check favorites for multiple itineraries
   */
  async batchCheckFavorites(userId: string, itineraryIds: string[]) {
    const result = await convex.query(
      api.itineraryFavorites.batchCheckFavorites,
      {
        userId,
        itineraryIds: itineraryIds as Id<'itineraries'>[],
      }
    );
    return result;
  },

  /**
   * Batch get favorite counts for multiple itineraries
   */
  async batchGetCounts(itineraryIds: string[]) {
    const result = await convex.query(api.itineraryFavorites.batchGetCounts, {
      itineraryIds: itineraryIds as Id<'itineraries'>[],
    });
    return result;
  },
};
