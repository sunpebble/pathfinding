export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        cityName: string | undefined;
        daysCount: number;
        _id: import("convex/values").GenericId<"itineraries">;
        _creationTime: number;
        coverImageUrl?: string | undefined;
        copiedFromId?: import("convex/values").GenericId<"itineraries"> | undefined;
        title: string;
        userId: string;
        startDate: string;
        endDate: string;
        visibility: "public" | "private" | "team";
        cityId: import("convex/values").GenericId<"cities">;
    }[];
    total: number;
}>>;
export declare const listPublic: import("convex/server").RegisteredQuery<"public", {
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}, Promise<{
    data: {
        cityName: string | undefined;
        daysCount: number;
        _id: import("convex/values").GenericId<"itineraries">;
        _creationTime: number;
        coverImageUrl?: string | undefined;
        copiedFromId?: import("convex/values").GenericId<"itineraries"> | undefined;
        title: string;
        userId: string;
        startDate: string;
        endDate: string;
        visibility: "public" | "private" | "team";
        cityId: import("convex/values").GenericId<"cities">;
    }[];
    total: number;
}>>;
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    cityName: string | undefined;
    daysCount: number;
    days: {
        items: {
            poi: {
                id: any;
                name: any;
                category: any;
                address: any;
                latitude: any;
                longitude: any;
                rating: any;
            } | null;
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
        _id: import("convex/values").GenericId<"itineraryDays">;
        _creationTime: number;
        date: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        dayNumber: number;
    }[];
    collaborators: {
        _id: import("convex/values").GenericId<"itineraryCollaborators">;
        _creationTime: number;
        userId: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        role: "owner" | "editor" | "viewer";
    }[];
    _id: import("convex/values").GenericId<"itineraries">;
    _creationTime: number;
    coverImageUrl?: string | undefined;
    copiedFromId?: import("convex/values").GenericId<"itineraries"> | undefined;
    title: string;
    userId: string;
    startDate: string;
    endDate: string;
    visibility: "public" | "private" | "team";
    cityId: import("convex/values").GenericId<"cities">;
} | null>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    visibility?: "public" | "private" | "team" | undefined;
    coverImageUrl?: string | undefined;
    title: string;
    userId: string;
    startDate: string;
    endDate: string;
    cityId: import("convex/values").GenericId<"cities">;
}, Promise<import("convex/values").GenericId<"itineraries">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    title?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    visibility?: "public" | "private" | "team" | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    coverImageUrl?: string | undefined;
    id: import("convex/values").GenericId<"itineraries">;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"itineraries">;
    _creationTime: number;
    coverImageUrl?: string | undefined;
    copiedFromId?: import("convex/values").GenericId<"itineraries"> | undefined;
    title: string;
    userId: string;
    startDate: string;
    endDate: string;
    visibility: "public" | "private" | "team";
    cityId: import("convex/values").GenericId<"cities">;
} | null>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"itineraries">;
    userId: string;
}, Promise<void>>;
export declare const copy: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    newStartDate: string;
}, Promise<import("convex/values").GenericId<"itineraries">>>;
export declare const copyPartial: import("convex/server").RegisteredMutation<"public", {
    newTitle?: string | undefined;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    selectedDays: number[];
    newStartDate: string;
}, Promise<import("convex/values").GenericId<"itineraries">>>;
export declare const getCopyHistory: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        originalItinerary: {
            id: import("convex/values").GenericId<"itineraries">;
            title: string;
            startDate: string;
            endDate: string;
        } | null;
        copiedItinerary: {
            id: import("convex/values").GenericId<"itineraries">;
            title: string;
            startDate: string;
            endDate: string;
        } | null;
        _id: import("convex/values").GenericId<"itineraryCopyHistory">;
        _creationTime: number;
        selectedDays?: number[] | undefined;
        userId: string;
        createdAt: number;
        originalItineraryId: import("convex/values").GenericId<"itineraries">;
        copiedItineraryId: import("convex/values").GenericId<"itineraries">;
        copyType: "partial" | "full";
        originalStartDate: string;
        newStartDate: string;
        dateOffset: number;
    }[];
    total: number;
}>>;
export declare const getItineraryCopyStats: import("convex/server").RegisteredQuery<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    copyCount: number;
    recentCopies: {
        copiedAt: number;
        copyType: "partial" | "full";
    }[];
}>>;
