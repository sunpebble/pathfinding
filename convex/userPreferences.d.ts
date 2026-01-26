export declare const getUserPreferences: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"userPreferences">;
    _creationTime: number;
    createdAt?: number | undefined;
    userId: string;
    lastUpdated: number;
    categoryScores: any;
    explicitPreferences: ("budget" | "shopping" | "family" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury" | "nightlife")[];
    travelStyle: "cultural" | "adventurous" | "relaxed" | "balanced";
    budgetLevel: "budget" | "moderate" | "luxury";
    pacePreference: "moderate" | "slow" | "fast";
    preferLocalFood: boolean;
    preferOffBeatPlaces: boolean;
    accessibilityNeeds: boolean;
    totalInteractions: number;
} | null>>;
export declare const getOrCreatePreferences: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"userPreferences">;
    _creationTime: number;
    createdAt?: number | undefined;
    userId: string;
    lastUpdated: number;
    categoryScores: any;
    explicitPreferences: ("budget" | "shopping" | "family" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury" | "nightlife")[];
    travelStyle: "cultural" | "adventurous" | "relaxed" | "balanced";
    budgetLevel: "budget" | "moderate" | "luxury";
    pacePreference: "moderate" | "slow" | "fast";
    preferLocalFood: boolean;
    preferOffBeatPlaces: boolean;
    accessibilityNeeds: boolean;
    totalInteractions: number;
} | {
    _id: null;
    userId: string;
    categoryScores: {};
    explicitPreferences: never[];
    travelStyle: string;
    budgetLevel: string;
    pacePreference: string;
    preferLocalFood: boolean;
    preferOffBeatPlaces: boolean;
    accessibilityNeeds: boolean;
    totalInteractions: number;
    lastUpdated: number;
}>>;
export declare const upsertPreferences: import("convex/server").RegisteredMutation<"public", {
    explicitPreferences?: ("budget" | "shopping" | "family" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury" | "nightlife")[] | undefined;
    travelStyle?: "cultural" | "adventurous" | "relaxed" | "balanced" | undefined;
    budgetLevel?: "budget" | "moderate" | "luxury" | undefined;
    pacePreference?: "moderate" | "slow" | "fast" | undefined;
    preferLocalFood?: boolean | undefined;
    preferOffBeatPlaces?: boolean | undefined;
    accessibilityNeeds?: boolean | undefined;
    userId: string;
}, Promise<import("convex/values").GenericId<"userPreferences">>>;
export declare const recordBehavior: import("convex/server").RegisteredMutation<"public", {
    metadata?: {
        duration?: number | undefined;
        cityName?: string | undefined;
        poiCategory?: string | undefined;
        scrollDepth?: number | undefined;
        searchQuery?: string | undefined;
    } | undefined;
    categories?: ("budget" | "shopping" | "family" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury" | "nightlife")[] | undefined;
    userId: string;
    targetType: "city" | "itinerary" | "poi" | "search" | "guide";
    targetId: string;
    behaviorType: "like" | "share" | "view" | "save" | "unsave" | "copy" | "unlike" | "search" | "poi_click" | "poi_add";
}, Promise<import("convex/values").GenericId<"userBehaviorEvents">>>;
export declare const getTopCategories: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    userId: string;
}, Promise<{
    category: string;
    score: number;
    normalized: number;
}[]>>;
export declare const getRecentBehaviors: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    behaviorType?: "like" | "share" | "view" | "save" | "unsave" | "copy" | "unlike" | "search" | "poi_click" | "poi_add" | undefined;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"userBehaviorEvents">;
    _creationTime: number;
    createdAt: number;
    metadata: any;
    userId: string;
    targetType: "city" | "itinerary" | "poi" | "search" | "guide";
    targetId: string;
    categories: ("budget" | "shopping" | "family" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury" | "nightlife")[];
    behaviorType: "like" | "share" | "view" | "save" | "unsave" | "copy" | "unlike" | "search" | "poi_click" | "poi_add";
}[]>>;
export declare const resetPreferences: import("convex/server").RegisteredMutation<"public", {
    userId: string;
}, Promise<{
    success: boolean;
    deletedEvents: number;
}>>;
export declare const getRecommendedCategories: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    topCategories: string[];
    style: string;
    isLearned: boolean;
    budgetLevel?: undefined;
    pacePreference?: undefined;
    totalInteractions?: undefined;
} | {
    topCategories: string[];
    style: "cultural" | "adventurous" | "relaxed" | "balanced";
    budgetLevel: "budget" | "moderate" | "luxury";
    pacePreference: "moderate" | "slow" | "fast";
    isLearned: boolean;
    totalInteractions: number;
}>>;
