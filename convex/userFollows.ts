import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * User Follows - Social Relationship Management
 * Handles follow/unfollow operations, follower/following lists, and mutual follow detection
 */

// Follow a user
export const follow = mutation({
  args: {
    followerId: v.string(),
    followingId: v.string(),
  },
  handler: async (ctx, args) => {
    // Prevent self-follow
    if (args.followerId === args.followingId) {
      throw new Error('Cannot follow yourself');
    }

    // Check if already following
    const existing = await ctx.db
      .query('userFollows')
      .withIndex('by_follower_following', (q) =>
        q.eq('followerId', args.followerId).eq('followingId', args.followingId)
      )
      .first();

    if (existing) {
      throw new Error('Already following this user');
    }

    // Create follow relationship
    const followId = await ctx.db.insert('userFollows', {
      followerId: args.followerId,
      followingId: args.followingId,
      createdAt: Date.now(),
    });

    // Update follower's followingCount
    const followerProfile = await ctx.db
      .query('profiles')
      .withIndex('by_email', (q) => q.eq('email', args.followerId))
      .first();

    if (followerProfile) {
      await ctx.db.patch(followerProfile._id, {
        followingCount: (followerProfile.followingCount ?? 0) + 1,
      });
    }

    // Update following's followersCount
    const followingProfile = await ctx.db
      .query('profiles')
      .withIndex('by_email', (q) => q.eq('email', args.followingId))
      .first();

    if (followingProfile) {
      await ctx.db.patch(followingProfile._id, {
        followersCount: (followingProfile.followersCount ?? 0) + 1,
      });
    }

    // Create notification for the followed user
    await ctx.db.insert('notifications', {
      userId: args.followingId,
      type: 'new_follower',
      referenceType: 'user',
      referenceId: args.followerId,
      actorId: args.followerId,
      message: '关注了你',
      isRead: false,
      createdAt: Date.now(),
    });

    return followId;
  },
});

// Unfollow a user
export const unfollow = mutation({
  args: {
    followerId: v.string(),
    followingId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the follow relationship
    const existing = await ctx.db
      .query('userFollows')
      .withIndex('by_follower_following', (q) =>
        q.eq('followerId', args.followerId).eq('followingId', args.followingId)
      )
      .first();

    if (!existing) {
      throw new Error('Not following this user');
    }

    // Delete follow relationship
    await ctx.db.delete(existing._id);

    // Update follower's followingCount
    const followerProfile = await ctx.db
      .query('profiles')
      .withIndex('by_email', (q) => q.eq('email', args.followerId))
      .first();

    if (followerProfile && (followerProfile.followingCount ?? 0) > 0) {
      await ctx.db.patch(followerProfile._id, {
        followingCount: (followerProfile.followingCount ?? 1) - 1,
      });
    }

    // Update following's followersCount
    const followingProfile = await ctx.db
      .query('profiles')
      .withIndex('by_email', (q) => q.eq('email', args.followingId))
      .first();

    if (followingProfile && (followingProfile.followersCount ?? 0) > 0) {
      await ctx.db.patch(followingProfile._id, {
        followersCount: (followingProfile.followersCount ?? 1) - 1,
      });
    }
  },
});

// Check if user A is following user B
export const isFollowing = query({
  args: {
    followerId: v.string(),
    followingId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('userFollows')
      .withIndex('by_follower_following', (q) =>
        q.eq('followerId', args.followerId).eq('followingId', args.followingId)
      )
      .first();

    return existing !== null;
  },
});

// Check mutual follow status between two users
export const getMutualFollowStatus = query({
  args: {
    userIdA: v.string(),
    userIdB: v.string(),
  },
  handler: async (ctx, args) => {
    const aFollowsB = await ctx.db
      .query('userFollows')
      .withIndex('by_follower_following', (q) =>
        q.eq('followerId', args.userIdA).eq('followingId', args.userIdB)
      )
      .first();

    const bFollowsA = await ctx.db
      .query('userFollows')
      .withIndex('by_follower_following', (q) =>
        q.eq('followerId', args.userIdB).eq('followingId', args.userIdA)
      )
      .first();

    return {
      aFollowsB: aFollowsB !== null,
      bFollowsA: bFollowsA !== null,
      isMutual: aFollowsB !== null && bFollowsA !== null,
    };
  },
});

