import type { Id } from './_generated/dataModel';
/**
 * List hidden gem POIs with optional filters
 */
export declare const listHiddenGems: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    category?: "attraction" | "restaurant" | "hotel" | "shopping" | "other" | undefined;
    popularityLevel?: "hidden" | "emerging" | "moderate" | "popular" | "crowded" | undefined;
    minHiddenGemRating?: number | undefined;
    onlyLocalRecommended?: boolean | undefined;
}, Promise<{
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
}[]>>;
/**
 * Get hidden gems by popularity level
 */
export declare const getByPopularityLevel: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    popularityLevel: "hidden" | "emerging" | "moderate" | "popular" | "crowded";
}, Promise<{
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
}[]>>;
/**
 * Get local recommended POIs
 */
export declare const getLocalRecommendations: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    category?: "attraction" | "restaurant" | "hotel" | "shopping" | "other" | undefined;
    cityId: import("convex/values").GenericId<"cities">;
}, Promise<{
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
}[]>>;
/**
 * Search hidden gems by keyword
 */
export declare const searchHiddenGems: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    category?: "attraction" | "restaurant" | "hotel" | "shopping" | "other" | undefined;
    query: string;
}, Promise<{
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
}[]>>;
/**
 * Mark a POI as a hidden gem
 */
export declare const markAsHiddenGem: import("convex/server").RegisteredMutation<"public", {
    hiddenGemScore?: number | undefined;
    localRecommendation?: {
        localTips?: string | undefined;
        bestTimeToVisit?: string | undefined;
        localSecrets?: string[] | undefined;
        recommendedBy?: string | undefined;
        isLocalRecommended: boolean;
    } | undefined;
    popularityLevel?: "hidden" | "emerging" | "moderate" | "popular" | "crowded" | undefined;
    poiId: import("convex/values").GenericId<"pois">;
}, Promise<{
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
} | null>>;
/**
 * Update hidden gem metadata
 */
export declare const updateHiddenGemInfo: import("convex/server").RegisteredMutation<"public", {
    hiddenGemScore?: number | undefined;
    localRecommendation?: {
        localTips?: string | undefined;
        bestTimeToVisit?: string | undefined;
        localSecrets?: string[] | undefined;
        recommendedBy?: string | undefined;
        isLocalRecommended: boolean;
    } | undefined;
    popularityLevel?: "hidden" | "emerging" | "moderate" | "popular" | "crowded" | undefined;
    poiId: import("convex/values").GenericId<"pois">;
}, Promise<{
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
} | null>>;
/**
 * Submit a new hidden gem POI
 */
export declare const submitHiddenGem: import("convex/server").RegisteredMutation<"public", {
    imageUrls?: string[] | undefined;
    nameEn?: string | undefined;
    address?: string | undefined;
    avoidTimes?: string | undefined;
    localTips?: string | undefined;
    bestTimeToVisit?: string | undefined;
    localSecrets?: string[] | undefined;
    priceRange?: string | undefined;
    howDiscovered?: string | undefined;
    name: string;
    description: string;
    latitude: number;
    longitude: number;
    userId: string;
    cityId: import("convex/values").GenericId<"cities">;
    category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
}, Promise<import("convex/values").GenericId<"userSubmittedPois">>>;
/**
 * List user submitted POIs
 */
export declare const listUserSubmittedPois: import("convex/server").RegisteredQuery<"public", {
    status?: "approved" | "rejected" | "pending" | "merged" | undefined;
    limit?: number | undefined;
    userId?: string | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    category?: "attraction" | "restaurant" | "hotel" | "shopping" | "other" | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"userSubmittedPois">;
    _creationTime: number;
    imageUrls?: string[] | undefined;
    updatedAt?: number | undefined;
    nameEn?: string | undefined;
    address?: string | undefined;
    avoidTimes?: string | undefined;
    localTips?: string | undefined;
    bestTimeToVisit?: string | undefined;
    localSecrets?: string[] | undefined;
    priceRange?: string | undefined;
    howDiscovered?: string | undefined;
    moderatorNotes?: string | undefined;
    reviewedBy?: string | undefined;
    reviewedAt?: number | undefined;
    mergedPoiId?: import("convex/values").GenericId<"pois"> | undefined;
    status: "approved" | "rejected" | "pending" | "merged";
    createdAt: number;
    name: string;
    description: string;
    latitude: number;
    longitude: number;
    userId: string;
    cityId: import("convex/values").GenericId<"cities">;
    category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
    upvotes: number;
    downvotes: number;
    viewCount: number;
}[]>>;
/**
 * Get a user submitted POI by ID
 */
