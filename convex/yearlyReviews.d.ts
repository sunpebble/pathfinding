/**
 * Yearly Reviews - Annual Travel Summary Queries and Mutations
 */
export declare const getByYear: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    year: number;
}, Promise<{
    _id: import("convex/values").GenericId<"yearlyReviews">;
    _creationTime: number;
    error?: string | undefined;
    generatedAt?: number | undefined;
    longestTrip?: {
        title: string;
        days: number;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        cityName: string;
    } | undefined;
    mostExpensiveTrip?: {
        title: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        amount: number;
    } | undefined;
    firstTripOfYear?: {
        title: string;
        startDate: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        cityName: string;
    } | undefined;
    lastTripOfYear?: {
        title: string;
        startDate: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        cityName: string;
    } | undefined;
    yearOverYear?: {
        tripsChange: number;
        expensesChange: number;
        distanceChange: number;
        citiesChange: number;
    } | undefined;
    memories?: {
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        imageUrl?: string | undefined;
        text: string;
        createdAt: number;
    }[] | undefined;
    status: "error" | "generating" | "ready";
    userId: string;
    createdAt: number;
    updatedAt: number;
    citiesCount: number;
    totalDistance: number;
    totalExpenses: number;
    year: number;
    tripsCount: number;
    daysCount: number;
    countriesCount: number;
    poisCount: number;
    expenseBreakdown: {
        icon?: string | undefined;
        categoryId: import("convex/values").GenericId<"expenseCategories">;
        amount: number;
        categoryName: string;
        percentage: number;
    }[];
    averagePerTrip: number;
    averagePerDay: number;
    topCities: {
        imageUrl?: string | undefined;
        cityId: import("convex/values").GenericId<"cities">;
        cityName: string;
        visitCount: number;
        totalDays: number;
    }[];
    monthlyActivity: {
        expenses: number;
        month: number;
        tripsCount: number;
        daysCount: number;
    }[];
    achievements: {
        earnedAt?: number | undefined;
        id: string;
        title: string;
        description: string;
        icon: string;
    }[];
} | null>>;
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"yearlyReviews">;
    _creationTime: number;
    error?: string | undefined;
    generatedAt?: number | undefined;
    longestTrip?: {
        title: string;
        days: number;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        cityName: string;
    } | undefined;
    mostExpensiveTrip?: {
        title: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        amount: number;
    } | undefined;
    firstTripOfYear?: {
        title: string;
        startDate: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        cityName: string;
    } | undefined;
    lastTripOfYear?: {
        title: string;
        startDate: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        cityName: string;
    } | undefined;
    yearOverYear?: {
        tripsChange: number;
        expensesChange: number;
        distanceChange: number;
        citiesChange: number;
    } | undefined;
    memories?: {
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        imageUrl?: string | undefined;
        text: string;
        createdAt: number;
    }[] | undefined;
    status: "error" | "generating" | "ready";
    userId: string;
    createdAt: number;
    updatedAt: number;
    citiesCount: number;
    totalDistance: number;
    totalExpenses: number;
    year: number;
    tripsCount: number;
    daysCount: number;
    countriesCount: number;
    poisCount: number;
    expenseBreakdown: {
        icon?: string | undefined;
        categoryId: import("convex/values").GenericId<"expenseCategories">;
        amount: number;
        categoryName: string;
        percentage: number;
    }[];
    averagePerTrip: number;
    averagePerDay: number;
    topCities: {
        imageUrl?: string | undefined;
        cityId: import("convex/values").GenericId<"cities">;
        cityName: string;
        visitCount: number;
        totalDays: number;
    }[];
    monthlyActivity: {
        expenses: number;
        month: number;
        tripsCount: number;
        daysCount: number;
    }[];
    achievements: {
        earnedAt?: number | undefined;
        id: string;
        title: string;
        description: string;
        icon: string;
    }[];
}[]>>;
export declare const getAvailableYears: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<number[]>>;
export declare const generate: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    year: number;
}, Promise<import("convex/values").GenericId<"yearlyReviews">>>;
export declare const addMemory: import("convex/server").RegisteredMutation<"public", {
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    imageUrl?: string | undefined;
    text: string;
    userId: string;
    year: number;
}, Promise<import("convex/values").GenericId<"yearlyReviews">>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    year: number;
}, Promise<void>>;
