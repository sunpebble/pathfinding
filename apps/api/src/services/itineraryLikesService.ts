/**
 * Itinerary Likes Service - Convex Implementation
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';

export const ItineraryLikesService = {
  /**
   * Toggle like status for an itinerary
   */
  async toggle(userId: string, itineraryId: string) {
    const result = await convex.mutation(api.itineraryLikes.toggle, {
      userId,
      itineraryId: itineraryId as Id<'itineraries'>,
    });
    return result;
  },

  /**
   * Check if user has liked an itinerary
   */
  async isLiked(userId: string, itineraryId: string) {
    const result = await convex.query(api.itineraryLikes.isLiked, {
      userId,
      itineraryId: itineraryId as Id<'itineraries'>,
    });
    return result;
  },

  /**
   * Get like count for an itinerary
   */
  async getCount(itineraryId: string) {
    const result = await convex.query(api.itineraryLikes.getCount, {
      itineraryId: itineraryId as Id<'itineraries'>,
    });
    return result;
  },

  /**
   * Get user's liked itineraries
   */
  async listByUser(userId: string, page: number = 1, pageSize: number = 20) {
    const result = await convex.query(api.itineraryLikes.listByUser, {
      userId,
      page,
      pageSize,
    });
    return result;
  },

  /**
   * Batch check likes for multiple itineraries
   */
  async batchCheckLikes(userId: string, itineraryIds: string[]) {
    const result = await convex.query(api.itineraryLikes.batchCheckLikes, {
      userId,
      itineraryIds: itineraryIds as Id<'itineraries'>[],
    });
    return result;
  },

  /**
   * Batch get like counts for multiple itineraries
   */
  async batchGetCounts(itineraryIds: string[]) {
    const result = await convex.query(api.itineraryLikes.batchGetCounts, {
      itineraryIds: itineraryIds as Id<'itineraries'>[],
    });
    return result;
  },
};
