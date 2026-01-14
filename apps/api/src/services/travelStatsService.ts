/**
 * Travel Statistics Service - Convex Implementation
 * Statistics and yearly review operations
 */

import { api, convex } from '../lib/convex';

/**
 * Travel Statistics service
 */
export const TravelStatsService = {
  /**
   * Get user's travel statistics
   */
  async getByUser(userId: string) {
    const stats = await convex.query(api.travelStats.getByUser, {
      userId,
    });

    return stats;
  },

  /**
   * Get quick stats summary
   */
  async getQuickStats(userId: string) {
    const stats = await convex.query(api.travelStats.getQuickStats, {
      userId,
    });

    return stats;
  },

  /**
   * Calculate and update user's travel statistics
   */
  async calculate(userId: string) {
    const statsId = await convex.mutation(api.travelStats.calculate, {
      userId,
    });

    // Fetch the updated stats
    const stats = await convex.query(api.travelStats.getByUser, {
      userId,
    });

    return stats;
  },
};

/**
 * Yearly Reviews service
 */
export const YearlyReviewsService = {
  /**
   * Get yearly review for a specific year
   */
  async getByYear(userId: string, year: number) {
    const review = await convex.query(api.yearlyReviews.getByYear, {
      userId,
      year,
    });

    return review;
  },

  /**
   * List all yearly reviews for a user
   */
  async listByUser(userId: string) {
    const reviews = await convex.query(api.yearlyReviews.listByUser, {
      userId,
    });

    return reviews;
  },

  /**
   * Get available years for a user
   */
  async getAvailableYears(userId: string) {
    const years = await convex.query(api.yearlyReviews.getAvailableYears, {
      userId,
    });

    return years;
  },

  /**
   * Generate yearly review for a specific year
   */
  async generate(userId: string, year: number) {
    const reviewId = await convex.mutation(api.yearlyReviews.generate, {
      userId,
      year,
    });

    // Fetch the generated review
    const review = await convex.query(api.yearlyReviews.getByYear, {
      userId,
      year,
    });

    return review;
  },

  /**
   * Add a memory to yearly review
   */
  async addMemory(
    userId: string,
    year: number,
    text: string,
    itineraryId?: string,
    imageUrl?: string
  ) {
    await convex.mutation(api.yearlyReviews.addMemory, {
      userId,
      year,
      text,
      itineraryId: itineraryId as any,
      imageUrl,
    });

    // Fetch the updated review
    const review = await convex.query(api.yearlyReviews.getByYear, {
      userId,
      year,
    });

    return review;
  },

  /**
   * Delete yearly review
   */
  async remove(userId: string, year: number) {
    await convex.mutation(api.yearlyReviews.remove, {
      userId,
      year,
    });
  },
};
