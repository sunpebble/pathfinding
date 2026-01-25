/**
 * User Follows - Social Relationship Management
 * Handles follow/unfollow operations, follower/following lists, and mutual follow detection
 */
export declare const follow: import("convex/server").RegisteredMutation<"public", {
    followerId: string;
    followingId: string;
}, Promise<import("convex/values").GenericId<"userFollows">>>;
export declare const unfollow: import("convex/server").RegisteredMutation<"public", {
    followerId: string;
    followingId: string;
}, Promise<void>>;
export declare const isFollowing: import("convex/server").RegisteredQuery<"public", {
    followerId: string;
    followingId: string;
}, Promise<boolean>>;
export declare const getMutualFollowStatus: import("convex/server").RegisteredQuery<"public", {
    userIdA: string;
    userIdB: string;
}, Promise<{
    aFollowsB: boolean;
    bFollowsA: boolean;
    isMutual: boolean;
}>>;
export declare const getFollowers: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    currentUserId?: string | undefined;
    userId: string;
}, Promise<{
    data: {
        id: string;
        displayName: string | undefined;
        avatarUrl: string | undefined;
        bio: string | undefined;
        followersCount: number;
        followingCount: number;
        followedAt: number;
        isFollowedByCurrentUser: boolean;
        isMutual: boolean;
    }[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}>>;
export declare const getFollowing: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    currentUserId?: string | undefined;
    userId: string;
}, Promise<{
    data: {
        id: string;
        displayName: string | undefined;
        avatarUrl: string | undefined;
        bio: string | undefined;
        followersCount: number;
        followingCount: number;
        followedAt: number;
        isFollowedByCurrentUser: boolean;
        isMutual: boolean;
    }[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}>>;
export declare const getFollowStats: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    followersCount: number;
    followingCount: number;
}>>;
export declare const getFollowingFeed: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        cityName: string | undefined;
        daysCount: number;
        author: {
            id: string;
            displayName: string | undefined;
            avatarUrl: string | undefined;
        };
        _id: import("convex/values").GenericId<"itineraries">;
        _creationTime: number;
        coverImageUrl?: string | undefined;
        copiedFromId?: import("convex/values").GenericId<"itineraries"> | undefined;
        title: string;
        userId: string;
        startDate: string;
        endDate: string;
        visibility: "public" | "private" | "team";
        cityId: import("convex/values").GenericId<"cities">;
    }[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}>>;
export declare const getMutualFollowers: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        id: string;
        displayName: string | undefined;
        avatarUrl: string | undefined;
        bio: string | undefined;
        followersCount: number;
        followingCount: number;
        followedAt: number;
    }[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}>>;
export declare const getFollowRecommendations: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        id: string;
        displayName: string | undefined;
        avatarUrl: string | undefined;
        bio: string | undefined;
        followersCount: number;
        followingCount: number;
        score: number;
        reasons: string[];
        followsYou: boolean;
    }[];
}>>;
export declare const batchCheckFollowStatus: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    targetUserIds: string[];
}, Promise<Record<string, {
    isFollowing: boolean;
    isFollowedBy: boolean;
    isMutual: boolean;
}>>>;
