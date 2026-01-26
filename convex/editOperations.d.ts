/**
 * Get recent operations for an itinerary
 */
export declare const getRecentOperations: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    _id: import("convex/values").GenericId<"editOperations">;
    _creationTime: number;
    conflictResolution?: {
        resolvedBy: string;
        resolvedAt: number;
        resolution: "accept_mine" | "accept_theirs" | "merge";
    } | undefined;
    status: "rejected" | "pending" | "applied" | "conflicted";
    version: number;
    timestamp: number;
    userId: string;
    targetType: "itinerary" | "day" | "item";
    targetId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    operationType: "create" | "update" | "delete" | "reorder";
    changes: any;
}[]>>;
/**
 * Get pending operations for conflict resolution
 */
export declare const getPendingOperations: import("convex/server").RegisteredQuery<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    _id: import("convex/values").GenericId<"editOperations">;
    _creationTime: number;
    conflictResolution?: {
        resolvedBy: string;
        resolvedAt: number;
        resolution: "accept_mine" | "accept_theirs" | "merge";
    } | undefined;
    status: "rejected" | "pending" | "applied" | "conflicted";
    version: number;
    timestamp: number;
    userId: string;
    targetType: "itinerary" | "day" | "item";
    targetId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    operationType: "create" | "update" | "delete" | "reorder";
    changes: any;
}[]>>;
/**
 * Get conflicted operations that need resolution
 */
export declare const getConflictedOperations: import("convex/server").RegisteredQuery<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    _id: import("convex/values").GenericId<"editOperations">;
    _creationTime: number;
    conflictResolution?: {
        resolvedBy: string;
        resolvedAt: number;
        resolution: "accept_mine" | "accept_theirs" | "merge";
    } | undefined;
    status: "rejected" | "pending" | "applied" | "conflicted";
    version: number;
    timestamp: number;
    userId: string;
    targetType: "itinerary" | "day" | "item";
    targetId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    operationType: "create" | "update" | "delete" | "reorder";
    changes: any;
}[]>>;
/**
 * Get operations by user
 */
export declare const getOperationsByUser: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    _id: import("convex/values").GenericId<"editOperations">;
    _creationTime: number;
    conflictResolution?: {
        resolvedBy: string;
        resolvedAt: number;
        resolution: "accept_mine" | "accept_theirs" | "merge";
    } | undefined;
    status: "rejected" | "pending" | "applied" | "conflicted";
    version: number;
    timestamp: number;
    userId: string;
    targetType: "itinerary" | "day" | "item";
    targetId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    operationType: "create" | "update" | "delete" | "reorder";
    changes: any;
}[]>>;
/**
 * Record a new edit operation
 */
export declare const recordOperation: import("convex/server").RegisteredMutation<"public", {
    baseVersion?: number | undefined;
    userId: string;
    targetType: "itinerary" | "day" | "item";
    targetId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    operationType: "create" | "update" | "delete" | "reorder";
    changes: any;
}, Promise<{
    operationId: import("convex/values").GenericId<"editOperations">;
    hasConflict: boolean;
    version: number;
}>>;
/**
 * Apply a pending operation
 */
export declare const applyOperation: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    operationId: import("convex/values").GenericId<"editOperations">;
}, Promise<{
    success: boolean;
}>>;
/**
 * Reject an operation
 */
export declare const rejectOperation: import("convex/server").RegisteredMutation<"public", {
    reason?: string | undefined;
    userId: string;
    operationId: import("convex/values").GenericId<"editOperations">;
}, Promise<{
    success: boolean;
}>>;
/**
 * Resolve a conflicted operation
 */
export declare const resolveConflict: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    resolution: "accept_mine" | "accept_theirs" | "merge";
    operationId: import("convex/values").GenericId<"editOperations">;
}, Promise<{
    success: boolean;
    finalStatus: string;
}>>;
/**
 * Clean up old operations (keep last N days)
 */
export declare const cleanupOldOperations: import("convex/server").RegisteredMutation<"public", {
    daysToKeep?: number | undefined;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    deletedCount: number;
}>>;
