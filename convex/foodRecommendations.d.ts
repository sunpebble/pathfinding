/**
 * Food Recommendations Convex Functions
 * Handles restaurant discovery, food reviews, and cuisine recommendations
 */
/**
 * List restaurants with filters
 */
export declare const listRestaurants: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    priceLevel?: number | undefined;
    cuisineType?: string | undefined;
    isLocalFavorite?: boolean | undefined;
    minRating?: number | undefined;
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
 * Search restaurants by keyword
 */
export declare const searchRestaurants: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    cuisineType?: string | undefined;
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
 * Get restaurant by ID
 */
export declare const getRestaurantById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"pois">;
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
 * Get nearby restaurants
 */
export declare const getNearbyRestaurants: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cuisineType?: string | undefined;
    radiusKm?: number | undefined;
    latitude: number;
    longitude: number;
}, Promise<{
    distance: number;
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
 * Get local favorite restaurants
 */
export declare const getLocalFavorites: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cuisineType?: string | undefined;
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
 * Get restaurants by cuisine type
 */
export declare const getByCuisineType: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    cuisineType: string;
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
 * Get reviews for a restaurant
 */
export declare const getRestaurantReviews: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    restaurantId: import("convex/values").GenericId<"pois">;
}, Promise<{
    _id: import("convex/values").GenericId<"foodReviews">;
    _creationTime: number;
    content?: string | undefined;
    title?: string | undefined;
    imageUrls?: string[] | undefined;
    tags?: string[] | undefined;
    visitDate?: string | undefined;
    helpfulCount?: number | undefined;
    dishesOrdered?: string[] | undefined;
    recommendedDishes?: string[] | undefined;
    pricePerPerson?: number | undefined;
    createdAt: number;
    userId: string;
    updatedAt: number;
    rating: number;
    wouldRecommend: boolean;
    restaurantId: import("convex/values").GenericId<"pois">;
}[]>>;
/**
 * Get user's review for a restaurant
 */
export declare const getUserReview: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    restaurantId: import("convex/values").GenericId<"pois">;
}, Promise<{
    _id: import("convex/values").GenericId<"foodReviews">;
    _creationTime: number;
    content?: string | undefined;
    title?: string | undefined;
    imageUrls?: string[] | undefined;
    tags?: string[] | undefined;
    visitDate?: string | undefined;
    helpfulCount?: number | undefined;
    dishesOrdered?: string[] | undefined;
    recommendedDishes?: string[] | undefined;
    pricePerPerson?: number | undefined;
    createdAt: number;
    userId: string;
    updatedAt: number;
    rating: number;
    wouldRecommend: boolean;
    restaurantId: import("convex/values").GenericId<"pois">;
} | null>>;
/**
 * Create or update a food review
 */
export declare const createFoodReview: import("convex/server").RegisteredMutation<"public", {
    content?: string | undefined;
    title?: string | undefined;
    imageUrls?: string[] | undefined;
    tags?: string[] | undefined;
    visitDate?: string | undefined;
    dishesOrdered?: string[] | undefined;
    recommendedDishes?: string[] | undefined;
    pricePerPerson?: number | undefined;
    userId: string;
    rating: number;
    wouldRecommend: boolean;
    restaurantId: import("convex/values").GenericId<"pois">;
}, Promise<import("convex/values").GenericId<"foodReviews">>>;
/**
 * Delete a food review
 */
export declare const deleteFoodReview: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    reviewId: import("convex/values").GenericId<"foodReviews">;
}, Promise<void>>;
/**
 * Mark a review as helpful
 */
export declare const markReviewHelpful: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    reviewId: import("convex/values").GenericId<"foodReviews">;
}, Promise<{
    action: string;
}>>;
/**
 * Add restaurant to favorites
 */
export declare const addToFavorites: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    collectionId?: import("convex/values").GenericId<"foodCollections"> | undefined;
    userId: string;
    restaurantId: import("convex/values").GenericId<"pois">;
}, Promise<import("convex/values").GenericId<"foodFavorites">>>;
/**
 * Remove restaurant from favorites
 */
export declare const removeFromFavorites: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    restaurantId: import("convex/values").GenericId<"pois">;
}, Promise<void>>;
/**
 * Get user's favorite restaurants
 */
export declare const getUserFavorites: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    collectionId?: import("convex/values").GenericId<"foodCollections"> | undefined;
    userId: string;
}, Promise<{
    restaurant: {
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
    _id: import("convex/values").GenericId<"foodFavorites">;
    _creationTime: number;
    notes?: string | undefined;
    collectionId?: import("convex/values").GenericId<"foodCollections"> | undefined;
    createdAt: number;
    userId: string;
    restaurantId: import("convex/values").GenericId<"pois">;
}[]>>;
/**
 * Check if restaurant is in favorites
 */
export declare const isInFavorites: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    restaurantId: import("convex/values").GenericId<"pois">;
}, Promise<boolean>>;
/**
 * Create a food collection
 */
export declare const createCollection: import("convex/server").RegisteredMutation<"public", {
    description?: string | undefined;
    coverImageUrl?: string | undefined;
    isPublic?: boolean | undefined;
    name: string;
    userId: string;
}, Promise<import("convex/values").GenericId<"foodCollections">>>;
/**
 * Get user's collections
 */
export declare const getUserCollections: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"foodCollections">;
    _creationTime: number;
    description?: string | undefined;
    coverImageUrl?: string | undefined;
    createdAt: number;
    name: string;
    userId: string;
    updatedAt: number;
    isPublic: boolean;
    itemCount: number;
}[]>>;
/**
 * Delete a collection
 */
export declare const deleteCollection: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    collectionId: import("convex/values").GenericId<"foodCollections">;
}, Promise<void>>;
/**
 * Get available cuisine types for a city
 */
export declare const getCuisineTypes: import("convex/server").RegisteredQuery<"public", {
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
}, Promise<{
    name: string;
    count: number;
}[]>>;
