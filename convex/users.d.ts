/**
 * Users - Authentication and Profile Management
 * Handles user sessions and profile data using Convex Auth
 */
export declare const getCurrentUser: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    id: string;
    email: string | undefined;
    name: string | undefined;
    pictureUrl: string | undefined;
    profile: {
        displayName: string | undefined;
        avatarUrl: string | undefined;
        bio: string | undefined;
        followersCount: number;
        followingCount: number;
    } | null;
} | null>>;
export declare const getUserById: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    id: string;
    email: string;
    displayName: string | undefined;
    avatarUrl: string | undefined;
    bio: string | undefined;
    followersCount: number;
    followingCount: number;
} | null>>;
export declare const getUserProfile: import("convex/server").RegisteredQuery<"public", {
    currentUserId?: string | undefined;
    userId: string;
}, Promise<{
    id: string;
    email: string;
    displayName: string | undefined;
    avatarUrl: string | undefined;
    bio: string | undefined;
    followersCount: number;
    followingCount: number;
    isFollowing: boolean;
    isFollowedBy: boolean;
    isMutual: boolean;
} | null>>;
export declare const isAuthenticated: import("convex/server").RegisteredQuery<"public", {}, Promise<boolean>>;
export declare const updateProfile: import("convex/server").RegisteredMutation<"public", {
    displayName?: string | undefined;
    avatarUrl?: string | undefined;
    bio?: string | undefined;
}, Promise<import("convex/values").GenericId<"profiles">>>;
export declare const getOrCreateProfile: import("convex/server").RegisteredMutation<"public", {}, Promise<import("convex/values").GenericId<"profiles">>>;
