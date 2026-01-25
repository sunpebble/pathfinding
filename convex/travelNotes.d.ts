import type { Id } from './_generated/dataModel';
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    visibility?: "public" | "followers" | "private" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        imageCount: number;
        coverImage: string;
        tags: string[];
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
    }[];
    total: number;
}>>;
export declare const listPublic: import("convex/server").RegisteredQuery<"public", {
    tag?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    sortBy?: "popular" | "latest" | "trending" | undefined;
}, Promise<{
    data: {
        imageCount: number;
        coverImage: string;
        tags: string[];
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
    }[];
    total: number;
}>>;
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    userId?: string | undefined;
    id: import("convex/values").GenericId<"travelNotes">;
}, Promise<{
    images: {
        id: import("convex/values").GenericId<"noteImages">;
        url: string;
        caption: string | undefined;
        isCover: boolean;
        orderIndex: number;
    }[];
    tags: string[];
    authorName: string | undefined;
    authorAvatar: string | undefined;
    itinerary: {
        id: import("convex/values").GenericId<"itineraries">;
        title: string;
    } | null;
    pois: {
        notePoiId: import("convex/values").GenericId<"notePois">;
        mentionIndex: number | undefined;
        _id: import("convex/values").GenericId<"pois">;
        _creationTime: number;
        phone?: string | undefined;
        nameEn?: string | undefined;
        priceLevel?: number | undefined;
        externalId?: string | undefined;
        address?: string | undefined;
        rating?: number | undefined;
        businessHours?: {
            timezone?: string | undefined;
            monday?: {
                open: string;
                close: string;
            }[] | undefined;
            tuesday?: {
                open: string;
                close: string;
            }[] | undefined;
            wednesday?: {
                open: string;
                close: string;
            }[] | undefined;
            thursday?: {
                open: string;
                close: string;
            }[] | undefined;
            friday?: {
                open: string;
                close: string;
            }[] | undefined;
            saturday?: {
                open: string;
                close: string;
            }[] | undefined;
            sunday?: {
                open: string;
                close: string;
            }[] | undefined;
            notes?: string | undefined;
        } | undefined;
        bestVisitTime?: {
            recommendedTime?: string | undefined;
            reason?: string | undefined;
            avoidTimes?: string[] | undefined;
            peakHours?: string[] | undefined;
            seasonalNotes?: string | undefined;
        } | undefined;
        imageUrls?: string[] | undefined;
        isHiddenGem?: boolean | undefined;
        hiddenGemScore?: number | undefined;
        hiddenGemRating?: number | undefined;
        hiddenGemRatingCount?: number | undefined;
        localRecommendation?: {
            localTips?: string | undefined;
            bestTimeToVisit?: string | undefined;
            localSecrets?: string[] | undefined;
            recommendedBy?: string | undefined;
            isLocalRecommended: boolean;
        } | undefined;
        popularityLevel?: "hidden" | "emerging" | "moderate" | "popular" | "crowded" | undefined;
        cuisineType?: string | undefined;
        isLocalFavorite?: boolean | undefined;
        signatureDishes?: string[] | undefined;
        dietaryOptions?: string[] | undefined;
        averagePrice?: number | undefined;
        name: string;
        latitude: number;
        longitude: number;
        cityId: import("convex/values").GenericId<"cities">;
        category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
        ratingCount: number;
        source: string;
    }[];
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
} | null>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    visibility?: "public" | "followers" | "private" | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    location?: string | undefined;
    travelDate?: string | undefined;
    title: string;
    content: string;
    authorId: string;
}, Promise<import("convex/values").GenericId<"travelNotes">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    title?: string | undefined;
    content?: string | undefined;
    visibility?: "public" | "followers" | "private" | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    location?: string | undefined;
    travelDate?: string | undefined;
    id: import("convex/values").GenericId<"travelNotes">;
    userId: string;
}, Promise<{
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
} | null>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"travelNotes">;
    userId: string;
}, Promise<void>>;
export declare const incrementViews: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"travelNotes">;
}, Promise<void>>;
export declare const addImage: import("convex/server").RegisteredMutation<"public", {
    caption?: string | undefined;
    isCover?: boolean | undefined;
    url: string;
    userId: string;
    orderIndex: number;
    noteId: import("convex/values").GenericId<"travelNotes">;
}, Promise<import("convex/values").GenericId<"noteImages">>>;
export declare const removeImage: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    imageId: import("convex/values").GenericId<"noteImages">;
}, Promise<void>>;
export declare const addImages: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    images: {
        caption?: string | undefined;
        isCover?: boolean | undefined;
        url: string;
        orderIndex: number;
    }[];
    noteId: import("convex/values").GenericId<"travelNotes">;
}, Promise<Id<"noteImages">[]>>;
export declare const addTag: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    noteId: import("convex/values").GenericId<"travelNotes">;
    tag: string;
}, Promise<import("convex/values").GenericId<"noteTags">>>;
export declare const removeTag: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    noteId: import("convex/values").GenericId<"travelNotes">;
    tag: string;
}, Promise<void>>;
export declare const setTags: import("convex/server").RegisteredMutation<"public", {
    tags: string[];
    userId: string;
    noteId: import("convex/values").GenericId<"travelNotes">;
}, Promise<void>>;
export declare const getPopularTags: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
}, Promise<{
    tag: string;
    count: number;
}[]>>;
export declare const addPoi: import("convex/server").RegisteredMutation<"public", {
    mentionIndex?: number | undefined;
    userId: string;
    poiId: import("convex/values").GenericId<"pois">;
    noteId: import("convex/values").GenericId<"travelNotes">;
}, Promise<import("convex/values").GenericId<"notePois">>>;
export declare const removePoi: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    poiId: import("convex/values").GenericId<"pois">;
    noteId: import("convex/values").GenericId<"travelNotes">;
}, Promise<void>>;
export declare const search: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    query: string;
}, Promise<{
    data: {
        imageCount: number;
        coverImage: string;
        tags: string[];
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
    }[];
    total: number;
}>>;
