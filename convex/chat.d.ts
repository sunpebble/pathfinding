export declare const listSessions: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    includeArchived?: boolean | undefined;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"chatSessions">;
    _creationTime: number;
    context?: string | undefined;
    guideId?: import("convex/values").GenericId<"travelGuides"> | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    createdAt: number;
    title: string;
    userId: string;
    lastMessageAt: number;
    messageCount: number;
    isArchived: boolean;
}[]>>;
export declare const getSession: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"chatSessions">;
}, Promise<{
    itinerary: {
        id: import("convex/values").GenericId<"itineraries">;
        title: string;
    } | null;
    guide: {
        id: import("convex/values").GenericId<"travelGuides">;
        title: string | undefined;
    } | null;
    _id: import("convex/values").GenericId<"chatSessions">;
    _creationTime: number;
    context?: string | undefined;
    guideId?: import("convex/values").GenericId<"travelGuides"> | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    createdAt: number;
    title: string;
    userId: string;
    lastMessageAt: number;
    messageCount: number;
    isArchived: boolean;
} | null>>;
export declare const createSession: import("convex/server").RegisteredMutation<"public", {
    title?: string | undefined;
    context?: string | undefined;
    guideId?: import("convex/values").GenericId<"travelGuides"> | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    userId: string;
}, Promise<import("convex/values").GenericId<"chatSessions">>>;
export declare const updateSession: import("convex/server").RegisteredMutation<"public", {
    title?: string | undefined;
    context?: string | undefined;
    isArchived?: boolean | undefined;
    id: import("convex/values").GenericId<"chatSessions">;
}, Promise<{
    _id: import("convex/values").GenericId<"chatSessions">;
    _creationTime: number;
    context?: string | undefined;
    guideId?: import("convex/values").GenericId<"travelGuides"> | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    createdAt: number;
    title: string;
    userId: string;
    lastMessageAt: number;
    messageCount: number;
    isArchived: boolean;
} | null>>;
export declare const deleteSession: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"chatSessions">;
}, Promise<void>>;
export declare const listMessages: import("convex/server").RegisteredQuery<"public", {
    cursor?: string | undefined;
    limit?: number | undefined;
    sessionId: import("convex/values").GenericId<"chatSessions">;
}, Promise<{
    messages: {
        _id: import("convex/values").GenericId<"chatMessages">;
        _creationTime: number;
        metadata?: {
            pois?: {
                description?: string | undefined;
                latitude?: number | undefined;
                longitude?: number | undefined;
                address?: string | undefined;
                rating?: number | undefined;
                priceInfo?: string | undefined;
                name: string;
                type: string;
            }[] | undefined;
            sources?: string[] | undefined;
            itineraryChanges?: {
                dayNumber?: number | undefined;
                poiName?: string | undefined;
                details?: string | undefined;
                action: string;
            }[] | undefined;
            quickActions?: {
                payload?: string | undefined;
                action: string;
                label: string;
            }[] | undefined;
        } | undefined;
        role: "user" | "assistant" | "system";
        content: string;
        createdAt: number;
        sessionId: import("convex/values").GenericId<"chatSessions">;
    }[];
    cursor: string;
    isDone: boolean;
}>>;
export declare const getRecentMessages: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    sessionId: import("convex/values").GenericId<"chatSessions">;
}, Promise<{
    _id: import("convex/values").GenericId<"chatMessages">;
    _creationTime: number;
    metadata?: {
        pois?: {
            description?: string | undefined;
            latitude?: number | undefined;
            longitude?: number | undefined;
            address?: string | undefined;
            rating?: number | undefined;
            priceInfo?: string | undefined;
            name: string;
            type: string;
        }[] | undefined;
        sources?: string[] | undefined;
        itineraryChanges?: {
            dayNumber?: number | undefined;
            poiName?: string | undefined;
            details?: string | undefined;
            action: string;
        }[] | undefined;
        quickActions?: {
            payload?: string | undefined;
            action: string;
            label: string;
        }[] | undefined;
    } | undefined;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: number;
    sessionId: import("convex/values").GenericId<"chatSessions">;
}[]>>;
export declare const addMessage: import("convex/server").RegisteredMutation<"public", {
    metadata?: {
        pois?: {
            description?: string | undefined;
            latitude?: number | undefined;
            longitude?: number | undefined;
            address?: string | undefined;
            rating?: number | undefined;
            priceInfo?: string | undefined;
            name: string;
            type: string;
        }[] | undefined;
        sources?: string[] | undefined;
        itineraryChanges?: {
            dayNumber?: number | undefined;
            poiName?: string | undefined;
            details?: string | undefined;
            action: string;
        }[] | undefined;
        quickActions?: {
            payload?: string | undefined;
            action: string;
            label: string;
        }[] | undefined;
    } | undefined;
    role: "user" | "assistant" | "system";
    content: string;
    sessionId: import("convex/values").GenericId<"chatSessions">;
}, Promise<import("convex/values").GenericId<"chatMessages">>>;
export declare const sendMessage: import("convex/server").RegisteredMutation<"public", {
    content: string;
    sessionId: import("convex/values").GenericId<"chatSessions">;
}, Promise<{
    messageId: import("convex/values").GenericId<"chatMessages">;
    sessionId: import("convex/values").GenericId<"chatSessions">;
    recentMessages: {
        _id: import("convex/values").GenericId<"chatMessages">;
        _creationTime: number;
        metadata?: {
            pois?: {
                description?: string | undefined;
                latitude?: number | undefined;
                longitude?: number | undefined;
                address?: string | undefined;
                rating?: number | undefined;
                priceInfo?: string | undefined;
                name: string;
                type: string;
            }[] | undefined;
            sources?: string[] | undefined;
            itineraryChanges?: {
                dayNumber?: number | undefined;
                poiName?: string | undefined;
                details?: string | undefined;
                action: string;
            }[] | undefined;
            quickActions?: {
                payload?: string | undefined;
                action: string;
                label: string;
            }[] | undefined;
        } | undefined;
        role: "user" | "assistant" | "system";
        content: string;
        createdAt: number;
        sessionId: import("convex/values").GenericId<"chatSessions">;
    }[];
    itineraryContext: {
        title: string;
        startDate: string;
        endDate: string;
        daysCount: number;
    } | null;
    guideContext: {
        title: string | undefined;
        destinations: string[];
        aiSummary: string | undefined;
    } | null;
    sessionContext: string | undefined;
}>>;
export declare const saveAssistantResponse: import("convex/server").RegisteredMutation<"public", {
    metadata?: {
        pois?: {
            description?: string | undefined;
            latitude?: number | undefined;
            longitude?: number | undefined;
            address?: string | undefined;
            rating?: number | undefined;
            priceInfo?: string | undefined;
            name: string;
            type: string;
        }[] | undefined;
        sources?: string[] | undefined;
        itineraryChanges?: {
            dayNumber?: number | undefined;
            poiName?: string | undefined;
            details?: string | undefined;
            action: string;
        }[] | undefined;
        quickActions?: {
            payload?: string | undefined;
            action: string;
            label: string;
        }[] | undefined;
    } | undefined;
    content: string;
    sessionId: import("convex/values").GenericId<"chatSessions">;
}, Promise<import("convex/values").GenericId<"chatMessages">>>;
export declare const getSessionWithContext: import("convex/server").RegisteredQuery<"public", {
    sessionId: import("convex/values").GenericId<"chatSessions">;
}, Promise<{
    session: {
        _id: import("convex/values").GenericId<"chatSessions">;
        _creationTime: number;
        context?: string | undefined;
        guideId?: import("convex/values").GenericId<"travelGuides"> | undefined;
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        createdAt: number;
        title: string;
        userId: string;
        lastMessageAt: number;
        messageCount: number;
        isArchived: boolean;
    };
    messages: {
        _id: import("convex/values").GenericId<"chatMessages">;
        _creationTime: number;
        metadata?: {
            pois?: {
                description?: string | undefined;
                latitude?: number | undefined;
                longitude?: number | undefined;
                address?: string | undefined;
                rating?: number | undefined;
                priceInfo?: string | undefined;
                name: string;
                type: string;
            }[] | undefined;
            sources?: string[] | undefined;
            itineraryChanges?: {
                dayNumber?: number | undefined;
                poiName?: string | undefined;
                details?: string | undefined;
                action: string;
            }[] | undefined;
            quickActions?: {
                payload?: string | undefined;
                action: string;
                label: string;
            }[] | undefined;
        } | undefined;
        role: "user" | "assistant" | "system";
        content: string;
        createdAt: number;
        sessionId: import("convex/values").GenericId<"chatSessions">;
    }[];
    itinerary: {
        id: import("convex/values").GenericId<"itineraries">;
        title: string;
        cityName: string | undefined;
        startDate: string;
        endDate: string;
        days: {
            dayNumber: number;
            date: string;
            items: {
                poiName: string | undefined;
                poiCategory: "attraction" | "restaurant" | "hotel" | "shopping" | "other" | undefined;
                _id: import("convex/values").GenericId<"itineraryItems">;
                _creationTime: number;
                notes?: string | undefined;
                startTime?: string | undefined;
                endTime?: string | undefined;
                poiId: import("convex/values").GenericId<"pois">;
                dayId: import("convex/values").GenericId<"itineraryDays">;
                orderIndex: number;
                transportMode: "walking" | "driving" | "transit" | "cycling" | "taxi";
            }[];
        }[];
    } | null;
    guide: {
        id: import("convex/values").GenericId<"travelGuides">;
        title: string | undefined;
        destinations: string[];
        aiSummary: string | undefined;
        aiTips: string[] | undefined;
        aiBestTime: string | undefined;
        aiDuration: string | undefined;
        aiBudget: string | undefined;
        aiDays: {
            theme?: string | undefined;
            pois: {
                description?: string | undefined;
                duration?: string | undefined;
                tips?: string | undefined;
                address?: string | undefined;
                rating?: number | undefined;
                priceInfo?: string | undefined;
                openingHours?: string | undefined;
                highlights?: string[] | undefined;
                transportToNext?: {
                    duration?: string | undefined;
                    mode?: string | undefined;
                    distance?: string | undefined;
                    notes?: string | undefined;
                } | undefined;
                geocodeConfidence?: number | undefined;
                geocodeSource?: string | undefined;
                isManuallyVerified?: boolean | undefined;
                verifiedAt?: number | undefined;
                verifiedBy?: string | undefined;
                name: string;
                type: string;
                latitude: number;
                longitude: number;
            }[];
            dayNumber: number;
        }[] | undefined;
    } | null;
} | null>>;
export declare const clearMessages: import("convex/server").RegisteredMutation<"public", {
    sessionId: import("convex/values").GenericId<"chatSessions">;
}, Promise<void>>;
