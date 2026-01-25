/**
 * Weather Cache Convex Functions
 * Handles caching and retrieval of weather data
 */
/**
 * Get cached weather data for a location
 */
export declare const get: import("convex/server").RegisteredQuery<"public", {
    latitude: number;
    longitude: number;
}, Promise<{
    _id: import("convex/values").GenericId<"weatherCache">;
    _creationTime: number;
    latitude: number;
    longitude: number;
    data: {
        current?: {
            date: string;
            timestamp: number;
            icon: string;
            condition: string;
            conditionDescription: string;
            tempMin: number;
            tempMax: number;
            tempMorning: number;
            tempDay: number;
            tempEvening: number;
            tempNight: number;
            feelsLikeDay: number;
            humidity: number;
            windSpeed: number;
            windDirection: number;
            precipitation: number;
            precipitationProbability: number;
            uvIndex: number;
            sunrise: number;
            sunset: number;
            cloudiness: number;
            pressure: number;
        } | undefined;
        latitude: number;
        longitude: number;
        timezone: string;
        timezoneOffset: number;
        daily: {
            date: string;
            timestamp: number;
            icon: string;
            condition: string;
            conditionDescription: string;
            tempMin: number;
            tempMax: number;
            tempMorning: number;
            tempDay: number;
            tempEvening: number;
            tempNight: number;
            feelsLikeDay: number;
            humidity: number;
            windSpeed: number;
            windDirection: number;
            precipitation: number;
            precipitationProbability: number;
            uvIndex: number;
            sunrise: number;
            sunset: number;
            cloudiness: number;
            pressure: number;
        }[];
        alerts: {
            description: string;
            severity: string;
            event: string;
            sender: string;
            start: number;
            end: number;
        }[];
        fetchedAt: number;
    };
    fetchedAt: number;
} | null>>;
/**
 * Upsert weather data for a location
 */
export declare const upsert: import("convex/server").RegisteredMutation<"public", {
    latitude: number;
    longitude: number;
    data: {
        current?: {
            date: string;
            timestamp: number;
            icon: string;
            condition: string;
            conditionDescription: string;
            tempMin: number;
            tempMax: number;
            tempMorning: number;
            tempDay: number;
            tempEvening: number;
            tempNight: number;
            feelsLikeDay: number;
            humidity: number;
            windSpeed: number;
            windDirection: number;
            precipitation: number;
            precipitationProbability: number;
            uvIndex: number;
            sunrise: number;
            sunset: number;
            cloudiness: number;
            pressure: number;
        } | undefined;
        latitude: number;
        longitude: number;
        timezone: string;
        timezoneOffset: number;
        daily: {
            date: string;
            timestamp: number;
            icon: string;
            condition: string;
            conditionDescription: string;
            tempMin: number;
            tempMax: number;
            tempMorning: number;
            tempDay: number;
            tempEvening: number;
            tempNight: number;
            feelsLikeDay: number;
            humidity: number;
            windSpeed: number;
            windDirection: number;
            precipitation: number;
            precipitationProbability: number;
            uvIndex: number;
            sunrise: number;
            sunset: number;
            cloudiness: number;
            pressure: number;
        }[];
        alerts: {
            description: string;
            severity: string;
            event: string;
            sender: string;
            start: number;
            end: number;
        }[];
        fetchedAt: number;
    };
    fetchedAt: number;
}, Promise<import("convex/values").GenericId<"weatherCache">>>;
/**
 * Delete old cache entries (older than specified hours)
 */
export declare const cleanup: import("convex/server").RegisteredMutation<"public", {
    maxAgeHours?: number | undefined;
}, Promise<{
    deleted: number;
}>>;
/**
 * Get weather cache statistics
 */
export declare const stats: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    totalEntries: number;
    recentEntries: number;
    staleEntries: number;
}>>;
