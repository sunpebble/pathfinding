import type { Id } from './_generated/dataModel';
/**
 * List tickets for a specific POI
 */
export declare const listByPoi: import("convex/server").RegisteredQuery<"public", {
    activeOnly?: boolean | undefined;
    poiId: import("convex/values").GenericId<"pois">;
}, Promise<{
    _id: import("convex/values").GenericId<"poiTickets">;
    _creationTime: number;
    currency?: string | undefined;
    source?: string | undefined;
    originalPrice?: number | undefined;
    discountInfo?: string | undefined;
    discountPercentage?: number | undefined;
    eligibilityRequirements?: string | undefined;
    ageRange?: {
        minAge?: number | undefined;
        maxAge?: number | undefined;
    } | undefined;
    validFrom?: number | undefined;
    validUntil?: number | undefined;
    validDays?: number | undefined;
    purchaseUrl?: string | undefined;
    purchasePlatform?: string | undefined;
    reservationUrl?: string | undefined;
    reservationTips?: string | undefined;
    advanceBookingDays?: number | undefined;
    usageInstructions?: string | undefined;
    includedServices?: string[] | undefined;
    excludedServices?: string[] | undefined;
    stockStatus?: "unknown" | "in_stock" | "low_stock" | "sold_out" | undefined;
    isRecommended?: boolean | undefined;
    lastSyncedAt?: number | undefined;
    createdAt: number;
    updatedAt: number;
    sortOrder: number;
    poiId: import("convex/values").GenericId<"pois">;
    ticketName: string;
    ticketType: "other" | "adult" | "student" | "senior" | "child" | "group" | "family" | "vip" | "free";
    price: number;
    requiresReservation: boolean;
    isActive: boolean;
}[]>>;
/**
 * Get a ticket by ID
 */
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"poiTickets">;
}, Promise<{
    _id: import("convex/values").GenericId<"poiTickets">;
    _creationTime: number;
    currency?: string | undefined;
    source?: string | undefined;
    originalPrice?: number | undefined;
    discountInfo?: string | undefined;
    discountPercentage?: number | undefined;
    eligibilityRequirements?: string | undefined;
    ageRange?: {
        minAge?: number | undefined;
        maxAge?: number | undefined;
    } | undefined;
    validFrom?: number | undefined;
    validUntil?: number | undefined;
    validDays?: number | undefined;
    purchaseUrl?: string | undefined;
    purchasePlatform?: string | undefined;
    reservationUrl?: string | undefined;
    reservationTips?: string | undefined;
    advanceBookingDays?: number | undefined;
    usageInstructions?: string | undefined;
    includedServices?: string[] | undefined;
    excludedServices?: string[] | undefined;
    stockStatus?: "unknown" | "in_stock" | "low_stock" | "sold_out" | undefined;
    isRecommended?: boolean | undefined;
    lastSyncedAt?: number | undefined;
    createdAt: number;
    updatedAt: number;
    sortOrder: number;
    poiId: import("convex/values").GenericId<"pois">;
    ticketName: string;
    ticketType: "other" | "adult" | "student" | "senior" | "child" | "group" | "family" | "vip" | "free";
    price: number;
    requiresReservation: boolean;
    isActive: boolean;
} | null>>;
/**
 * List tickets by type for a POI
 */
export declare const listByType: import("convex/server").RegisteredQuery<"public", {
    poiId: import("convex/values").GenericId<"pois">;
    ticketType: "other" | "adult" | "student" | "senior" | "child" | "group" | "family" | "vip" | "free";
}, Promise<{
    _id: import("convex/values").GenericId<"poiTickets">;
    _creationTime: number;
    currency?: string | undefined;
    source?: string | undefined;
    originalPrice?: number | undefined;
    discountInfo?: string | undefined;
    discountPercentage?: number | undefined;
    eligibilityRequirements?: string | undefined;
    ageRange?: {
        minAge?: number | undefined;
        maxAge?: number | undefined;
    } | undefined;
    validFrom?: number | undefined;
    validUntil?: number | undefined;
    validDays?: number | undefined;
    purchaseUrl?: string | undefined;
    purchasePlatform?: string | undefined;
    reservationUrl?: string | undefined;
    reservationTips?: string | undefined;
    advanceBookingDays?: number | undefined;
    usageInstructions?: string | undefined;
    includedServices?: string[] | undefined;
    excludedServices?: string[] | undefined;
    stockStatus?: "unknown" | "in_stock" | "low_stock" | "sold_out" | undefined;
    isRecommended?: boolean | undefined;
    lastSyncedAt?: number | undefined;
    createdAt: number;
    updatedAt: number;
    sortOrder: number;
    poiId: import("convex/values").GenericId<"pois">;
    ticketName: string;
    ticketType: "other" | "adult" | "student" | "senior" | "child" | "group" | "family" | "vip" | "free";
    price: number;
    requiresReservation: boolean;
    isActive: boolean;
}[]>>;
/**
 * Get recommended tickets for a POI (marked as recommended and active)
 */
