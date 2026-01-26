/**
 * WiFi Credentials - User-saved WiFi passwords and credentials
 */
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"wifiCredentials">;
    _creationTime: number;
    latitude?: number | undefined;
    longitude?: number | undefined;
    notes?: string | undefined;
    lastUsedAt?: number | undefined;
    locationName?: string | undefined;
    wifiSpotId?: import("convex/values").GenericId<"wifiSpots"> | undefined;
    securityType?: "unknown" | "open" | "wep" | "wpa" | "wpa2" | "wpa3" | undefined;
    createdAt: number;
    name: string;
    userId: string;
    updatedAt: number;
    ssid: string;
    password: string;
    isShared: boolean;
}[]>>;
export declare const getBySpot: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    wifiSpotId: import("convex/values").GenericId<"wifiSpots">;
}, Promise<{
    _id: import("convex/values").GenericId<"wifiCredentials">;
    _creationTime: number;
    latitude?: number | undefined;
    longitude?: number | undefined;
    notes?: string | undefined;
    lastUsedAt?: number | undefined;
    locationName?: string | undefined;
    wifiSpotId?: import("convex/values").GenericId<"wifiSpots"> | undefined;
    securityType?: "unknown" | "open" | "wep" | "wpa" | "wpa2" | "wpa3" | undefined;
    createdAt: number;
    name: string;
    userId: string;
    updatedAt: number;
    ssid: string;
    password: string;
    isShared: boolean;
} | null>>;
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"wifiCredentials">;
}, Promise<{
    _id: import("convex/values").GenericId<"wifiCredentials">;
    _creationTime: number;
    latitude?: number | undefined;
    longitude?: number | undefined;
    notes?: string | undefined;
    lastUsedAt?: number | undefined;
    locationName?: string | undefined;
    wifiSpotId?: import("convex/values").GenericId<"wifiSpots"> | undefined;
    securityType?: "unknown" | "open" | "wep" | "wpa" | "wpa2" | "wpa3" | undefined;
    createdAt: number;
    name: string;
    userId: string;
    updatedAt: number;
    ssid: string;
    password: string;
    isShared: boolean;
} | null>>;
export declare const search: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    query: string;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"wifiCredentials">;
    _creationTime: number;
    latitude?: number | undefined;
    longitude?: number | undefined;
    notes?: string | undefined;
    lastUsedAt?: number | undefined;
    locationName?: string | undefined;
    wifiSpotId?: import("convex/values").GenericId<"wifiSpots"> | undefined;
    securityType?: "unknown" | "open" | "wep" | "wpa" | "wpa2" | "wpa3" | undefined;
    createdAt: number;
    name: string;
    userId: string;
    updatedAt: number;
    ssid: string;
    password: string;
    isShared: boolean;
}[]>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    latitude?: number | undefined;
    longitude?: number | undefined;
    notes?: string | undefined;
    locationName?: string | undefined;
    wifiSpotId?: import("convex/values").GenericId<"wifiSpots"> | undefined;
    securityType?: "unknown" | "open" | "wep" | "wpa" | "wpa2" | "wpa3" | undefined;
    isShared?: boolean | undefined;
    name: string;
    userId: string;
    ssid: string;
    password: string;
}, Promise<import("convex/values").GenericId<"wifiCredentials">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    name?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    notes?: string | undefined;
    locationName?: string | undefined;
    ssid?: string | undefined;
    password?: string | undefined;
    securityType?: "unknown" | "open" | "wep" | "wpa" | "wpa2" | "wpa3" | undefined;
    isShared?: boolean | undefined;
    id: import("convex/values").GenericId<"wifiCredentials">;
}, Promise<{
    _id: import("convex/values").GenericId<"wifiCredentials">;
    _creationTime: number;
    latitude?: number | undefined;
    longitude?: number | undefined;
    notes?: string | undefined;
    lastUsedAt?: number | undefined;
    locationName?: string | undefined;
    wifiSpotId?: import("convex/values").GenericId<"wifiSpots"> | undefined;
    securityType?: "unknown" | "open" | "wep" | "wpa" | "wpa2" | "wpa3" | undefined;
    createdAt: number;
    name: string;
    userId: string;
    updatedAt: number;
    ssid: string;
    password: string;
    isShared: boolean;
} | null>>;
export declare const markUsed: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"wifiCredentials">;
}, Promise<{
    _id: import("convex/values").GenericId<"wifiCredentials">;
    _creationTime: number;
    latitude?: number | undefined;
    longitude?: number | undefined;
    notes?: string | undefined;
    lastUsedAt?: number | undefined;
    locationName?: string | undefined;
    wifiSpotId?: import("convex/values").GenericId<"wifiSpots"> | undefined;
    securityType?: "unknown" | "open" | "wep" | "wpa" | "wpa2" | "wpa3" | undefined;
    createdAt: number;
    name: string;
    userId: string;
    updatedAt: number;
    ssid: string;
    password: string;
    isShared: boolean;
} | null>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"wifiCredentials">;
}, Promise<void>>;
export declare const getSharedBySpot: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    wifiSpotId: import("convex/values").GenericId<"wifiSpots">;
}, Promise<{
    _id: import("convex/values").GenericId<"wifiCredentials">;
    _creationTime: number;
    latitude?: number | undefined;
    longitude?: number | undefined;
    notes?: string | undefined;
    lastUsedAt?: number | undefined;
    locationName?: string | undefined;
    wifiSpotId?: import("convex/values").GenericId<"wifiSpots"> | undefined;
    securityType?: "unknown" | "open" | "wep" | "wpa" | "wpa2" | "wpa3" | undefined;
    createdAt: number;
    name: string;
    userId: string;
    updatedAt: number;
    ssid: string;
    password: string;
    isShared: boolean;
}[]>>;
