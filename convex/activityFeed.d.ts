/**
 * Get personalized feed for authenticated user
 * Combines activities from followed users and recommended/trending content
 */
export declare const getFollowingFeed: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cursor?: number | undefined;
    userId: string;
}, Promise<{
    activities: {
        _id: import("convex/values").GenericId<"activityFeed">;
        _creationTime: number;
        actorName?: string | undefined;
        actorAvatarUrl?: string | undefined;
        targetTitle?: string | undefined;
        targetCoverImageUrl?: string | undefined;
        targetUserName?: string | undefined;
        targetCityName?: string | undefined;
        updatedAt?: number | undefined;
        createdAt: number;
        actorId: string;
        activityType: "new_itinerary" | "update_itinerary" | "like_itinerary" | "comment_itinerary" | "copy_itinerary" | "follow_user";
        targetType: "user" | "itinerary";
        targetId: string;
        likesCount: number;
        commentsCount: number;
        visibility: "public" | "followers";
    }[];
    hasMore: boolean;
    nextCursor: number | null;
}>>;
/**
 * Get public/trending feed (no authentication required)
 * Returns popular and recent public activities
 */
export declare const getPublicFeed: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    activityType?: "new_itinerary" | "update_itinerary" | "like_itinerary" | "comment_itinerary" | "copy_itinerary" | "follow_user" | undefined;
    cursor?: number | undefined;
}, Promise<{
    activities: {
        _id: import("convex/values").GenericId<"activityFeed">;
        _creationTime: number;
        actorName?: string | undefined;
        actorAvatarUrl?: string | undefined;
        targetTitle?: string | undefined;
        targetCoverImageUrl?: string | undefined;
        targetUserName?: string | undefined;
        targetCityName?: string | undefined;
        updatedAt?: number | undefined;
        createdAt: number;
        actorId: string;
        activityType: "new_itinerary" | "update_itinerary" | "like_itinerary" | "comment_itinerary" | "copy_itinerary" | "follow_user";
        targetType: "user" | "itinerary";
        targetId: string;
        likesCount: number;
        commentsCount: number;
        visibility: "public" | "followers";
    }[];
    hasMore: boolean;
    nextCursor: number | null;
}>>;
/**
 * Get recommended/trending itineraries
 * Based on engagement metrics (likes, comments, copies)
 */
export declare const getTrendingFeed: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    timeWindowDays?: number | undefined;
}, Promise<{
    activities: {
        engagementScore: number;
        _id: import("convex/values").GenericId<"activityFeed">;
        _creationTime: number;
        actorName?: string | undefined;
        actorAvatarUrl?: string | undefined;
        targetTitle?: string | undefined;
        targetCoverImageUrl?: string | undefined;
        targetUserName?: string | undefined;
        targetCityName?: string | undefined;
        updatedAt?: number | undefined;
        createdAt: number;
        actorId: string;
        activityType: "new_itinerary" | "update_itinerary" | "like_itinerary" | "comment_itinerary" | "copy_itinerary" | "follow_user";
        targetType: "user" | "itinerary";
        targetId: string;
        likesCount: number;
        commentsCount: number;
        visibility: "public" | "followers";
    }[];
}>>;
/**
 * Get activities for a specific user's profile
 */
export declare const getUserActivities: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    activityType?: "new_itinerary" | "update_itinerary" | "like_itinerary" | "comment_itinerary" | "copy_itinerary" | "follow_user" | undefined;
    cursor?: number | undefined;
    userId: string;
}, Promise<{
    activities: {
        _id: import("convex/values").GenericId<"activityFeed">;
        _creationTime: number;
        actorName?: string | undefined;
        actorAvatarUrl?: string | undefined;
        targetTitle?: string | undefined;
        targetCoverImageUrl?: string | undefined;
        targetUserName?: string | undefined;
        targetCityName?: string | undefined;
        updatedAt?: number | undefined;
        createdAt: number;
        actorId: string;
        activityType: "new_itinerary" | "update_itinerary" | "like_itinerary" | "comment_itinerary" | "copy_itinerary" | "follow_user";
        targetType: "user" | "itinerary";
        targetId: string;
        likesCount: number;
        commentsCount: number;
        visibility: "public" | "followers";
    }[];
    hasMore: boolean;
    nextCursor: number | null;
}>>;
/**
 * Create a new activity (called when user performs an action)
 */
export declare const createActivity: import("convex/server").RegisteredMutation<"public", {
    actorName?: string | undefined;
    actorAvatarUrl?: string | undefined;
    targetTitle?: string | undefined;
    targetCoverImageUrl?: string | undefined;
    targetUserName?: string | undefined;
    targetCityName?: string | undefined;
    visibility?: "public" | "followers" | undefined;
    actorId: string;
    activityType: "new_itinerary" | "update_itinerary" | "like_itinerary" | "comment_itinerary" | "copy_itinerary" | "follow_user";
    targetType: "user" | "itinerary";
    targetId: string;
}, Promise<import("convex/values").GenericId<"activityFeed">>>;
/**
 * Update activity engagement counts
 */
export declare const updateActivityEngagement: import("convex/server").RegisteredMutation<"public", {
    likesIncrement?: number | undefined;
    commentsIncrement?: number | undefined;
    targetType: "user" | "itinerary";
    targetId: string;
}, Promise<void>>;
/**
 * Delete an activity (e.g., when an itinerary is deleted)
 */
export declare const deleteActivity: import("convex/server").RegisteredMutation<"public", {
    activityId: import("convex/values").GenericId<"activityFeed">;
}, Promise<void>>;
/**
 * Delete activities for a target (e.g., when an itinerary is deleted)
 */
export declare const deleteActivitiesForTarget: import("convex/server").RegisteredMutation<"public", {
    targetType: "user" | "itinerary";
    targetId: string;
}, Promise<void>>;
/**
 * Follow a user
 */
export declare const followUser: import("convex/server").RegisteredMutation<"public", {
    followerName?: string | undefined;
    followerAvatarUrl?: string | undefined;
    followingName?: string | undefined;
    followerId: string;
    followingId: string;
}, Promise<{
    alreadyFollowing: boolean;
    followId: import("convex/values").GenericId<"userFollows">;
}>>;
/**
 * Unfollow a user
 */
export declare const unfollowUser: import("convex/server").RegisteredMutation<"public", {
    followerId: string;
    followingId: string;
}, Promise<{
    wasFollowing: boolean;
}>>;
/**
 * Check if user is following another user
 */
export declare const isFollowing: import("convex/server").RegisteredQuery<"public", {
    followerId: string;
    followingId: string;
}, Promise<{
    isFollowing: boolean;
}>>;
/**
 * Get followers for a user
 */
export declare const getFollowers: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cursor?: number | undefined;
    userId: string;
}, Promise<{
    followers: {
        followerProfile: {
            displayName: string | undefined;
            avatarUrl: string | undefined;
            bio: string | undefined;
        } | null;
        _id: import("convex/values").GenericId<"userFollows">;
        _creationTime: number;
        followerId: string;
        followingId: string;
        createdAt: number;
    }[];
    hasMore: boolean;
    nextCursor: number | null;
}>>;
/**
 * Get users that a user is following
 */
export declare const getFollowing: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cursor?: number | undefined;
    userId: string;
}, Promise<{
    following: {
        followingProfile: {
            displayName: string | undefined;
            avatarUrl: string | undefined;
            bio: string | undefined;
        } | null;
        _id: import("convex/values").GenericId<"userFollows">;
        _creationTime: number;
        followerId: string;
        followingId: string;
        createdAt: number;
    }[];
    hasMore: boolean;
    nextCursor: number | null;
}>>;
