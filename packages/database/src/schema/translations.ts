/**
 * Translations schema - phrases, saved translations, offline packs, content translations.
 */
import {
  boolean,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns.js';

export const translationPhrases = mysqlTable(
  'translation_phrases',
  {
    id: id(),
    category: varchar('category', { length: 50 }).notNull(),
    sourceLanguage: varchar('source_language', { length: 10 }).notNull(),
    targetLanguage: varchar('target_language', { length: 10 }).notNull(),
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

export const savedTranslations = mysqlTable(
  'saved_translations',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    sourceText: text('source_text').notNull(),
    translatedText: text('translated_text').notNull(),
    sourceLanguage: varchar('source_language', { length: 10 }).notNull(),
    targetLanguage: varchar('target_language', { length: 10 }).notNull(),
    translationType: varchar('translation_type', { length: 20 }).notNull().default('phrase'),
    isFavorite: boolean('is_favorite').notNull().default(false),
    lastUsedAt: timestamp('last_used_at', { mode: 'date' }),
    useCount: int('use_count').notNull().default(1),
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

export const offlineTranslationPacks = mysqlTable(
  'offline_translation_packs',
  {
    id: id(),
    sourceLanguage: varchar('source_language', { length: 10 }).notNull(),
    targetLanguage: varchar('target_language', { length: 10 }).notNull(),
    packName: varchar('pack_name', { length: 255 }).notNull(),
    description: text('description'),
    size: int('size'),
    phraseCount: int('phrase_count'),
    version: int('version').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
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

export const userOfflinePacks = mysqlTable(
  'user_offline_packs',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    packId: fk('pack_id').notNull(),
    downloadedAt: timestamp('downloaded_at', { mode: 'date' }),
    version: int('version'),
    createdAt: createdAt(),
  },
  t => [
    index('user_offline_packs_user_idx').on(t.userId),
    index('user_offline_packs_pack_idx').on(t.packId),
    index('user_offline_packs_pair_idx').on(t.userId, t.packId),
  ],
);

export const contentTranslations = mysqlTable(
  'content_translations',
  {
    id: id(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: fk('entity_id').notNull(),
    field: varchar('field', { length: 100 }).notNull(),
    language: varchar('language', { length: 10 }).notNull(),
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
