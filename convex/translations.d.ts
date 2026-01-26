/**
 * Translation Functions
 * Convex functions for managing translations, phrases, and offline packs
 */
/**
 * List phrases by category
 */
export declare const listPhrasesByCategory: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    sourceLang?: string | undefined;
    category: "time" | "emergency" | "dining" | "shopping" | "accommodation" | "transportation" | "greeting" | "directions" | "numbers" | "common";
}, Promise<{
    _id: import("convex/values").GenericId<"translationPhrases">;
    _creationTime: number;
    audioUrls?: {
        url: string;
        lang: string;
    }[] | undefined;
    usageContext?: string | undefined;
    category: "time" | "emergency" | "dining" | "shopping" | "accommodation" | "transportation" | "greeting" | "directions" | "numbers" | "common";
    sortOrder: number;
    sourceText: string;
    sourceLang: string;
    translations: {
        pinyin?: string | undefined;
        pronunciation?: string | undefined;
        text: string;
        lang: string;
    }[];
    isOfflineAvailable: boolean;
}[]>>;
/**
 * Search phrases
 */
export declare const searchPhrases: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    category?: "time" | "emergency" | "dining" | "shopping" | "accommodation" | "transportation" | "greeting" | "directions" | "numbers" | "common" | undefined;
    sourceLang?: string | undefined;
    query: string;
}, Promise<{
    _id: import("convex/values").GenericId<"translationPhrases">;
    _creationTime: number;
    audioUrls?: {
        url: string;
        lang: string;
    }[] | undefined;
    usageContext?: string | undefined;
    category: "time" | "emergency" | "dining" | "shopping" | "accommodation" | "transportation" | "greeting" | "directions" | "numbers" | "common";
    sortOrder: number;
    sourceText: string;
    sourceLang: string;
    translations: {
        pinyin?: string | undefined;
        pronunciation?: string | undefined;
        text: string;
        lang: string;
    }[];
    isOfflineAvailable: boolean;
}[]>>;
/**
 * Get all categories with phrase counts
 */
export declare const getCategories: import("convex/server").RegisteredQuery<"public", {
    sourceLang?: string | undefined;
}, Promise<{
    category: "time" | "emergency" | "dining" | "shopping" | "accommodation" | "transportation" | "greeting" | "directions" | "numbers" | "common";
    count: number;
}[]>>;
/**
 * List user's saved translations
 */
export declare const listSavedTranslations: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    offset?: number | undefined;
    translationType?: "text" | "photo" | "voice" | undefined;
    favoritesOnly?: boolean | undefined;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"savedTranslations">;
    _creationTime: number;
    notes?: string | undefined;
    imageUrl?: string | undefined;
    audioUrl?: string | undefined;
    createdAt: number;
    targetLang: string;
    userId: string;
    lastUsedAt: number;
    usageCount: number;
    sourceText: string;
    sourceLang: string;
    targetText: string;
    translationType: "text" | "photo" | "voice";
    isFavorite: boolean;
}[]>>;
/**
 * Search saved translations
 */
export declare const searchSavedTranslations: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    query: string;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"savedTranslations">;
    _creationTime: number;
    notes?: string | undefined;
    imageUrl?: string | undefined;
    audioUrl?: string | undefined;
    createdAt: number;
    targetLang: string;
    userId: string;
    lastUsedAt: number;
    usageCount: number;
    sourceText: string;
    sourceLang: string;
    targetText: string;
    translationType: "text" | "photo" | "voice";
    isFavorite: boolean;
}[]>>;
/**
 * Save a translation
 */
export declare const saveTranslation: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    imageUrl?: string | undefined;
    audioUrl?: string | undefined;
    targetLang: string;
    userId: string;
    sourceText: string;
    sourceLang: string;
    targetText: string;
    translationType: "text" | "photo" | "voice";
}, Promise<import("convex/values").GenericId<"savedTranslations">>>;
/**
 * Toggle favorite status
 */
export declare const toggleFavorite: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"savedTranslations">;
}, Promise<boolean>>;
/**
 * Delete saved translation
 */
export declare const deleteSavedTranslation: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"savedTranslations">;
}, Promise<void>>;
/**
 * Update usage count (when user accesses a saved translation)
 */
export declare const recordUsage: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"savedTranslations">;
}, Promise<void>>;
/**
 * List available offline packs
 */
export declare const listOfflinePacks: import("convex/server").RegisteredQuery<"public", {
    targetLang?: string | undefined;
    sourceLang?: string | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"offlineTranslationPacks">;
    _creationTime: number;
    createdAt: number;
    name: string;
    version: string;
    description: string;
    targetLang: string;
    updatedAt: number;
    isActive: boolean;
    sourceLang: string;
    phraseCount: number;
    downloadSize: number;
    downloadUrl: string;
    categories: string[];
}[]>>;
/**
 * Get user's downloaded packs
 */
export declare const getUserPacks: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    pack: {
        _id: import("convex/values").GenericId<"offlineTranslationPacks">;
        _creationTime: number;
        createdAt: number;
        name: string;
        version: string;
        description: string;
        targetLang: string;
        updatedAt: number;
        isActive: boolean;
        sourceLang: string;
        phraseCount: number;
        downloadSize: number;
        downloadUrl: string;
        categories: string[];
    } | null;
    hasUpdate: boolean;
    _id: import("convex/values").GenericId<"userOfflinePacks">;
    _creationTime: number;
    userId: string;
    lastSyncedAt: number;
    packId: import("convex/values").GenericId<"offlineTranslationPacks">;
    downloadedVersion: string;
    downloadedAt: number;
}[]>>;
/**
 * Record pack download
 */
