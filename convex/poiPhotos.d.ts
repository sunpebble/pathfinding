export declare const listByPoi: import("convex/server").RegisteredQuery<"public", {
    status?: "approved" | "rejected" | "hidden" | "pending" | undefined;
    limit?: number | undefined;
    category?: "other" | "activity" | "food" | "interior" | "exterior" | "scenery" | "detail" | undefined;
    cursor?: string | undefined;
    poiId: import("convex/values").GenericId<"pois">;
}, Promise<{
    items: {
        _id: import("convex/values").GenericId<"poiPhotos">;
        _creationTime: number;
        updatedAt?: number | undefined;
        category?: "other" | "activity" | "food" | "interior" | "exterior" | "scenery" | "detail" | undefined;
        moderatorNotes?: string | undefined;
        reviewedBy?: string | undefined;
        reviewedAt?: number | undefined;
        location?: {
            latitude: number;
            longitude: number;
        } | undefined;
        caption?: string | undefined;
        userName?: string | undefined;
        userAvatarUrl?: string | undefined;
        thumbnailUrl?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        takenAt?: number | undefined;
        featuredAt?: number | undefined;
        featuredBy?: string | undefined;
        status: "approved" | "rejected" | "hidden" | "pending";
        userId: string;
        createdAt: number;
        likesCount: number;
        poiId: import("convex/values").GenericId<"pois">;
        viewsCount: number;
        imageUrl: string;
        isFeatured: boolean;
    }[];
    nextCursor: import("convex/values").GenericId<"poiPhotos"> | null;
    hasMore: boolean;
}>>;
export declare const getFeaturedByPoi: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    poiId: import("convex/values").GenericId<"pois">;
}, Promise<{
    _id: import("convex/values").GenericId<"poiPhotos">;
    _creationTime: number;
    updatedAt?: number | undefined;
    category?: "other" | "activity" | "food" | "interior" | "exterior" | "scenery" | "detail" | undefined;
    moderatorNotes?: string | undefined;
    reviewedBy?: string | undefined;
    reviewedAt?: number | undefined;
    location?: {
        latitude: number;
        longitude: number;
    } | undefined;
    caption?: string | undefined;
    userName?: string | undefined;
    userAvatarUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    takenAt?: number | undefined;
    featuredAt?: number | undefined;
    featuredBy?: string | undefined;
    status: "approved" | "rejected" | "hidden" | "pending";
    userId: string;
    createdAt: number;
    likesCount: number;
    poiId: import("convex/values").GenericId<"pois">;
    viewsCount: number;
    imageUrl: string;
    isFeatured: boolean;
}[]>>;
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"poiPhotos">;
}, Promise<{
    _id: import("convex/values").GenericId<"poiPhotos">;
    _creationTime: number;
    updatedAt?: number | undefined;
    category?: "other" | "activity" | "food" | "interior" | "exterior" | "scenery" | "detail" | undefined;
    moderatorNotes?: string | undefined;
    reviewedBy?: string | undefined;
    reviewedAt?: number | undefined;
    location?: {
        latitude: number;
        longitude: number;
    } | undefined;
    caption?: string | undefined;
    userName?: string | undefined;
    userAvatarUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    takenAt?: number | undefined;
    featuredAt?: number | undefined;
    featuredBy?: string | undefined;
    status: "approved" | "rejected" | "hidden" | "pending";
    userId: string;
    createdAt: number;
    likesCount: number;
    poiId: import("convex/values").GenericId<"pois">;
    viewsCount: number;
    imageUrl: string;
    isFeatured: boolean;
} | null>>;
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"poiPhotos">;
    _creationTime: number;
    updatedAt?: number | undefined;
    category?: "other" | "activity" | "food" | "interior" | "exterior" | "scenery" | "detail" | undefined;
    moderatorNotes?: string | undefined;
    reviewedBy?: string | undefined;
    reviewedAt?: number | undefined;
    location?: {
        latitude: number;
        longitude: number;
    } | undefined;
    caption?: string | undefined;
    userName?: string | undefined;
    userAvatarUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    takenAt?: number | undefined;
    featuredAt?: number | undefined;
    featuredBy?: string | undefined;
    status: "approved" | "rejected" | "hidden" | "pending";
    userId: string;
    createdAt: number;
    likesCount: number;
    poiId: import("convex/values").GenericId<"pois">;
    viewsCount: number;
    imageUrl: string;
    isFeatured: boolean;
}[]>>;
export declare const getTimeline: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cursor?: string | undefined;
}, Promise<{
    items: {
        _id: import("convex/values").GenericId<"poiPhotos">;
        _creationTime: number;
        updatedAt?: number | undefined;
        category?: "other" | "activity" | "food" | "interior" | "exterior" | "scenery" | "detail" | undefined;
        moderatorNotes?: string | undefined;
        reviewedBy?: string | undefined;
        reviewedAt?: number | undefined;
        location?: {
            latitude: number;
            longitude: number;
        } | undefined;
        caption?: string | undefined;
        userName?: string | undefined;
        userAvatarUrl?: string | undefined;
        thumbnailUrl?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        takenAt?: number | undefined;
        featuredAt?: number | undefined;
        featuredBy?: string | undefined;
        status: "approved" | "rejected" | "hidden" | "pending";
        userId: string;
        createdAt: number;
        likesCount: number;
        poiId: import("convex/values").GenericId<"pois">;
        viewsCount: number;
        imageUrl: string;
        isFeatured: boolean;
    }[];
    nextCursor: import("convex/values").GenericId<"poiPhotos"> | null;
    hasMore: boolean;
}>>;
export declare const getPoiPhotoStats: import("convex/server").RegisteredQuery<"public", {
    poiId: import("convex/values").GenericId<"pois">;
}, Promise<{
    totalPhotos: number;
    featuredCount: number;
    totalLikes: number;
    totalViews: number;
    pendingCount: number;
    categoryBreakdown: Record<string, number>;
}>>;
export declare const getPopularPhotos: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    poiId?: import("convex/values").GenericId<"pois"> | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"poiPhotos">;
    _creationTime: number;
    updatedAt?: number | undefined;
    category?: "other" | "activity" | "food" | "interior" | "exterior" | "scenery" | "detail" | undefined;
    moderatorNotes?: string | undefined;
    reviewedBy?: string | undefined;
    reviewedAt?: number | undefined;
    location?: {
        latitude: number;
        longitude: number;
    } | undefined;
    caption?: string | undefined;
    userName?: string | undefined;
    userAvatarUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    takenAt?: number | undefined;
    featuredAt?: number | undefined;
    featuredBy?: string | undefined;
    status: "approved" | "rejected" | "hidden" | "pending";
    userId: string;
    createdAt: number;
    likesCount: number;
    poiId: import("convex/values").GenericId<"pois">;
    viewsCount: number;
    imageUrl: string;
    isFeatured: boolean;
}[]>>;
export declare const hasUserLiked: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    photoId: import("convex/values").GenericId<"poiPhotos">;
}, Promise<boolean>>;
export declare const getUserLikedPhotos: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    userId: string;
}, Promise<({
    _id: import("convex/values").GenericId<"poiPhotos">;
    _creationTime: number;
    updatedAt?: number | undefined;
    category?: "other" | "activity" | "food" | "interior" | "exterior" | "scenery" | "detail" | undefined;
    moderatorNotes?: string | undefined;
    reviewedBy?: string | undefined;
    reviewedAt?: number | undefined;
    location?: {
        latitude: number;
        longitude: number;
    } | undefined;
    caption?: string | undefined;
    userName?: string | undefined;
    userAvatarUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    takenAt?: number | undefined;
    featuredAt?: number | undefined;
    featuredBy?: string | undefined;
    status: "approved" | "rejected" | "hidden" | "pending";
    userId: string;
    createdAt: number;
    likesCount: number;
    poiId: import("convex/values").GenericId<"pois">;
    viewsCount: number;
    imageUrl: string;
    isFeatured: boolean;
} | null)[]>>;
export declare const upload: import("convex/server").RegisteredMutation<"public", {
    category?: "other" | "activity" | "food" | "interior" | "exterior" | "scenery" | "detail" | undefined;
    location?: {
        latitude: number;
        longitude: number;
    } | undefined;
    caption?: string | undefined;
    userName?: string | undefined;
    userAvatarUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    takenAt?: number | undefined;
    userId: string;
    poiId: import("convex/values").GenericId<"pois">;
    imageUrl: string;
}, Promise<import("convex/values").GenericId<"poiPhotos">>>;
export declare const updateCaption: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"poiPhotos">;
    userId: string;
    caption: string;
}, Promise<{
    _id: import("convex/values").GenericId<"poiPhotos">;
    _creationTime: number;
    updatedAt?: number | undefined;
    category?: "other" | "activity" | "food" | "interior" | "exterior" | "scenery" | "detail" | undefined;
    moderatorNotes?: string | undefined;
    reviewedBy?: string | undefined;
    reviewedAt?: number | undefined;
    location?: {
        latitude: number;
        longitude: number;
    } | undefined;
    caption?: string | undefined;
    userName?: string | undefined;
    userAvatarUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    takenAt?: number | undefined;
    featuredAt?: number | undefined;
    featuredBy?: string | undefined;
    status: "approved" | "rejected" | "hidden" | "pending";
    userId: string;
    createdAt: number;
    likesCount: number;
    poiId: import("convex/values").GenericId<"pois">;
    viewsCount: number;
    imageUrl: string;
    isFeatured: boolean;
} | null>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"poiPhotos">;
    userId: string;
}, Promise<void>>;
export declare const like: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    photoId: import("convex/values").GenericId<"poiPhotos">;
}, Promise<void>>;
export declare const unlike: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    photoId: import("convex/values").GenericId<"poiPhotos">;
}, Promise<void>>;
export declare const incrementViews: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"poiPhotos">;
}, Promise<void>>;
export declare const approve: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"poiPhotos">;
    reviewedBy: string;
}, Promise<{
    _id: import("convex/values").GenericId<"poiPhotos">;
    _creationTime: number;
    updatedAt?: number | undefined;
    category?: "other" | "activity" | "food" | "interior" | "exterior" | "scenery" | "detail" | undefined;
    moderatorNotes?: string | undefined;
    reviewedBy?: string | undefined;
    reviewedAt?: number | undefined;
    location?: {
        latitude: number;
        longitude: number;
    } | undefined;
    caption?: string | undefined;
    userName?: string | undefined;
    userAvatarUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    takenAt?: number | undefined;
    featuredAt?: number | undefined;
    featuredBy?: string | undefined;
    status: "approved" | "rejected" | "hidden" | "pending";
    userId: string;
    createdAt: number;
    likesCount: number;
    poiId: import("convex/values").GenericId<"pois">;
    viewsCount: number;
    imageUrl: string;
    isFeatured: boolean;
} | null>>;
export declare const reject: import("convex/server").RegisteredMutation<"public", {
    moderatorNotes?: string | undefined;
    id: import("convex/values").GenericId<"poiPhotos">;
    reviewedBy: string;
}, Promise<{
    _id: import("convex/values").GenericId<"poiPhotos">;
    _creationTime: number;
    updatedAt?: number | undefined;
    category?: "other" | "activity" | "food" | "interior" | "exterior" | "scenery" | "detail" | undefined;
    moderatorNotes?: string | undefined;
    reviewedBy?: string | undefined;
    reviewedAt?: number | undefined;
    location?: {
        latitude: number;
        longitude: number;
    } | undefined;
    caption?: string | undefined;
    userName?: string | undefined;
    userAvatarUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    takenAt?: number | undefined;
    featuredAt?: number | undefined;
    featuredBy?: string | undefined;
    status: "approved" | "rejected" | "hidden" | "pending";
    userId: string;
    createdAt: number;
    likesCount: number;
    poiId: import("convex/values").GenericId<"pois">;
    viewsCount: number;
    imageUrl: string;
    isFeatured: boolean;
} | null>>;
export declare const setFeatured: import("convex/server").RegisteredMutation<"public", {
    featuredBy?: string | undefined;
    id: import("convex/values").GenericId<"poiPhotos">;
    isFeatured: boolean;
}, Promise<{
    _id: import("convex/values").GenericId<"poiPhotos">;
    _creationTime: number;
    updatedAt?: number | undefined;
    category?: "other" | "activity" | "food" | "interior" | "exterior" | "scenery" | "detail" | undefined;
    moderatorNotes?: string | undefined;
    reviewedBy?: string | undefined;
    reviewedAt?: number | undefined;
    location?: {
        latitude: number;
        longitude: number;
    } | undefined;
    caption?: string | undefined;
    userName?: string | undefined;
    userAvatarUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    takenAt?: number | undefined;
    featuredAt?: number | undefined;
    featuredBy?: string | undefined;
    status: "approved" | "rejected" | "hidden" | "pending";
    userId: string;
    createdAt: number;
    likesCount: number;
    poiId: import("convex/values").GenericId<"pois">;
    viewsCount: number;
    imageUrl: string;
    isFeatured: boolean;
} | null>>;
export declare const getPendingPhotos: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"poiPhotos">;
    _creationTime: number;
    updatedAt?: number | undefined;
    category?: "other" | "activity" | "food" | "interior" | "exterior" | "scenery" | "detail" | undefined;
    moderatorNotes?: string | undefined;
    reviewedBy?: string | undefined;
    reviewedAt?: number | undefined;
    location?: {
        latitude: number;
        longitude: number;
    } | undefined;
    caption?: string | undefined;
    userName?: string | undefined;
    userAvatarUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    takenAt?: number | undefined;
    featuredAt?: number | undefined;
    featuredBy?: string | undefined;
    status: "approved" | "rejected" | "hidden" | "pending";
    userId: string;
    createdAt: number;
    likesCount: number;
    poiId: import("convex/values").GenericId<"pois">;
    viewsCount: number;
    imageUrl: string;
    isFeatured: boolean;
}[]>>;
export declare const bulkApprove: import("convex/server").RegisteredMutation<"public", {
    reviewedBy: string;
    ids: import("convex/values").GenericId<"poiPhotos">[];
}, Promise<{
    approved: number;
}>>;
