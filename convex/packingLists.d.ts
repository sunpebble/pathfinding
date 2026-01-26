import type { Id } from './_generated/dataModel';
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        itemsCount: number;
        packedCount: number;
        progress: number;
        _id: import("convex/values").GenericId<"packingLists">;
        _creationTime: number;
        destination?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        weatherInfo?: {
            condition?: string | undefined;
            humidity?: number | undefined;
            fetchedAt?: number | undefined;
            avgTemp?: number | undefined;
        } | undefined;
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        tripType?: "city" | "other" | "leisure" | "business" | "adventure" | "beach" | "ski" | "hiking" | undefined;
        shareCode?: string | undefined;
        sharedWith?: string[] | undefined;
        templateId?: import("convex/values").GenericId<"packingTemplates"> | undefined;
        createdAt: number;
        title: string;
        userId: string;
        updatedAt: number;
        isPublic: boolean;
    }[];
    total: number;
}>>;
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    userId?: string | undefined;
    id: import("convex/values").GenericId<"packingLists">;
}, Promise<{
    items: {
        _id: import("convex/values").GenericId<"packingItems">;
        _creationTime: number;
        notes?: string | undefined;
        suggestedBy?: "user" | "ai" | "weather" | "activity" | "template" | undefined;
        packedAt?: number | undefined;
        packedBy?: string | undefined;
        createdAt: number;
        name: string;
        updatedAt: number;
        category: "other" | "clothing" | "toiletries" | "electronics" | "documents" | "medicine" | "accessories" | "gear" | "snacks";
        orderIndex: number;
        packingListId: import("convex/values").GenericId<"packingLists">;
        quantity: number;
        isPacked: boolean;
        isEssential: boolean;
    }[];
    itemsByCategory: Record<string, {
        _id: import("convex/values").GenericId<"packingItems">;
        _creationTime: number;
        notes?: string | undefined;
        suggestedBy?: "user" | "ai" | "weather" | "activity" | "template" | undefined;
        packedAt?: number | undefined;
        packedBy?: string | undefined;
        createdAt: number;
        name: string;
        updatedAt: number;
        category: "other" | "clothing" | "toiletries" | "electronics" | "documents" | "medicine" | "accessories" | "gear" | "snacks";
        orderIndex: number;
        packingListId: import("convex/values").GenericId<"packingLists">;
        quantity: number;
        isPacked: boolean;
        isEssential: boolean;
    }[]>;
    itemsCount: number;
    packedCount: number;
    progress: number;
    itinerary: {
        id: import("convex/values").GenericId<"itineraries">;
        title: string;
        startDate: string;
        endDate: string;
    } | null;
    _id: import("convex/values").GenericId<"packingLists">;
    _creationTime: number;
    destination?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    weatherInfo?: {
        condition?: string | undefined;
        humidity?: number | undefined;
        fetchedAt?: number | undefined;
        avgTemp?: number | undefined;
    } | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    tripType?: "city" | "other" | "leisure" | "business" | "adventure" | "beach" | "ski" | "hiking" | undefined;
    shareCode?: string | undefined;
    sharedWith?: string[] | undefined;
    templateId?: import("convex/values").GenericId<"packingTemplates"> | undefined;
    createdAt: number;
    title: string;
    userId: string;
    updatedAt: number;
    isPublic: boolean;
} | null>>;
export declare const getByShareCode: import("convex/server").RegisteredQuery<"public", {
    shareCode: string;
}, Promise<{
    items: {
        _id: import("convex/values").GenericId<"packingItems">;
        _creationTime: number;
        notes?: string | undefined;
        suggestedBy?: "user" | "ai" | "weather" | "activity" | "template" | undefined;
        packedAt?: number | undefined;
        packedBy?: string | undefined;
        createdAt: number;
        name: string;
        updatedAt: number;
        category: "other" | "clothing" | "toiletries" | "electronics" | "documents" | "medicine" | "accessories" | "gear" | "snacks";
        orderIndex: number;
        packingListId: import("convex/values").GenericId<"packingLists">;
        quantity: number;
        isPacked: boolean;
        isEssential: boolean;
    }[];
    itemsByCategory: Record<string, {
        _id: import("convex/values").GenericId<"packingItems">;
        _creationTime: number;
        notes?: string | undefined;
        suggestedBy?: "user" | "ai" | "weather" | "activity" | "template" | undefined;
        packedAt?: number | undefined;
        packedBy?: string | undefined;
        createdAt: number;
        name: string;
        updatedAt: number;
        category: "other" | "clothing" | "toiletries" | "electronics" | "documents" | "medicine" | "accessories" | "gear" | "snacks";
        orderIndex: number;
        packingListId: import("convex/values").GenericId<"packingLists">;
        quantity: number;
        isPacked: boolean;
        isEssential: boolean;
    }[]>;
    itemsCount: number;
    packedCount: number;
    progress: number;
    _id: import("convex/values").GenericId<"packingLists">;
    _creationTime: number;
    destination?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    weatherInfo?: {
        condition?: string | undefined;
        humidity?: number | undefined;
        fetchedAt?: number | undefined;
        avgTemp?: number | undefined;
    } | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    tripType?: "city" | "other" | "leisure" | "business" | "adventure" | "beach" | "ski" | "hiking" | undefined;
    shareCode?: string | undefined;
    sharedWith?: string[] | undefined;
    templateId?: import("convex/values").GenericId<"packingTemplates"> | undefined;
    createdAt: number;
    title: string;
    userId: string;
    updatedAt: number;
    isPublic: boolean;
} | null>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    destination?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    tripType?: "city" | "other" | "leisure" | "business" | "adventure" | "beach" | "ski" | "hiking" | undefined;
    templateId?: import("convex/values").GenericId<"packingTemplates"> | undefined;
    title: string;
    userId: string;
}, Promise<import("convex/values").GenericId<"packingLists">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    title?: string | undefined;
    destination?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    weatherInfo?: {
        condition?: string | undefined;
        humidity?: number | undefined;
        fetchedAt?: number | undefined;
        avgTemp?: number | undefined;
    } | undefined;
    tripType?: "city" | "other" | "leisure" | "business" | "adventure" | "beach" | "ski" | "hiking" | undefined;
    isPublic?: boolean | undefined;
    id: import("convex/values").GenericId<"packingLists">;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"packingLists">;
    _creationTime: number;
    destination?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    weatherInfo?: {
        condition?: string | undefined;
        humidity?: number | undefined;
        fetchedAt?: number | undefined;
        avgTemp?: number | undefined;
    } | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    tripType?: "city" | "other" | "leisure" | "business" | "adventure" | "beach" | "ski" | "hiking" | undefined;
    shareCode?: string | undefined;
    sharedWith?: string[] | undefined;
    templateId?: import("convex/values").GenericId<"packingTemplates"> | undefined;
    createdAt: number;
    title: string;
    userId: string;
    updatedAt: number;
    isPublic: boolean;
} | null>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"packingLists">;
    userId: string;
}, Promise<void>>;
export declare const generateShareCode: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"packingLists">;
    userId: string;
}, Promise<string>>;
export declare const addSharedUser: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"packingLists">;
    userId: string;
    sharedUserId: string;
}, Promise<void>>;
export declare const removeSharedUser: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"packingLists">;
    userId: string;
    sharedUserId: string;
}, Promise<void>>;
export declare const addItem: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    quantity?: number | undefined;
    isEssential?: boolean | undefined;
    suggestedBy?: "user" | "ai" | "weather" | "activity" | "template" | undefined;
    name: string;
    userId: string;
    category: "other" | "clothing" | "toiletries" | "electronics" | "documents" | "medicine" | "accessories" | "gear" | "snacks";
    packingListId: import("convex/values").GenericId<"packingLists">;
}, Promise<import("convex/values").GenericId<"packingItems">>>;
export declare const updateItem: import("convex/server").RegisteredMutation<"public", {
    name?: string | undefined;
    category?: "other" | "clothing" | "toiletries" | "electronics" | "documents" | "medicine" | "accessories" | "gear" | "snacks" | undefined;
    notes?: string | undefined;
    quantity?: number | undefined;
    isEssential?: boolean | undefined;
    id: import("convex/values").GenericId<"packingItems">;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"packingItems">;
    _creationTime: number;
    notes?: string | undefined;
    suggestedBy?: "user" | "ai" | "weather" | "activity" | "template" | undefined;
    packedAt?: number | undefined;
    packedBy?: string | undefined;
    createdAt: number;
    name: string;
    updatedAt: number;
    category: "other" | "clothing" | "toiletries" | "electronics" | "documents" | "medicine" | "accessories" | "gear" | "snacks";
    orderIndex: number;
    packingListId: import("convex/values").GenericId<"packingLists">;
    quantity: number;
    isPacked: boolean;
    isEssential: boolean;
} | null>>;
export declare const toggleItemPacked: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"packingItems">;
    userId: string;
}, Promise<boolean>>;
export declare const removeItem: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"packingItems">;
    userId: string;
}, Promise<void>>;
export declare const addItemsBulk: import("convex/server").RegisteredMutation<"public", {
    items: {
        notes?: string | undefined;
        quantity?: number | undefined;
        isEssential?: boolean | undefined;
        suggestedBy?: "user" | "ai" | "weather" | "activity" | "template" | undefined;
        name: string;
        category: "other" | "clothing" | "toiletries" | "electronics" | "documents" | "medicine" | "accessories" | "gear" | "snacks";
    }[];
    userId: string;
    packingListId: import("convex/values").GenericId<"packingLists">;
}, Promise<Id<"packingItems">[]>>;
export declare const listSystemTemplates: import("convex/server").RegisteredQuery<"public", {
    tripType?: "city" | "other" | "leisure" | "business" | "adventure" | "beach" | "ski" | "hiking" | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"packingTemplates">;
    _creationTime: number;
    description?: string | undefined;
    nameEn?: string | undefined;
    climate?: "any" | "tropical" | "dry" | "temperate" | "cold" | "polar" | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    createdBy?: string | undefined;
    durationDays?: number | undefined;
    createdAt: number;
    name: string;
    items: {
        conditions?: {
            minDays?: number | undefined;
            maxDays?: number | undefined;
            minTemp?: number | undefined;
            maxTemp?: number | undefined;
            weatherConditions?: string[] | undefined;
            activities?: string[] | undefined;
        } | undefined;
        name: string;
        category: string;
        quantity: number;
        isEssential: boolean;
    }[];
    updatedAt: number;
    isSystem: boolean;
    tripType: "city" | "other" | "leisure" | "business" | "adventure" | "beach" | "ski" | "hiking";
    isPublic: boolean;
    usageCount: number;
}[]>>;
export declare const listPublicTemplates: import("convex/server").RegisteredQuery<"public", {
    tripType?: "city" | "other" | "leisure" | "business" | "adventure" | "beach" | "ski" | "hiking" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}, Promise<{
    data: {
        _id: import("convex/values").GenericId<"packingTemplates">;
        _creationTime: number;
        description?: string | undefined;
        nameEn?: string | undefined;
        climate?: "any" | "tropical" | "dry" | "temperate" | "cold" | "polar" | undefined;
        rating?: number | undefined;
        ratingCount?: number | undefined;
        createdBy?: string | undefined;
        durationDays?: number | undefined;
        createdAt: number;
        name: string;
        items: {
            conditions?: {
                minDays?: number | undefined;
                maxDays?: number | undefined;
                minTemp?: number | undefined;
                maxTemp?: number | undefined;
                weatherConditions?: string[] | undefined;
                activities?: string[] | undefined;
            } | undefined;
            name: string;
            category: string;
            quantity: number;
            isEssential: boolean;
        }[];
        updatedAt: number;
        isSystem: boolean;
        tripType: "city" | "other" | "leisure" | "business" | "adventure" | "beach" | "ski" | "hiking";
        isPublic: boolean;
        usageCount: number;
    }[];
    total: number;
}>>;
export declare const getTemplateById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"packingTemplates">;
}, Promise<{
    _id: import("convex/values").GenericId<"packingTemplates">;
    _creationTime: number;
    description?: string | undefined;
    nameEn?: string | undefined;
    climate?: "any" | "tropical" | "dry" | "temperate" | "cold" | "polar" | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    createdBy?: string | undefined;
    durationDays?: number | undefined;
    createdAt: number;
    name: string;
    items: {
        conditions?: {
            minDays?: number | undefined;
            maxDays?: number | undefined;
            minTemp?: number | undefined;
            maxTemp?: number | undefined;
            weatherConditions?: string[] | undefined;
            activities?: string[] | undefined;
        } | undefined;
        name: string;
        category: string;
        quantity: number;
        isEssential: boolean;
    }[];
    updatedAt: number;
    isSystem: boolean;
    tripType: "city" | "other" | "leisure" | "business" | "adventure" | "beach" | "ski" | "hiking";
    isPublic: boolean;
    usageCount: number;
} | null>>;
export declare const createTemplateFromList: import("convex/server").RegisteredMutation<"public", {
    description?: string | undefined;
    isPublic?: boolean | undefined;
    name: string;
    userId: string;
    packingListId: import("convex/values").GenericId<"packingLists">;
}, Promise<import("convex/values").GenericId<"packingTemplates">>>;
export declare const updateTemplate: import("convex/server").RegisteredMutation<"public", {
    name?: string | undefined;
    description?: string | undefined;
    isPublic?: boolean | undefined;
    id: import("convex/values").GenericId<"packingTemplates">;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"packingTemplates">;
    _creationTime: number;
    description?: string | undefined;
    nameEn?: string | undefined;
    climate?: "any" | "tropical" | "dry" | "temperate" | "cold" | "polar" | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    createdBy?: string | undefined;
    durationDays?: number | undefined;
    createdAt: number;
    name: string;
    items: {
        conditions?: {
            minDays?: number | undefined;
            maxDays?: number | undefined;
            minTemp?: number | undefined;
            maxTemp?: number | undefined;
            weatherConditions?: string[] | undefined;
            activities?: string[] | undefined;
        } | undefined;
        name: string;
        category: string;
        quantity: number;
        isEssential: boolean;
    }[];
    updatedAt: number;
    isSystem: boolean;
    tripType: "city" | "other" | "leisure" | "business" | "adventure" | "beach" | "ski" | "hiking";
    isPublic: boolean;
    usageCount: number;
} | null>>;
export declare const removeTemplate: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"packingTemplates">;
    userId: string;
}, Promise<void>>;