// Get followers list for a user
export const getFollowers = query({
  args: {
    userId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    currentUserId: v.optional(v.string()), // To check if current user follows each follower
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    // Get all followers
    const follows = await ctx.db
      .query('userFollows')
      .withIndex('by_following', (q) => q.eq('followingId', args.userId))
      .order('desc')
      .collect();

    const total = follows.length;
    const paginatedFollows = follows.slice(offset, offset + pageSize);

    // Enrich with profile data and follow status
    const enrichedFollowers = await Promise.all(
      paginatedFollows.map(async (follow) => {
        const profile = await ctx.db
          .query('profiles')
          .withIndex('by_email', (q) => q.eq('email', follow.followerId))
          .first();

        // Check if current user follows this follower
        let isFollowedByCurrentUser = false;
        let isMutual = false;

        if (args.currentUserId && args.currentUserId !== follow.followerId) {
          const currentUserFollows = await ctx.db
            .query('userFollows')
            .withIndex('by_follower_following', (q) =>
              q
                .eq('followerId', args.currentUserId!)
                .eq('followingId', follow.followerId)
            )
            .first();
          isFollowedByCurrentUser = currentUserFollows !== null;

          // Check if this follower follows the current user back
          if (args.currentUserId === args.userId) {
            isMutual = isFollowedByCurrentUser;
          }
        }

        return {
          id: follow.followerId,
          displayName: profile?.displayName,
          avatarUrl: profile?.avatarUrl,
          bio: profile?.bio,
          followersCount: profile?.followersCount ?? 0,
          followingCount: profile?.followingCount ?? 0,
          followedAt: follow.createdAt,
          isFollowedByCurrentUser,
          isMutual,
        };
      })
    );

    return {
      data: enrichedFollowers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },
});

// Get following list for a user
export const getFollowing = query({
  args: {
    userId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    currentUserId: v.optional(v.string()), // To check if current user follows each user
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    // Get all following
    const follows = await ctx.db
      .query('userFollows')
      .withIndex('by_follower', (q) => q.eq('followerId', args.userId))
      .order('desc')
      .collect();

    const total = follows.length;
    const paginatedFollows = follows.slice(offset, offset + pageSize);

    // Enrich with profile data and follow status
    const enrichedFollowing = await Promise.all(
      paginatedFollows.map(async (follow) => {
        const profile = await ctx.db
          .query('profiles')
          .withIndex('by_email', (q) => q.eq('email', follow.followingId))
          .first();

        // Check if current user follows this user
        let isFollowedByCurrentUser = false;
        let isMutual = false;

        if (args.currentUserId) {
          if (args.currentUserId === args.userId) {
            // Viewing own following list - all are followed by current user
            isFollowedByCurrentUser = true;

            // Check if they follow back
            const followsBack = await ctx.db
              .query('userFollows')
              .withIndex('by_follower_following', (q) =>
                q
                  .eq('followerId', follow.followingId)
                  .eq('followingId', args.userId)
              )
              .first();
            isMutual = followsBack !== null;
          } else if (args.currentUserId !== follow.followingId) {
            const currentUserFollows = await ctx.db
              .query('userFollows')
              .withIndex('by_follower_following', (q) =>
                q
                  .eq('followerId', args.currentUserId!)
                  .eq('followingId', follow.followingId)
              )
              .first();
            isFollowedByCurrentUser = currentUserFollows !== null;
          }
        }

        return {
          id: follow.followingId,
          displayName: profile?.displayName,
          avatarUrl: profile?.avatarUrl,
          bio: profile?.bio,
          followersCount: profile?.followersCount ?? 0,
          followingCount: profile?.followingCount ?? 0,
          followedAt: follow.createdAt,
          isFollowedByCurrentUser,
          isMutual,
        };
      })
    );

    return {
      data: enrichedFollowing,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },
});

// Get follow statistics for a user
export const getFollowStats = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_email', (q) => q.eq('email', args.userId))
      .first();

    return {
      followersCount: profile?.followersCount ?? 0,
      followingCount: profile?.followingCount ?? 0,
    };
  },
});

