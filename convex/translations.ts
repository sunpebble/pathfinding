/**
 * Translation Functions
 * Convex functions for managing translations, phrases, and offline packs
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// ===========================================
// Translation Phrases Queries
// ===========================================

/**
 * List phrases by category
 */
export const listPhrasesByCategory = query({
  args: {
    category: v.union(
      v.literal('greeting'),
      v.literal('transportation'),
      v.literal('dining'),
      v.literal('shopping'),
      v.literal('accommodation'),
      v.literal('emergency'),
      v.literal('directions'),
      v.literal('numbers'),
      v.literal('time'),
      v.literal('common'),
    ),
    sourceLang: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const q = ctx.db
      .query('translationPhrases')
      .withIndex('by_category', q => q.eq('category', args.category));

    const phrases = await q.collect();

    // Filter by source language if specified
    let filtered = phrases;
    if (args.sourceLang) {
      filtered = phrases.filter(p => p.sourceLang === args.sourceLang);
    }

    // Sort by sortOrder
    filtered.sort((a, b) => a.sortOrder - b.sortOrder);

    // Apply limit
    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    return filtered;
  },
});

/**
 * Search phrases
 */
export const searchPhrases = query({
  args: {
    query: v.string(),
    category: v.optional(
      v.union(
        v.literal('greeting'),
        v.literal('transportation'),
        v.literal('dining'),
        v.literal('shopping'),
        v.literal('accommodation'),
        v.literal('emergency'),
        v.literal('directions'),
        v.literal('numbers'),
        v.literal('time'),
        v.literal('common'),
      ),
    ),
    sourceLang: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query('translationPhrases')
      .withSearchIndex('search_phrases', (q) => {
        let search = q.search('sourceText', args.query);
        if (args.category) {
          search = search.eq('category', args.category);
        }
        if (args.sourceLang) {
          search = search.eq('sourceLang', args.sourceLang);
        }
        return search;
      })
      .take(args.limit || 20);

    return results;
  },
});

/**
 * Get all categories with phrase counts
 */
export const getCategories = query({
  args: {
    sourceLang: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const categories = [
      'greeting',
      'transportation',
      'dining',
      'shopping',
      'accommodation',
      'emergency',
      'directions',
      'numbers',
      'time',
      'common',
    ] as const;

    const result = await Promise.all(
      categories.map(async (category) => {
        const phrases = await ctx.db
          .query('translationPhrases')
          .withIndex('by_category', q => q.eq('category', category))
          .collect();

        let filtered = phrases;
        if (args.sourceLang) {
          filtered = phrases.filter(p => p.sourceLang === args.sourceLang);
        }

        return {
          category,
          count: filtered.length,
        };
      }),
    );

    return result;
  },
});

// ===========================================
// Saved Translations Queries & Mutations
// ===========================================

/**
 * List user's saved translations
 */
export const listSavedTranslations = query({
  args: {
    userId: v.string(),
    translationType: v.optional(
      v.union(v.literal('text'), v.literal('photo'), v.literal('voice')),
    ),
    favoritesOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q;

    if (args.favoritesOnly) {
      q = ctx.db
        .query('savedTranslations')
        .withIndex('by_user_favorite', q =>
          q.eq('userId', args.userId).eq('isFavorite', true));
    }
    else if (args.translationType) {
      q = ctx.db
        .query('savedTranslations')
        .withIndex('by_user_type', q =>
          q
            .eq('userId', args.userId)
            .eq('translationType', args.translationType!));
    }
    else {
      q = ctx.db
        .query('savedTranslations')
        .withIndex('by_user_last_used', q => q.eq('userId', args.userId));
    }

    let results = await q.collect();

    // Sort by last used (most recent first)
    results.sort((a, b) => b.lastUsedAt - a.lastUsedAt);

    // Apply pagination
    const offset = args.offset || 0;
    const limit = args.limit || 50;
    results = results.slice(offset, offset + limit);

    return results;
  },
});

/**
 * Search saved translations
 */
export const searchSavedTranslations = query({
  args: {
    userId: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query('savedTranslations')
      .withSearchIndex('search_saved', q =>
        q.search('sourceText', args.query).eq('userId', args.userId))
      .take(args.limit || 20);

    return results;
  },
});

/**
 * Save a translation
 */
