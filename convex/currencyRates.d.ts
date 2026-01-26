/**
 * Currency Rates Convex Functions
 * Handles caching and retrieval of exchange rate data
 */
/**
 * Get cached exchange rates for a base currency
 */
export declare const get: import("convex/server").RegisteredQuery<"public", {
    base: string;
}, Promise<{
    _id: import("convex/values").GenericId<"currencyRates">;
    _creationTime: number;
    fetchedAt: number;
    base: string;
    rates: any;
} | null>>;
/**
 * Upsert exchange rates for a base currency
 */
export declare const upsert: import("convex/server").RegisteredMutation<"public", {
    fetchedAt: number;
    base: string;
    rates: any;
}, Promise<import("convex/values").GenericId<"currencyRates">>>;
/**
 * Get cached exchange rate history for a currency pair
 */
export declare const getHistory: import("convex/server").RegisteredQuery<"public", {
    days: number;
    base: string;
    target: string;
}, Promise<{
    _id: import("convex/values").GenericId<"currencyHistory">;
    _creationTime: number;
    data: {
        base: string;
        rates: {
            date: string;
            rate: number;
        }[];
        target: string;
        change: number;
        trend: "up" | "down" | "stable";
    };
    days: number;
    fetchedAt: number;
    base: string;
    target: string;
} | null>>;
/**
 * Upsert exchange rate history for a currency pair
 */
export declare const upsertHistory: import("convex/server").RegisteredMutation<"public", {
    data: {
        base: string;
        rates: {
            date: string;
            rate: number;
        }[];
        target: string;
        change: number;
        trend: "up" | "down" | "stable";
    };
    days: number;
    fetchedAt: number;
    base: string;
    target: string;
}, Promise<import("convex/values").GenericId<"currencyHistory">>>;
/**
 * Delete old cache entries (older than specified hours)
 */
export declare const cleanup: import("convex/server").RegisteredMutation<"public", {
    maxAgeHours?: number | undefined;
}, Promise<{
    deletedRates: number;
    deletedHistory: number;
}>>;
/**
 * Get currency cache statistics
 */
export declare const stats: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    rates: {
        total: number;
        recent: number;
        stale: number;
    };
    history: {
        total: number;
        recent: number;
        stale: number;
    };
}>>;
