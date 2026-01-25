/**
 * Get all online collaborators for an itinerary
 */
export declare const getOnlineCollaborators: import("convex/server").RegisteredQuery<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    _id: import("convex/values").GenericId<"collaboratorPresence">;
    _creationTime: number;
    displayName?: string | undefined;
    avatarUrl?: string | undefined;
    currentDayId?: import("convex/values").GenericId<"itineraryDays"> | undefined;
    currentItemId?: import("convex/values").GenericId<"itineraryItems"> | undefined;
    cursorPosition?: {
        offset?: number | undefined;
        field: string;
    } | undefined;
    selectedElements?: {
        type: "day" | "item" | "poi";
        id: string;
    }[] | undefined;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    color: string;
    lastActiveAt: number;
    isOnline: boolean;
}[]>>;
/**
 * Get presence for a specific user in an itinerary
 */
export declare const getUserPresence: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    _id: import("convex/values").GenericId<"collaboratorPresence">;
    _creationTime: number;
    displayName?: string | undefined;
    avatarUrl?: string | undefined;
    currentDayId?: import("convex/values").GenericId<"itineraryDays"> | undefined;
    currentItemId?: import("convex/values").GenericId<"itineraryItems"> | undefined;
    cursorPosition?: {
        offset?: number | undefined;
        field: string;
    } | undefined;
    selectedElements?: {
        type: "day" | "item" | "poi";
        id: string;
    }[] | undefined;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    color: string;
    lastActiveAt: number;
    isOnline: boolean;
} | null>>;
/**
 * Get all collaborators with their presence status
 */
export declare const getCollaboratorsWithPresence: import("convex/server").RegisteredQuery<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    userId: string;
    role: "owner" | "editor" | "viewer";
    isOnline: boolean;
    presence: {
        _id: import("convex/values").GenericId<"collaboratorPresence">;
        _creationTime: number;
        displayName?: string | undefined;
        avatarUrl?: string | undefined;
        currentDayId?: import("convex/values").GenericId<"itineraryDays"> | undefined;
        currentItemId?: import("convex/values").GenericId<"itineraryItems"> | undefined;
        cursorPosition?: {
            offset?: number | undefined;
            field: string;
        } | undefined;
        selectedElements?: {
            type: "day" | "item" | "poi";
            id: string;
        }[] | undefined;
        userId: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        color: string;
        lastActiveAt: number;
        isOnline: boolean;
    } | null;
}[]>>;
/**
 * Join a collaborative editing session
 */
export declare const joinSession: import("convex/server").RegisteredMutation<"public", {
    displayName?: string | undefined;
    avatarUrl?: string | undefined;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<import("convex/values").GenericId<"collaboratorPresence">>>;
/**
 * Leave a collaborative editing session
 */
export declare const leaveSession: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<void>>;
/**
 * Update presence heartbeat (keep-alive)
 */
export declare const heartbeat: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<void>>;
/**
 * Update cursor position
 */
export declare const updateCursor: import("convex/server").RegisteredMutation<"public", {
    currentDayId?: import("convex/values").GenericId<"itineraryDays"> | undefined;
    currentItemId?: import("convex/values").GenericId<"itineraryItems"> | undefined;
    cursorPosition?: {
        offset?: number | undefined;
        field: string;
    } | undefined;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<void>>;
/**
 * Update selection state
 */
export declare const updateSelection: import("convex/server").RegisteredMutation<"public", {
    selectedElements?: {
        type: "day" | "item" | "poi";
        id: string;
    }[] | undefined;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<void>>;
/**
 * Clean up stale presence records (users who haven't sent heartbeat)
 * This should be called periodically by a scheduled function
 */
export declare const cleanupStalePresences: import("convex/server").RegisteredMutation<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    cleanedCount: number;
}>>;