export declare const getRecommended: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    poiId: import("convex/values").GenericId<"pois">;
}, Promise<{
    _id: import("convex/values").GenericId<"poiTickets">;
    _creationTime: number;
    currency?: string | undefined;
    source?: string | undefined;
    originalPrice?: number | undefined;
    discountInfo?: string | undefined;
    discountPercentage?: number | undefined;
    eligibilityRequirements?: string | undefined;
    ageRange?: {
        minAge?: number | undefined;
        maxAge?: number | undefined;
    } | undefined;
    validFrom?: number | undefined;
    validUntil?: number | undefined;
    validDays?: number | undefined;
    purchaseUrl?: string | undefined;
    purchasePlatform?: string | undefined;
    reservationUrl?: string | undefined;
    reservationTips?: string | undefined;
    advanceBookingDays?: number | undefined;
    usageInstructions?: string | undefined;
    includedServices?: string[] | undefined;
    excludedServices?: string[] | undefined;
    stockStatus?: "unknown" | "in_stock" | "low_stock" | "sold_out" | undefined;
    isRecommended?: boolean | undefined;
    lastSyncedAt?: number | undefined;
    createdAt: number;
    updatedAt: number;
    sortOrder: number;
    poiId: import("convex/values").GenericId<"pois">;
    ticketName: string;
    ticketType: "other" | "adult" | "student" | "senior" | "child" | "group" | "family" | "vip" | "free";
    price: number;
    requiresReservation: boolean;
    isActive: boolean;
}[]>>;
/**
 * Get ticket price range for a POI
 */
export declare const getPriceRange: import("convex/server").RegisteredQuery<"public", {
    poiId: import("convex/values").GenericId<"pois">;
}, Promise<{
    minPrice: number;
    maxPrice: number;
    currency: string;
    hasFreeTickets: boolean;
    ticketCount: number;
} | null>>;
/**
 * Create a new ticket
 */
export declare const create: import("convex/server").RegisteredMutation<"public", {
    currency?: string | undefined;
    sortOrder?: number | undefined;
    source?: string | undefined;
    originalPrice?: number | undefined;
    discountInfo?: string | undefined;
    discountPercentage?: number | undefined;
    eligibilityRequirements?: string | undefined;
    ageRange?: {
        minAge?: number | undefined;
        maxAge?: number | undefined;
    } | undefined;
    validFrom?: number | undefined;
    validUntil?: number | undefined;
    validDays?: number | undefined;
    purchaseUrl?: string | undefined;
    purchasePlatform?: string | undefined;
    reservationUrl?: string | undefined;
    reservationTips?: string | undefined;
    advanceBookingDays?: number | undefined;
    usageInstructions?: string | undefined;
    includedServices?: string[] | undefined;
    excludedServices?: string[] | undefined;
    isActive?: boolean | undefined;
    stockStatus?: "unknown" | "in_stock" | "low_stock" | "sold_out" | undefined;
    isRecommended?: boolean | undefined;
    poiId: import("convex/values").GenericId<"pois">;
    ticketName: string;
    ticketType: "other" | "adult" | "student" | "senior" | "child" | "group" | "family" | "vip" | "free";
    price: number;
    requiresReservation: boolean;
}, Promise<import("convex/values").GenericId<"poiTickets">>>;
/**
 * Update a ticket
 */
