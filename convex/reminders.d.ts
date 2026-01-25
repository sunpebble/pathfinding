/**
 * Reminders - Notification scheduling for itinerary items
 */
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"reminders">;
    _creationTime: number;
    triggeredAt?: number | undefined;
    itemId?: import("convex/values").GenericId<"itineraryItems"> | undefined;
    message: string;
    userId: string;
    isTriggered: boolean;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    reminderTime: number;
}[]>>;
export declare const listByItinerary: import("convex/server").RegisteredQuery<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    _id: import("convex/values").GenericId<"reminders">;
    _creationTime: number;
    triggeredAt?: number | undefined;
    itemId?: import("convex/values").GenericId<"itineraryItems"> | undefined;
    message: string;
    userId: string;
    isTriggered: boolean;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    reminderTime: number;
}[]>>;
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"reminders">;
}, Promise<{
    _id: import("convex/values").GenericId<"reminders">;
    _creationTime: number;
    triggeredAt?: number | undefined;
    itemId?: import("convex/values").GenericId<"itineraryItems"> | undefined;
    message: string;
    userId: string;
    isTriggered: boolean;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    reminderTime: number;
} | null>>;
export declare const getByItemId: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    itemId: import("convex/values").GenericId<"itineraryItems">;
}, Promise<{
    _id: import("convex/values").GenericId<"reminders">;
    _creationTime: number;
    triggeredAt?: number | undefined;
    itemId?: import("convex/values").GenericId<"itineraryItems"> | undefined;
    message: string;
    userId: string;
    isTriggered: boolean;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    reminderTime: number;
} | null>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    itemId?: import("convex/values").GenericId<"itineraryItems"> | undefined;
    message: string;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    reminderTime: number;
}, Promise<import("convex/values").GenericId<"reminders">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    message?: string | undefined;
    reminderTime?: number | undefined;
    id: import("convex/values").GenericId<"reminders">;
}, Promise<{
    _id: import("convex/values").GenericId<"reminders">;
    _creationTime: number;
    triggeredAt?: number | undefined;
    itemId?: import("convex/values").GenericId<"itineraryItems"> | undefined;
    message: string;
    userId: string;
    isTriggered: boolean;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    reminderTime: number;
} | null>>;
export declare const markTriggered: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"reminders">;
}, Promise<void>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"reminders">;
}, Promise<void>>;
export declare const getPending: import("convex/server").RegisteredQuery<"public", {
    beforeTime: number;
}, Promise<{
    _id: import("convex/values").GenericId<"reminders">;
    _creationTime: number;
    triggeredAt?: number | undefined;
    itemId?: import("convex/values").GenericId<"itineraryItems"> | undefined;
    message: string;
    userId: string;
    isTriggered: boolean;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    reminderTime: number;
}[]>>;
