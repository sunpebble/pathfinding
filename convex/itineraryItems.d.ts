export declare const listByDay: import("convex/server").RegisteredQuery<"public", {
    dayId: import("convex/values").GenericId<"itineraryDays">;
}, Promise<{
    poi: {
        id: import("convex/values").GenericId<"pois">;
        name: string;
        nameEn: string | undefined;
        category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
        address: string | undefined;
        latitude: number;
        longitude: number;
        rating: number | undefined;
    } | null;
    _id: import("convex/values").GenericId<"itineraryItems">;
    _creationTime: number;
    notes?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    poiId: import("convex/values").GenericId<"pois">;
    dayId: import("convex/values").GenericId<"itineraryDays">;
    orderIndex: number;
    transportMode: "walking" | "driving" | "transit" | "cycling" | "taxi";
}[]>>;
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"itineraryItems">;
}, Promise<{
    poi: {
        _id: import("convex/values").GenericId<"pois">;
        _creationTime: number;
        imageUrls?: string[] | undefined;
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
    } | null;
    _id: import("convex/values").GenericId<"itineraryItems">;
    _creationTime: number;
    notes?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    poiId: import("convex/values").GenericId<"pois">;
    dayId: import("convex/values").GenericId<"itineraryDays">;
    orderIndex: number;
    transportMode: "walking" | "driving" | "transit" | "cycling" | "taxi";
} | null>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    orderIndex?: number | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    transportMode?: "walking" | "driving" | "transit" | "cycling" | "taxi" | undefined;
    userId: string;
    poiId: import("convex/values").GenericId<"pois">;
    dayId: import("convex/values").GenericId<"itineraryDays">;
}, Promise<import("convex/values").GenericId<"itineraryItems">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    orderIndex?: number | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    transportMode?: "walking" | "driving" | "transit" | "cycling" | "taxi" | undefined;
    id: import("convex/values").GenericId<"itineraryItems">;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"itineraryItems">;
    _creationTime: number;
    notes?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    poiId: import("convex/values").GenericId<"pois">;
    dayId: import("convex/values").GenericId<"itineraryDays">;
    orderIndex: number;
    transportMode: "walking" | "driving" | "transit" | "cycling" | "taxi";
} | null>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"itineraryItems">;
    userId: string;
}, Promise<void>>;
export declare const reorder: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    itemId: import("convex/values").GenericId<"itineraryItems">;
    newOrderIndex: number;
}, Promise<void>>;
export declare const moveToDay: import("convex/server").RegisteredMutation<"public", {
    orderIndex?: number | undefined;
    userId: string;
    itemId: import("convex/values").GenericId<"itineraryItems">;
    newDayId: import("convex/values").GenericId<"itineraryDays">;
}, Promise<{
    _id: import("convex/values").GenericId<"itineraryItems">;
    _creationTime: number;
    notes?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    poiId: import("convex/values").GenericId<"pois">;
    dayId: import("convex/values").GenericId<"itineraryDays">;
    orderIndex: number;
    transportMode: "walking" | "driving" | "transit" | "cycling" | "taxi";
} | null>>;
