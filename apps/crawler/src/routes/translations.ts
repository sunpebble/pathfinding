/**
 * Translation Routes
 * API endpoints for multi-language translation features
 */

import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { api, convex } from '../lib/convex.js';
import { translationLogger } from '../lib/logger.js';
import { getTranslationService } from '../services/translation.service.js';

export const translationsRouter = new Hono();

// ===========================================
// Request Schemas
// ===========================================

const translateTextSchema = z.object({
  text: z.string().min(1).max(5000),
  targetLang: z.enum(['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'ru', 'th', 'vi']),
  sourceLang: z.enum(['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'ru', 'th', 'vi']).optional(),
});

const translatePhotoSchema = z.object({
  image: z.string().min(1), // Base64 encoded image
  targetLang: z.enum(['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'ru', 'th', 'vi']),
});

const translateVoiceSchema = z.object({
  recognizedText: z.string().min(1).max(5000),
  targetLang: z.enum(['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'ru', 'th', 'vi']),
  sourceLang: z.enum(['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'ru', 'th', 'vi']).optional(),
});

const translateBatchSchema = z.object({
  texts: z.array(z.string().min(1).max(5000)).min(1).max(50),
  targetLang: z.enum(['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'ru', 'th', 'vi']),
  sourceLang: z.enum(['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'ru', 'th', 'vi']).optional(),
});

const saveTranslationSchema = z.object({
  userId: z.string().min(1),
  sourceText: z.string().min(1),
  sourceLang: z.string().min(2).max(5),
  targetText: z.string().min(1),
  targetLang: z.string().min(2).max(5),
  translationType: z.enum(['text', 'photo', 'voice']),
  imageUrl: z.string().url().optional(),
  audioUrl: z.string().url().optional(),
  notes: z.string().max(500).optional(),
});

const listPhrasesSchema = z.object({
  category: z.enum([
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
  ]),
  sourceLang: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
});

const searchPhrasesSchema = z.object({
  query: z.string().min(1).max(100),
  category: z
    .enum([
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
    ])
    .optional(),
  sourceLang: z.string().optional(),
  limit: z.number().min(1).max(50).optional(),
});

// ===========================================
// Health Check
// ===========================================

translationsRouter.get('/health', async (c: Context) => {
  const translationService = getTranslationService();
  const isHealthy = await translationService.healthCheck();

  return c.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
    },
    isHealthy ? 200 : 503
  );
});

// ===========================================
// Translation Endpoints
// ===========================================

/**
 * Translate text
 * POST /api/translations/text
 */
translationsRouter.post(
  '/text',
  zValidator('json', translateTextSchema),
  async (c: Context) => {
    const { text, targetLang, sourceLang } = await c.req.json();
    const translationService = getTranslationService();

    try {
      const result = await translationService.translateText(text, targetLang, sourceLang);

      translationLogger.info('Text translation completed', {
        sourceLang: result.sourceLang,
        targetLang: result.targetLang,
        textLength: text.length,
      });

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Translation failed';
      translationLogger.error('Text translation failed', { error, text: text.substring(0, 100) });
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * Translate photo (OCR + translation)
 * POST /api/translations/photo
 */
translationsRouter.post(
  '/photo',
  zValidator('json', translatePhotoSchema),
  async (c: Context) => {
    const { image, targetLang } = await c.req.json();
    const translationService = getTranslationService();

    try {
      const result = await translationService.translatePhoto(image, targetLang);

      translationLogger.info('Photo translation completed', {
        targetLang,
        ocrResultCount: result.ocrResults.length,
        translationCount: result.translations.length,
      });

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Photo translation failed';
      translationLogger.error('Photo translation failed', { error });
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * Translate voice (speech-to-text result)
 * POST /api/translations/voice
 */
translationsRouter.post(
  '/voice',
  zValidator('json', translateVoiceSchema),
  async (c: Context) => {
    const { recognizedText, targetLang, sourceLang } = await c.req.json();
    const translationService = getTranslationService();

    try {
      const result = await translationService.translateVoice(recognizedText, targetLang, sourceLang);

      translationLogger.info('Voice translation completed', {
        sourceLang: result.translation.sourceLang,
        targetLang: result.translation.targetLang,
      });

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Voice translation failed';
      translationLogger.error('Voice translation failed', { error });
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * Batch translate multiple texts
 * POST /api/translations/batch
 */
translationsRouter.post(
  '/batch',
  zValidator('json', translateBatchSchema),
  async (c: Context) => {
    const { texts, targetLang, sourceLang } = await c.req.json();
    const translationService = getTranslationService();

    try {
      const results = await translationService.translateBatch(texts, targetLang, sourceLang);

      translationLogger.info('Batch translation completed', {
        count: results.length,
        targetLang,
      });

      return c.json({
        success: true,
        data: results,
        count: results.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Batch translation failed';
      translationLogger.error('Batch translation failed', { error });
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * Detect language
 * POST /api/translations/detect
 */
translationsRouter.post('/detect', async (c: Context) => {
  const { text } = await c.req.json();

  if (!text || typeof text !== 'string') {
    return c.json({ success: false, error: 'Text is required' }, 400);
  }

  const translationService = getTranslationService();

  try {
    const detectedLang = await translationService.detectLanguage(text);

    return c.json({
      success: true,
      data: {
        language: detectedLang,
        text: text.substring(0, 100),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Language detection failed';
    return c.json({ success: false, error: message }, 500);
  }
});

// ===========================================
// Supported Languages
// ===========================================

/**
 * Get supported languages
 * GET /api/translations/languages
 */
translationsRouter.get('/languages', (c: Context) => {
  const translationService = getTranslationService();
  const languages = translationService.getSupportedLanguages();

  return c.json({
    success: true,
    data: languages,
  });
});

// ===========================================
// Phrase Categories
// ===========================================

/**
 * Get phrase categories
 * GET /api/translations/categories
 */
translationsRouter.get('/categories', async (c: Context) => {
  const translationService = getTranslationService();
  const sourceLang = c.req.query('sourceLang');

  try {
    // Get categories from service
    const categories = translationService.getCategories();

    // Get phrase counts from Convex
    const counts = await convex.query(api.translations.getCategories, {
      sourceLang: sourceLang || undefined,
    });

    // Merge counts into categories
    const categoriesWithCounts = categories.map((cat) => {
      const countData = counts.find((c: any) => c.category === cat.id);
      return {
        ...cat,
        phraseCount: countData?.count || 0,
      };
    });

    return c.json({
      success: true,
      data: categoriesWithCounts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get categories';
    translationLogger.error('Failed to get categories', { error });
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * List phrases by category
 * GET /api/translations/phrases
 */
translationsRouter.get('/phrases', async (c: Context) => {
  const category = c.req.query('category') as any;
  const sourceLang = c.req.query('sourceLang');
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined;

  if (!category) {
    return c.json({ success: false, error: 'Category is required' }, 400);
  }

  try {
    const phrases = await convex.query(api.translations.listPhrasesByCategory, {
      category,
      sourceLang: sourceLang || undefined,
      limit,
    });

    return c.json({
      success: true,
      data: phrases,
      count: phrases.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list phrases';
    translationLogger.error('Failed to list phrases', { error, category });
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * Search phrases
 * GET /api/translations/phrases/search
 */
translationsRouter.get('/phrases/search', async (c: Context) => {
  const query = c.req.query('query');
  const category = c.req.query('category') as any;
  const sourceLang = c.req.query('sourceLang');
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined;

  if (!query) {
    return c.json({ success: false, error: 'Query is required' }, 400);
  }

  try {
    const phrases = await convex.query(api.translations.searchPhrases, {
      query,
      category: category || undefined,
      sourceLang: sourceLang || undefined,
      limit,
    });

    return c.json({
      success: true,
      data: phrases,
      count: phrases.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search phrases';
    translationLogger.error('Failed to search phrases', { error, query });
    return c.json({ success: false, error: message }, 500);
  }
});

// ===========================================
// Saved Translations
// ===========================================

/**
 * Save a translation
 * POST /api/translations/saved
 */
translationsRouter.post(
  '/saved',
  zValidator('json', saveTranslationSchema),
  async (c: Context) => {
    const body = await c.req.json();

    try {
      const id = await convex.mutation(api.translations.saveTranslation, body);

      translationLogger.info('Translation saved', {
        userId: body.userId,
        translationType: body.translationType,
      });

      return c.json({
        success: true,
        data: { id },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save translation';
      translationLogger.error('Failed to save translation', { error });
      return c.json({ success: false, error: message }, 500);
    }
  }
);

/**
 * List saved translations
 * GET /api/translations/saved
 */
translationsRouter.get('/saved', async (c: Context) => {
  const userId = c.req.query('userId');
  const translationType = c.req.query('type') as any;
  const favoritesOnly = c.req.query('favorites') === 'true';
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined;
  const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!) : undefined;

  if (!userId) {
    return c.json({ success: false, error: 'userId is required' }, 400);
  }

  try {
    const translations = await convex.query(api.translations.listSavedTranslations, {
      userId,
      translationType: translationType || undefined,
      favoritesOnly: favoritesOnly || undefined,
      limit,
      offset,
    });

    return c.json({
      success: true,
      data: translations,
      count: translations.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list saved translations';
    translationLogger.error('Failed to list saved translations', { error, userId });
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * Search saved translations
 * GET /api/translations/saved/search
 */
translationsRouter.get('/saved/search', async (c: Context) => {
  const userId = c.req.query('userId');
  const query = c.req.query('query');
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined;

  if (!userId || !query) {
    return c.json({ success: false, error: 'userId and query are required' }, 400);
  }

  try {
    const translations = await convex.query(api.translations.searchSavedTranslations, {
      userId,
      query,
      limit,
    });

    return c.json({
      success: true,
      data: translations,
      count: translations.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search saved translations';
    translationLogger.error('Failed to search saved translations', { error, userId, query });
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * Toggle favorite status
 * POST /api/translations/saved/:id/favorite
 */
translationsRouter.post('/saved/:id/favorite', async (c: Context) => {
  const id = c.req.param('id');

  try {
    const isFavorite = await convex.mutation(api.translations.toggleFavorite, {
      id: id as any,
    });

    return c.json({
      success: true,
      data: { isFavorite },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to toggle favorite';
    translationLogger.error('Failed to toggle favorite', { error, id });
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * Delete saved translation
 * DELETE /api/translations/saved/:id
 */
translationsRouter.delete('/saved/:id', async (c: Context) => {
  const id = c.req.param('id');

  try {
    await convex.mutation(api.translations.deleteSavedTranslation, {
      id: id as any,
    });

    return c.json({
      success: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete translation';
    translationLogger.error('Failed to delete translation', { error, id });
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * Record usage
 * POST /api/translations/saved/:id/usage
 */
translationsRouter.post('/saved/:id/usage', async (c: Context) => {
  const id = c.req.param('id');

  try {
    await convex.mutation(api.translations.recordUsage, {
      id: id as any,
    });

    return c.json({
      success: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record usage';
    translationLogger.error('Failed to record usage', { error, id });
    return c.json({ success: false, error: message }, 500);
  }
});

// ===========================================
// Offline Packs
// ===========================================

/**
 * List available offline packs
 * GET /api/translations/packs
 */
translationsRouter.get('/packs', async (c: Context) => {
  const sourceLang = c.req.query('sourceLang');
  const targetLang = c.req.query('targetLang');

  try {
    const packs = await convex.query(api.translations.listOfflinePacks, {
      sourceLang: sourceLang || undefined,
      targetLang: targetLang || undefined,
    });

    return c.json({
      success: true,
      data: packs,
      count: packs.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list offline packs';
    translationLogger.error('Failed to list offline packs', { error });
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * Get user's downloaded packs
 * GET /api/translations/packs/user/:userId
 */
translationsRouter.get('/packs/user/:userId', async (c: Context) => {
  const userId = c.req.param('userId');

  try {
    const packs = await convex.query(api.translations.getUserPacks, {
      userId,
    });

    return c.json({
      success: true,
      data: packs,
      count: packs.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get user packs';
    translationLogger.error('Failed to get user packs', { error, userId });
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * Record pack download
 * POST /api/translations/packs/:packId/download
 */
translationsRouter.post('/packs/:packId/download', async (c: Context) => {
  const packId = c.req.param('packId');
  const { userId } = await c.req.json();

  if (!userId) {
    return c.json({ success: false, error: 'userId is required' }, 400);
  }

  try {
    const id = await convex.mutation(api.translations.recordPackDownload, {
      userId,
      packId: packId as any,
    });

    return c.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record download';
    translationLogger.error('Failed to record pack download', { error, packId, userId });
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * Delete user pack
 * DELETE /api/translations/packs/user/:id
 */
translationsRouter.delete('/packs/user/:id', async (c: Context) => {
  const id = c.req.param('id');

  try {
    await convex.mutation(api.translations.deleteUserPack, {
      id: id as any,
    });

    return c.json({
      success: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete user pack';
    translationLogger.error('Failed to delete user pack', { error, id });
    return c.json({ success: false, error: message }, 500);
  }
});

// ===========================================
// Pinyin Generation
// ===========================================

/**
 * Get pinyin for Chinese text
 * POST /api/translations/pinyin
 */
translationsRouter.post('/pinyin', async (c: Context) => {
  const { text } = await c.req.json();

  if (!text || typeof text !== 'string') {
    return c.json({ success: false, error: 'Text is required' }, 400);
  }

  const translationService = getTranslationService();

  try {
    const pinyin = await translationService.getPinyin(text);

    return c.json({
      success: true,
      data: {
        text,
        pinyin: pinyin || null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate pinyin';
    return c.json({ success: false, error: message }, 500);
  }
});

export default translationsRouter;
