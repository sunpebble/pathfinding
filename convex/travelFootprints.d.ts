/**
 * Travel Footprints - User's visited cities and countries tracking
 */
export declare const listVisitedCities: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"visitedCities">;
    _creationTime: number;
    createdAt?: number | undefined;
    rating?: number | undefined;
    notes?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    cityNameEn?: string | undefined;
    countryNameEn?: string | undefined;
    firstVisitedAt?: number | undefined;
    lastVisitedAt?: number | undefined;
    visitCount?: number | undefined;
    photos?: string[] | undefined;
    travelGuideId?: import("convex/values").GenericId<"travelGuides"> | undefined;
    latitude: number;
    longitude: number;
    userId: string;
    countryCode: string;
    cityName: string;
    countryName: string;
    visitedAt: number;
}[]>>;
export declare const getVisitedCityById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"visitedCities">;
}, Promise<{
    _id: import("convex/values").GenericId<"visitedCities">;
    _creationTime: number;
    createdAt?: number | undefined;
    rating?: number | undefined;
    notes?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    cityNameEn?: string | undefined;
    countryNameEn?: string | undefined;
    firstVisitedAt?: number | undefined;
    lastVisitedAt?: number | undefined;
    visitCount?: number | undefined;
    photos?: string[] | undefined;
    travelGuideId?: import("convex/values").GenericId<"travelGuides"> | undefined;
    latitude: number;
    longitude: number;
    userId: string;
    countryCode: string;
    cityName: string;
    countryName: string;
    visitedAt: number;
} | null>>;
export declare const addVisitedCity: import("convex/server").RegisteredMutation<"public", {
    rating?: number | undefined;
    notes?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    cityNameEn?: string | undefined;
    countryNameEn?: string | undefined;
    photos?: string[] | undefined;
    travelGuideId?: import("convex/values").GenericId<"travelGuides"> | undefined;
    latitude: number;
    longitude: number;
    userId: string;
    countryCode: string;
    cityName: string;
    countryName: string;
    visitedAt: number;
}, Promise<import("convex/values").GenericId<"visitedCities">>>;
export declare const updateVisitedCity: import("convex/server").RegisteredMutation<"public", {
    rating?: number | undefined;
    notes?: string | undefined;
    photos?: string[] | undefined;
    id: import("convex/values").GenericId<"visitedCities">;
}, Promise<{
    _id: import("convex/values").GenericId<"visitedCities">;
    _creationTime: number;
    createdAt?: number | undefined;
    rating?: number | undefined;
    notes?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    cityNameEn?: string | undefined;
    countryNameEn?: string | undefined;
    firstVisitedAt?: number | undefined;
    lastVisitedAt?: number | undefined;
    visitCount?: number | undefined;
    photos?: string[] | undefined;
    travelGuideId?: import("convex/values").GenericId<"travelGuides"> | undefined;
    latitude: number;
    longitude: number;
    userId: string;
    countryCode: string;
    cityName: string;
    countryName: string;
    visitedAt: number;
} | null>>;
export declare const removeVisitedCity: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"visitedCities">;
}, Promise<void>>;
export declare const listVisitedCountries: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"visitedCountries">;
    _creationTime: number;
    createdAt?: number | undefined;
    countryNameEn?: string | undefined;
    userId: string;
    countryCode: string;
    countryName: string;
    firstVisitedAt: number;
    lastVisitedAt: number;
    citiesCount: number;
}[]>>;
export declare const upsertVisitedCountry: import("convex/server").RegisteredMutation<"public", {
    countryNameEn?: string | undefined;
    userId: string;
    countryCode: string;
    countryName: string;
    firstVisitedAt: number;
}, Promise<import("convex/values").GenericId<"visitedCountries">>>;
export declare const getTravelStats: import("convex/server").RegisteredQuery<"public", {
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
} | {
    userId: string;
    totalCities: number;
    totalCountries: number;
    totalTrips: number;
    totalDistance: number;
    mostVisitedCity: null;
    mostVisitedCountry: null;
    firstTripDate: null;
    lastTripDate: null;
    goalCities: number;
    goalCountries: number;
    yearlyStats: {};
}>>;
export declare const updateTravelStats: import("convex/server").RegisteredMutation<"public", {
    userId: string;
}, Promise<import("convex/values").GenericId<"travelStats">>>;
export declare const setTravelGoals: import("convex/server").RegisteredMutation<"public", {
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
    userId: string;
}, Promise<import("convex/values").GenericId<"travelStats">>>;
export declare const getTravelTimeline: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    offset?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        _id: import("convex/values").GenericId<"visitedCities">;
        _creationTime: number;
        createdAt?: number | undefined;
        rating?: number | undefined;
        notes?: string | undefined;
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        cityNameEn?: string | undefined;
        countryNameEn?: string | undefined;
        firstVisitedAt?: number | undefined;
        lastVisitedAt?: number | undefined;
        visitCount?: number | undefined;
        photos?: string[] | undefined;
        travelGuideId?: import("convex/values").GenericId<"travelGuides"> | undefined;
        latitude: number;
        longitude: number;
        userId: string;
        countryCode: string;
        cityName: string;
        countryName: string;
        visitedAt: number;
    }[];
    total: number;
    hasMore: boolean;
}>>;
