import type { AuthVariables } from '../middleware/auth.js';
import { zValidator } from '@hono/zod-validator';
import {
  getDb,
  offlineTranslationPacks,
  savedTranslations,
  translationPhrases,
} from '@pathfinding/database';
import { and, desc, eq, like, sql } from 'drizzle-orm';
/**
 * Translations routes — categories, phrases, saved, packs, languages.
 * Mirrors the Convex /api/translations/* HTTP endpoints.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { authRequired } from '../middleware/auth.js';
import { ApiError } from '../middleware/error-handler.js';

const app = new Hono<{ Variables: AuthVariables }>();

// ── GET /categories — List translation categories ──────
app.get('/categories', async (c) => {
  const sourceLang = c.req.query('sourceLang');

  const db = getDb();

  const conditions = [];
  if (sourceLang) {
    conditions.push(eq(translationPhrases.sourceLanguage, sourceLang));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const categories = await db
    .select({
      category: translationPhrases.category,
      count: sql<number>`count(*)`,
    })
    .from(translationPhrases)
    .where(where)
    .groupBy(translationPhrases.category);

  return c.json({ data: convertKeysToSnakeCase(categories) });
});

// ── GET /phrases — List phrases by category ────────────
app.get('/phrases', async (c) => {
  const category = c.req.query('category');
  const sourceLang = c.req.query('sourceLang');
  const limit = Number.parseInt(c.req.query('limit') ?? '50', 10);

  if (!category) {
    throw new ApiError(400, '缺少category参数');
  }

  const db = getDb();

  const conditions = [eq(translationPhrases.category, category)];
  if (sourceLang) {
    conditions.push(eq(translationPhrases.sourceLanguage, sourceLang));
  }

  const phrases = await db
    .select()
    .from(translationPhrases)
    .where(and(...conditions))
    .limit(limit);

  return c.json({ data: convertKeysToSnakeCase(phrases) });
});

// ── GET /phrases/search — Search phrases ───────────────
app.get('/phrases/search', async (c) => {
  const query = c.req.query('q');
  const category = c.req.query('category');
  const sourceLang = c.req.query('sourceLang');
  const limit = Number.parseInt(c.req.query('limit') ?? '20', 10);

  if (!query) {
    throw new ApiError(400, '缺少查询参数 q');
  }

  const db = getDb();

  const conditions = [like(translationPhrases.sourceText, `%${query}%`)];
  if (category) {
    conditions.push(eq(translationPhrases.category, category));
  }
  if (sourceLang) {
    conditions.push(eq(translationPhrases.sourceLanguage, sourceLang));
  }

  const phrases = await db
    .select()
    .from(translationPhrases)
    .where(and(...conditions))
    .limit(limit);

  return c.json({ data: convertKeysToSnakeCase(phrases) });
});

// ── GET /saved — List saved translations ───────────────
app.get('/saved', authRequired(), async (c) => {
  const userId = Number(c.get('userId'));
  const translationType = c.req.query('type');
  const favoritesOnly = c.req.query('favoritesOnly') === 'true';
  const limit = Number.parseInt(c.req.query('limit') ?? '50', 10);
  const offset = Number.parseInt(c.req.query('offset') ?? '0', 10);

  const db = getDb();

  const conditions = [eq(savedTranslations.userId, userId)];
  if (translationType) {
    conditions.push(eq(savedTranslations.translationType, translationType));
  }
  if (favoritesOnly) {
    conditions.push(eq(savedTranslations.isFavorite, true));
  }

  const translations = await db
    .select()
    .from(savedTranslations)
    .where(and(...conditions))
    .orderBy(desc(savedTranslations.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({ data: convertKeysToSnakeCase(translations) });
});

// ── POST /saved — Save a translation ───────────────────
const saveTranslationSchema = z.object({
  sourceText: z.string().min(1),
  sourceLang: z.string().min(1),
  targetText: z.string().min(1),
  targetLang: z.string().min(1),
  translationType: z.string().min(1),
});

app.post('/saved', authRequired(), zValidator('json', saveTranslationSchema), async (c) => {
  const { sourceText, sourceLang, targetText, targetLang, translationType } = c.req.valid('json');

  const db = getDb();

  const result = await db.insert(savedTranslations).values({
    userId: Number(c.get('userId')),
    sourceText,
    translatedText: targetText,
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
    translationType,
  });

  return c.json({ id: Number(result[0].insertId) }, 201);
});

// ── DELETE /saved — Delete a saved translation ─────────
const deleteTranslationSchema = z.object({
  id: z.number(),
});

app.delete('/saved', authRequired(), zValidator('json', deleteTranslationSchema), async (c) => {
  const { id } = c.req.valid('json');

  const db = getDb();
  await db.delete(savedTranslations).where(eq(savedTranslations.id, id));

  return c.json({ success: true });
});

// ── POST /saved/favorite — Toggle favorite ─────────────
const favoriteTranslationSchema = z.object({
  id: z.number(),
});

app.post('/saved/favorite', authRequired(), zValidator('json', favoriteTranslationSchema), async (c) => {
  const { id } = c.req.valid('json');

  const db = getDb();

  const existing = await db
    .select()
    .from(savedTranslations)
    .where(eq(savedTranslations.id, id))
    .limit(1);

  if (!existing[0]) {
    throw new ApiError(404, '翻译不存在');
  }

  const newFavorite = !existing[0].isFavorite;
  await db
    .update(savedTranslations)
    .set({ isFavorite: newFavorite, updatedAt: new Date() })
    .where(eq(savedTranslations.id, id));

  return c.json({ isFavorite: newFavorite });
});

// ── GET /packs — List offline translation packs ────────
app.get('/packs', async (c) => {
  const sourceLang = c.req.query('sourceLang');
  const targetLang = c.req.query('targetLang');

  const db = getDb();

  const conditions = [eq(offlineTranslationPacks.isActive, true)];
  if (sourceLang) {
    conditions.push(eq(offlineTranslationPacks.sourceLanguage, sourceLang));
  }
  if (targetLang) {
    conditions.push(eq(offlineTranslationPacks.targetLanguage, targetLang));
  }

  const packs = await db
    .select()
    .from(offlineTranslationPacks)
    .where(and(...conditions));

  return c.json({ data: convertKeysToSnakeCase(packs) });
});

// ── GET /languages — Supported languages (static) ──────
app.get('/languages', async (c) => {
  const languages = [
    { code: 'zh', name: '中文', native_name: '中文' },
    { code: 'en', name: 'English', native_name: 'English' },
    { code: 'ja', name: 'Japanese', native_name: '日本語' },
    { code: 'ko', name: 'Korean', native_name: '한국어' },
    { code: 'th', name: 'Thai', native_name: 'ไทย' },
    { code: 'vi', name: 'Vietnamese', native_name: 'Tiếng Việt' },
    { code: 'fr', name: 'French', native_name: 'Français' },
    { code: 'de', name: 'German', native_name: 'Deutsch' },
    { code: 'es', name: 'Spanish', native_name: 'Español' },
    { code: 'it', name: 'Italian', native_name: 'Italiano' },
    { code: 'pt', name: 'Portuguese', native_name: 'Português' },
    { code: 'ru', name: 'Russian', native_name: 'Русский' },
  ];

  return c.json({ data: languages });
});

export default app;
