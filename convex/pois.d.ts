import type { Id } from './_generated/dataModel';
export declare const list: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    category?: "attraction" | "restaurant" | "hotel" | "shopping" | "other" | undefined;
}, Promise<{
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
}[]>>;
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"pois">;
}, Promise<{
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
} | null>>;
export declare const search: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    category?: "attraction" | "restaurant" | "hotel" | "shopping" | "other" | undefined;
    minRating?: number | undefined;
    query: string;
}, Promise<{
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
}[]>>;
export declare const getNearby: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    category?: "attraction" | "restaurant" | "hotel" | "shopping" | "other" | undefined;
    latitude: number;
    longitude: number;
    radiusKm: number;
}, Promise<{
    distance: number;
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
}[]>>;
export declare const getRecommendations: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    category?: "attraction" | "restaurant" | "hotel" | "shopping" | "other" | undefined;
    cityId: import("convex/values").GenericId<"cities">;
}, Promise<{
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
}[]>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    phone?: string | undefined;
    nameEn?: string | undefined;
    priceLevel?: number | undefined;
    externalId?: string | undefined;
    address?: string | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    businessHours?: any;
    imageUrls?: string[] | undefined;
    name: string;
    latitude: number;
    longitude: number;
    cityId: import("convex/values").GenericId<"cities">;
    category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
    source: string;
}, Promise<import("convex/values").GenericId<"pois">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    name?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    phone?: string | undefined;
    nameEn?: string | undefined;
    priceLevel?: number | undefined;
    category?: "attraction" | "restaurant" | "hotel" | "shopping" | "other" | undefined;
    address?: string | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    businessHours?: any;
    imageUrls?: string[] | undefined;
    id: import("convex/values").GenericId<"pois">;
}, Promise<{
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
} | null>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"pois">;
}, Promise<void>>;
export declare const bulkInsert: import("convex/server").RegisteredMutation<"public", {
    pois: {
        phone?: string | undefined;
        nameEn?: string | undefined;
        priceLevel?: number | undefined;
        externalId?: string | undefined;
        address?: string | undefined;
        rating?: number | undefined;
        ratingCount?: number | undefined;
        businessHours?: any;
        imageUrls?: string[] | undefined;
        name: string;
        latitude: number;
        longitude: number;
        cityId: import("convex/values").GenericId<"cities">;
        category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
        source: string;
    }[];
}, Promise<Id<"pois">[]>>;
