/**
 * Itinerary Favorites - Save itineraries to collections
 */
export declare const add: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    collectionId?: import("convex/values").GenericId<"favoriteCollections"> | undefined;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<import("convex/values").GenericId<"itineraryFavorites">>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    removed: boolean;
}>>;
export declare const toggle: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    favorited: boolean;
}>>;
export declare const isFavorited: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    favorited: boolean;
    collectionId: import("convex/values").GenericId<"favoriteCollections"> | undefined;
}>>;
export declare const getCount: import("convex/server").RegisteredQuery<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    count: number;
}>>;
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    collectionId?: import("convex/values").GenericId<"favoriteCollections"> | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        itinerary: {
            cityName: string | undefined;
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
        };
        collectionName: string | undefined;
        _id: import("convex/values").GenericId<"itineraryFavorites">;
        _creationTime: number;
        notes?: string | undefined;
        collectionId?: import("convex/values").GenericId<"favoriteCollections"> | undefined;
        createdAt: number;
        userId: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
    }[];
    total: number;
}>>;
export declare const moveToCollection: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    favoriteId: import("convex/values").GenericId<"itineraryFavorites">;
    newCollectionId: import("convex/values").GenericId<"favoriteCollections">;
}, Promise<{
    _id: import("convex/values").GenericId<"itineraryFavorites">;
    _creationTime: number;
    notes?: string | undefined;
    collectionId?: import("convex/values").GenericId<"favoriteCollections"> | undefined;
    createdAt: number;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
} | null>>;
export declare const updateNotes: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    userId: string;
    favoriteId: import("convex/values").GenericId<"itineraryFavorites">;
}, Promise<{
    _id: import("convex/values").GenericId<"itineraryFavorites">;
    _creationTime: number;
    notes?: string | undefined;
    collectionId?: import("convex/values").GenericId<"favoriteCollections"> | undefined;
    createdAt: number;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
} | null>>;
export declare const batchCheckFavorites: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    itineraryIds: import("convex/values").GenericId<"itineraries">[];
}, Promise<Record<string, boolean>>>;
export declare const batchGetCounts: import("convex/server").RegisteredQuery<"public", {
    itineraryIds: import("convex/values").GenericId<"itineraries">[];
}, Promise<Record<string, number>>>;
