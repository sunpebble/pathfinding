import type { Id } from './_generated/dataModel';
/**
 * Get POI with business hours and open/closed status
 */
export declare const getPoiWithBusinessHours: import("convex/server").RegisteredQuery<"public", {
    timezone?: string | undefined;
    poiId: import("convex/values").GenericId<"pois">;
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
    };
    openStatus: {
        isOpen: boolean;
        nextOpenTime: string | null;
        nextCloseTime: string | null;
        currentDay: string;
        todayHours: {
            open: string;
            close: string;
        }[] | undefined;
        holidayInfo: {
            holidayName: string;
            holidayNameEn: string | undefined;
            isClosed: boolean;
            hours: {
                open: string;
                close: string;
            }[] | undefined;
            notes: string | undefined;
        } | null;
    };
    bestVisitTime: {
        recommendedTime?: string | undefined;
        reason?: string | undefined;
        avoidTimes?: string[] | undefined;
        peakHours?: string[] | undefined;
        seasonalNotes?: string | undefined;
    } | undefined;
} | null>>;
/**
 * Get business hours for multiple POIs
 */
export declare const getBatchPoiBusinessHours: import("convex/server").RegisteredQuery<"public", {
    poiIds: import("convex/values").GenericId<"pois">[];
}, Promise<{
    poiId: Id<"pois">;
    businessHours: unknown;
    bestVisitTime: unknown;
}[]>>;
/**
 * Get holiday hours for a POI
 */
export declare const getHolidayHours: import("convex/server").RegisteredQuery<"public", {
    includeExpired?: boolean | undefined;
    poiId: import("convex/values").GenericId<"pois">;
}, Promise<{
    _id: import("convex/values").GenericId<"poiHolidayHours">;
    _creationTime: number;
    notes?: string | undefined;
    holidayNameEn?: string | undefined;
    hours?: {
        open: string;
        close: string;
    }[] | undefined;
    createdAt: number;
    startDate: string;
    endDate: string;
    updatedAt: number;
    poiId: import("convex/values").GenericId<"pois">;
    holidayName: string;
    isClosed: boolean;
    isRecurring: boolean;
}[]>>;
/**
 * Get upcoming holidays for a date range
 */
export declare const getUpcomingHolidays: import("convex/server").RegisteredQuery<"public", {
    startDate: string;
    endDate: string;
    poiId: import("convex/values").GenericId<"pois">;
}, Promise<{
    _id: import("convex/values").GenericId<"poiHolidayHours">;
    _creationTime: number;
    notes?: string | undefined;
    holidayNameEn?: string | undefined;
    hours?: {
        open: string;
        close: string;
    }[] | undefined;
    createdAt: number;
    startDate: string;
    endDate: string;
    updatedAt: number;
    poiId: import("convex/values").GenericId<"pois">;
    holidayName: string;
    isClosed: boolean;
    isRecurring: boolean;
}[]>>;
/**
 * Update business hours for a POI
 */
export declare const updateBusinessHours: import("convex/server").RegisteredMutation<"public", {
    businessHours: {
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
    };
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
 * Update best visit time for a POI
 */
export declare const updateBestVisitTime: import("convex/server").RegisteredMutation<"public", {
    bestVisitTime: {
        recommendedTime?: string | undefined;
        reason?: string | undefined;
        avoidTimes?: string[] | undefined;
        peakHours?: string[] | undefined;
        seasonalNotes?: string | undefined;
    };
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
 * Create holiday hours for a POI
 */
export declare const createHolidayHours: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    holidayNameEn?: string | undefined;
    hours?: {
        open: string;
        close: string;
    }[] | undefined;
    startDate: string;
    endDate: string;
    poiId: import("convex/values").GenericId<"pois">;
    holidayName: string;
    isClosed: boolean;
    isRecurring: boolean;
}, Promise<import("convex/values").GenericId<"poiHolidayHours">>>;
/**
 * Update holiday hours
 */
export declare const updateHolidayHours: import("convex/server").RegisteredMutation<"public", {
    startDate?: string | undefined;
    endDate?: string | undefined;
    notes?: string | undefined;
    holidayName?: string | undefined;
    holidayNameEn?: string | undefined;
    isClosed?: boolean | undefined;
    hours?: {
        open: string;
        close: string;
    }[] | undefined;
    isRecurring?: boolean | undefined;
    id: import("convex/values").GenericId<"poiHolidayHours">;
}, Promise<{
    _id: import("convex/values").GenericId<"poiHolidayHours">;
    _creationTime: number;
    notes?: string | undefined;
    holidayNameEn?: string | undefined;
    hours?: {
        open: string;
        close: string;
    }[] | undefined;
    createdAt: number;
    startDate: string;
    endDate: string;
    updatedAt: number;
    poiId: import("convex/values").GenericId<"pois">;
    holidayName: string;
    isClosed: boolean;
    isRecurring: boolean;
} | null>>;
/**
 * Delete holiday hours
 */
export declare const deleteHolidayHours: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"poiHolidayHours">;
}, Promise<void>>;
/**
 * Create a business hours reminder
 */
export declare const createReminder: import("convex/server").RegisteredMutation<"public", {
    itineraryItemId?: import("convex/values").GenericId<"itineraryItems"> | undefined;
    userId: string;
    poiId: import("convex/values").GenericId<"pois">;
    reminderType: "opening" | "closing" | "best_time";
    minutesBefore: number;
    scheduledTime: number;
}, Promise<import("convex/values").GenericId<"poiBusinessHoursReminders">>>;
/**
 * Get user's reminders
 */
export declare const getUserReminders: import("convex/server").RegisteredQuery<"public", {
    includeTriggered?: boolean | undefined;
    userId: string;
}, Promise<{
    poi: {
        id: import("convex/values").GenericId<"pois">;
        name: string;
        category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
        address: string | undefined;
    } | null;
    _id: import("convex/values").GenericId<"poiBusinessHoursReminders">;
    _creationTime: number;
    itineraryItemId?: import("convex/values").GenericId<"itineraryItems"> | undefined;
    triggeredAt?: number | undefined;
    createdAt: number;
    userId: string;
    poiId: import("convex/values").GenericId<"pois">;
    reminderType: "opening" | "closing" | "best_time";
    minutesBefore: number;
    scheduledTime: number;
    isTriggered: boolean;
}[]>>;
/**
 * Get pending reminders for processing
 */
export declare const getPendingReminders: import("convex/server").RegisteredQuery<"public", {
    beforeTime: number;
}, Promise<{
    _id: import("convex/values").GenericId<"poiBusinessHoursReminders">;
    _creationTime: number;
    itineraryItemId?: import("convex/values").GenericId<"itineraryItems"> | undefined;
    triggeredAt?: number | undefined;
    createdAt: number;
    userId: string;
    poiId: import("convex/values").GenericId<"pois">;
    reminderType: "opening" | "closing" | "best_time";
    minutesBefore: number;
    scheduledTime: number;
    isTriggered: boolean;
}[]>>;
/**
 * Mark reminder as triggered
 */
export declare const triggerReminder: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"poiBusinessHoursReminders">;
}, Promise<void>>;
/**
 * Delete a reminder
 */
export declare const deleteReminder: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"poiBusinessHoursReminders">;
}, Promise<void>>;
/**
 * Delete all reminders for a POI
 */
export declare const deletePoiReminders: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    poiId: import("convex/values").GenericId<"pois">;
}, Promise<number>>;