export declare const getUserSubmittedPoiById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"userSubmittedPois">;
}, Promise<{
    _id: import("convex/values").GenericId<"userSubmittedPois">;
    _creationTime: number;
    imageUrls?: string[] | undefined;
    updatedAt?: number | undefined;
    nameEn?: string | undefined;
    address?: string | undefined;
    avoidTimes?: string | undefined;
    localTips?: string | undefined;
    bestTimeToVisit?: string | undefined;
    localSecrets?: string[] | undefined;
    priceRange?: string | undefined;
    howDiscovered?: string | undefined;
    moderatorNotes?: string | undefined;
    reviewedBy?: string | undefined;
    reviewedAt?: number | undefined;
    mergedPoiId?: import("convex/values").GenericId<"pois"> | undefined;
    status: "approved" | "rejected" | "pending" | "merged";
    createdAt: number;
    name: string;
    description: string;
    latitude: number;
    longitude: number;
    userId: string;
    cityId: import("convex/values").GenericId<"cities">;
    category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
    upvotes: number;
    downvotes: number;
    viewCount: number;
} | null>>;
/**
 * Vote on a user submitted POI
 */
export declare const voteOnUserSubmittedPoi: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    poiId: import("convex/values").GenericId<"userSubmittedPois">;
    voteType: "up" | "down";
}, Promise<{
    action: string;
    voteType: "up" | "down";
}>>;
/**
 * Update user submitted POI status (for moderation)
 */
export declare const updateUserSubmittedPoiStatus: import("convex/server").RegisteredMutation<"public", {
    moderatorNotes?: string | undefined;
    status: "approved" | "rejected" | "pending" | "merged";
    reviewedBy: string;
    poiId: import("convex/values").GenericId<"userSubmittedPois">;
}, Promise<{
    _id: import("convex/values").GenericId<"userSubmittedPois">;
    _creationTime: number;
    imageUrls?: string[] | undefined;
    updatedAt?: number | undefined;
    nameEn?: string | undefined;
    address?: string | undefined;
    avoidTimes?: string | undefined;
    localTips?: string | undefined;
    bestTimeToVisit?: string | undefined;
    localSecrets?: string[] | undefined;
    priceRange?: string | undefined;
    howDiscovered?: string | undefined;
    moderatorNotes?: string | undefined;
    reviewedBy?: string | undefined;
    reviewedAt?: number | undefined;
    mergedPoiId?: import("convex/values").GenericId<"pois"> | undefined;
    status: "approved" | "rejected" | "pending" | "merged";
    createdAt: number;
    name: string;
    description: string;
    latitude: number;
    longitude: number;
    userId: string;
    cityId: import("convex/values").GenericId<"cities">;
    category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
    upvotes: number;
    downvotes: number;
    viewCount: number;
} | null>>;
/**
 * Increment view count for user submitted POI
 */
export declare const incrementViewCount: import("convex/server").RegisteredMutation<"public", {
    poiId: import("convex/values").GenericId<"userSubmittedPois">;
}, Promise<void>>;
/**
 * Rate a hidden gem POI
 */
export declare const rateHiddenGem: import("convex/server").RegisteredMutation<"public", {
    review?: string | undefined;
    visitDate?: string | undefined;
    userId: string;
    rating: number;
    poiId: import("convex/values").GenericId<"pois">;
    wouldRecommend: boolean;
}, Promise<Id<"hiddenGemRatings">>>;
/**
 * Get ratings for a hidden gem POI
 */
export declare const getHiddenGemRatings: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    poiId: import("convex/values").GenericId<"pois">;
}, Promise<{
    _id: import("convex/values").GenericId<"hiddenGemRatings">;
    _creationTime: number;
    updatedAt?: number | undefined;
    review?: string | undefined;
    visitDate?: string | undefined;
    createdAt: number;
    userId: string;
    rating: number;
    poiId: import("convex/values").GenericId<"pois">;
    wouldRecommend: boolean;
}[]>>;
/**
 * Get user's rating for a POI
 */
export declare const getUserRating: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    poiId: import("convex/values").GenericId<"pois">;
}, Promise<{
    _id: import("convex/values").GenericId<"hiddenGemRatings">;
    _creationTime: number;
    updatedAt?: number | undefined;
    review?: string | undefined;
    visitDate?: string | undefined;
    createdAt: number;
    userId: string;
    rating: number;
    poiId: import("convex/values").GenericId<"pois">;
    wouldRecommend: boolean;
} | null>>;
/**
 * Delete a hidden gem rating
 */
export declare const deleteRating: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    ratingId: import("convex/values").GenericId<"hiddenGemRatings">;
}, Promise<void>>;
