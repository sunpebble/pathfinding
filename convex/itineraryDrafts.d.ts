/**
 * List drafts for a user
 */
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        cityName: string | undefined;
        _id: import("convex/values").GenericId<"itineraryDrafts">;
        _creationTime: number;
        startDate?: string | undefined;
        endDate?: string | undefined;
        days?: {
            date?: string | undefined;
            items: {
                notes?: string | undefined;
                poiId?: import("convex/values").GenericId<"pois"> | undefined;
                startTime?: string | undefined;
                endTime?: string | undefined;
                transportMode?: "walking" | "driving" | "transit" | "cycling" | "taxi" | undefined;
                inlinePoi?: {
                    latitude?: number | undefined;
                    longitude?: number | undefined;
                    address?: string | undefined;
                    name: string;
                    category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
                } | undefined;
                orderIndex: number;
            }[];
            dayNumber: number;
        }[] | undefined;
        visibility?: "public" | "private" | "team" | undefined;
        cityId?: import("convex/values").GenericId<"cities"> | undefined;
        coverImageUrl?: string | undefined;
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        deviceId?: string | undefined;
        title: string;
        userId: string;
        expiresAt: number;
        lastModifiedAt: number;
        syncVersion: number;
    }[];
    total: number;
}>>;
/**
 * Get a specific draft by ID
 */
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"itineraryDrafts">;
}, Promise<{
    cityName: string | undefined;
    _id: import("convex/values").GenericId<"itineraryDrafts">;
    _creationTime: number;
    startDate?: string | undefined;
    endDate?: string | undefined;
    days?: {
        date?: string | undefined;
        items: {
            notes?: string | undefined;
            poiId?: import("convex/values").GenericId<"pois"> | undefined;
            startTime?: string | undefined;
            endTime?: string | undefined;
            transportMode?: "walking" | "driving" | "transit" | "cycling" | "taxi" | undefined;
            inlinePoi?: {
                latitude?: number | undefined;
                longitude?: number | undefined;
                address?: string | undefined;
                name: string;
                category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
            } | undefined;
            orderIndex: number;
        }[];
        dayNumber: number;
    }[] | undefined;
    visibility?: "public" | "private" | "team" | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    coverImageUrl?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    deviceId?: string | undefined;
    title: string;
    userId: string;
    expiresAt: number;
    lastModifiedAt: number;
    syncVersion: number;
} | null>>;
/**
 * Get draft for a specific itinerary (for editing existing itinerary)
 */
export declare const getByItinerary: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    cityName: string | undefined;
    _id: import("convex/values").GenericId<"itineraryDrafts">;
    _creationTime: number;
    startDate?: string | undefined;
    endDate?: string | undefined;
    days?: {
        date?: string | undefined;
        items: {
            notes?: string | undefined;
            poiId?: import("convex/values").GenericId<"pois"> | undefined;
            startTime?: string | undefined;
            endTime?: string | undefined;
            transportMode?: "walking" | "driving" | "transit" | "cycling" | "taxi" | undefined;
            inlinePoi?: {
                latitude?: number | undefined;
                longitude?: number | undefined;
                address?: string | undefined;
                name: string;
                category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
            } | undefined;
            orderIndex: number;
        }[];
        dayNumber: number;
    }[] | undefined;
    visibility?: "public" | "private" | "team" | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    coverImageUrl?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    deviceId?: string | undefined;
    title: string;
    userId: string;
    expiresAt: number;
    lastModifiedAt: number;
    syncVersion: number;
} | null>>;
/**
 * Save or update a draft (auto-save)
 * Uses optimistic locking via syncVersion for multi-device sync
 */
export declare const save: import("convex/server").RegisteredMutation<"public", {
    startDate?: string | undefined;
    endDate?: string | undefined;
    days?: {
        date?: string | undefined;
        items: {
            notes?: string | undefined;
            poiId?: import("convex/values").GenericId<"pois"> | undefined;
            startTime?: string | undefined;
            endTime?: string | undefined;
            transportMode?: "walking" | "driving" | "transit" | "cycling" | "taxi" | undefined;
            inlinePoi?: {
                latitude?: number | undefined;
                longitude?: number | undefined;
                address?: string | undefined;
                name: string;
                category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
            } | undefined;
            orderIndex: number;
        }[];
        dayNumber: number;
    }[] | undefined;
    visibility?: "public" | "private" | "team" | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    coverImageUrl?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    deviceId?: string | undefined;
    draftId?: import("convex/values").GenericId<"itineraryDrafts"> | undefined;
    expectedVersion?: number | undefined;
    title: string;
    userId: string;
}, Promise<import("convex/values").GenericId<"itineraryDrafts">>>;
/**
 * Delete a draft
 */
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"itineraryDrafts">;
    userId: string;
}, Promise<void>>;
/**
 * Delete draft for a specific itinerary (called after successful save)
 */
export declare const removeByItinerary: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<void>>;
/**
 * Clean up expired drafts (should be called periodically via cron)
 */
export declare const cleanupExpired: import("convex/server").RegisteredMutation<"public", {
    batchSize?: number | undefined;
}, Promise<{
    deletedCount: number;
    hasMore: boolean;
}>>;
/**
 * Get draft count for a user (for UI badge)
 */
export declare const countByUser: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<number>>;
/**
 * Extend draft expiration (user wants to keep it longer)
 */
export declare const extendExpiration: import("convex/server").RegisteredMutation<"public", {
    additionalDays?: number | undefined;
    id: import("convex/values").GenericId<"itineraryDrafts">;
    userId: string;
}, Promise<{
    expiresAt: number;
}>>;
