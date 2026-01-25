/**
 * Itinerary Likes - User like/unlike operations for public itineraries
 */
export declare const toggle: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    liked: boolean;
}>>;
export declare const isLiked: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    liked: boolean;
}>>;
export declare const getCount: import("convex/server").RegisteredQuery<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    count: number;
}>>;
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
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
        _id: import("convex/values").GenericId<"itineraryLikes">;
        _creationTime: number;
        userId: string;
        createdAt: number;
        itineraryId: import("convex/values").GenericId<"itineraries">;
    }[];
    total: number;
}>>;
export declare const batchCheckLikes: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    itineraryIds: import("convex/values").GenericId<"itineraries">[];
}, Promise<Record<string, boolean>>>;
export declare const batchGetCounts: import("convex/server").RegisteredQuery<"public", {
    itineraryIds: import("convex/values").GenericId<"itineraries">[];
}, Promise<Record<string, number>>>;
