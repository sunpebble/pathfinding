/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Activity Feed - Queries and Mutations
 * Handles social activity feed for itinerary sharing and community engagement
 */

// Activity type validators
const activityTypeValidator = v.union(
  v.literal("new_itinerary"),
  v.literal("update_itinerary"),
  v.literal("like_itinerary"),
  v.literal("comment_itinerary"),
  v.literal("copy_itinerary"),
  v.literal("follow_user"),
);

const visibilityValidator = v.union(
  v.literal("public"),
  v.literal("followers"),
);

// ============================================
// Queries
// ============================================

/**
 * Get personalized feed for authenticated user
 * Combines activities from followed users and recommended/trending content
 */
export const getFollowingFeed = query({
  args: {
    userId: v.string(),
    cursor: v.optional(v.number()), // Unix timestamp for pagination
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const cursor = args.cursor ?? Date.now();

    // Get list of users this user follows
    const follows = await ctx.db
      .query("userFollows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();

    const followingIds = follows.map((f) => f.followingId);

    // If user doesn't follow anyone, return empty feed
    if (followingIds.length === 0) {
      return {
        activities: [],
        hasMore: false,
        nextCursor: null,
      };
    }

    // Query activities from followed users
    // Since Convex doesn't support IN queries, we need to fetch and filter
    const allActivities = await ctx.db
      .query("activityFeed")
      .withIndex("by_created")
      .order("desc")
      .filter((q) => q.lt(q.field("createdAt"), cursor))
      .take(limit * 5); // Fetch more to account for filtering

    // Filter to only include activities from followed users
    const filteredActivities = allActivities
      .filter((activity) => followingIds.includes(activity.actorId))
      .slice(0, limit + 1);

    const hasMore = filteredActivities.length > limit;
    const activities = filteredActivities.slice(0, limit);

    return {
      activities,
      hasMore,
      nextCursor:
        activities.length > 0
          ? activities[activities.length - 1].createdAt
          : null,
    };
  },
});

/**
 * Get public/trending feed (no authentication required)
 * Returns popular and recent public activities
 */
export const getPublicFeed = query({
  args: {
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
    activityType: v.optional(activityTypeValidator),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const cursor = args.cursor ?? Date.now();

    let activitiesQuery = ctx.db
      .query("activityFeed")
      .withIndex("by_visibility_created", (q) => q.eq("visibility", "public"))
      .order("desc")
      .filter((q) => q.lt(q.field("createdAt"), cursor));

    // Apply activity type filter if provided
    if (args.activityType) {
      activitiesQuery = activitiesQuery.filter((q) =>
        q.eq(q.field("activityType"), args.activityType),
      );
    }

    const activities = await activitiesQuery.take(limit + 1);

    const hasMore = activities.length > limit;
    const data = activities.slice(0, limit);

    return {
      activities: data,
      hasMore,
      nextCursor: data.length > 0 ? data[data.length - 1].createdAt : null,
    };
  },
});

/**
 * Get recommended/trending itineraries
 * Based on engagement metrics (likes, comments, copies)
 */
export const getTrendingFeed = query({
  args: {
    limit: v.optional(v.number()),
    timeWindowDays: v.optional(v.number()), // Look back period
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const timeWindowDays = args.timeWindowDays ?? 7;
    const cutoffTime = Date.now() - timeWindowDays * 24 * 60 * 60 * 1000;

    // Get recent public activities for new itineraries
    const activities = await ctx.db
      .query("activityFeed")
      .withIndex("by_visibility_created", (q) => q.eq("visibility", "public"))
      .order("desc")
      .filter((q) =>
        q.and(
          q.gt(q.field("createdAt"), cutoffTime),
          q.eq(q.field("activityType"), "new_itinerary"),
        ),
      )
      .take(limit * 3);

    // Calculate engagement score and sort
    const scoredActivities = activities.map((activity) => ({
      ...activity,
      engagementScore:
        (activity.likesCount || 0) * 2 + (activity.commentsCount || 0) * 3,
    }));

    scoredActivities.sort((a, b) => b.engagementScore - a.engagementScore);

    return {
      activities: scoredActivities.slice(0, limit),
    };
  },
});

/**
 * Get activities for a specific user's profile
 */
export const getUserActivities = query({
  args: {
    userId: v.string(),
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
    activityType: v.optional(activityTypeValidator),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const cursor = args.cursor ?? Date.now();

    let query = ctx.db
      .query("activityFeed")
      .withIndex("by_actor_created", (q) => q.eq("actorId", args.userId))
      .order("desc")
      .filter((q) => q.lt(q.field("createdAt"), cursor));

    if (args.activityType) {
      query = query.filter((q) =>
        q.eq(q.field("activityType"), args.activityType),
      );
    }

    const activities = await query.take(limit + 1);

    const hasMore = activities.length > limit;
    const data = activities.slice(0, limit);

    return {
      activities: data,
      hasMore,
      nextCursor: data.length > 0 ? data[data.length - 1].createdAt : null,
    };
  },
});

// ============================================
// Mutations
// ============================================

/**
 * Create a new activity (called when user performs an action)
 */
export const createActivity = mutation({
  args: {
    actorId: v.string(),
    actorName: v.optional(v.string()),
    actorAvatarUrl: v.optional(v.string()),
    activityType: activityTypeValidator,
    targetType: v.union(v.literal("itinerary"), v.literal("user")),
    targetId: v.string(),
    targetTitle: v.optional(v.string()),
    targetCoverImageUrl: v.optional(v.string()),
    targetUserName: v.optional(v.string()),
    targetCityName: v.optional(v.string()),
    visibility: v.optional(visibilityValidator),
  },
  handler: async (ctx, args) => {
    const activityId = await ctx.db.insert("activityFeed", {
      actorId: args.actorId,
      actorName: args.actorName,
      actorAvatarUrl: args.actorAvatarUrl,
      activityType: args.activityType,
      targetType: args.targetType,
      targetId: args.targetId,
      targetTitle: args.targetTitle,
      targetCoverImageUrl: args.targetCoverImageUrl,
      targetUserName: args.targetUserName,
      targetCityName: args.targetCityName,
      likesCount: 0,
      commentsCount: 0,
      visibility: args.visibility ?? "public",
      createdAt: Date.now(),
    });

    return activityId;
  },
});

/**
 * Update activity engagement counts
 */
export const updateActivityEngagement = mutation({
  args: {
    targetType: v.union(v.literal("itinerary"), v.literal("user")),
    targetId: v.string(),
    likesIncrement: v.optional(v.number()),
    commentsIncrement: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Find the most recent activity for this target
    const activity = await ctx.db
      .query("activityFeed")
      .withIndex("by_target", (q) =>
        q.eq("targetType", args.targetType).eq("targetId", args.targetId),
      )
      .order("desc")
      .first();

    if (activity) {
      await ctx.db.patch(activity._id, {
        likesCount: (activity.likesCount || 0) + (args.likesIncrement || 0),
        commentsCount:
          (activity.commentsCount || 0) + (args.commentsIncrement || 0),
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Delete an activity (e.g., when an itinerary is deleted)
 */
export const deleteActivity = mutation({
  args: {
    activityId: v.id("activityFeed"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.activityId);
  },
});

/**
 * Delete activities for a target (e.g., when an itinerary is deleted)
 */
export const deleteActivitiesForTarget = mutation({
  args: {
    targetType: v.union(v.literal("itinerary"), v.literal("user")),
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("activityFeed")
      .withIndex("by_target", (q) =>
        q.eq("targetType", args.targetType).eq("targetId", args.targetId),
      )
      .collect();

    for (const activity of activities) {
      await ctx.db.delete(activity._id);
    }
  },
});

// ============================================
// User Follow Mutations
// ============================================

/**
 * Follow a user
 */
export const followUser = mutation({
  args: {
    followerId: v.string(),
    followingId: v.string(),
    followerName: v.optional(v.string()),
    followerAvatarUrl: v.optional(v.string()),
    followingName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already following
    const existing = await ctx.db
      .query("userFollows")
      .withIndex("by_follower_following", (q) =>
        q.eq("followerId", args.followerId).eq("followingId", args.followingId),
      )
      .first();

    if (existing) {
      return { alreadyFollowing: true, followId: existing._id };
    }

    // Create follow relationship
    const followId = await ctx.db.insert("userFollows", {
      followerId: args.followerId,
      followingId: args.followingId,
      createdAt: Date.now(),
    });

    // Update follower/following counts on profiles
    const followerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_email")
      .filter((q) => q.eq(q.field("email"), args.followerId))
      .first();

    const followingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_email")
      .filter((q) => q.eq(q.field("email"), args.followingId))
      .first();

    if (followerProfile) {
      await ctx.db.patch(followerProfile._id, {
        followingCount: (followerProfile.followingCount || 0) + 1,
      });
    }

    if (followingProfile) {
      await ctx.db.patch(followingProfile._id, {
        followersCount: (followingProfile.followersCount || 0) + 1,
      });
    }

    // Create activity for the follow action
    await ctx.db.insert("activityFeed", {
      actorId: args.followerId,
      actorName: args.followerName,
      actorAvatarUrl: args.followerAvatarUrl,
      activityType: "follow_user",
      targetType: "user",
      targetId: args.followingId,
      targetUserName: args.followingName,
      likesCount: 0,
      commentsCount: 0,
      visibility: "followers",
      createdAt: Date.now(),
    });

    // Create notification for the followed user
    await ctx.db.insert("notifications", {
      userId: args.followingId,
      type: "new_follower",
      referenceType: "user",
      referenceId: args.followerId,
      actorId: args.followerId,
      message: `${args.followerName || "用户"} 关注了你`,
      isRead: false,
      createdAt: Date.now(),
    });

    return { alreadyFollowing: false, followId };
  },
});

/**
 * Unfollow a user
 */
export const unfollowUser = mutation({
  args: {
    followerId: v.string(),
    followingId: v.string(),
  },
  handler: async (ctx, args) => {
    const follow = await ctx.db
      .query("userFollows")
      .withIndex("by_follower_following", (q) =>
        q.eq("followerId", args.followerId).eq("followingId", args.followingId),
      )
      .first();

    if (!follow) {
      return { wasFollowing: false };
    }

    await ctx.db.delete(follow._id);

    // Update follower/following counts on profiles
    const followerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_email")
      .filter((q) => q.eq(q.field("email"), args.followerId))
      .first();

    const followingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_email")
      .filter((q) => q.eq(q.field("email"), args.followingId))
      .first();

    if (followerProfile && (followerProfile.followingCount || 0) > 0) {
      await ctx.db.patch(followerProfile._id, {
        followingCount: (followerProfile.followingCount || 0) - 1,
      });
    }

    if (followingProfile && (followingProfile.followersCount || 0) > 0) {
      await ctx.db.patch(followingProfile._id, {
        followersCount: (followingProfile.followersCount || 0) - 1,
      });
    }

    return { wasFollowing: true };
  },
});

/**
 * Check if user is following another user
 */
export const isFollowing = query({
  args: {
    followerId: v.string(),
    followingId: v.string(),
  },
  handler: async (ctx, args) => {
    const follow = await ctx.db
      .query("userFollows")
      .withIndex("by_follower_following", (q) =>
        q.eq("followerId", args.followerId).eq("followingId", args.followingId),
      )
      .first();

    return { isFollowing: !!follow };
  },
});

/**
 * Get followers for a user
 */
export const getFollowers = query({
  args: {
    userId: v.string(),
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const cursor = args.cursor ?? Date.now();

    const follows = await ctx.db
      .query("userFollows")
      .withIndex("by_following", (q) => q.eq("followingId", args.userId))
      .order("desc")
      .filter((q) => q.lt(q.field("createdAt"), cursor))
      .take(limit + 1);

    const hasMore = follows.length > limit;
    const data = follows.slice(0, limit);

    // Enrich with profile data
    const enrichedFollows = await Promise.all(
      data.map(async (follow) => {
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("email"), follow.followerId))
          .first();

        return {
          ...follow,
          followerProfile: profile
            ? {
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
                bio: profile.bio,
              }
            : null,
        };
      }),
    );

    return {
      followers: enrichedFollows,
      hasMore,
      nextCursor: data.length > 0 ? data[data.length - 1].createdAt : null,
    };
  },
});

/**
 * Get users that a user is following
 */
export const getFollowing = query({
  args: {
    userId: v.string(),
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const cursor = args.cursor ?? Date.now();

    const follows = await ctx.db
      .query("userFollows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .order("desc")
      .filter((q) => q.lt(q.field("createdAt"), cursor))
      .take(limit + 1);

    const hasMore = follows.length > limit;
    const data = follows.slice(0, limit);

    // Enrich with profile data
    const enrichedFollows = await Promise.all(
      data.map(async (follow) => {
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("email"), follow.followingId))
          .first();

        return {
          ...follow,
          followingProfile: profile
            ? {
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
                bio: profile.bio,
              }
            : null,
        };
      }),
    );

    return {
      following: enrichedFollows,
      hasMore,
      nextCursor: data.length > 0 ? data[data.length - 1].createdAt : null,
    };
  },
});
