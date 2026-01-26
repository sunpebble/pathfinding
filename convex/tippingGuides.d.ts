/**
 * Tipping Guides - CRUD Operations for Tipping Information by Country
 */
export type TippingCulture = 'expected' | 'appreciated' | 'optional' | 'not_expected' | 'offensive';
export type TippingScenarioType = 'restaurant' | 'hotel' | 'taxi' | 'bar' | 'spa' | 'tour' | 'delivery' | 'hairdresser' | 'other';
export declare const list: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    _id: import("convex/values").GenericId<"tippingGuides">;
    _creationTime: number;
    tips?: string[] | undefined;
    countryNameEn?: string | undefined;
    countryCode: string;
    currency: string;
    currencySymbol: string;
    lastUpdated: number;
    countryName: string;
    tippingCulture: "optional" | "expected" | "appreciated" | "not_expected" | "offensive";
    cultureSummary: string;
    scenarios: {
        notes?: string | undefined;
        fixedAmount?: number | undefined;
        type: "restaurant" | "hotel" | "other" | "taxi" | "bar" | "spa" | "tour" | "delivery" | "hairdresser";
        typeName: string;
        minPercentage: number;
        maxPercentage: number;
        suggestedPercentage: number;
    }[];
}[]>>;
export declare const getByCountryCode: import("convex/server").RegisteredQuery<"public", {
    countryCode: string;
}, Promise<{
    _id: import("convex/values").GenericId<"tippingGuides">;
    _creationTime: number;
    tips?: string[] | undefined;
    countryNameEn?: string | undefined;
    countryCode: string;
    currency: string;
    currencySymbol: string;
    lastUpdated: number;
    countryName: string;
    tippingCulture: "optional" | "expected" | "appreciated" | "not_expected" | "offensive";
    cultureSummary: string;
    scenarios: {
        notes?: string | undefined;
        fixedAmount?: number | undefined;
        type: "restaurant" | "hotel" | "other" | "taxi" | "bar" | "spa" | "tour" | "delivery" | "hairdresser";
        typeName: string;
        minPercentage: number;
        maxPercentage: number;
        suggestedPercentage: number;
    }[];
} | null>>;
export declare const getByTippingCulture: import("convex/server").RegisteredQuery<"public", {
    culture: "optional" | "expected" | "appreciated" | "not_expected" | "offensive";
}, Promise<{
    _id: import("convex/values").GenericId<"tippingGuides">;
    _creationTime: number;
    tips?: string[] | undefined;
    countryNameEn?: string | undefined;
    countryCode: string;
    currency: string;
    currencySymbol: string;
    lastUpdated: number;
    countryName: string;
    tippingCulture: "optional" | "expected" | "appreciated" | "not_expected" | "offensive";
    cultureSummary: string;
    scenarios: {
        notes?: string | undefined;
        fixedAmount?: number | undefined;
        type: "restaurant" | "hotel" | "other" | "taxi" | "bar" | "spa" | "tour" | "delivery" | "hairdresser";
        typeName: string;
        minPercentage: number;
        maxPercentage: number;
        suggestedPercentage: number;
    }[];
}[]>>;
export declare const searchByName: import("convex/server").RegisteredQuery<"public", {
    name: string;
}, Promise<{
    _id: import("convex/values").GenericId<"tippingGuides">;
    _creationTime: number;
    tips?: string[] | undefined;
    countryNameEn?: string | undefined;
    countryCode: string;
    currency: string;
    currencySymbol: string;
    lastUpdated: number;
    countryName: string;
    tippingCulture: "optional" | "expected" | "appreciated" | "not_expected" | "offensive";
    cultureSummary: string;
    scenarios: {
        notes?: string | undefined;
        fixedAmount?: number | undefined;
        type: "restaurant" | "hotel" | "other" | "taxi" | "bar" | "spa" | "tour" | "delivery" | "hairdresser";
        typeName: string;
        minPercentage: number;
        maxPercentage: number;
        suggestedPercentage: number;
    }[];
}[]>>;
export declare const getScenario: import("convex/server").RegisteredQuery<"public", {
    countryCode: string;
    scenarioType: "restaurant" | "hotel" | "other" | "taxi" | "bar" | "spa" | "tour" | "delivery" | "hairdresser";
}, Promise<{
    countryName: string;
    currency: string;
    currencySymbol: string;
    tippingCulture: "optional" | "expected" | "appreciated" | "not_expected" | "offensive";
    notes?: string | undefined;
    fixedAmount?: number | undefined;
    type: "restaurant" | "hotel" | "other" | "taxi" | "bar" | "spa" | "tour" | "delivery" | "hairdresser";
    typeName: string;
    minPercentage: number;
    maxPercentage: number;
    suggestedPercentage: number;
} | null>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    tips?: string[] | undefined;
    countryNameEn?: string | undefined;
    countryCode: string;
    currency: string;
    currencySymbol: string;
    countryName: string;
    tippingCulture: "optional" | "expected" | "appreciated" | "not_expected" | "offensive";
    cultureSummary: string;
    scenarios: {
        notes?: string | undefined;
        fixedAmount?: number | undefined;
        type: "restaurant" | "hotel" | "other" | "taxi" | "bar" | "spa" | "tour" | "delivery" | "hairdresser";
        typeName: string;
        minPercentage: number;
        maxPercentage: number;
        suggestedPercentage: number;
    }[];
}, Promise<import("convex/values").GenericId<"tippingGuides">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    tips?: string[] | undefined;
    countryCode?: string | undefined;
    currency?: string | undefined;
    currencySymbol?: string | undefined;
    countryName?: string | undefined;
    countryNameEn?: string | undefined;
    tippingCulture?: "optional" | "expected" | "appreciated" | "not_expected" | "offensive" | undefined;
    cultureSummary?: string | undefined;
    scenarios?: {
        notes?: string | undefined;
        fixedAmount?: number | undefined;
        type: "restaurant" | "hotel" | "other" | "taxi" | "bar" | "spa" | "tour" | "delivery" | "hairdresser";
        typeName: string;
        minPercentage: number;
        maxPercentage: number;
        suggestedPercentage: number;
    }[] | undefined;
    id: import("convex/values").GenericId<"tippingGuides">;
}, Promise<{
    _id: import("convex/values").GenericId<"tippingGuides">;
    _creationTime: number;
    tips?: string[] | undefined;
    countryNameEn?: string | undefined;
    countryCode: string;
    currency: string;
    currencySymbol: string;
    lastUpdated: number;
    countryName: string;
    tippingCulture: "optional" | "expected" | "appreciated" | "not_expected" | "offensive";
    cultureSummary: string;
    scenarios: {
        notes?: string | undefined;
        fixedAmount?: number | undefined;
        type: "restaurant" | "hotel" | "other" | "taxi" | "bar" | "spa" | "tour" | "delivery" | "hairdresser";
        typeName: string;
        minPercentage: number;
        maxPercentage: number;
        suggestedPercentage: number;
    }[];
} | null>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"tippingGuides">;
}, Promise<void>>;
export declare const seedInitialData: import("convex/server").RegisteredMutation<"public", {}, Promise<{
    message: string;
    count: number;
}>>;
