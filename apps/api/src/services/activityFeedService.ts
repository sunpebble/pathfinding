/**
 * Activity Feed Service - Convex Implementation
 * CRUD operations for social activity feed
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';

// Types
export type ActivityType =
  | 'new_itinerary'
  | 'update_itinerary'
  | 'like_itinerary'
  | 'comment_itinerary'
  | 'copy_itinerary'
  | 'follow_user';

export type Visibility = 'public' | 'followers';

export interface Activity {
  _id: string;
  actorId: string;
  actorName?: string;
  actorAvatarUrl?: string;
  activityType: ActivityType;
  targetType: 'itinerary' | 'user';
  targetId: string;
  targetTitle?: string;
  targetCoverImageUrl?: string;
  targetUserName?: string;
  targetCityName?: string;
  likesCount: number;
  commentsCount: number;
  visibility: Visibility;
  createdAt: number;
  updatedAt?: number;
}

export interface FeedQuery {
  cursor?: number;
  limit?: number;
  activityType?: ActivityType;
}

export interface CreateActivityInput {
  actorId: string;
  actorName?: string;
  actorAvatarUrl?: string;
  activityType: ActivityType;
  targetType: 'itinerary' | 'user';
  targetId: string;
  targetTitle?: string;
  targetCoverImageUrl?: string;
  targetUserName?: string;
  targetCityName?: string;
  visibility?: Visibility;
}

/**
 * Activity Feed Service
 */
export const ActivityFeedService = {
  /**
   * Get personalized feed for authenticated user (from followed users)
   */
  async getFollowingFeed(userId: string, query: FeedQuery) {
    const result = await convex.query(api.activityFeed.getFollowingFeed, {
      userId,
      cursor: query.cursor,
      limit: query.limit,
    });

    return result;
  },

  /**
   * Get public/trending feed (no auth required)
   */
  async getPublicFeed(query: FeedQuery) {
    const result = await convex.query(api.activityFeed.getPublicFeed, {
      cursor: query.cursor,
      limit: query.limit,
      activityType: query.activityType,
    });

    return result;
  },

  /**
   * Get trending/recommended itineraries
   */
  async getTrendingFeed(limit?: number, timeWindowDays?: number) {
    const result = await convex.query(api.activityFeed.getTrendingFeed, {
      limit,
      timeWindowDays,
    });

    return result;
  },

  /**
   * Get activities for a specific user's profile
   */
  async getUserActivities(userId: string, query: FeedQuery) {
    const result = await convex.query(api.activityFeed.getUserActivities, {
      userId,
      cursor: query.cursor,
      limit: query.limit,
      activityType: query.activityType,
    });

    return result;
  },

  /**
   * Create a new activity
   */
  async createActivity(input: CreateActivityInput) {
    const activityId = await convex.mutation(api.activityFeed.createActivity, {
      actorId: input.actorId,
      actorName: input.actorName,
      actorAvatarUrl: input.actorAvatarUrl,
      activityType: input.activityType,
      targetType: input.targetType,
      targetId: input.targetId,
      targetTitle: input.targetTitle,
      targetCoverImageUrl: input.targetCoverImageUrl,
      targetUserName: input.targetUserName,
      targetCityName: input.targetCityName,
      visibility: input.visibility,
    });

    return activityId;
  },

  /**
   * Update activity engagement counts
   */
  async updateActivityEngagement(
    targetType: 'itinerary' | 'user',
    targetId: string,
    likesIncrement?: number,
    commentsIncrement?: number
  ) {
    await convex.mutation(api.activityFeed.updateActivityEngagement, {
      targetType,
      targetId,
      likesIncrement,
      commentsIncrement,
    });
  },

  /**
   * Delete activities for a target
   */
  async deleteActivitiesForTarget(
    targetType: 'itinerary' | 'user',
    targetId: string
  ) {
    await convex.mutation(api.activityFeed.deleteActivitiesForTarget, {
      targetType,
      targetId,
    });
  },

  /**
   * Follow a user
   */
  async followUser(
    followerId: string,
    followingId: string,
    followerName?: string,
    followerAvatarUrl?: string,
    followingName?: string
  ) {
    const result = await convex.mutation(api.activityFeed.followUser, {
      followerId,
      followingId,
      followerName,
      followerAvatarUrl,
      followingName,
    });

    return result;
  },

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followingId: string) {
    const result = await convex.mutation(api.activityFeed.unfollowUser, {
      followerId,
      followingId,
    });

    return result;
  },

  /**
   * Check if user is following another user
   */
  async isFollowing(followerId: string, followingId: string) {
    const result = await convex.query(api.activityFeed.isFollowing, {
      followerId,
      followingId,
    });

    return result.isFollowing;
  },

  /**
   * Get followers for a user
   */
  async getFollowers(userId: string, cursor?: number, limit?: number) {
    const result = await convex.query(api.activityFeed.getFollowers, {
      userId,
      cursor,
      limit,
    });

    return result;
  },

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string, cursor?: number, limit?: number) {
    const result = await convex.query(api.activityFeed.getFollowing, {
      userId,
      cursor,
      limit,
    });

    return result;
  },
};
