/**
 * Favorite Collections - User-managed folders for organizing saved itineraries
 */
export declare const create: import("convex/server").RegisteredMutation<"public", {
    description?: string | undefined;
    coverImageUrl?: string | undefined;
    isDefault?: boolean | undefined;
    name: string;
    userId: string;
}, Promise<import("convex/values").GenericId<"favoriteCollections">>>;
export declare const getOrCreateDefault: import("convex/server").RegisteredMutation<"public", {
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"favoriteCollections">;
    _creationTime: number;
    description?: string | undefined;
    coverImageUrl?: string | undefined;
    name: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    sortOrder: number;
    isDefault: boolean;
} | null>>;
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    itemCount: number;
    _id: import("convex/values").GenericId<"favoriteCollections">;
    _creationTime: number;
    description?: string | undefined;
    coverImageUrl?: string | undefined;
    name: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    sortOrder: number;
    isDefault: boolean;
}[]>>;
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    id: import("convex/values").GenericId<"favoriteCollections">;
}, Promise<{
    items: {
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
        _id: import("convex/values").GenericId<"itineraryFavorites">;
        _creationTime: number;
        notes?: string | undefined;
        collectionId?: import("convex/values").GenericId<"favoriteCollections"> | undefined;
        userId: string;
        createdAt: number;
        itineraryId: import("convex/values").GenericId<"itineraries">;
    }[];
    total: number;
    _id: import("convex/values").GenericId<"favoriteCollections">;
    _creationTime: number;
    description?: string | undefined;
    coverImageUrl?: string | undefined;
    name: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    sortOrder: number;
    isDefault: boolean;
} | null>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    name?: string | undefined;
    description?: string | undefined;
    coverImageUrl?: string | undefined;
    isDefault?: boolean | undefined;
    id: import("convex/values").GenericId<"favoriteCollections">;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"favoriteCollections">;
    _creationTime: number;
    description?: string | undefined;
    coverImageUrl?: string | undefined;
    name: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    sortOrder: number;
    isDefault: boolean;
} | null>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"favoriteCollections">;
    userId: string;
}, Promise<void>>;
export declare const reorder: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    orderedIds: import("convex/values").GenericId<"favoriteCollections">[];
}, Promise<void>>;
