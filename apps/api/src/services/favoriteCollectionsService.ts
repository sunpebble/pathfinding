/**
 * Favorite Collections Service - Convex Implementation
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';

export const FavoriteCollectionsService = {
  /**
   * Create a new collection
   */
  async create(
    userId: string,
    data: {
      name: string;
      description?: string;
      coverImageUrl?: string;
      isDefault?: boolean;
    }
  ) {
    const collectionId = await convex.mutation(api.favoriteCollections.create, {
      userId,
      ...data,
    });
    return collectionId;
  },

  /**
   * Get or create default collection
   */
  async getOrCreateDefault(userId: string) {
    const collection = await convex.mutation(
      api.favoriteCollections.getOrCreateDefault,
      { userId }
    );
    return collection;
  },

  /**
   * List user's collections
   */
  async listByUser(userId: string) {
    const collections = await convex.query(api.favoriteCollections.listByUser, {
      userId,
    });
    return collections;
  },

  /**
   * Get collection by ID with items
   */
  async getById(id: string, page: number = 1, pageSize: number = 20) {
    const collection = await convex.query(api.favoriteCollections.getById, {
      id: id as Id<'favoriteCollections'>,
      page,
      pageSize,
    });
    return collection;
  },

  /**
   * Update a collection
   */
  async update(
    id: string,
    userId: string,
    data: {
      name?: string;
      description?: string;
      coverImageUrl?: string;
      isDefault?: boolean;
    }
  ) {
    const collection = await convex.mutation(api.favoriteCollections.update, {
      id: id as Id<'favoriteCollections'>,
      userId,
      ...data,
    });
    return collection;
  },

  /**
   * Delete a collection
   */
  async remove(id: string, userId: string) {
    await convex.mutation(api.favoriteCollections.remove, {
      id: id as Id<'favoriteCollections'>,
      userId,
    });
  },

  /**
   * Reorder collections
   */
  async reorder(userId: string, orderedIds: string[]) {
    await convex.mutation(api.favoriteCollections.reorder, {
      userId,
      orderedIds: orderedIds as Id<'favoriteCollections'>[],
    });
  },
};