export declare const update: import("convex/server").RegisteredMutation<"public", {
    currency?: string | undefined;
    sortOrder?: number | undefined;
    source?: string | undefined;
    ticketName?: string | undefined;
    ticketType?: "other" | "adult" | "student" | "senior" | "child" | "group" | "family" | "vip" | "free" | undefined;
    price?: number | undefined;
    originalPrice?: number | undefined;
    discountInfo?: string | undefined;
    discountPercentage?: number | undefined;
    eligibilityRequirements?: string | undefined;
    ageRange?: {
        minAge?: number | undefined;
        maxAge?: number | undefined;
    } | undefined;
    validFrom?: number | undefined;
    validUntil?: number | undefined;
    validDays?: number | undefined;
    purchaseUrl?: string | undefined;
    purchasePlatform?: string | undefined;
    requiresReservation?: boolean | undefined;
    reservationUrl?: string | undefined;
    reservationTips?: string | undefined;
    advanceBookingDays?: number | undefined;
    usageInstructions?: string | undefined;
    includedServices?: string[] | undefined;
    excludedServices?: string[] | undefined;
    isActive?: boolean | undefined;
    stockStatus?: "unknown" | "in_stock" | "low_stock" | "sold_out" | undefined;
    isRecommended?: boolean | undefined;
    lastSyncedAt?: number | undefined;
    id: import("convex/values").GenericId<"poiTickets">;
}, Promise<{
    _id: import("convex/values").GenericId<"poiTickets">;
    _creationTime: number;
    currency?: string | undefined;
    source?: string | undefined;
    originalPrice?: number | undefined;
    discountInfo?: string | undefined;
    discountPercentage?: number | undefined;
    eligibilityRequirements?: string | undefined;
    ageRange?: {
        minAge?: number | undefined;
        maxAge?: number | undefined;
    } | undefined;
    validFrom?: number | undefined;
    validUntil?: number | undefined;
    validDays?: number | undefined;
    purchaseUrl?: string | undefined;
    purchasePlatform?: string | undefined;
    reservationUrl?: string | undefined;
    reservationTips?: string | undefined;
    advanceBookingDays?: number | undefined;
    usageInstructions?: string | undefined;
    includedServices?: string[] | undefined;
    excludedServices?: string[] | undefined;
    stockStatus?: "unknown" | "in_stock" | "low_stock" | "sold_out" | undefined;
    isRecommended?: boolean | undefined;
    lastSyncedAt?: number | undefined;
    createdAt: number;
    updatedAt: number;
    sortOrder: number;
    poiId: import("convex/values").GenericId<"pois">;
    ticketName: string;
    ticketType: "other" | "adult" | "student" | "senior" | "child" | "group" | "family" | "vip" | "free";
    price: number;
    requiresReservation: boolean;
    isActive: boolean;
} | null>>;
/**
 * Delete a ticket
 */
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"poiTickets">;
}, Promise<void>>;
/**
 * Bulk create tickets for a POI
 */
export declare const bulkCreate: import("convex/server").RegisteredMutation<"public", {
    poiId: import("convex/values").GenericId<"pois">;
    tickets: {
        currency?: string | undefined;
        sortOrder?: number | undefined;
        source?: string | undefined;
        originalPrice?: number | undefined;
        discountInfo?: string | undefined;
        discountPercentage?: number | undefined;
        eligibilityRequirements?: string | undefined;
        ageRange?: {
            minAge?: number | undefined;
            maxAge?: number | undefined;
        } | undefined;
        validFrom?: number | undefined;
        validUntil?: number | undefined;
        validDays?: number | undefined;
        purchaseUrl?: string | undefined;
        purchasePlatform?: string | undefined;
        reservationUrl?: string | undefined;
        reservationTips?: string | undefined;
        advanceBookingDays?: number | undefined;
        usageInstructions?: string | undefined;
        includedServices?: string[] | undefined;
        excludedServices?: string[] | undefined;
        isActive?: boolean | undefined;
        stockStatus?: "unknown" | "in_stock" | "low_stock" | "sold_out" | undefined;
        isRecommended?: boolean | undefined;
        ticketName: string;
        ticketType: "other" | "adult" | "student" | "senior" | "child" | "group" | "family" | "vip" | "free";
        price: number;
        requiresReservation: boolean;
    }[];
}, Promise<Id<"poiTickets">[]>>;
/**
 * Deactivate all tickets for a POI (soft delete)
 */
export declare const deactivateByPoi: import("convex/server").RegisteredMutation<"public", {
    poiId: import("convex/values").GenericId<"pois">;
}, Promise<number>>;
