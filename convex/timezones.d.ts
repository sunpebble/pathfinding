/**
 * Timezones - User timezone settings and timezone utilities
 */
export declare const getUserSettings: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"userTimezoneSettings">;
    _creationTime: number;
    homeCityId?: import("convex/values").GenericId<"cities"> | undefined;
    userId: string;
    createdAt: number;
    updatedAt: number;
    homeTimezone: string;
    displayFormat: "24h" | "12h";
    showSeconds: boolean;
    autoDetect: boolean;
    savedClocks: {
        label?: string | undefined;
        cityId: import("convex/values").GenericId<"cities">;
        sortOrder: number;
    }[];
} | null>>;
export declare const upsertUserSettings: import("convex/server").RegisteredMutation<"public", {
    homeCityId?: import("convex/values").GenericId<"cities"> | undefined;
    userId: string;
    homeTimezone: string;
    displayFormat: "24h" | "12h";
    showSeconds: boolean;
    autoDetect: boolean;
    savedClocks: {
        label?: string | undefined;
        cityId: import("convex/values").GenericId<"cities">;
        sortOrder: number;
    }[];
}, Promise<import("convex/values").GenericId<"userTimezoneSettings">>>;
export declare const updateHomeTimezone: import("convex/server").RegisteredMutation<"public", {
    homeCityId?: import("convex/values").GenericId<"cities"> | undefined;
    userId: string;
    homeTimezone: string;
}, Promise<import("convex/values").GenericId<"userTimezoneSettings">>>;
export declare const updateDisplayFormat: import("convex/server").RegisteredMutation<"public", {
    showSeconds?: boolean | undefined;
    userId: string;
    displayFormat: "24h" | "12h";
}, Promise<import("convex/values").GenericId<"userTimezoneSettings">>>;
export declare const addSavedClock: import("convex/server").RegisteredMutation<"public", {
    label?: string | undefined;
    userId: string;
    cityId: import("convex/values").GenericId<"cities">;
}, Promise<import("convex/values").GenericId<"userTimezoneSettings">>>;
export declare const removeSavedClock: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    cityId: import("convex/values").GenericId<"cities">;
}, Promise<import("convex/values").GenericId<"userTimezoneSettings">>>;
export declare const updateSavedClockLabel: import("convex/server").RegisteredMutation<"public", {
    label?: string | undefined;
    userId: string;
    cityId: import("convex/values").GenericId<"cities">;
}, Promise<import("convex/values").GenericId<"userTimezoneSettings">>>;
export declare const reorderSavedClocks: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    orderedCityIds: import("convex/values").GenericId<"cities">[];
}, Promise<import("convex/values").GenericId<"userTimezoneSettings">>>;
export declare const getWorldClock: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    settings: null;
    homeCity: null;
    clocks: never[];
} | {
    settings: {
        homeTimezone: string;
        displayFormat: "24h" | "12h";
        showSeconds: boolean;
        autoDetect: boolean;
    };
    homeCity: {
        _id: import("convex/values").GenericId<"cities">;
        _creationTime: number;
        nameEn?: string | undefined;
        utcOffset?: number | undefined;
        dstOffset?: number | undefined;
        observesDst?: boolean | undefined;
        name: string;
        latitude: number;
        longitude: number;
        timezone: string;
        countryCode: string;
    } | null;
    clocks: {
        city: {
            _id: import("convex/values").GenericId<"cities">;
            _creationTime: number;
            nameEn?: string | undefined;
            utcOffset?: number | undefined;
            dstOffset?: number | undefined;
            observesDst?: boolean | undefined;
            name: string;
            latitude: number;
            longitude: number;
            timezone: string;
            countryCode: string;
        };
        label: string | undefined;
        sortOrder: number;
    }[];
}>>;
