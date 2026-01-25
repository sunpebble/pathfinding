/**
 * Note Likes - 游记点赞相关操作
 */
export declare const toggle: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    noteId: import("convex/values").GenericId<"travelNotes">;
}, Promise<{
    liked: boolean;
}>>;
export declare const isLiked: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    noteId: import("convex/values").GenericId<"travelNotes">;
}, Promise<{
    liked: boolean;
}>>;
export declare const getCount: import("convex/server").RegisteredQuery<"public", {
    noteId: import("convex/values").GenericId<"travelNotes">;
}, Promise<{
    count: number;
}>>;
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        note: {
            coverImage: string;
            authorName: string | undefined;
            authorAvatar: string | undefined;
            _id: import("convex/values").GenericId<"travelNotes">;
            _creationTime: number;
            itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
            location?: string | undefined;
            travelDate?: string | undefined;
            title: string;
            content: string;
            createdAt: number;
            likesCount: number;
            commentsCount: number;
            visibility: "public" | "followers" | "private";
            updatedAt: number;
            authorId: string;
            savesCount: number;
            viewsCount: number;
            isEdited: boolean;
        };
        _id: import("convex/values").GenericId<"noteLikes">;
        _creationTime: number;
        userId: string;
        createdAt: number;
        noteId: import("convex/values").GenericId<"travelNotes">;
    }[];
    total: number;
}>>;
export declare const batchCheckLikes: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    noteIds: import("convex/values").GenericId<"travelNotes">[];
}, Promise<Record<string, boolean>>>;
