/**
 * List comments for an itinerary with pagination
 * Returns top-level comments with their reply counts
 */
export declare const listByItinerary: import("convex/server").RegisteredQuery<"public", {
    userId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    data: {
        id: import("convex/values").GenericId<"itineraryComments">;
        authorName: string;
        authorAvatar: string | undefined;
        isLikedByUser: boolean;
        _id: import("convex/values").GenericId<"itineraryComments">;
        _creationTime: number;
        updatedAt?: number | undefined;
        parentId?: import("convex/values").GenericId<"itineraryComments"> | undefined;
        content: string;
        userId: string;
        createdAt: number;
        likesCount: number;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        repliesCount: number;
        isEdited: boolean;
        isDeleted: boolean;
        reportCount: number;
    }[];
    total: number;
}>>;
/**
 * Get replies for a comment
 */
export declare const getReplies: import("convex/server").RegisteredQuery<"public", {
    userId?: string | undefined;
    commentId: import("convex/values").GenericId<"itineraryComments">;
}, Promise<{
    id: import("convex/values").GenericId<"itineraryComments">;
    authorName: string;
    authorAvatar: string | undefined;
    isLikedByUser: boolean;
    _id: import("convex/values").GenericId<"itineraryComments">;
    _creationTime: number;
    updatedAt?: number | undefined;
    parentId?: import("convex/values").GenericId<"itineraryComments"> | undefined;
    content: string;
    userId: string;
    createdAt: number;
    likesCount: number;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    repliesCount: number;
    isEdited: boolean;
    isDeleted: boolean;
    reportCount: number;
}[]>>;
/**
 * Get a single comment by ID
 */
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"itineraryComments">;
}, Promise<{
    id: import("convex/values").GenericId<"itineraryComments">;
    authorName: string;
    authorAvatar: string | undefined;
    _id: import("convex/values").GenericId<"itineraryComments">;
    _creationTime: number;
    updatedAt?: number | undefined;
    parentId?: import("convex/values").GenericId<"itineraryComments"> | undefined;
    content: string;
    userId: string;
    createdAt: number;
    likesCount: number;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    repliesCount: number;
    isEdited: boolean;
    isDeleted: boolean;
    reportCount: number;
} | null>>;
/**
 * Get comment count for an itinerary
 */
export declare const getCommentCount: import("convex/server").RegisteredQuery<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<number>>;
/**
 * Create a new comment
 */
export declare const create: import("convex/server").RegisteredMutation<"public", {
    parentId?: import("convex/values").GenericId<"itineraryComments"> | undefined;
    content: string;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<import("convex/values").GenericId<"itineraryComments">>>;
/**
 * Update a comment
 */
export declare const update: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"itineraryComments">;
    content: string;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"itineraryComments">;
    _creationTime: number;
    updatedAt?: number | undefined;
    parentId?: import("convex/values").GenericId<"itineraryComments"> | undefined;
    content: string;
    userId: string;
    createdAt: number;
    likesCount: number;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    repliesCount: number;
    isEdited: boolean;
    isDeleted: boolean;
    reportCount: number;
} | null>>;
/**
 * Delete a comment (soft delete)
 */
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"itineraryComments">;
    userId: string;
}, Promise<void>>;
/**
 * Toggle like on a comment
 */
export declare const toggleLike: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    commentId: import("convex/values").GenericId<"itineraryComments">;
}, Promise<{
    liked: boolean;
    likesCount: number;
}>>;
/**
 * Report a comment
 */
export declare const report: import("convex/server").RegisteredMutation<"public", {
    description?: string | undefined;
    userId: string;
    reason: "other" | "spam" | "harassment" | "inappropriate" | "misinformation";
    commentId: import("convex/values").GenericId<"itineraryComments">;
}, Promise<{
    success: boolean;
}>>;
/**
 * List notifications for a user
 */
export declare const listNotifications: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    unreadOnly?: boolean | undefined;
    userId: string;
}, Promise<{
    data: {
        id: import("convex/values").GenericId<"notifications">;
        actorName: string;
        actorAvatar: string | undefined;
        _id: import("convex/values").GenericId<"notifications">;
        _creationTime: number;
        priority?: "low" | "high" | "normal" | undefined;
        title?: string | undefined;
        data?: any;
        actorId?: string | undefined;
        readAt?: number | undefined;
        body?: string | undefined;
        isPushSent?: boolean | undefined;
        pushSentAt?: number | undefined;
        message: string;
        type: "comment" | "reply" | "like" | "mention" | "new_follower" | "following_itinerary" | "itinerary_reminder" | "flight_status" | "weather_alert" | "social_interaction";
        userId: string;
        createdAt: number;
        isRead: boolean;
        referenceType: "user" | "itinerary" | "comment" | "flight" | "weather";
        referenceId: string;
    }[];
    total: number;
}>>;
/**
 * Get unread notification count
 */
export declare const getUnreadCount: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<number>>;
/**
 * Mark notification as read
 */
export declare const markNotificationRead: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"notifications">;
    userId: string;
}, Promise<void>>;
/**
 * Mark all notifications as read
 */
export declare const markAllNotificationsRead: import("convex/server").RegisteredMutation<"public", {
    userId: string;
}, Promise<{
    count: number;
}>>;
