/**
 * Share Events - Track share actions, manage share links, and control permissions
 */
/**
 * Create a new share link
 */
export declare const createShareLink: import("convex/server").RegisteredMutation<"public", {
    password?: string | undefined;
    expiresAt?: number | undefined;
    permission?: "public" | "private" | "password" | "unlisted" | undefined;
    maxViews?: number | undefined;
    allowDownload?: boolean | undefined;
    allowCopy?: boolean | undefined;
    platform: "xiaohongshu" | "weibo" | "douyin" | "wechat" | "qq" | "copy_link" | "system_share" | "generic";
    resourceType: "itinerary" | "travelGuide" | "travelNote";
    resourceId: string;
    ownerId: string;
}, Promise<{
    id: import("convex/values").GenericId<"shareLinks">;
    shareCode: string;
    shareUrl: string;
}>>;
/**
 * Create a share event (for tracking shares without creating a link)
 */
export declare const create: import("convex/server").RegisteredMutation<"public", {
    resourceType?: "itinerary" | "travelGuide" | "travelNote" | undefined;
    shareUrl?: string | undefined;
    sharerId?: string | undefined;
    platform: "xiaohongshu" | "weibo" | "douyin" | "wechat" | "qq" | "copy_link" | "system_share" | "generic";
    resourceId: string;
}, Promise<import("convex/values").GenericId<"shareEvents">>>;
/**
 * Track a share-related event (click, view, save)
 */
export declare const trackEvent: import("convex/server").RegisteredMutation<"public", {
    platform?: "xiaohongshu" | "weibo" | "douyin" | "wechat" | "qq" | "copy_link" | "system_share" | "generic" | undefined;
    shareCode?: string | undefined;
    resourceType?: "itinerary" | "travelGuide" | "travelNote" | undefined;
    resourceId?: string | undefined;
    shareLinkId?: import("convex/values").GenericId<"shareLinks"> | undefined;
    referrer?: string | undefined;
    userAgent?: string | undefined;
    ipHash?: string | undefined;
    eventType: "share" | "click" | "view" | "save";
}, Promise<{
    success: boolean;
}>>;
/**
 * Verify share link access (check password, expiry, etc.)
 */
export declare const verifyAccess: import("convex/server").RegisteredQuery<"public", {
    password?: string | undefined;
    shareCode: string;
}, Promise<{
    valid: boolean;
    error: string;
    requiresPassword?: undefined;
    resourceType?: undefined;
    resourceId?: undefined;
    permission?: undefined;
    allowDownload?: undefined;
    allowCopy?: undefined;
} | {
    valid: boolean;
    error: string;
    requiresPassword: boolean;
    resourceType?: undefined;
    resourceId?: undefined;
    permission?: undefined;
    allowDownload?: undefined;
    allowCopy?: undefined;
} | {
    valid: boolean;
    resourceType: "itinerary" | "travelGuide" | "travelNote";
    resourceId: string;
    permission: "public" | "private" | "password" | "unlisted";
    allowDownload: boolean;
    allowCopy: boolean;
    error?: undefined;
    requiresPassword?: undefined;
}>>;
/**
 * Get share link by code
 */
export declare const getByCode: import("convex/server").RegisteredQuery<"public", {
    shareCode: string;
}, Promise<{
    _id: import("convex/values").GenericId<"shareLinks">;
    _creationTime: number;
    expiresAt?: number | undefined;
    maxViews?: number | undefined;
    lastAccessedAt?: number | undefined;
    createdAt: number;
    updatedAt: number;
    viewCount: number;
    platform: "xiaohongshu" | "weibo" | "douyin" | "wechat" | "qq" | "copy_link" | "system_share" | "generic";
    isActive: boolean;
    shareCode: string;
    saveCount: number;
    resourceType: "itinerary" | "travelGuide" | "travelNote";
    resourceId: string;
    ownerId: string;
    shareUrl: string;
    permission: "public" | "private" | "password" | "unlisted";
    allowDownload: boolean;
    allowCopy: boolean;
    clickCount: number;
} | null>>;
/**
 * Get share statistics for a resource
 */
