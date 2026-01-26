import type { Id } from './_generated/dataModel';
export declare const list: import("convex/server").RegisteredQuery<"public", {
    platform?: "tongcheng" | "xiaohongshu" | "mafengwo" | "ctrip" | "qunar" | "weibo" | "douyin" | "tripadvisor" | undefined;
    limit?: number | undefined;
    minQuality?: number | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"travelGuides">;
    _creationTime: number;
    title?: string | undefined;
    sourceUrl?: string | undefined;
    authorName?: string | undefined;
    publishedAt?: number | undefined;
    coverImageUrl?: string | undefined;
    contentHtml?: string | undefined;
    authorId?: string | undefined;
    contentHash?: string | undefined;
    enrichmentStatus?: "completed" | "failed" | "processing" | "pending" | undefined;
    enrichmentError?: string | undefined;
    enrichmentStartedAt?: number | undefined;
    aiProcessedAt?: number | undefined;
    aiSummary?: string | undefined;
    aiTips?: string[] | undefined;
    aiBestTime?: string | undefined;
    aiDuration?: string | undefined;
    aiBudget?: string | undefined;
    aiDays?: {
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
    geocodingMetrics?: {
        sourceDistribution?: {
            nominatim?: number | undefined;
            amap?: number | undefined;
            overpass?: number | undefined;
            consensus?: number | undefined;
            manual?: number | undefined;
        } | undefined;
        lastUpdated?: number | undefined;
        totalPois: number;
        averageConfidence: number;
        lowConfidenceCount: number;
        manuallyVerifiedCount: number;
    } | undefined;
    content: string;
    sourceExternalId: string;
    imageUrls: string[];
    destinations: string[];
    tags: string[];
    likesCount: number;
    savesCount: number;
    commentsCount: number;
    viewsCount: number;
    qualityScore: number;
    crawledAt: number;
    sourcePlatform: "tongcheng" | "xiaohongshu" | "mafengwo" | "ctrip" | "qunar" | "weibo" | "douyin" | "tripadvisor";
}[]>>;
export declare const listIds: import("convex/server").RegisteredQuery<"public", {
    cursor?: string | undefined;
    limit?: number | undefined;
}, Promise<{
    items: {
        _id: import("convex/values").GenericId<"travelGuides">;
        sourceExternalId: string;
        sourcePlatform: "tongcheng" | "xiaohongshu" | "mafengwo" | "ctrip" | "qunar" | "weibo" | "douyin" | "tripadvisor";
        title: string | undefined;
        contentLength: number;
        qualityScore: number;
        aiProcessedAt: number | undefined;
    }[];
    cursor: string;
    isDone: boolean;
}>>;
export declare const count: import("convex/server").RegisteredQuery<"public", {}, Promise<number>>;
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"travelGuides">;
}, Promise<{
    _id: import("convex/values").GenericId<"travelGuides">;
    _creationTime: number;
    title?: string | undefined;
    sourceUrl?: string | undefined;
    authorName?: string | undefined;
    publishedAt?: number | undefined;
    coverImageUrl?: string | undefined;
    contentHtml?: string | undefined;
    authorId?: string | undefined;
    contentHash?: string | undefined;
    enrichmentStatus?: "completed" | "failed" | "processing" | "pending" | undefined;
    enrichmentError?: string | undefined;
    enrichmentStartedAt?: number | undefined;
    aiProcessedAt?: number | undefined;
    aiSummary?: string | undefined;
    aiTips?: string[] | undefined;
    aiBestTime?: string | undefined;
    aiDuration?: string | undefined;
    aiBudget?: string | undefined;
    aiDays?: {
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
    geocodingMetrics?: {
        sourceDistribution?: {
            nominatim?: number | undefined;
            amap?: number | undefined;
            overpass?: number | undefined;
            consensus?: number | undefined;
            manual?: number | undefined;
        } | undefined;
        lastUpdated?: number | undefined;
        totalPois: number;
        averageConfidence: number;
        lowConfidenceCount: number;
        manuallyVerifiedCount: number;
    } | undefined;
    content: string;
    sourceExternalId: string;
    imageUrls: string[];
    destinations: string[];
    tags: string[];
    likesCount: number;
    savesCount: number;
    commentsCount: number;
    viewsCount: number;
    qualityScore: number;
    crawledAt: number;
    sourcePlatform: "tongcheng" | "xiaohongshu" | "mafengwo" | "ctrip" | "qunar" | "weibo" | "douyin" | "tripadvisor";
} | null>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    content?: string | undefined;
    title?: string | undefined;
    aiSummary?: string | undefined;
    id: import("convex/values").GenericId<"travelGuides">;
}, Promise<{
    _id: import("convex/values").GenericId<"travelGuides">;
    _creationTime: number;
    title?: string | undefined;
    sourceUrl?: string | undefined;
    authorName?: string | undefined;
    publishedAt?: number | undefined;
    coverImageUrl?: string | undefined;
    contentHtml?: string | undefined;
    authorId?: string | undefined;
    contentHash?: string | undefined;
    enrichmentStatus?: "completed" | "failed" | "processing" | "pending" | undefined;
    enrichmentError?: string | undefined;
    enrichmentStartedAt?: number | undefined;
    aiProcessedAt?: number | undefined;
    aiSummary?: string | undefined;
    aiTips?: string[] | undefined;
    aiBestTime?: string | undefined;
    aiDuration?: string | undefined;
    aiBudget?: string | undefined;
    aiDays?: {
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
    geocodingMetrics?: {
        sourceDistribution?: {
            nominatim?: number | undefined;
            amap?: number | undefined;
            overpass?: number | undefined;
            consensus?: number | undefined;
            manual?: number | undefined;
        } | undefined;
        lastUpdated?: number | undefined;
        totalPois: number;
        averageConfidence: number;
        lowConfidenceCount: number;
        manuallyVerifiedCount: number;
    } | undefined;
    content: string;
    sourceExternalId: string;
    imageUrls: string[];
    destinations: string[];
    tags: string[];
    likesCount: number;
    savesCount: number;
    commentsCount: number;
    viewsCount: number;
    qualityScore: number;
    crawledAt: number;
    sourcePlatform: "tongcheng" | "xiaohongshu" | "mafengwo" | "ctrip" | "qunar" | "weibo" | "douyin" | "tripadvisor";
} | null>>;
export declare const search: import("convex/server").RegisteredQuery<"public", {
    destination?: string | undefined;
    limit?: number | undefined;
    query?: string | undefined;
    hasAiData?: boolean | undefined;
    daysAgo?: number | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"travelGuides">;
    _creationTime: number;
    title?: string | undefined;
    sourceUrl?: string | undefined;
    authorName?: string | undefined;
    publishedAt?: number | undefined;
    coverImageUrl?: string | undefined;
    contentHtml?: string | undefined;
    authorId?: string | undefined;
    contentHash?: string | undefined;
    enrichmentStatus?: "completed" | "failed" | "processing" | "pending" | undefined;
    enrichmentError?: string | undefined;
    enrichmentStartedAt?: number | undefined;
    aiProcessedAt?: number | undefined;
    aiSummary?: string | undefined;
    aiTips?: string[] | undefined;
    aiBestTime?: string | undefined;
    aiDuration?: string | undefined;
    aiBudget?: string | undefined;
    aiDays?: {
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
    geocodingMetrics?: {
        sourceDistribution?: {
            nominatim?: number | undefined;
            amap?: number | undefined;
            overpass?: number | undefined;
            consensus?: number | undefined;
            manual?: number | undefined;
        } | undefined;
        lastUpdated?: number | undefined;
        totalPois: number;
        averageConfidence: number;
        lowConfidenceCount: number;
        manuallyVerifiedCount: number;
    } | undefined;
    content: string;
    sourceExternalId: string;
    imageUrls: string[];
    destinations: string[];
    tags: string[];
    likesCount: number;
    savesCount: number;
    commentsCount: number;
    viewsCount: number;
    qualityScore: number;
    crawledAt: number;
    sourcePlatform: "tongcheng" | "xiaohongshu" | "mafengwo" | "ctrip" | "qunar" | "weibo" | "douyin" | "tripadvisor";
}[]>>;
export declare const listDestinationsBatch: import("convex/server").RegisteredQuery<"public", {
    cursor?: string | undefined;
    batchSize?: number | undefined;
}, Promise<{
    destinations: string[];
    cursor: string;
    isDone: boolean;
}>>;
export declare const getPopularDestinations: import("convex/server").RegisteredQuery<"public", {
    destinations?: string[] | undefined;
    limit?: number | undefined;
}, Promise<{
    name: string;
    count: number;
}[]>>;
export declare const getByDestination: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    destination: string;
}, Promise<{
    _id: import("convex/values").GenericId<"travelGuides">;
    _creationTime: number;
    title?: string | undefined;
    sourceUrl?: string | undefined;
    authorName?: string | undefined;
    publishedAt?: number | undefined;
    coverImageUrl?: string | undefined;
    contentHtml?: string | undefined;
    authorId?: string | undefined;
    contentHash?: string | undefined;
    enrichmentStatus?: "completed" | "failed" | "processing" | "pending" | undefined;
    enrichmentError?: string | undefined;
    enrichmentStartedAt?: number | undefined;
    aiProcessedAt?: number | undefined;
    aiSummary?: string | undefined;
    aiTips?: string[] | undefined;
    aiBestTime?: string | undefined;
    aiDuration?: string | undefined;
    aiBudget?: string | undefined;
    aiDays?: {
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
    geocodingMetrics?: {
        sourceDistribution?: {
            nominatim?: number | undefined;
            amap?: number | undefined;
            overpass?: number | undefined;
            consensus?: number | undefined;
            manual?: number | undefined;
        } | undefined;
        lastUpdated?: number | undefined;
        totalPois: number;
        averageConfidence: number;
        lowConfidenceCount: number;
        manuallyVerifiedCount: number;
    } | undefined;
    content: string;
    sourceExternalId: string;
    imageUrls: string[];
    destinations: string[];
    tags: string[];
    likesCount: number;
    savesCount: number;
    commentsCount: number;
    viewsCount: number;
    qualityScore: number;
    crawledAt: number;
    sourcePlatform: "tongcheng" | "xiaohongshu" | "mafengwo" | "ctrip" | "qunar" | "weibo" | "douyin" | "tripadvisor";
}[]>>;
export declare const upsert: import("convex/server").RegisteredMutation<"public", {
    title?: string | undefined;
    sourceUrl?: string | undefined;
    authorName?: string | undefined;
    publishedAt?: number | undefined;
    coverImageUrl?: string | undefined;
    imageUrls?: string[] | undefined;
    likesCount?: number | undefined;
    savesCount?: number | undefined;
    commentsCount?: number | undefined;
    viewsCount?: number | undefined;
    qualityScore?: number | undefined;
    contentHtml?: string | undefined;
    authorId?: string | undefined;
    contentHash?: string | undefined;
    content: string;
    sourceExternalId: string;
    destinations: string[];
    tags: string[];
    sourcePlatform: "tongcheng" | "xiaohongshu" | "mafengwo" | "ctrip" | "qunar" | "weibo" | "douyin" | "tripadvisor";
}, Promise<import("convex/values").GenericId<"travelGuides">>>;
export declare const bulkInsert: import("convex/server").RegisteredMutation<"public", {
    guides: {
        title?: string | undefined;
        sourceUrl?: string | undefined;
        authorName?: string | undefined;
        publishedAt?: number | undefined;
        coverImageUrl?: string | undefined;
        imageUrls?: string[] | undefined;
        likesCount?: number | undefined;
        savesCount?: number | undefined;
        commentsCount?: number | undefined;
        viewsCount?: number | undefined;
        qualityScore?: number | undefined;
        contentHtml?: string | undefined;
        authorId?: string | undefined;
        contentHash?: string | undefined;
        content: string;
        sourceExternalId: string;
        destinations: string[];
        tags: string[];
        sourcePlatform: "tongcheng" | "xiaohongshu" | "mafengwo" | "ctrip" | "qunar" | "weibo" | "douyin" | "tripadvisor";
    }[];
}, Promise<Id<"travelGuides">[]>>;
export declare const updateQualityScore: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"travelGuides">;
    qualityScore: number;
}, Promise<void>>;
export declare const updateAiData: import("convex/server").RegisteredMutation<"public", {
    aiSummary?: string | undefined;
    aiTips?: string[] | undefined;
    aiBestTime?: string | undefined;
    aiDuration?: string | undefined;
    aiBudget?: string | undefined;
    aiDays?: {
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
    id: import("convex/values").GenericId<"travelGuides">;
}, Promise<void>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"travelGuides">;
}, Promise<void>>;
export declare const findDuplicatesForExternalId: import("convex/server").RegisteredQuery<"public", {
    sourceExternalId: string;
    sourcePlatform: "tongcheng" | "xiaohongshu" | "mafengwo" | "ctrip" | "qunar" | "weibo" | "douyin" | "tripadvisor";
}, Promise<{
    idsToDelete: never[];
    kept: import("convex/values").GenericId<"travelGuides">;
    total?: undefined;
} | {
    idsToDelete: import("convex/values").GenericId<"travelGuides">[];
    kept: import("convex/values").GenericId<"travelGuides">;
    total: number;
}>>;
export declare const getUniqueExternalIds: import("convex/server").RegisteredQuery<"public", {
    cursor?: string | undefined;
    limit?: number | undefined;
    platform: "tongcheng" | "xiaohongshu" | "mafengwo" | "ctrip" | "qunar" | "weibo" | "douyin" | "tripadvisor";
}, Promise<{
    items: {
        id: import("convex/values").GenericId<"travelGuides">;
        externalId: string;
        platform: "tongcheng" | "xiaohongshu" | "mafengwo" | "ctrip" | "qunar" | "weibo" | "douyin" | "tripadvisor";
    }[];
    cursor: string;
    isDone: boolean;
}>>;
export declare const batchDelete: import("convex/server").RegisteredMutation<"public", {
    ids: import("convex/values").GenericId<"travelGuides">[];
}, Promise<{
    deletedCount: number;
}>>;
export declare const removeDuplicates: import("convex/server").RegisteredMutation<"public", {
    platform?: "tongcheng" | "xiaohongshu" | "mafengwo" | "ctrip" | "qunar" | "weibo" | "douyin" | "tripadvisor" | undefined;
}, Promise<{
    removedCount: number;
    totalBefore: number;
    totalAfter: number;
    uniqueKeys: number;
    platform: string;
}>>;
export declare const removeShortContent: import("convex/server").RegisteredMutation<"public", {
    minLength?: number | undefined;
}, Promise<{
    removedCount: number;
    minLength: number;
}>>;
export declare const clearAllAiData: import("convex/server").RegisteredMutation<"public", {
    limit?: number | undefined;
}, Promise<{
    clearedCount: number;
    hasMore: boolean;
}>>;
export declare const updatePoiCoordinates: import("convex/server").RegisteredMutation<"public", {
    verifiedBy?: string | undefined;
    guideId: import("convex/values").GenericId<"travelGuides">;
    latitude: number;
    longitude: number;
    dayNumber: number;
    poiIndex: number;
}, Promise<{
    success: boolean;
    updatedPoi: {
        dayNumber: number;
        poiIndex: number;
        latitude: number;
        longitude: number;
    };
    geocodingMetrics: {
        totalPois: number;
        averageConfidence: number;
        lowConfidenceCount: number;
        manuallyVerifiedCount: number;
        sourceDistribution: {
            amap?: number;
            nominatim?: number;
            overpass?: number;
            consensus?: number;
            manual?: number;
        };
        lastUpdated: number;
    };
}>>;
export declare const getGuidesWithLowConfidence: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    confidenceThreshold?: number | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"travelGuides">;
    title: string | undefined;
    sourcePlatform: "tongcheng" | "xiaohongshu" | "mafengwo" | "ctrip" | "qunar" | "weibo" | "douyin" | "tripadvisor";
    sourceExternalId: string;
    totalPois: number;
    lowConfidenceCount: number;
    averageConfidence: number;
    manuallyVerifiedCount: number;
    unverifiedLowConfidence: number;
}[]>>;
