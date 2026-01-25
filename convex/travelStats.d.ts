/**
 * Travel Statistics - Queries and Mutations
 */
export declare const getByUser: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"travelStats">;
    _creationTime: number;
    createdAt?: number | undefined;
    updatedAt?: number | undefined;
    totalDays?: number | undefined;
    totalExpenses?: number | undefined;
    mostVisitedCity?: {
        name: string;
        count: number;
    } | undefined;
    mostVisitedCountry?: {
        name: string;
        count: number;
    } | undefined;
    firstTripDate?: number | undefined;
    lastTripDate?: number | undefined;
    goalCities?: number | undefined;
    goalCountries?: number | undefined;
    nextGoalCity?: {
        notes?: string | undefined;
        plannedDate?: number | undefined;
        latitude: number;
        longitude: number;
        countryCode: string;
        cityName: string;
        countryName: string;
    } | undefined;
    yearlyStats?: any;
    userId: string;
    totalCities: number;
    totalCountries: number;
    totalTrips: number;
    totalDistance: number;
} | null>>;
export declare const calculate: import("convex/server").RegisteredMutation<"public", {
    userId: string;
}, Promise<import("convex/values").GenericId<"travelStats">>>;
export declare const getQuickStats: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    totalTrips: number;
    totalDays: number | undefined;
    totalCities: number;
    totalExpenses: number | undefined;
}>>;