export declare const getStats: import("convex/server").RegisteredQuery<"public", {
    resourceType: "itinerary" | "travelGuide" | "travelNote";
    resourceId: string;
}, Promise<{
    resourceType: "itinerary" | "travelGuide" | "travelNote";
    resourceId: string;
    totals: {
        shares: number;
        clicks: number;
        views: number;
        saves: number;
        activeLinks: number;
    };
    byPlatform: Record<string, {
        shares: number;
        clicks: number;
        views: number;
        saves: number;
        lastShareAt?: number;
    }>;
    recentShares: {
        _id: import("convex/values").GenericId<"shareEvents">;
        _creationTime: number;
        shareUrl?: string | undefined;
        sharerId?: string | undefined;
        shareLinkId?: import("convex/values").GenericId<"shareLinks"> | undefined;
        createdAt: number;
        platform: "xiaohongshu" | "weibo" | "douyin" | "wechat" | "qq" | "copy_link" | "system_share" | "generic";
        resourceType: "itinerary" | "travelGuide" | "travelNote";
        resourceId: string;
        eventType: "share" | "click" | "view" | "save";
    }[];
}>>;
/**
 * Get share links for a resource (owner only)
 */
export declare const getShareLinks: import("convex/server").RegisteredQuery<"public", {
    resourceType: "itinerary" | "travelGuide" | "travelNote";
    resourceId: string;
    ownerId: string;
}, Promise<{
    hasPassword: boolean;
    _id: import("convex/values").GenericId<"shareLinks">;
    _creationTime: number;
    expiresAt?: number | undefined;
    maxViews?: number | undefined;
    lastAccessedAt?: number | undefined;
    createdAt: number;
    updatedAt: number;
    viewCount: number;
    platform: "xiaohongshu" | "weibo" | "douyin" | "wechat" | "qq" | "copy_link" | "system_share" | "generic";
    isActive: boolean;
    shareCode: string;
    saveCount: number;
    resourceType: "itinerary" | "travelGuide" | "travelNote";
    resourceId: string;
    ownerId: string;
    shareUrl: string;
    permission: "public" | "private" | "password" | "unlisted";
    allowDownload: boolean;
    allowCopy: boolean;
    clickCount: number;
}[]>>;
/**
 * Get share history for a user
 */
export declare const getShareHistory: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cursor?: string | undefined;
    userId: string;
}, Promise<{
    items: {
        _id: import("convex/values").GenericId<"shareEvents">;
        _creationTime: number;
        shareUrl?: string | undefined;
        sharerId?: string | undefined;
        shareLinkId?: import("convex/values").GenericId<"shareLinks"> | undefined;
        createdAt: number;
        platform: "xiaohongshu" | "weibo" | "douyin" | "wechat" | "qq" | "copy_link" | "system_share" | "generic";
        resourceType: "itinerary" | "travelGuide" | "travelNote";
        resourceId: string;
        eventType: "share" | "click" | "view" | "save";
    }[];
    hasMore: boolean;
    nextCursor: import("convex/values").GenericId<"shareEvents"> | undefined;
}>>;
/**
 * Update share link settings
 */
export declare const updateShareLink: import("convex/server").RegisteredMutation<"public", {
    isActive?: boolean | undefined;
    password?: string | undefined;
    expiresAt?: number | undefined;
    permission?: "public" | "private" | "password" | "unlisted" | undefined;
    maxViews?: number | undefined;
    allowDownload?: boolean | undefined;
    allowCopy?: boolean | undefined;
    ownerId: string;
    shareLinkId: import("convex/values").GenericId<"shareLinks">;
}, Promise<{
    success: boolean;
}>>;
/**
 * Revoke (deactivate) a share link
 */
export declare const revokeShareLink: import("convex/server").RegisteredMutation<"public", {
    ownerId: string;
    shareLinkId: import("convex/values").GenericId<"shareLinks">;
}, Promise<{
    success: boolean;
}>>;
/**
 * Delete a share link permanently
 */
export declare const deleteShareLink: import("convex/server").RegisteredMutation<"public", {
    ownerId: string;
    shareLinkId: import("convex/values").GenericId<"shareLinks">;
}, Promise<{
    success: boolean;
}>>;
/**
 * Get top shared resources
 */
export declare const getTopShared: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    days?: number | undefined;
    resourceType?: "itinerary" | "travelGuide" | "travelNote" | undefined;
}, Promise<{
    resourceType: string;
    resourceId: string;
    shareCount: number;
}[]>>;
/**
 * Clean up old share event logs
 */
export declare const cleanupOldLogs: import("convex/server").RegisteredMutation<"public", {
    olderThanDays?: number | undefined;
}, Promise<{
    deletedCount: number;
    hasMore: boolean;
}>>;
/**
 * Clean up expired share links
 */
export declare const cleanupExpiredLinks: import("convex/server").RegisteredMutation<"public", {}, Promise<{
    deactivatedCount: number;
    hasMore: boolean;
}>>;
