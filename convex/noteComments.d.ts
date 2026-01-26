/**
 * Note Comments - 游记评论相关操作
 */
export declare const create: import("convex/server").RegisteredMutation<"public", {
    parentId?: import("convex/values").GenericId<"noteComments"> | undefined;
    content: string;
    userId: string;
    noteId: import("convex/values").GenericId<"travelNotes">;
}, Promise<import("convex/values").GenericId<"noteComments">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    content: string;
    userId: string;
    commentId: import("convex/values").GenericId<"noteComments">;
}, Promise<{
    _id: import("convex/values").GenericId<"noteComments">;
    _creationTime: number;
    updatedAt?: number | undefined;
    parentId?: import("convex/values").GenericId<"noteComments"> | undefined;
    content: string;
    createdAt: number;
    likesCount: number;
    userId: string;
    repliesCount: number;
    isEdited: boolean;
    isDeleted: boolean;
    noteId: import("convex/values").GenericId<"travelNotes">;
} | null>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    commentId: import("convex/values").GenericId<"noteComments">;
}, Promise<void>>;
export declare const listByNote: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    sortBy?: "popular" | "latest" | undefined;
    noteId: import("convex/values").GenericId<"travelNotes">;
}, Promise<{
    data: {
        userName: string;
        userAvatar: string | undefined;
        replies: {
            userName: string;
            userAvatar: string | undefined;
            _id: import("convex/values").GenericId<"noteComments">;
            _creationTime: number;
            updatedAt?: number | undefined;
            parentId?: import("convex/values").GenericId<"noteComments"> | undefined;
            content: string;
            createdAt: number;
            likesCount: number;
            userId: string;
            repliesCount: number;
            isEdited: boolean;
            isDeleted: boolean;
            noteId: import("convex/values").GenericId<"travelNotes">;
        }[];
        _id: import("convex/values").GenericId<"noteComments">;
        _creationTime: number;
        updatedAt?: number | undefined;
        parentId?: import("convex/values").GenericId<"noteComments"> | undefined;
        content: string;
        createdAt: number;
        likesCount: number;
        userId: string;
        repliesCount: number;
        isEdited: boolean;
        isDeleted: boolean;
        noteId: import("convex/values").GenericId<"travelNotes">;
    }[];
    total: number;
}>>;
export declare const listReplies: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    parentId: import("convex/values").GenericId<"noteComments">;
}, Promise<{
    data: {
        userName: string;
        userAvatar: string | undefined;
        _id: import("convex/values").GenericId<"noteComments">;
        _creationTime: number;
        updatedAt?: number | undefined;
        parentId?: import("convex/values").GenericId<"noteComments"> | undefined;
        content: string;
        createdAt: number;
        likesCount: number;
        userId: string;
        repliesCount: number;
        isEdited: boolean;
        isDeleted: boolean;
        noteId: import("convex/values").GenericId<"travelNotes">;
    }[];
    total: number;
}>>;
export declare const toggleLike: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    commentId: import("convex/values").GenericId<"noteComments">;
}, Promise<{
    liked: boolean;
}>>;
export declare const isCommentLiked: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    commentId: import("convex/values").GenericId<"noteComments">;
}, Promise<{
    liked: boolean;
}>>;
export declare const batchCheckCommentLikes: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    commentIds: import("convex/values").GenericId<"noteComments">[];
}, Promise<Record<string, boolean>>>;
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        noteTitle: string | undefined;
        _id: import("convex/values").GenericId<"noteComments">;
        _creationTime: number;
        updatedAt?: number | undefined;
        parentId?: import("convex/values").GenericId<"noteComments"> | undefined;
        content: string;
        createdAt: number;
        likesCount: number;
        userId: string;
        repliesCount: number;
        isEdited: boolean;
        isDeleted: boolean;
        noteId: import("convex/values").GenericId<"travelNotes">;
    }[];
    total: number;
}>>;
