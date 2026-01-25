export declare const listCategories: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    _id: import("convex/values").GenericId<"templateCategories">;
    _creationTime: number;
    description?: string | undefined;
    nameEn?: string | undefined;
    name: string;
    createdAt: number;
    updatedAt: number;
    sortOrder: number;
    isActive: boolean;
    icon: string;
}[]>>;
export declare const getCategoryById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"templateCategories">;
}, Promise<{
    _id: import("convex/values").GenericId<"templateCategories">;
    _creationTime: number;
    description?: string | undefined;
    nameEn?: string | undefined;
    name: string;
    createdAt: number;
    updatedAt: number;
    sortOrder: number;
    isActive: boolean;
    icon: string;
} | null>>;
export declare const createCategory: import("convex/server").RegisteredMutation<"public", {
    description?: string | undefined;
    nameEn?: string | undefined;
    name: string;
    sortOrder: number;
    icon: string;
}, Promise<import("convex/values").GenericId<"templateCategories">>>;
export declare const updateCategory: import("convex/server").RegisteredMutation<"public", {
    name?: string | undefined;
    description?: string | undefined;
    nameEn?: string | undefined;
    sortOrder?: number | undefined;
    isActive?: boolean | undefined;
    icon?: string | undefined;
    id: import("convex/values").GenericId<"templateCategories">;
}, Promise<{
    _id: import("convex/values").GenericId<"templateCategories">;
    _creationTime: number;
    description?: string | undefined;
    nameEn?: string | undefined;
    name: string;
    createdAt: number;
    updatedAt: number;
    sortOrder: number;
    isActive: boolean;
    icon: string;
} | null>>;
export declare const listPublicTemplates: import("convex/server").RegisteredQuery<"public", {
    categoryId?: import("convex/values").GenericId<"templateCategories"> | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    sortBy?: "popular" | "newest" | "most_used" | undefined;
}, Promise<{
    data: {
        categoryName: string | undefined;
        categoryIcon: string | undefined;
        _id: import("convex/values").GenericId<"itineraryTemplates">;
        _creationTime: number;
        tags?: string[] | undefined;
        description?: string | undefined;
        destinations?: string[] | undefined;
        coverImageUrl?: string | undefined;
        publishedAt?: number | undefined;
        creatorId?: string | undefined;
        creatorName?: string | undefined;
        estimatedBudget?: {
            currency: string;
            min: number;
            max: number;
        } | undefined;
        suitableFor?: string[] | undefined;
        bestSeasons?: string[] | undefined;
        title: string;
        days: {
            theme?: string | undefined;
            pois: {
                description?: string | undefined;
                latitude?: number | undefined;
                longitude?: number | undefined;
                address?: string | undefined;
                notes?: string | undefined;
                suggestedDuration?: number | undefined;
                suggestedTime?: string | undefined;
                type: "attraction" | "restaurant" | "hotel" | "shopping" | "activity" | "transportation";
                name: string;
            }[];
            dayNumber: number;
        }[];
        createdAt: number;
        visibility: "public" | "private" | "unlisted";
        updatedAt: number;
        viewCount: number;
        categoryId: import("convex/values").GenericId<"templateCategories">;
        daysCount: number;
        templateType: "user" | "preset";
        isPublished: boolean;
        likeCount: number;
        saveCount: number;
        useCount: number;
    }[];
    total: number;
}>>;
export declare const listUserTemplates: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        categoryName: string | undefined;
        categoryIcon: string | undefined;
        _id: import("convex/values").GenericId<"itineraryTemplates">;
        _creationTime: number;
        tags?: string[] | undefined;
        description?: string | undefined;
        destinations?: string[] | undefined;
        coverImageUrl?: string | undefined;
        publishedAt?: number | undefined;
        creatorId?: string | undefined;
        creatorName?: string | undefined;
        estimatedBudget?: {
            currency: string;
            min: number;
            max: number;
        } | undefined;
        suitableFor?: string[] | undefined;
        bestSeasons?: string[] | undefined;
        title: string;
        days: {
            theme?: string | undefined;
            pois: {
                description?: string | undefined;
                latitude?: number | undefined;
                longitude?: number | undefined;
                address?: string | undefined;
                notes?: string | undefined;
                suggestedDuration?: number | undefined;
                suggestedTime?: string | undefined;
                type: "attraction" | "restaurant" | "hotel" | "shopping" | "activity" | "transportation";
                name: string;
            }[];
            dayNumber: number;
        }[];
        createdAt: number;
        visibility: "public" | "private" | "unlisted";
        updatedAt: number;
        viewCount: number;
        categoryId: import("convex/values").GenericId<"templateCategories">;
        daysCount: number;
        templateType: "user" | "preset";
        isPublished: boolean;
        likeCount: number;
        saveCount: number;
        useCount: number;
    }[];
    total: number;
}>>;
export declare const getTemplateById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"itineraryTemplates">;
}, Promise<{
    categoryName: string | undefined;
    categoryIcon: string | undefined;
    _id: import("convex/values").GenericId<"itineraryTemplates">;
    _creationTime: number;
    tags?: string[] | undefined;
    description?: string | undefined;
    destinations?: string[] | undefined;
    coverImageUrl?: string | undefined;
    publishedAt?: number | undefined;
    creatorId?: string | undefined;
    creatorName?: string | undefined;
    estimatedBudget?: {
        currency: string;
        min: number;
        max: number;
    } | undefined;
    suitableFor?: string[] | undefined;
    bestSeasons?: string[] | undefined;
    title: string;
    days: {
        theme?: string | undefined;
        pois: {
            description?: string | undefined;
            latitude?: number | undefined;
            longitude?: number | undefined;
            address?: string | undefined;
            notes?: string | undefined;
            suggestedDuration?: number | undefined;
            suggestedTime?: string | undefined;
            type: "attraction" | "restaurant" | "hotel" | "shopping" | "activity" | "transportation";
            name: string;
        }[];
        dayNumber: number;
    }[];
    createdAt: number;
    visibility: "public" | "private" | "unlisted";
    updatedAt: number;
    viewCount: number;
    categoryId: import("convex/values").GenericId<"templateCategories">;
    daysCount: number;
    templateType: "user" | "preset";
    isPublished: boolean;
    likeCount: number;
    saveCount: number;
    useCount: number;
} | null>>;
export declare const getTemplateWithUserStatus: import("convex/server").RegisteredQuery<"public", {
    userId?: string | undefined;
    id: import("convex/values").GenericId<"itineraryTemplates">;
}, Promise<{
    categoryName: string | undefined;
    categoryIcon: string | undefined;
    isLiked: boolean;
    isSaved: boolean;
    _id: import("convex/values").GenericId<"itineraryTemplates">;
    _creationTime: number;
    tags?: string[] | undefined;
    description?: string | undefined;
    destinations?: string[] | undefined;
    coverImageUrl?: string | undefined;
    publishedAt?: number | undefined;
    creatorId?: string | undefined;
    creatorName?: string | undefined;
    estimatedBudget?: {
        currency: string;
        min: number;
        max: number;
    } | undefined;
    suitableFor?: string[] | undefined;
    bestSeasons?: string[] | undefined;
    title: string;
    days: {
        theme?: string | undefined;
        pois: {
            description?: string | undefined;
            latitude?: number | undefined;
            longitude?: number | undefined;
            address?: string | undefined;
            notes?: string | undefined;
            suggestedDuration?: number | undefined;
            suggestedTime?: string | undefined;
            type: "attraction" | "restaurant" | "hotel" | "shopping" | "activity" | "transportation";
            name: string;
        }[];
        dayNumber: number;
    }[];
    createdAt: number;
    visibility: "public" | "private" | "unlisted";
    updatedAt: number;
    viewCount: number;
    categoryId: import("convex/values").GenericId<"templateCategories">;
    daysCount: number;
    templateType: "user" | "preset";
    isPublished: boolean;
    likeCount: number;
    saveCount: number;
    useCount: number;
} | null>>;
export declare const listSavedTemplates: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        categoryName: string | undefined;
        categoryIcon: string | undefined;
        savedAt: number;
        _id: import("convex/values").GenericId<"itineraryTemplates">;
        _creationTime: number;
        tags?: string[] | undefined;
        description?: string | undefined;
        destinations?: string[] | undefined;
        coverImageUrl?: string | undefined;
        publishedAt?: number | undefined;
        creatorId?: string | undefined;
        creatorName?: string | undefined;
        estimatedBudget?: {
            currency: string;
            min: number;
            max: number;
        } | undefined;
        suitableFor?: string[] | undefined;
        bestSeasons?: string[] | undefined;
        title: string;
        days: {
            theme?: string | undefined;
            pois: {
                description?: string | undefined;
                latitude?: number | undefined;
                longitude?: number | undefined;
                address?: string | undefined;
                notes?: string | undefined;
                suggestedDuration?: number | undefined;
                suggestedTime?: string | undefined;
                type: "attraction" | "restaurant" | "hotel" | "shopping" | "activity" | "transportation";
                name: string;
            }[];
            dayNumber: number;
        }[];
        createdAt: number;
        visibility: "public" | "private" | "unlisted";
        updatedAt: number;
        viewCount: number;
        categoryId: import("convex/values").GenericId<"templateCategories">;
        daysCount: number;
        templateType: "user" | "preset";
        isPublished: boolean;
        likeCount: number;
        saveCount: number;
        useCount: number;
    }[];
    total: number;
}>>;
export declare const searchTemplates: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    query: string;
}, Promise<{
    data: {
        categoryName: string | undefined;
        categoryIcon: string | undefined;
        _id: import("convex/values").GenericId<"itineraryTemplates">;
        _creationTime: number;
        tags?: string[] | undefined;
        description?: string | undefined;
        destinations?: string[] | undefined;
        coverImageUrl?: string | undefined;
        publishedAt?: number | undefined;
        creatorId?: string | undefined;
        creatorName?: string | undefined;
        estimatedBudget?: {
            currency: string;
            min: number;
            max: number;
        } | undefined;
        suitableFor?: string[] | undefined;
        bestSeasons?: string[] | undefined;
        title: string;
        days: {
            theme?: string | undefined;
            pois: {
                description?: string | undefined;
                latitude?: number | undefined;
                longitude?: number | undefined;
                address?: string | undefined;
                notes?: string | undefined;
                suggestedDuration?: number | undefined;
                suggestedTime?: string | undefined;
                type: "attraction" | "restaurant" | "hotel" | "shopping" | "activity" | "transportation";
                name: string;
            }[];
            dayNumber: number;
        }[];
        createdAt: number;
        visibility: "public" | "private" | "unlisted";
        updatedAt: number;
        viewCount: number;
        categoryId: import("convex/values").GenericId<"templateCategories">;
        daysCount: number;
        templateType: "user" | "preset";
        isPublished: boolean;
        likeCount: number;
        saveCount: number;
        useCount: number;
    }[];
    total: number;
}>>;
export declare const getRecommendedTemplates: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
}, Promise<{
    categoryName: string | undefined;
    categoryIcon: string | undefined;
    _id: import("convex/values").GenericId<"itineraryTemplates">;
    _creationTime: number;
    tags?: string[] | undefined;
    description?: string | undefined;
    destinations?: string[] | undefined;
    coverImageUrl?: string | undefined;
    publishedAt?: number | undefined;
    creatorId?: string | undefined;
    creatorName?: string | undefined;
    estimatedBudget?: {
        currency: string;
        min: number;
        max: number;
    } | undefined;
    suitableFor?: string[] | undefined;
    bestSeasons?: string[] | undefined;
    title: string;
    days: {
        theme?: string | undefined;
        pois: {
            description?: string | undefined;
            latitude?: number | undefined;
            longitude?: number | undefined;
            address?: string | undefined;
            notes?: string | undefined;
            suggestedDuration?: number | undefined;
            suggestedTime?: string | undefined;
            type: "attraction" | "restaurant" | "hotel" | "shopping" | "activity" | "transportation";
            name: string;
        }[];
        dayNumber: number;
    }[];
    createdAt: number;
    visibility: "public" | "private" | "unlisted";
    updatedAt: number;
    viewCount: number;
    categoryId: import("convex/values").GenericId<"templateCategories">;
    daysCount: number;
    templateType: "user" | "preset";
    isPublished: boolean;
    likeCount: number;
    saveCount: number;
    useCount: number;
}[]>>;
export declare const createTemplate: import("convex/server").RegisteredMutation<"public", {
    tags?: string[] | undefined;
    description?: string | undefined;
    destinations?: string[] | undefined;
    visibility?: "public" | "private" | "unlisted" | undefined;
    coverImageUrl?: string | undefined;
    creatorId?: string | undefined;
    creatorName?: string | undefined;
    estimatedBudget?: {
        currency: string;
        min: number;
        max: number;
    } | undefined;
    suitableFor?: string[] | undefined;
    bestSeasons?: string[] | undefined;
    title: string;
    days: {
        theme?: string | undefined;
        pois: {
            description?: string | undefined;
            latitude?: number | undefined;
            longitude?: number | undefined;
            address?: string | undefined;
            notes?: string | undefined;
            suggestedDuration?: number | undefined;
            suggestedTime?: string | undefined;
            type: "attraction" | "restaurant" | "hotel" | "shopping" | "activity" | "transportation";
            name: string;
        }[];
        dayNumber: number;
    }[];
    categoryId: import("convex/values").GenericId<"templateCategories">;
    daysCount: number;
    templateType: "user" | "preset";
}, Promise<import("convex/values").GenericId<"itineraryTemplates">>>;
export declare const updateTemplate: import("convex/server").RegisteredMutation<"public", {
    tags?: string[] | undefined;
    title?: string | undefined;
    description?: string | undefined;
    destinations?: string[] | undefined;
    days?: {
        theme?: string | undefined;
        pois: {
            description?: string | undefined;
            latitude?: number | undefined;
            longitude?: number | undefined;
            address?: string | undefined;
            notes?: string | undefined;
            suggestedDuration?: number | undefined;
            suggestedTime?: string | undefined;
            type: "attraction" | "restaurant" | "hotel" | "shopping" | "activity" | "transportation";
            name: string;
        }[];
        dayNumber: number;
    }[] | undefined;
    visibility?: "public" | "private" | "unlisted" | undefined;
    coverImageUrl?: string | undefined;
    categoryId?: import("convex/values").GenericId<"templateCategories"> | undefined;
    daysCount?: number | undefined;
    estimatedBudget?: {
        currency: string;
        min: number;
        max: number;
    } | undefined;
    suitableFor?: string[] | undefined;
    bestSeasons?: string[] | undefined;
    id: import("convex/values").GenericId<"itineraryTemplates">;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"itineraryTemplates">;
    _creationTime: number;
    tags?: string[] | undefined;
    description?: string | undefined;
    destinations?: string[] | undefined;
    coverImageUrl?: string | undefined;
    publishedAt?: number | undefined;
    creatorId?: string | undefined;
    creatorName?: string | undefined;
    estimatedBudget?: {
        currency: string;
        min: number;
        max: number;
    } | undefined;
    suitableFor?: string[] | undefined;
    bestSeasons?: string[] | undefined;
    title: string;
    days: {
        theme?: string | undefined;
        pois: {
            description?: string | undefined;
            latitude?: number | undefined;
            longitude?: number | undefined;
            address?: string | undefined;
            notes?: string | undefined;
            suggestedDuration?: number | undefined;
            suggestedTime?: string | undefined;
            type: "attraction" | "restaurant" | "hotel" | "shopping" | "activity" | "transportation";
            name: string;
        }[];
        dayNumber: number;
    }[];
    createdAt: number;
    visibility: "public" | "private" | "unlisted";
    updatedAt: number;
    viewCount: number;
    categoryId: import("convex/values").GenericId<"templateCategories">;
    daysCount: number;
    templateType: "user" | "preset";
    isPublished: boolean;
    likeCount: number;
    saveCount: number;
    useCount: number;
} | null>>;
export declare const deleteTemplate: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"itineraryTemplates">;
    userId: string;
}, Promise<void>>;
export declare const incrementViewCount: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"itineraryTemplates">;
}, Promise<void>>;
export declare const incrementUseCount: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"itineraryTemplates">;
}, Promise<void>>;
export declare const toggleLike: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    templateId: import("convex/values").GenericId<"itineraryTemplates">;
}, Promise<{
    liked: boolean;
}>>;
export declare const toggleSave: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    templateId: import("convex/values").GenericId<"itineraryTemplates">;
}, Promise<{
    saved: boolean;
}>>;
export declare const createItineraryFromTemplate: import("convex/server").RegisteredMutation<"public", {
    title: string;
    userId: string;
    startDate: string;
    endDate: string;
    cityId: import("convex/values").GenericId<"cities">;
    templateId: import("convex/values").GenericId<"itineraryTemplates">;
}, Promise<import("convex/values").GenericId<"itineraries">>>;
export declare const saveItineraryAsTemplate: import("convex/server").RegisteredMutation<"public", {
    tags?: string[] | undefined;
    description?: string | undefined;
    visibility?: "public" | "private" | "unlisted" | undefined;
    title: string;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    categoryId: import("convex/values").GenericId<"templateCategories">;
}, Promise<import("convex/values").GenericId<"itineraryTemplates">>>;
