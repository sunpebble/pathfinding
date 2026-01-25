/**
 * List version history for an itinerary
 */
export declare const listByItinerary: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    data: {
        id: import("convex/values").GenericId<"itineraryVersions">;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        versionNumber: number;
        versionNote: string | undefined;
        changesSummary: string | undefined;
        changesCount: {
            daysAdded: number;
            daysRemoved: number;
            itemsAdded: number;
            itemsRemoved: number;
            itemsModified: number;
        } | undefined;
        createdAt: number;
        snapshotMeta: {
            title: string;
            daysCount: number;
            itemsCount: number;
        };
    }[];
    total: number;
}>>;
/**
 * Get a specific version with full snapshot
 */
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    versionId: import("convex/values").GenericId<"itineraryVersions">;
}, Promise<{
    snapshot: {
        cityName: string | undefined;
        days: {
            items: {
                poi: {
                    id: import("convex/values").GenericId<"pois">;
                    name: string;
                    category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
                    address: string | undefined;
                    latitude: number;
                    longitude: number;
                } | null;
                notes?: string | undefined;
                startTime?: string | undefined;
                endTime?: string | undefined;
                poiId: import("convex/values").GenericId<"pois">;
                orderIndex: number;
                transportMode: "walking" | "driving" | "transit" | "cycling" | "taxi";
            }[];
            date: string;
            dayNumber: number;
        }[];
        coverImageUrl?: string | undefined;
        title: string;
        startDate: string;
        endDate: string;
        visibility: "public" | "private" | "team";
        cityId: import("convex/values").GenericId<"cities">;
    };
    _id: import("convex/values").GenericId<"itineraryVersions">;
    _creationTime: number;
    versionNote?: string | undefined;
    changesSummary?: string | undefined;
    changesCount?: {
        daysAdded: number;
        daysRemoved: number;
        itemsAdded: number;
        itemsRemoved: number;
        itemsModified: number;
    } | undefined;
    userId: string;
    createdAt: number;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    versionNumber: number;
} | null>>;
/**
 * Compare two versions
 */
export declare const compare: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    versionId1: import("convex/values").GenericId<"itineraryVersions">;
    versionId2: import("convex/values").GenericId<"itineraryVersions">;
}, Promise<{
    olderVersion: {
        id: import("convex/values").GenericId<"itineraryVersions">;
        versionNumber: number;
        createdAt: number;
        title: string;
    };
    newerVersion: {
        id: import("convex/values").GenericId<"itineraryVersions">;
        versionNumber: number;
        createdAt: number;
        title: string;
    };
    changes: {
        daysAdded: number;
        daysRemoved: number;
        itemsAdded: number;
        itemsRemoved: number;
        itemsModified: number;
    };
    changesSummary: string;
    daysDiff: {
        dayNumber: number;
        status: "added" | "removed" | "modified" | "unchanged";
        olderItemCount: number;
        newerItemCount: number;
    }[];
}>>;
/**
 * Create a new version (auto-save current state)
 */
export declare const create: import("convex/server").RegisteredMutation<"public", {
    versionNote?: string | undefined;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    id: import("convex/values").GenericId<"itineraryVersions">;
    versionNumber: number;
}>>;
/**
 * Update version note
 */
export declare const updateNote: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    versionNote: string;
    versionId: import("convex/values").GenericId<"itineraryVersions">;
}, Promise<{
    _id: import("convex/values").GenericId<"itineraryVersions">;
    _creationTime: number;
    versionNote?: string | undefined;
    changesSummary?: string | undefined;
    changesCount?: {
        daysAdded: number;
        daysRemoved: number;
        itemsAdded: number;
        itemsRemoved: number;
        itemsModified: number;
    } | undefined;
    userId: string;
    createdAt: number;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    versionNumber: number;
    snapshot: {
        coverImageUrl?: string | undefined;
        title: string;
        startDate: string;
        endDate: string;
        days: {
            date: string;
            items: {
                notes?: string | undefined;
                startTime?: string | undefined;
                endTime?: string | undefined;
                poiId: import("convex/values").GenericId<"pois">;
                orderIndex: number;
                transportMode: "walking" | "driving" | "transit" | "cycling" | "taxi";
            }[];
            dayNumber: number;
        }[];
        visibility: "public" | "private" | "team";
        cityId: import("convex/values").GenericId<"cities">;
    };
} | null>>;
/**
 * Restore itinerary to a specific version
 */
export declare const restore: import("convex/server").RegisteredMutation<"public", {
    createBackup?: boolean | undefined;
    userId: string;
    versionId: import("convex/values").GenericId<"itineraryVersions">;
}, Promise<{
    success: boolean;
    restoredToVersion: number;
}>>;
/**
 * Delete a specific version
 */
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    versionId: import("convex/values").GenericId<"itineraryVersions">;
}, Promise<{
    success: boolean;
}>>;
/**
 * Clean up old versions (keep only the most recent N versions)
 */
export declare const cleanup: import("convex/server").RegisteredMutation<"public", {
    keepCount?: number | undefined;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    deleted: number;
    remaining: number;
}>>;
/**
 * Get version count for an itinerary
 */
export declare const getVersionCount: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    count: number;
    latestVersion: number;
}>>;
