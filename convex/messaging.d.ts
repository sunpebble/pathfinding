/**
 * List all conversations for a user
 * Returns conversations sorted by last message time
 */
export declare const listConversations: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    userId: string;
}, Promise<{
    otherUser: {
        id: string;
        displayName: string | undefined;
        avatarUrl: string | undefined;
    } | {
        id: string;
        displayName: null;
        avatarUrl: null;
    } | null;
    unreadCount: number;
    _id: import("convex/values").GenericId<"conversations">;
    _creationTime: number;
    lastMessageText?: string | undefined;
    lastMessageAt?: number | undefined;
    lastMessageSenderId?: string | undefined;
    participantIds: string[];
}[]>>;
/**
 * Get or create a conversation between two users
 */
export declare const getOrCreateConversation: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    otherUserId: string;
}, Promise<import("convex/values").GenericId<"conversations">>>;
/**
 * Get conversation by ID with participant info
 */
export declare const getConversation: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    conversationId: import("convex/values").GenericId<"conversations">;
}, Promise<{
    otherUser: {
        id: string;
        displayName: string | undefined;
        avatarUrl: string | undefined;
    } | {
        id: string;
        displayName: null;
        avatarUrl: null;
    } | null;
    _id: import("convex/values").GenericId<"conversations">;
    _creationTime: number;
    lastMessageText?: string | undefined;
    lastMessageAt?: number | undefined;
    lastMessageSenderId?: string | undefined;
    participantIds: string[];
} | null>>;
/**
 * Get messages for a conversation with pagination
 */
export declare const getMessages: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    before?: number | undefined;
    userId: string;
    conversationId: import("convex/values").GenericId<"conversations">;
}, Promise<{
    sender: {
        id: string;
        displayName: string | undefined;
        avatarUrl: string | undefined;
    } | {
        id: string;
        displayName: null;
        avatarUrl: null;
    };
    sharedItinerary: {
        id: import("convex/values").GenericId<"itineraries">;
        title: string;
        cityName: string | undefined;
        coverImageUrl: string | undefined;
        startDate: string;
        endDate: string;
    } | null;
    _id: import("convex/values").GenericId<"messages">;
    _creationTime: number;
    isDeleted?: boolean | undefined;
    sharedItineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    sharedImageUrl?: string | undefined;
    content: string;
    sentAt: number;
    conversationId: import("convex/values").GenericId<"conversations">;
    senderId: string;
    messageType: "text" | "image" | "itinerary_share";
}[]>>;
/**
 * Send a message
 */
export declare const sendMessage: import("convex/server").RegisteredMutation<"public", {
    sharedItineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    sharedImageUrl?: string | undefined;
    content: string;
    conversationId: import("convex/values").GenericId<"conversations">;
    senderId: string;
    messageType: "text" | "image" | "itinerary_share";
}, Promise<import("convex/values").GenericId<"messages">>>;
/**
 * Delete a message (soft delete)
 */
export declare const deleteMessage: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    messageId: import("convex/values").GenericId<"messages">;
}, Promise<void>>;
/**
 * Mark conversation as read
 */
export declare const markAsRead: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    conversationId: import("convex/values").GenericId<"conversations">;
}, Promise<void>>;
/**
 * Get total unread message count for a user
 */
export declare const getUnreadCount: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<number>>;
/**
 * Search users for starting a new conversation
 */
export declare const searchUsers: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    query: string;
    currentUserId: string;
}, Promise<{
    id: string;
    displayName: string | undefined;
    avatarUrl: string | undefined;
}[]>>;
