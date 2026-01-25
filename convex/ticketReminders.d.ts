/**
 * List reminders for a user
 */
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    includeTriggered?: boolean | undefined;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"ticketReminders">;
    _creationTime: number;
    message?: string | undefined;
    triggeredAt?: number | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    ticketId?: import("convex/values").GenericId<"poiTickets"> | undefined;
    readAt?: number | undefined;
    userId: string;
    createdAt: number;
    updatedAt: number;
    poiId: import("convex/values").GenericId<"pois">;
    reminderType: "reservation_open" | "booking_reminder" | "visit_reminder" | "price_drop" | "stock_available";
    isTriggered: boolean;
    reminderTime: number;
    isRead: boolean;
}[]>>;
/**
 * Get a reminder by ID
 */
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"ticketReminders">;
}, Promise<{
    _id: import("convex/values").GenericId<"ticketReminders">;
    _creationTime: number;
    message?: string | undefined;
    triggeredAt?: number | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    ticketId?: import("convex/values").GenericId<"poiTickets"> | undefined;
    readAt?: number | undefined;
    userId: string;
    createdAt: number;
    updatedAt: number;
    poiId: import("convex/values").GenericId<"pois">;
    reminderType: "reservation_open" | "booking_reminder" | "visit_reminder" | "price_drop" | "stock_available";
    isTriggered: boolean;
    reminderTime: number;
    isRead: boolean;
} | null>>;
/**
 * List reminders for a specific POI
 */
export declare const listByPoi: import("convex/server").RegisteredQuery<"public", {
    userId?: string | undefined;
    poiId: import("convex/values").GenericId<"pois">;
}, Promise<{
    _id: import("convex/values").GenericId<"ticketReminders">;
    _creationTime: number;
    message?: string | undefined;
    triggeredAt?: number | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    ticketId?: import("convex/values").GenericId<"poiTickets"> | undefined;
    readAt?: number | undefined;
    userId: string;
    createdAt: number;
    updatedAt: number;
    poiId: import("convex/values").GenericId<"pois">;
    reminderType: "reservation_open" | "booking_reminder" | "visit_reminder" | "price_drop" | "stock_available";
    isTriggered: boolean;
    reminderTime: number;
    isRead: boolean;
}[]>>;
/**
 * Get pending reminders (for notification service)
 */
export declare const getPendingReminders: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    beforeTime: number;
}, Promise<{
    _id: import("convex/values").GenericId<"ticketReminders">;
    _creationTime: number;
    message?: string | undefined;
    triggeredAt?: number | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    ticketId?: import("convex/values").GenericId<"poiTickets"> | undefined;
    readAt?: number | undefined;
    userId: string;
    createdAt: number;
    updatedAt: number;
    poiId: import("convex/values").GenericId<"pois">;
    reminderType: "reservation_open" | "booking_reminder" | "visit_reminder" | "price_drop" | "stock_available";
    isTriggered: boolean;
    reminderTime: number;
    isRead: boolean;
}[]>>;
/**
 * Get unread reminders count for a user
 */
export declare const getUnreadCount: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<number>>;
/**
 * Get upcoming reminders for a user (next 7 days)
 */
export declare const getUpcoming: import("convex/server").RegisteredQuery<"public", {
    days?: number | undefined;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"ticketReminders">;
    _creationTime: number;
    message?: string | undefined;
    triggeredAt?: number | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    ticketId?: import("convex/values").GenericId<"poiTickets"> | undefined;
    readAt?: number | undefined;
    userId: string;
    createdAt: number;
    updatedAt: number;
    poiId: import("convex/values").GenericId<"pois">;
    reminderType: "reservation_open" | "booking_reminder" | "visit_reminder" | "price_drop" | "stock_available";
    isTriggered: boolean;
    reminderTime: number;
    isRead: boolean;
}[]>>;
/**
 * Create a new reminder
 */
export declare const create: import("convex/server").RegisteredMutation<"public", {
    message?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    ticketId?: import("convex/values").GenericId<"poiTickets"> | undefined;
    userId: string;
    poiId: import("convex/values").GenericId<"pois">;
    reminderType: "reservation_open" | "booking_reminder" | "visit_reminder" | "price_drop" | "stock_available";
    reminderTime: number;
}, Promise<import("convex/values").GenericId<"ticketReminders">>>;
/**
 * Update a reminder
 */
export declare const update: import("convex/server").RegisteredMutation<"public", {
    message?: string | undefined;
    reminderType?: "reservation_open" | "booking_reminder" | "visit_reminder" | "price_drop" | "stock_available" | undefined;
    reminderTime?: number | undefined;
    id: import("convex/values").GenericId<"ticketReminders">;
}, Promise<{
    _id: import("convex/values").GenericId<"ticketReminders">;
    _creationTime: number;
    message?: string | undefined;
    triggeredAt?: number | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    ticketId?: import("convex/values").GenericId<"poiTickets"> | undefined;
    readAt?: number | undefined;
    userId: string;
    createdAt: number;
    updatedAt: number;
    poiId: import("convex/values").GenericId<"pois">;
    reminderType: "reservation_open" | "booking_reminder" | "visit_reminder" | "price_drop" | "stock_available";
    isTriggered: boolean;
    reminderTime: number;
    isRead: boolean;
} | null>>;
/**
 * Mark a reminder as triggered
 */
export declare const markTriggered: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"ticketReminders">;
}, Promise<{
    _id: import("convex/values").GenericId<"ticketReminders">;
    _creationTime: number;
    message?: string | undefined;
    triggeredAt?: number | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    ticketId?: import("convex/values").GenericId<"poiTickets"> | undefined;
    readAt?: number | undefined;
    userId: string;
    createdAt: number;
    updatedAt: number;
    poiId: import("convex/values").GenericId<"pois">;
    reminderType: "reservation_open" | "booking_reminder" | "visit_reminder" | "price_drop" | "stock_available";
    isTriggered: boolean;
    reminderTime: number;
    isRead: boolean;
} | null>>;
/**
 * Mark a reminder as read
 */
export declare const markRead: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"ticketReminders">;
}, Promise<{
    _id: import("convex/values").GenericId<"ticketReminders">;
    _creationTime: number;
    message?: string | undefined;
    triggeredAt?: number | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    ticketId?: import("convex/values").GenericId<"poiTickets"> | undefined;
    readAt?: number | undefined;
    userId: string;
    createdAt: number;
    updatedAt: number;
    poiId: import("convex/values").GenericId<"pois">;
    reminderType: "reservation_open" | "booking_reminder" | "visit_reminder" | "price_drop" | "stock_available";
    isTriggered: boolean;
    reminderTime: number;
    isRead: boolean;
} | null>>;
/**
 * Mark all reminders as read for a user
 */
export declare const markAllRead: import("convex/server").RegisteredMutation<"public", {
    userId: string;
}, Promise<number>>;
/**
 * Delete a reminder
 */
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"ticketReminders">;
}, Promise<void>>;
/**
 * Delete all reminders for a POI (for a specific user)
 */
export declare const removeByPoi: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    poiId: import("convex/values").GenericId<"pois">;
}, Promise<number>>;
/**
 * Batch trigger reminders (for scheduled job)
 */
export declare const batchTrigger: import("convex/server").RegisteredMutation<"public", {
    ids: import("convex/values").GenericId<"ticketReminders">[];
}, Promise<number>>;