export declare const recordPackDownload: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    packId: import("convex/values").GenericId<"offlineTranslationPacks">;
}, Promise<import("convex/values").GenericId<"userOfflinePacks">>>;
/**
 * Delete downloaded pack record
 */
export declare const deleteUserPack: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"userOfflinePacks">;
}, Promise<void>>;
/**
 * Create a translation phrase (admin)
 */
export declare const createPhrase: import("convex/server").RegisteredMutation<"public", {
    audioUrls?: {
        url: string;
        lang: string;
    }[] | undefined;
    usageContext?: string | undefined;
    category: "time" | "emergency" | "dining" | "shopping" | "accommodation" | "transportation" | "greeting" | "directions" | "numbers" | "common";
    sortOrder: number;
    sourceText: string;
    sourceLang: string;
    translations: {
        pinyin?: string | undefined;
        pronunciation?: string | undefined;
        text: string;
        lang: string;
    }[];
    isOfflineAvailable: boolean;
}, Promise<import("convex/values").GenericId<"translationPhrases">>>;
/**
 * Batch create phrases (admin)
 */
export declare const batchCreatePhrases: import("convex/server").RegisteredMutation<"public", {
    phrases: {
        audioUrls?: {
            url: string;
            lang: string;
        }[] | undefined;
        usageContext?: string | undefined;
        category: "time" | "emergency" | "dining" | "shopping" | "accommodation" | "transportation" | "greeting" | "directions" | "numbers" | "common";
        sortOrder: number;
        sourceText: string;
        sourceLang: string;
        translations: {
            pinyin?: string | undefined;
            pronunciation?: string | undefined;
            text: string;
            lang: string;
        }[];
        isOfflineAvailable: boolean;
    }[];
}, Promise<(string & {
    __tableName: "translationPhrases";
})[]>>;
/**
 * Create offline pack (admin)
 */
export declare const createOfflinePack: import("convex/server").RegisteredMutation<"public", {
    name: string;
    version: string;
    description: string;
    targetLang: string;
    isActive: boolean;
    sourceLang: string;
    phraseCount: number;
    downloadSize: number;
    downloadUrl: string;
    categories: string[];
}, Promise<import("convex/values").GenericId<"offlineTranslationPacks">>>;
export declare const supportedLanguages: readonly ["zh", "en", "ja"];
export type SupportedLanguage = (typeof supportedLanguages)[number];
/**
 * Get content translations for a specific entity
 */
export declare const getContentTranslations: import("convex/server").RegisteredQuery<"public", {
    language?: "zh" | "en" | "ja" | undefined;
    entityType: "city" | "itinerary" | "poi" | "travelGuide";
    entityId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"contentTranslations">;
    _creationTime: number;
    translatedBy?: string | undefined;
    createdAt: number;
    value: string;
    updatedAt: number;
    field: string;
    entityType: string;
    entityId: string;
    language: string;
    isAutoTranslated: boolean;
}[]>>;
/**
 * Get a single content translation
 */
export declare const getContentTranslation: import("convex/server").RegisteredQuery<"public", {
    field: string;
    entityType: "city" | "itinerary" | "poi" | "travelGuide";
    entityId: string;
    language: "zh" | "en" | "ja";
}, Promise<{
    _id: import("convex/values").GenericId<"contentTranslations">;
    _creationTime: number;
    translatedBy?: string | undefined;
    createdAt: number;
    value: string;
    updatedAt: number;
    field: string;
    entityType: string;
    entityId: string;
    language: string;
    isAutoTranslated: boolean;
} | null>>;
/**
 * Create or update a content translation
 */
export declare const upsertContentTranslation: import("convex/server").RegisteredMutation<"public", {
    isAutoTranslated?: boolean | undefined;
    translatedBy?: string | undefined;
    value: string;
    field: string;
    entityType: "city" | "itinerary" | "poi" | "travelGuide";
    entityId: string;
    language: "zh" | "en" | "ja";
}, Promise<import("convex/values").GenericId<"contentTranslations">>>;
/**
 * Bulk upsert content translations for an entity
 */
export declare const bulkUpsertContentTranslations: import("convex/server").RegisteredMutation<"public", {
    translatedBy?: string | undefined;
    translations: {
        isAutoTranslated?: boolean | undefined;
        value: string;
        field: string;
        language: "zh" | "en" | "ja";
    }[];
    entityType: "city" | "itinerary" | "poi" | "travelGuide";
    entityId: string;
}, Promise<import("convex/values").GenericId<"contentTranslations">[]>>;
/**
 * Delete content translations for an entity
 */
export declare const deleteContentTranslations: import("convex/server").RegisteredMutation<"public", {
    language?: "zh" | "en" | "ja" | undefined;
    entityType: "city" | "itinerary" | "poi" | "travelGuide";
    entityId: string;
}, Promise<{
    deletedCount: number;
}>>;
/**
 * Get content translation statistics
 */
export declare const getContentTranslationStats: import("convex/server").RegisteredQuery<"public", {
    entityType?: "city" | "itinerary" | "poi" | "travelGuide" | undefined;
}, Promise<{
    total: number;
    byLanguage: Record<string, number>;
    byEntityType: Record<string, number>;
    autoTranslatedCount: number;
    manualCount: number;
}>>;