// Get itineraries from followed users (feed)
export const getFollowingFeed = query({
  args: {
    userId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    // Get all users that the current user follows
    const following = await ctx.db
      .query('userFollows')
      .withIndex('by_follower', (q) => q.eq('followerId', args.userId))
      .collect();

    const followingIds = following.map((f) => f.followingId);

    if (followingIds.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    // Get public itineraries from followed users
    const allItineraries = await ctx.db
      .query('itineraries')
      .withIndex('by_visibility', (q) => q.eq('visibility', 'public'))
      .order('desc')
      .collect();

    // Filter to only include itineraries from followed users
    const feedItineraries = allItineraries.filter((itinerary) =>
      followingIds.includes(itinerary.userId)
    );

    const total = feedItineraries.length;
    const paginatedItineraries = feedItineraries.slice(
      offset,
      offset + pageSize
    );

    // Enrich with city and user data
    const enrichedItineraries = await Promise.all(
      paginatedItineraries.map(async (itinerary) => {
        const city = await ctx.db.get(itinerary.cityId);
        const userProfile = await ctx.db
          .query('profiles')
          .withIndex('by_email', (q) => q.eq('email', itinerary.userId))
          .first();

        const daysCount = calculateDaysCount(
          itinerary.startDate,
          itinerary.endDate
        );

        return {
          ...itinerary,
          cityName: city?.name,
          daysCount,
          author: {
            id: itinerary.userId,
            displayName: userProfile?.displayName,
            avatarUrl: userProfile?.avatarUrl,
          },
        };
      })
    );

    return {
      data: enrichedItineraries,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },
});

// Helper function
function calculateDaysCount(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
}

// Get mutual followers (users who follow each other)
export const getMutualFollowers = query({
  args: {
    userId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    // Get all users that the current user follows
    const following = await ctx.db
      .query('userFollows')
      .withIndex('by_follower', (q) => q.eq('followerId', args.userId))
      .collect();

    const followingIds = new Set(following.map((f) => f.followingId));

    // Get all users that follow the current user
    const followers = await ctx.db
      .query('userFollows')
      .withIndex('by_following', (q) => q.eq('followingId', args.userId))
      .collect();

    // Find mutual follows (intersection)
    const mutualFollows = followers.filter((f) =>
      followingIds.has(f.followerId)
    );

    const total = mutualFollows.length;
    const paginatedMutuals = mutualFollows.slice(offset, offset + pageSize);

    // Enrich with profile data
    const enrichedMutuals = await Promise.all(
      paginatedMutuals.map(async (follow) => {
        const profile = await ctx.db
          .query('profiles')
          .withIndex('by_email', (q) => q.eq('email', follow.followerId))
          .first();

        return {
          id: follow.followerId,
          displayName: profile?.displayName,
          avatarUrl: profile?.avatarUrl,
          bio: profile?.bio,
          followersCount: profile?.followersCount ?? 0,
          followingCount: profile?.followingCount ?? 0,
          followedAt: follow.createdAt,
        };
      })
    );

    return {
      data: enrichedMutuals,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },
});

// Get follow recommendations based on various signals
export const getFollowRecommendations = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    // Get users the current user already follows
    const following = await ctx.db
      .query('userFollows')
      .withIndex('by_follower', (q) => q.eq('followerId', args.userId))
      .collect();

    const followingIds = new Set(following.map((f) => f.followingId));
    followingIds.add(args.userId); // Exclude self

    // Strategy 1: Friends of friends (users followed by people you follow)
    const friendsOfFriends: Map<string, { count: number; source: string }> =
      new Map();

    for (const follow of following) {
      const theirFollowing = await ctx.db
        .query('userFollows')
        .withIndex('by_follower', (q) => q.eq('followerId', follow.followingId))
        .take(50); // Limit to prevent too many queries

      for (const ff of theirFollowing) {
        if (!followingIds.has(ff.followingId)) {
          const existing = friendsOfFriends.get(ff.followingId);
          if (existing) {
            existing.count += 1;
          } else {
            friendsOfFriends.set(ff.followingId, {
              count: 1,
              source: 'friends_of_friends',
            });
          }
        }
      }
    }

    // Strategy 2: Popular users (users with high follower counts)
    const allProfiles = await ctx.db.query('profiles').collect();

    const popularUsers = allProfiles
      .filter((p) => !followingIds.has(p.email) && (p.followersCount ?? 0) > 0)
      .sort((a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0))
      .slice(0, 20);

    // Strategy 3: Active content creators (users with recent itineraries)
    const recentActivities = await ctx.db
      .query('activityFeed')
      .withIndex('by_type', (q) => q.eq('activityType', 'new_itinerary'))
      .order('desc')
      .take(100);

    const activeCreators: Map<string, number> = new Map();
    for (const activity of recentActivities) {
      if (!followingIds.has(activity.actorId)) {
        activeCreators.set(
          activity.actorId,
          (activeCreators.get(activity.actorId) ?? 0) + 1
        );
      }
    }

    // Combine and score recommendations
    const recommendations: Map<string, { score: number; reasons: string[] }> =
      new Map();

    // Add friends of friends with high weight
    for (const [userId, data] of friendsOfFriends) {
      const existing = recommendations.get(userId) ?? { score: 0, reasons: [] };
      existing.score += data.count * 3; // Weight: 3 per mutual connection
      existing.reasons.push(`${data.count}位共同关注`);
      recommendations.set(userId, existing);
    }

    // Add popular users
    for (const profile of popularUsers) {
      const existing = recommendations.get(profile.email) ?? {
        score: 0,
        reasons: [],
      };
      existing.score += Math.min((profile.followersCount ?? 0) / 10, 5); // Cap at 5 points
      existing.reasons.push('热门用户');
      recommendations.set(profile.email, existing);
    }

    // Add active creators
    for (const [userId, activityCount] of activeCreators) {
      const existing = recommendations.get(userId) ?? { score: 0, reasons: [] };
      existing.score += activityCount * 2; // Weight: 2 per recent activity
      existing.reasons.push('活跃创作者');
      recommendations.set(userId, existing);
    }

    // Sort by score and take top recommendations
    const sortedRecommendations = Array.from(recommendations.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, limit);

    // Enrich with profile data
    const enrichedRecommendations = await Promise.all(
      sortedRecommendations.map(async ([userId, data]) => {
        const profile = await ctx.db
          .query('profiles')
          .withIndex('by_email', (q) => q.eq('email', userId))
          .first();

        // Check if this user follows the current user
        const followsBack = await ctx.db
          .query('userFollows')
          .withIndex('by_follower_following', (q) =>
            q.eq('followerId', userId).eq('followingId', args.userId)
          )
          .first();

        return {
          id: userId,
          displayName: profile?.displayName,
          avatarUrl: profile?.avatarUrl,
          bio: profile?.bio,
          followersCount: profile?.followersCount ?? 0,
          followingCount: profile?.followingCount ?? 0,
          score: data.score,
          reasons: data.reasons,
          followsYou: followsBack !== null,
        };
      })
    );

    return {
      data: enrichedRecommendations.filter((r) => r.displayName), // Filter out users without profiles
    };
  },
});

// Batch check follow status for multiple users
export const batchCheckFollowStatus = query({
  args: {
    userId: v.string(),
    targetUserIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const results: Record<
      string,
      { isFollowing: boolean; isFollowedBy: boolean; isMutual: boolean }
    > = {};

    for (const targetId of args.targetUserIds) {
      const isFollowing = await ctx.db
        .query('userFollows')
        .withIndex('by_follower_following', (q) =>
          q.eq('followerId', args.userId).eq('followingId', targetId)
        )
        .first();

      const isFollowedBy = await ctx.db
        .query('userFollows')
        .withIndex('by_follower_following', (q) =>
          q.eq('followerId', targetId).eq('followingId', args.userId)
        )
        .first();

      results[targetId] = {
        isFollowing: isFollowing !== null,
        isFollowedBy: isFollowedBy !== null,
        isMutual: isFollowing !== null && isFollowedBy !== null,
      };
    }

    return results;
  },
});
