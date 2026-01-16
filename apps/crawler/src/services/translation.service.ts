/**
 * Translation Service
 * Provides multi-language translation capabilities including text, photo OCR, and voice translation
 * Integrates with Baidu Translate API and local Ollama for AI-powered translations
 */

import crypto from 'node:crypto';
import { translationLogger } from '../lib/logger.js';
import { CircuitBreaker, withRetry } from '../lib/retry.js';
import { getOllamaService } from './ollama.service.js';

// ===========================================
// Types and Interfaces
// ===========================================

export interface TranslationConfig {
  baiduAppId: string;
  baiduSecretKey: string;
  baiduApiUrl: string;
  ocrApiUrl: string;
  timeout: number;
}

export interface TranslationResult {
  sourceText: string;
  sourceLang: string;
  targetText: string;
  targetLang: string;
  confidence?: number;
  alternatives?: string[];
  pinyin?: string;
  pronunciation?: string;
}

export interface OCRResult {
  text: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PhotoTranslationResult {
  ocrResults: OCRResult[];
  translations: TranslationResult[];
  imageUrl?: string;
}

export interface VoiceTranslationResult {
  recognizedText: string;
  translation: TranslationResult;
  audioUrl?: string;
}

export interface PhraseCategory {
  id: string;
  name: string;
  nameZh: string;
  icon: string;
  phraseCount: number;
}

export interface TranslationPhrase {
  id: string;
  category: string;
  sourceText: string;
  sourceLang: string;
  translations: Array<{
    lang: string;
    text: string;
    pinyin?: string;
    pronunciation?: string;
  }>;
  audioUrls?: Array<{
    lang: string;
    url: string;
  }>;
  usageContext?: string;
}

// ===========================================
// Constants
// ===========================================

const SUPPORTED_LANGUAGES = ['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'ru', 'th', 'vi'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

const LANGUAGE_NAMES: Record<SupportedLanguage, { en: string; zh: string }> = {
  zh: { en: 'Chinese', zh: '中文' },
  en: { en: 'English', zh: '英语' },
  ja: { en: 'Japanese', zh: '日语' },
  ko: { en: 'Korean', zh: '韩语' },
  fr: { en: 'French', zh: '法语' },
  de: { en: 'German', zh: '德语' },
  es: { en: 'Spanish', zh: '西班牙语' },
  it: { en: 'Italian', zh: '意大利语' },
  ru: { en: 'Russian', zh: '俄语' },
  th: { en: 'Thai', zh: '泰语' },
  vi: { en: 'Vietnamese', zh: '越南语' },
};

// Baidu Translate language codes mapping
const BAIDU_LANG_CODES: Record<SupportedLanguage, string> = {
  zh: 'zh',
  en: 'en',
  ja: 'jp',
  ko: 'kor',
  fr: 'fra',
  de: 'de',
  es: 'spa',
  it: 'it',
  ru: 'ru',
  th: 'th',
  vi: 'vie',
};

const DEFAULT_CONFIG: TranslationConfig = {
  baiduAppId: process.env.BAIDU_TRANSLATE_APP_ID || '',
  baiduSecretKey: process.env.BAIDU_TRANSLATE_SECRET_KEY || '',
  baiduApiUrl: 'https://fanyi-api.baidu.com/api/trans/vip/translate',
  ocrApiUrl: 'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic',
  timeout: 30000,
};

// Phrase categories with icons
const PHRASE_CATEGORIES: PhraseCategory[] = [
  { id: 'greeting', name: 'Greetings', nameZh: '问候语', icon: 'hand.wave', phraseCount: 0 },
  { id: 'transportation', name: 'Transportation', nameZh: '交通', icon: 'car', phraseCount: 0 },
  { id: 'dining', name: 'Dining', nameZh: '餐饮', icon: 'fork.knife', phraseCount: 0 },
  { id: 'shopping', name: 'Shopping', nameZh: '购物', icon: 'bag', phraseCount: 0 },
  { id: 'accommodation', name: 'Accommodation', nameZh: '住宿', icon: 'bed.double', phraseCount: 0 },
  { id: 'emergency', name: 'Emergency', nameZh: '紧急情况', icon: 'exclamationmark.triangle', phraseCount: 0 },
  { id: 'directions', name: 'Directions', nameZh: '问路', icon: 'map', phraseCount: 0 },
  { id: 'numbers', name: 'Numbers', nameZh: '数字', icon: 'number', phraseCount: 0 },
  { id: 'time', name: 'Time', nameZh: '时间', icon: 'clock', phraseCount: 0 },
  { id: 'common', name: 'Common Phrases', nameZh: '常用语', icon: 'text.bubble', phraseCount: 0 },
];

// ===========================================
// Translation Service Class
// ===========================================

export class TranslationService {
  private config: TranslationConfig;
  private circuitBreaker: CircuitBreaker;
  private baiduAccessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: Partial<TranslationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.circuitBreaker = new CircuitBreaker(5, 60000);
  }

  // ===========================================
  // Health Check
  // ===========================================

  async healthCheck(): Promise<boolean> {
    try {
      // Check if Baidu API credentials are configured
      const hasBaiduConfig = !!(this.config.baiduAppId && this.config.baiduSecretKey);

      // Check Ollama service as fallback
      const ollamaService = getOllamaService();
      const ollamaHealthy = await ollamaService.healthCheck();

      return hasBaiduConfig || ollamaHealthy;
    } catch (error) {
      translationLogger.error('Health check failed', { error });
      return false;
    }
  }

  // ===========================================
  // Text Translation
  // ===========================================

  /**
   * Translate text using Baidu Translate API or Ollama fallback
   */
  async translateText(
    text: string,
    targetLang: SupportedLanguage,
    sourceLang?: SupportedLanguage
  ): Promise<TranslationResult> {
    if (!text.trim()) {
      throw new Error('Text cannot be empty');
    }

    const detectedSourceLang = sourceLang || (await this.detectLanguage(text));

    // Try Baidu API first if configured
    if (this.config.baiduAppId && this.config.baiduSecretKey) {
      try {
        return await this.translateWithBaidu(text, targetLang, detectedSourceLang);
      } catch (error) {
        translationLogger.warn('Baidu translation failed, falling back to Ollama', { error });
      }
    }

    // Fallback to Ollama
    return await this.translateWithOllama(text, targetLang, detectedSourceLang);
  }

  /**
   * Translate using Baidu Translate API
   */
  private async translateWithBaidu(
    text: string,
    targetLang: SupportedLanguage,
    sourceLang: SupportedLanguage
  ): Promise<TranslationResult> {
    const salt = Date.now().toString();
    const sign = this.generateBaiduSign(text, salt);

    const params = new URLSearchParams({
      q: text,
      from: BAIDU_LANG_CODES[sourceLang] || 'auto',
      to: BAIDU_LANG_CODES[targetLang],
      appid: this.config.baiduAppId,
      salt,
      sign,
    });

    const response = await withRetry(
      async () => {
        const res = await fetch(`${this.config.baiduApiUrl}?${params.toString()}`, {
          method: 'GET',
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!res.ok) {
          throw new Error(`Baidu API error: ${res.status}`);
        }

        return res.json();
      },
      { maxRetries: 3, initialDelay: 1000 }
    );

    if (response.error_code) {
      throw new Error(`Baidu API error: ${response.error_code} - ${response.error_msg}`);
    }

    const translation = response.trans_result?.[0];
    if (!translation) {
      throw new Error('No translation result');
    }

    return {
      sourceText: text,
      sourceLang,
      targetText: translation.dst,
      targetLang,
      pinyin: targetLang === 'zh' ? await this.getPinyin(translation.dst) : undefined,
    };
  }

  /**
   * Translate using Ollama (AI-powered)
   */
  private async translateWithOllama(
    text: string,
    targetLang: SupportedLanguage,
    sourceLang: SupportedLanguage
  ): Promise<TranslationResult> {
    const ollamaService = getOllamaService();
    const targetLangName = LANGUAGE_NAMES[targetLang]?.en || targetLang;

    const translatedText = await ollamaService.translateContent(text, targetLang);

    return {
      sourceText: text,
      sourceLang,
      targetText: translatedText,
      targetLang,
      pinyin: targetLang === 'zh' ? await this.getPinyin(translatedText) : undefined,
    };
  }

  /**
   * Generate Baidu API sign
   */
  private generateBaiduSign(text: string, salt: string): string {
    const signStr = `${this.config.baiduAppId}${text}${salt}${this.config.baiduSecretKey}`;
    return crypto.createHash('md5').update(signStr).digest('hex');
  }

  // ===========================================
  // Language Detection
  // ===========================================

  /**
   * Detect the language of input text
   */
  async detectLanguage(text: string): Promise<SupportedLanguage> {
    // Simple heuristic-based detection
    const hasChineseChars = /[\u4e00-\u9fff]/.test(text);
    const hasJapaneseChars = /[\u3040-\u309f\u30a0-\u30ff]/.test(text);
    const hasKoreanChars = /[\uac00-\ud7af\u1100-\u11ff]/.test(text);
    const hasCyrillicChars = /[\u0400-\u04ff]/.test(text);
    const hasThaiChars = /[\u0e00-\u0e7f]/.test(text);
    const hasVietnameseChars = /[\u00c0-\u1ef9]/.test(text) && /[àáảãạăằắẳẵặâầấẩẫậ]/.test(text);

    if (hasJapaneseChars) return 'ja';
    if (hasKoreanChars) return 'ko';
    if (hasChineseChars) return 'zh';
    if (hasCyrillicChars) return 'ru';
    if (hasThaiChars) return 'th';
    if (hasVietnameseChars) return 'vi';

    // Default to English for Latin scripts
    return 'en';
  }

  // ===========================================
  // Photo Translation (OCR)
  // ===========================================

  /**
   * Translate text from an image using OCR
   */
  async translatePhoto(
    imageData: string | Buffer,
    targetLang: SupportedLanguage
  ): Promise<PhotoTranslationResult> {
    // Extract text using OCR
    const ocrResults = await this.performOCR(imageData);

    if (ocrResults.length === 0) {
      return {
        ocrResults: [],
        translations: [],
      };
    }

    // Translate each OCR result
    const translations: TranslationResult[] = [];
    for (const ocr of ocrResults) {
      if (ocr.text.trim()) {
        try {
          const translation = await this.translateText(ocr.text, targetLang);
          translations.push(translation);
        } catch (error) {
          translationLogger.warn('Failed to translate OCR text', { text: ocr.text, error });
        }
      }
    }

    return {
      ocrResults,
      translations,
    };
  }

  /**
   * Perform OCR on image
   */
  private async performOCR(imageData: string | Buffer): Promise<OCRResult[]> {
    // Use Ollama for OCR if Baidu OCR is not configured
    const ollamaService = getOllamaService();

    try {
      // Convert image to base64 if needed
      const base64Image = Buffer.isBuffer(imageData)
        ? imageData.toString('base64')
        : imageData;

      // Use Ollama vision model for OCR
      const prompt = `Please extract all text from this image. Return only the extracted text, one line per text block found. If no text is found, return "NO_TEXT_FOUND".`;

      const response = await ollamaService.generateWithImage(prompt, base64Image);

      if (response === 'NO_TEXT_FOUND' || !response.trim()) {
        return [];
      }

      // Parse response into OCR results
      const lines = response.split('\n').filter((line) => line.trim());
      return lines.map((text, index) => ({
        text: text.trim(),
        confidence: 0.8, // Estimated confidence for Ollama OCR
      }));
    } catch (error) {
      translationLogger.error('OCR failed', { error });
      return [];
    }
  }

  // ===========================================
  // Voice Translation
  // ===========================================

  /**
   * Translate voice input (requires speech-to-text preprocessing)
   */
  async translateVoice(
    recognizedText: string,
    targetLang: SupportedLanguage,
    sourceLang?: SupportedLanguage
  ): Promise<VoiceTranslationResult> {
    const translation = await this.translateText(recognizedText, targetLang, sourceLang);

    return {
      recognizedText,
      translation,
    };
  }

  // ===========================================
  // Pinyin Generation
  // ===========================================

  /**
   * Get pinyin for Chinese text
   */
  async getPinyin(chineseText: string): Promise<string | undefined> {
    if (!chineseText || !/[\u4e00-\u9fff]/.test(chineseText)) {
      return undefined;
    }

    try {
      const ollamaService = getOllamaService();
      const prompt = `Convert the following Chinese text to pinyin with tone marks. Only return the pinyin, nothing else:\n\n${chineseText}`;

      const response = await ollamaService.generate(prompt, {
        temperature: 0.1,
        max_tokens: 200,
      });

      return response.trim();
    } catch (error) {
      translationLogger.warn('Failed to generate pinyin', { error });
      return undefined;
    }
  }

  // ===========================================
  // Phrase Categories
  // ===========================================

  /**
   * Get all phrase categories
   */
  getCategories(): PhraseCategory[] {
    return PHRASE_CATEGORIES;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): Array<{ code: SupportedLanguage; name: string; nameZh: string }> {
    return SUPPORTED_LANGUAGES.map((code) => ({
      code,
      name: LANGUAGE_NAMES[code].en,
      nameZh: LANGUAGE_NAMES[code].zh,
    }));
  }

  // ===========================================
  // Batch Translation
  // ===========================================

  /**
   * Translate multiple texts in batch
   */
  async translateBatch(
    texts: string[],
    targetLang: SupportedLanguage,
    sourceLang?: SupportedLanguage
  ): Promise<TranslationResult[]> {
    const results: TranslationResult[] = [];

    // Process in batches of 10 to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((text) => this.translateText(text, targetLang, sourceLang))
      );
      results.push(...batchResults);

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }
}

// ===========================================
// Singleton Instance
// ===========================================

let translationServiceInstance: TranslationService | null = null;

export function getTranslationService(): TranslationService {
  if (!translationServiceInstance) {
    translationServiceInstance = new TranslationService();
  }
  return translationServiceInstance;
}

export default TranslationService;
