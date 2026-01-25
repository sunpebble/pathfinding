/**
 * Guide Comments - Comments on Travel Guides (travelGuides table)
 * Uses string IDs to support various guide sources
 */
/**
 * Create a new comment on a guide
 */
export declare const create: import("convex/server").RegisteredMutation<"public", {
    parentId?: string | undefined;
    guideId: string;
    content: string;
    userId: string;
}, Promise<string>>;
/**
 * List comments for a guide
 */
export declare const listByGuide: import("convex/server").RegisteredQuery<"public", {
    userId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    guideId: string;
}, Promise<{
    data: {
        id: import("convex/values").GenericId<"guideComments">;
        itinerary_id: string;
        user_id: string;
        parent_id: string | undefined;
        content: string;
        likes_count: number;
        replies_count: number;
        is_edited: boolean;
        is_deleted: boolean;
        created_at: number;
        updated_at: number | undefined;
        author_name: string;
        author_avatar: string | undefined;
        is_liked_by_user: boolean;
    }[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}>>;
/**
 * Get replies for a comment
 */
export declare const getReplies: import("convex/server").RegisteredQuery<"public", {
    userId?: string | undefined;
    commentId: string;
}, Promise<{
    id: import("convex/values").GenericId<"guideComments">;
    itinerary_id: string;
    user_id: string;
    parent_id: string | undefined;
    content: string;
    likes_count: number;
    replies_count: number;
    is_edited: boolean;
    is_deleted: boolean;
    created_at: number;
    updated_at: number | undefined;
    author_name: string;
    author_avatar: string | undefined;
    is_liked_by_user: boolean;
}[]>>;
/**
 * Toggle like on a comment
 */
export declare const toggleLike: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    commentId: import("convex/values").GenericId<"guideComments">;
}, Promise<{
    liked: boolean;
    likesCount: number;
}>>;
/**
 * Update a comment
 */
export declare const update: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"guideComments">;
    content: string;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"guideComments">;
    _creationTime: number;
    updatedAt?: number | undefined;
    parentId?: string | undefined;
    guideId: string;
    content: string;
    userId: string;
    createdAt: number;
    likesCount: number;
    repliesCount: number;
    isEdited: boolean;
    isDeleted: boolean;
} | null>>;
/**
 * Delete a comment (hard delete)
 */
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"guideComments">;
    userId: string;
}, Promise<void>>;
