/**
 * Translations schema - phrases, saved translations, offline packs, content translations.
 */
import {
  index,
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import { createdAt, fk, id, updatedAt } from './columns';

export const translationPhrases = sqliteTable(
  'translation_phrases',
  {
    id: id(),
    category: text('category').notNull(),
    sourceLanguage: text('source_language').notNull(),
    targetLanguage: text('target_language').notNull(),
    sourceText: text('source_text').notNull(),
    translatedText: text('translated_text').notNull(),
    pronunciation: text('pronunciation'),
    audioUrl: text('audio_url'),
    context: text('context'),
    createdAt: createdAt(),
  },
  t => [
    index('trans_phrases_category_idx').on(t.category),
    index('trans_phrases_source_lang_idx').on(t.sourceLanguage),
    index('trans_phrases_cat_lang_idx').on(t.category, t.sourceLanguage),
  ],
);

export const savedTranslations = sqliteTable(
  'saved_translations',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    sourceText: text('source_text').notNull(),
    translatedText: text('translated_text').notNull(),
    sourceLanguage: text('source_language').notNull(),
    targetLanguage: text('target_language').notNull(),
    translationType: text('translation_type').notNull().default('phrase'),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
    useCount: integer('use_count').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('saved_trans_user_idx').on(t.userId),
    index('saved_trans_user_type_idx').on(t.userId, t.translationType),
    index('saved_trans_user_fav_idx').on(t.userId, t.isFavorite),
    index('saved_trans_user_last_idx').on(t.userId, t.lastUsedAt),
  ],
);

export const offlineTranslationPacks = sqliteTable(
  'offline_translation_packs',
  {
    id: id(),
    sourceLanguage: text('source_language').notNull(),
    targetLanguage: text('target_language').notNull(),
    packName: text('pack_name').notNull(),
    description: text('description'),
    size: integer('size'),
    phraseCount: integer('phrase_count'),
    version: integer('version').notNull().default(1),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    downloadUrl: text('download_url'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('offline_packs_source_idx').on(t.sourceLanguage),
    index('offline_packs_target_idx').on(t.targetLanguage),
    index('offline_packs_pair_idx').on(t.sourceLanguage, t.targetLanguage),
    index('offline_packs_active_idx').on(t.isActive),
  ],
);

export const userOfflinePacks = sqliteTable(
  'user_offline_packs',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    packId: fk('pack_id').notNull(),
    downloadedAt: integer('downloaded_at', { mode: 'timestamp' }),
    version: integer('version'),
    createdAt: createdAt(),
  },
  t => [
    index('user_offline_packs_user_idx').on(t.userId),
    index('user_offline_packs_pack_idx').on(t.packId),
    index('user_offline_packs_pair_idx').on(t.userId, t.packId),
  ],
);

export const contentTranslations = sqliteTable(
  'content_translations',
  {
    id: id(),
    entityType: text('entity_type').notNull(),
    entityId: fk('entity_id').notNull(),
    field: text('field').notNull(),
    language: text('language').notNull(),
    translatedContent: text('translated_content').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('content_trans_entity_idx').on(t.entityType, t.entityId),
    index('content_trans_entity_field_lang_idx').on(t.entityType, t.entityId, t.field, t.language),
    index('content_trans_type_idx').on(t.entityType),
  ],
);