export const saveTranslation = mutation({
  args: {
    userId: v.string(),
    sourceText: v.string(),
    sourceLang: v.string(),
    targetText: v.string(),
    targetLang: v.string(),
    translationType: v.union(
      v.literal('text'),
      v.literal('photo'),
      v.literal('voice'),
    ),
    imageUrl: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if this exact translation already exists
    const existing = await ctx.db
      .query('savedTranslations')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .filter(q =>
        q.and(
          q.eq(q.field('sourceText'), args.sourceText),
          q.eq(q.field('sourceLang'), args.sourceLang),
          q.eq(q.field('targetLang'), args.targetLang),
        ),
      )
      .first();

    if (existing) {
      // Update existing translation
      await ctx.db.patch(existing._id, {
        usageCount: existing.usageCount + 1,
        lastUsedAt: now,
        targetText: args.targetText, // Update with latest translation
        ...(args.notes && { notes: args.notes }),
      });
      return existing._id;
    }

    // Create new saved translation
    const id = await ctx.db.insert('savedTranslations', {
      userId: args.userId,
      sourceText: args.sourceText,
      sourceLang: args.sourceLang,
      targetText: args.targetText,
      targetLang: args.targetLang,
      translationType: args.translationType,
      imageUrl: args.imageUrl,
      audioUrl: args.audioUrl,
      isFavorite: false,
      usageCount: 1,
      lastUsedAt: now,
      createdAt: now,
      notes: args.notes,
    });

    return id;
  },
});

/**
 * Toggle favorite status
 */
export const toggleFavorite = mutation({
  args: {
    id: v.id('savedTranslations'),
  },
  handler: async (ctx, args) => {
    const translation = await ctx.db.get(args.id);
    if (!translation) {
      throw new Error('Translation not found');
    }

    await ctx.db.patch(args.id, {
      isFavorite: !translation.isFavorite,
    });

    return !translation.isFavorite;
  },
});

/**
 * Delete saved translation
 */
export const deleteSavedTranslation = mutation({
  args: {
    id: v.id('savedTranslations'),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/**
 * Update usage count (when user accesses a saved translation)
 */
export const recordUsage = mutation({
  args: {
    id: v.id('savedTranslations'),
  },
  handler: async (ctx, args) => {
    const translation = await ctx.db.get(args.id);
    if (!translation) {
      throw new Error('Translation not found');
    }

    await ctx.db.patch(args.id, {
      usageCount: translation.usageCount + 1,
      lastUsedAt: Date.now(),
    });
  },
});

// ===========================================
// Offline Packs Queries & Mutations
// ===========================================

/**
 * List available offline packs
 */
export const listOfflinePacks = query({
  args: {
    sourceLang: v.optional(v.string()),
    targetLang: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let packs = await ctx.db
      .query('offlineTranslationPacks')
      .withIndex('by_active', q => q.eq('isActive', true))
      .collect();

    if (args.sourceLang) {
      packs = packs.filter(p => p.sourceLang === args.sourceLang);
    }
    if (args.targetLang) {
      packs = packs.filter(p => p.targetLang === args.targetLang);
    }

    return packs;
  },
});

/**
 * Get user's downloaded packs
 */
export const getUserPacks = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const userPacks = await ctx.db
      .query('userOfflinePacks')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect();

    // Fetch pack details
    const result = await Promise.all(
      userPacks.map(async (up) => {
        const pack = await ctx.db.get(up.packId);
        return {
          ...up,
          pack,
          hasUpdate: pack ? pack.version !== up.downloadedVersion : false,
        };
      }),
    );

    return result;
  },
});

/**
 * Record pack download
 */
export const recordPackDownload = mutation({
  args: {
    userId: v.string(),
    packId: v.id('offlineTranslationPacks'),
  },
  handler: async (ctx, args) => {
    const pack = await ctx.db.get(args.packId);
    if (!pack) {
      throw new Error('Pack not found');
    }

    const now = Date.now();

    // Check if already downloaded
    const existing = await ctx.db
      .query('userOfflinePacks')
      .withIndex('by_user_pack', q =>
        q.eq('userId', args.userId).eq('packId', args.packId))
      .first();

    if (existing) {
      // Update version
      await ctx.db.patch(existing._id, {
        downloadedVersion: pack.version,
        downloadedAt: now,
        lastSyncedAt: now,
      });
      return existing._id;
    }

    // Create new record
    const id = await ctx.db.insert('userOfflinePacks', {
      userId: args.userId,
      packId: args.packId,
      downloadedVersion: pack.version,
      downloadedAt: now,
      lastSyncedAt: now,
    });

    return id;
  },
});

