/**
 * Favorite SIM Cards - User's saved SIM card products
 */
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    offset?: number | undefined;
    userId: string;
}, Promise<{
    simCard: {
        _id: import("convex/values").GenericId<"simCards">;
        _creationTime: number;
        nameEn?: string | undefined;
        rating?: number | undefined;
        providerLogo?: string | undefined;
        destinationNames?: string[] | undefined;
        regionName?: string | undefined;
        supportedCarriers?: string[] | undefined;
        esimInfo?: {
            activationInstructions?: string | undefined;
            compatibleDevices?: string[] | undefined;
            supportsQrActivation: boolean;
            supportsAppActivation: boolean;
            requiresUnlockedPhone: boolean;
        } | undefined;
        physicalSimInfo?: {
            deliveryOptions?: {
                description?: string | undefined;
                estimatedDays?: number | undefined;
                fee?: number | undefined;
                method: string;
            }[] | undefined;
            pickupLocations?: string[] | undefined;
            simSize: string[];
        } | undefined;
        voiceMinutes?: number | undefined;
        smsCount?: number | undefined;
        localNumber?: boolean | undefined;
        maxDevices?: number | undefined;
        purchasePlatforms?: string[] | undefined;
        affiliateUrl?: string | undefined;
        salesCount?: number | undefined;
        isPromoted?: boolean | undefined;
        provider: string;
        priority: number;
        name: string;
        destinations: string[];
        createdAt: number;
        updatedAt: number;
        purchaseUrl: string;
        isActive: boolean;
        features: string[];
        reviewCount: number;
        coverageType: "single_country" | "regional" | "global";
        cardType: "physical" | "esim" | "wifi_device";
        dataPlans: {
            originalPrice?: number | undefined;
            pricePerDay?: number | undefined;
            dataAmountBytes?: number | undefined;
            throttledSpeedAfterLimit?: string | undefined;
            pricePerGB?: number | undefined;
            currency: string;
            price: number;
            dataAmount: string;
            isUnlimited: boolean;
            validityDays: number;
        }[];
        networkType: string[];
        includesVoice: boolean;
        includesSms: boolean;
        hotspotSupported: boolean;
    } | null;
    _id: import("convex/values").GenericId<"favoriteSimCards">;
    _creationTime: number;
    notes?: string | undefined;
    userId: string;
    createdAt: number;
    simCardId: import("convex/values").GenericId<"simCards">;
}[]>>;
export declare const isFavorited: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    simCardId: import("convex/values").GenericId<"simCards">;
}, Promise<boolean>>;
export declare const getFavorite: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    simCardId: import("convex/values").GenericId<"simCards">;
}, Promise<{
    _id: import("convex/values").GenericId<"favoriteSimCards">;
    _creationTime: number;
    notes?: string | undefined;
    userId: string;
    createdAt: number;
    simCardId: import("convex/values").GenericId<"simCards">;
}>>;
export declare const add: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    userId: string;
    simCardId: import("convex/values").GenericId<"simCards">;
}, Promise<import("convex/values").GenericId<"favoriteSimCards">>>;
export declare const updateNotes: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    id: import("convex/values").GenericId<"favoriteSimCards">;
}, Promise<{
    _id: import("convex/values").GenericId<"favoriteSimCards">;
    _creationTime: number;
    notes?: string | undefined;
    userId: string;
    createdAt: number;
    simCardId: import("convex/values").GenericId<"simCards">;
} | null>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    simCardId: import("convex/values").GenericId<"simCards">;
}, Promise<void>>;
export declare const toggle: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    simCardId: import("convex/values").GenericId<"simCards">;
}, Promise<{
    isFavorited: boolean;
}>>;
export declare const getFavoriteCount: import("convex/server").RegisteredQuery<"public", {
    simCardId: import("convex/values").GenericId<"simCards">;
}, Promise<number>>;
