/**
 * WiFi Reviews - User reviews and quality ratings for WiFi spots
 */
export declare const listBySpot: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    offset?: number | undefined;
    wifiSpotId: import("convex/values").GenericId<"wifiSpots">;
}, Promise<{
    _id: import("convex/values").GenericId<"wifiReviews">;
    _creationTime: number;
    visitDate?: string | undefined;
    comment?: string | undefined;
    speedTestResult?: number | undefined;
    connectionTime?: string | undefined;
    deviceType?: string | undefined;
    createdAt: number;
    userId: string;
    updatedAt: number;
    overallRating: number;
    wifiSpotId: import("convex/values").GenericId<"wifiSpots">;
    speedRating: number;
    stabilityRating: number;
    easeOfAccessRating: number;
    helpfulCount: number;
}[]>>;
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"wifiReviews">;
    _creationTime: number;
    visitDate?: string | undefined;
    comment?: string | undefined;
    speedTestResult?: number | undefined;
    connectionTime?: string | undefined;
    deviceType?: string | undefined;
    createdAt: number;
    userId: string;
    updatedAt: number;
    overallRating: number;
    wifiSpotId: import("convex/values").GenericId<"wifiSpots">;
    speedRating: number;
    stabilityRating: number;
    easeOfAccessRating: number;
    helpfulCount: number;
}[]>>;
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"wifiReviews">;
}, Promise<{
    _id: import("convex/values").GenericId<"wifiReviews">;
    _creationTime: number;
    visitDate?: string | undefined;
    comment?: string | undefined;
    speedTestResult?: number | undefined;
    connectionTime?: string | undefined;
    deviceType?: string | undefined;
    createdAt: number;
    userId: string;
    updatedAt: number;
    overallRating: number;
    wifiSpotId: import("convex/values").GenericId<"wifiSpots">;
    speedRating: number;
    stabilityRating: number;
    easeOfAccessRating: number;
    helpfulCount: number;
} | null>>;
export declare const getUserReview: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    wifiSpotId: import("convex/values").GenericId<"wifiSpots">;
}, Promise<{
    _id: import("convex/values").GenericId<"wifiReviews">;
    _creationTime: number;
    visitDate?: string | undefined;
    comment?: string | undefined;
    speedTestResult?: number | undefined;
    connectionTime?: string | undefined;
    deviceType?: string | undefined;
    createdAt: number;
    userId: string;
    updatedAt: number;
    overallRating: number;
    wifiSpotId: import("convex/values").GenericId<"wifiSpots">;
    speedRating: number;
    stabilityRating: number;
    easeOfAccessRating: number;
    helpfulCount: number;
} | null>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    visitDate?: string | undefined;
    comment?: string | undefined;
    speedTestResult?: number | undefined;
    connectionTime?: string | undefined;
    deviceType?: string | undefined;
    userId: string;
    overallRating: number;
    wifiSpotId: import("convex/values").GenericId<"wifiSpots">;
    speedRating: number;
    stabilityRating: number;
    easeOfAccessRating: number;
}, Promise<import("convex/values").GenericId<"wifiReviews">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    comment?: string | undefined;
    overallRating?: number | undefined;
    speedRating?: number | undefined;
    stabilityRating?: number | undefined;
    easeOfAccessRating?: number | undefined;
    speedTestResult?: number | undefined;
    id: import("convex/values").GenericId<"wifiReviews">;
}, Promise<{
    _id: import("convex/values").GenericId<"wifiReviews">;
    _creationTime: number;
    visitDate?: string | undefined;
    comment?: string | undefined;
    speedTestResult?: number | undefined;
    connectionTime?: string | undefined;
    deviceType?: string | undefined;
    createdAt: number;
    userId: string;
    updatedAt: number;
    overallRating: number;
    wifiSpotId: import("convex/values").GenericId<"wifiSpots">;
    speedRating: number;
    stabilityRating: number;
    easeOfAccessRating: number;
    helpfulCount: number;
} | null>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"wifiReviews">;
}, Promise<void>>;
export declare const markHelpful: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"wifiReviews">;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"wifiReviews">;
    _creationTime: number;
    visitDate?: string | undefined;
    comment?: string | undefined;
    speedTestResult?: number | undefined;
    connectionTime?: string | undefined;
    deviceType?: string | undefined;
    createdAt: number;
    userId: string;
    updatedAt: number;
    overallRating: number;
    wifiSpotId: import("convex/values").GenericId<"wifiSpots">;
    speedRating: number;
    stabilityRating: number;
    easeOfAccessRating: number;
    helpfulCount: number;
} | null>>;