/**
 * Delete downloaded pack record
 */
export const deleteUserPack = mutation({
  args: {
    id: v.id('userOfflinePacks'),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ===========================================
// Admin Functions for Managing Phrases
// ===========================================

/**
 * Create a translation phrase (admin)
 */
export const createPhrase = mutation({
  args: {
    category: v.union(
      v.literal('greeting'),
      v.literal('transportation'),
      v.literal('dining'),
      v.literal('shopping'),
      v.literal('accommodation'),
      v.literal('emergency'),
      v.literal('directions'),
      v.literal('numbers'),
      v.literal('time'),
      v.literal('common'),
    ),
    sourceText: v.string(),
    sourceLang: v.string(),
    translations: v.array(
      v.object({
        lang: v.string(),
        text: v.string(),
        pinyin: v.optional(v.string()),
        pronunciation: v.optional(v.string()),
      }),
    ),
    audioUrls: v.optional(
      v.array(
        v.object({
          lang: v.string(),
          url: v.string(),
        }),
      ),
    ),
    usageContext: v.optional(v.string()),
    sortOrder: v.number(),
    isOfflineAvailable: v.boolean(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('translationPhrases', args);
    return id;
  },
});

/**
 * Batch create phrases (admin)
 */
export const batchCreatePhrases = mutation({
  args: {
    phrases: v.array(
      v.object({
        category: v.union(
          v.literal('greeting'),
          v.literal('transportation'),
          v.literal('dining'),
          v.literal('shopping'),
          v.literal('accommodation'),
          v.literal('emergency'),
          v.literal('directions'),
          v.literal('numbers'),
          v.literal('time'),
          v.literal('common'),
        ),
        sourceText: v.string(),
        sourceLang: v.string(),
        translations: v.array(
          v.object({
            lang: v.string(),
            text: v.string(),
            pinyin: v.optional(v.string()),
            pronunciation: v.optional(v.string()),
          }),
        ),
        audioUrls: v.optional(
          v.array(
            v.object({
              lang: v.string(),
              url: v.string(),
            }),
          ),
        ),
        usageContext: v.optional(v.string()),
        sortOrder: v.number(),
        isOfflineAvailable: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const ids = await Promise.all(
      args.phrases.map(phrase => ctx.db.insert('translationPhrases', phrase)),
    );
    return ids;
  },
});

/**
 * Create offline pack (admin)
 */
export const createOfflinePack = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    sourceLang: v.string(),
    targetLang: v.string(),
    version: v.string(),
    phraseCount: v.number(),
    downloadSize: v.number(),
    downloadUrl: v.string(),
    categories: v.array(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert('offlineTranslationPacks', {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

// ===========================================
// Content Translations (i18n for entities)
// ===========================================

// Supported languages for content
export const supportedLanguages = ['zh', 'en', 'ja'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

const contentLanguageValidator = v.union(
  v.literal('zh'),
  v.literal('en'),
  v.literal('ja'),
);

const entityTypeValidator = v.union(
  v.literal('poi'),
  v.literal('city'),
  v.literal('travelGuide'),
  v.literal('itinerary'),
);

/**
 * Get content translations for a specific entity
 */
export const getContentTranslations = query({
  args: {
    entityType: entityTypeValidator,
    entityId: v.string(),
    language: v.optional(contentLanguageValidator),
  },
  handler: async (ctx, args) => {
    const translations = await ctx.db
      .query('contentTranslations')
      .withIndex('by_entity', q =>
        q.eq('entityType', args.entityType).eq('entityId', args.entityId))
      .collect();

    if (args.language) {
      return translations.filter(t => t.language === args.language);
    }

    return translations;
  },
});

/**
 * Get a single content translation
 */
export const getContentTranslation = query({
  args: {
    entityType: entityTypeValidator,
    entityId: v.string(),
    field: v.string(),
    language: contentLanguageValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('contentTranslations')
      .withIndex('by_entity_field_language', q =>
        q
          .eq('entityType', args.entityType)
          .eq('entityId', args.entityId)
          .eq('field', args.field)
          .eq('language', args.language))
      .first();
  },
});

/**
 * Create or update a content translation
 */
export const upsertContentTranslation = mutation({
  args: {
    entityType: entityTypeValidator,
    entityId: v.string(),
    field: v.string(),
    language: contentLanguageValidator,
    value: v.string(),
    isAutoTranslated: v.optional(v.boolean()),
    translatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('contentTranslations')
      .withIndex('by_entity_field_language', q =>
        q
          .eq('entityType', args.entityType)
          .eq('entityId', args.entityId)
          .eq('field', args.field)
          .eq('language', args.language))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        isAutoTranslated: args.isAutoTranslated ?? existing.isAutoTranslated,
        translatedBy: args.translatedBy,
        updatedAt: now,
      });
      return existing._id;
    }
    else {
      return await ctx.db.insert('contentTranslations', {
        entityType: args.entityType,
        entityId: args.entityId,
        field: args.field,
        language: args.language,
        value: args.value,
        isAutoTranslated: args.isAutoTranslated ?? false,
        translatedBy: args.translatedBy,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Bulk upsert content translations for an entity
 */
export const bulkUpsertContentTranslations = mutation({
  args: {
    entityType: entityTypeValidator,
    entityId: v.string(),
    translations: v.array(
      v.object({
        field: v.string(),
        language: contentLanguageValidator,
        value: v.string(),
        isAutoTranslated: v.optional(v.boolean()),
      }),
    ),
    translatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results = [];

    for (const translation of args.translations) {
      const existing = await ctx.db
        .query('contentTranslations')
        .withIndex('by_entity_field_language', q =>
          q
            .eq('entityType', args.entityType)
            .eq('entityId', args.entityId)
            .eq('field', translation.field)
            .eq('language', translation.language))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: translation.value,
          isAutoTranslated:
            translation.isAutoTranslated ?? existing.isAutoTranslated,
          translatedBy: args.translatedBy,
          updatedAt: now,
        });
        results.push(existing._id);
      }
      else {
        const id = await ctx.db.insert('contentTranslations', {
          entityType: args.entityType,
          entityId: args.entityId,
          field: translation.field,
          language: translation.language,
          value: translation.value,
          isAutoTranslated: translation.isAutoTranslated ?? false,
          translatedBy: args.translatedBy,
          createdAt: now,
          updatedAt: now,
        });
        results.push(id);
      }
    }

    return results;
  },
});

/**
 * Delete content translations for an entity
 */
export const deleteContentTranslations = mutation({
  args: {
    entityType: entityTypeValidator,
    entityId: v.string(),
    language: v.optional(contentLanguageValidator),
  },
  handler: async (ctx, args) => {
    const translations = await ctx.db
      .query('contentTranslations')
      .withIndex('by_entity', q =>
        q.eq('entityType', args.entityType).eq('entityId', args.entityId))
      .collect();

    let toDelete = translations;
    if (args.language) {
      toDelete = translations.filter(t => t.language === args.language);
    }

    for (const translation of toDelete) {
      await ctx.db.delete(translation._id);
    }

    return { deletedCount: toDelete.length };
  },
});

/**
 * Get content translation statistics
 */
export const getContentTranslationStats = query({
  args: {
    entityType: v.optional(entityTypeValidator),
  },
  handler: async (ctx, args) => {
    let translations;

    if (args.entityType) {
      translations = await ctx.db
        .query('contentTranslations')
        .withIndex('by_type', q => q.eq('entityType', args.entityType!))
        .collect();
    }
    else {
      translations = await ctx.db.query('contentTranslations').collect();
    }

    const byLanguage: Record<string, number> = {};
    const byEntityType: Record<string, number> = {};
    let autoTranslatedCount = 0;
    let manualCount = 0;

    for (const t of translations) {
      byLanguage[t.language] = (byLanguage[t.language] || 0) + 1;
      byEntityType[t.entityType] = (byEntityType[t.entityType] || 0) + 1;
      if (t.isAutoTranslated) {
        autoTranslatedCount++;
      }
      else {
        manualCount++;
      }
    }

    return {
      total: translations.length,
      byLanguage,
      byEntityType,
      autoTranslatedCount,
      manualCount,
    };
  },
});
