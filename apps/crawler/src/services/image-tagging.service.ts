/**
 * Image Tagging Service
 * Uses Ollama vision model for intelligent image recognition and tagging
 */

import { ollamaLogger } from '../lib/logger.js';
import type { RetryOptions } from '../lib/retry.js';
import { CircuitBreaker, parseJsonSafely, withRetry } from '../lib/retry.js';

export interface ImageTaggingConfig {
  baseUrl: string;
  model: string;
  timeout?: number;
}

export interface ImageTag {
  name: string;
  confidence: number; // 0-1
  category: ImageTagCategory;
  localized?: {
    zh?: string;
    en?: string;
  };
}

export type ImageTagCategory =
  | 'location' // Geographic location (city, country, region)
  | 'landmark' // Famous landmarks, attractions
  | 'nature' // Natural scenery (mountain, beach, forest)
  | 'architecture' // Buildings, structures
  | 'food' // Food and drinks
  | 'activity' // Activities (hiking, swimming, dining)
  | 'object' // General objects
  | 'scene' // Scene type (indoor, outdoor, street)
  | 'style' // Photo style (landscape, portrait, aerial)
  | 'time' // Time of day (sunrise, sunset, night)
  | 'weather' // Weather conditions
  | 'transport'; // Transportation modes

export interface ImageAnalysisResult {
  tags: ImageTag[];
  location?: {
    name: string;
    type: 'city' | 'country' | 'region' | 'landmark' | 'unknown';
    confidence: number;
  };
  landmarks?: Array<{
    name: string;
    confidence: number;
    description?: string;
  }>;
  classification: {
    primaryCategory: ImageTagCategory;
    subcategory?: string;
    description: string;
  };
  qualityScore: number; // 0-100
  suggestedCaption?: string;
  metadata?: {
    dominantColors?: string[];
    aspectRatio?: string;
    isBlurry?: boolean;
    hasText?: boolean;
    hasFaces?: boolean;
  };
}

const DEFAULT_CONFIG: ImageTaggingConfig = {
  baseUrl: process.env.OLLAMA_BASE_URL || 'https://ol.svc.kunish.org',
  model: process.env.OLLAMA_VISION_MODEL || 'llava:latest',
  timeout: 180000, // 3 minutes for image processing
};

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 2,
  initialDelay: 2000,
  maxDelay: 15000,
  backoffMultiplier: 2,
  onRetry: (error: Error, attempt: number) => {
    ollamaLogger.warn('Image tagging retry attempt', {
      attempt,
      error_message: error.message,
    });
  },
};

/**
 * ImageTaggingService - AI-powered image recognition and tagging
 * Uses vision-capable LLM models for content analysis
 */
export class ImageTaggingService {
  private config: ImageTaggingConfig;
  private circuitBreaker: CircuitBreaker;

  constructor(config: Partial<ImageTaggingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.circuitBreaker = new CircuitBreaker(3, 60000);
  }

  /**
   * Check if vision model is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return false;

      const data = (await response.json()) as {
        models: Array<{ name: string }>;
      };
      return (
        data.models?.some((m) =>
          m.name.includes(this.config.model.split(':')[0])
        ) ?? false
      );
    } catch {
      return false;
    }
  }

  /**
   * Analyze image from URL and generate tags
   */
  async analyzeImageFromUrl(
    imageUrl: string,
    options?: {
      language?: 'zh' | 'en';
      includeCaption?: boolean;
      maxTags?: number;
    }
  ): Promise<ImageAnalysisResult> {
    const language = options?.language || 'zh';
    const maxTags = options?.maxTags || 15;

    return this.circuitBreaker.execute(() =>
      withRetry(
        async () => {
          // Fetch image and convert to base64
          const imageResponse = await fetch(imageUrl, {
            signal: AbortSignal.timeout(30000),
          });

          if (!imageResponse.ok) {
            throw new Error(
              `Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`
            );
          }

          const imageBuffer = await imageResponse.arrayBuffer();
          const base64Image = Buffer.from(imageBuffer).toString('base64');

          return this.analyzeImage(base64Image, { language, maxTags });
        },
        {
          ...DEFAULT_RETRY_OPTIONS,
          timeout: this.config.timeout,
        }
      )
    );
  }

  /**
   * Analyze image from base64 data
   */
  async analyzeImage(
    base64Image: string,
    options?: {
      language?: 'zh' | 'en';
      maxTags?: number;
    }
  ): Promise<ImageAnalysisResult> {
    const language = options?.language || 'zh';
    const maxTags = options?.maxTags || 15;

    const prompt =
      language === 'zh'
        ? this.buildChinesePrompt(maxTags)
        : this.buildEnglishPrompt(maxTags);

    return this.circuitBreaker.execute(() =>
      withRetry(
        async () => {
          const response = await fetch(`${this.config.baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: this.config.model,
              prompt,
              images: [base64Image],
              stream: false,
              options: {
                temperature: 0.3,
                top_p: 0.9,
                num_predict: 2000,
              },
            }),
            signal: AbortSignal.timeout(this.config.timeout!),
          });

          if (!response.ok) {
            throw new Error(
              `Vision API error: ${response.status} ${response.statusText}`
            );
          }

          const result = (await response.json()) as { response: string };
          return this.parseAnalysisResult(result.response, language);
        },
        {
          ...DEFAULT_RETRY_OPTIONS,
          timeout: this.config.timeout,
        }
      )
    );
  }

  /**
   * Batch analyze multiple images
   */
  async analyzeMultipleImages(
    imageUrls: string[],
    options?: {
      language?: 'zh' | 'en';
      maxTags?: number;
      concurrency?: number;
    }
  ): Promise<Map<string, ImageAnalysisResult>> {
    const concurrency = options?.concurrency || 2;
    const results = new Map<string, ImageAnalysisResult>();

    // Process images in batches
    for (let i = 0; i < imageUrls.length; i += concurrency) {
      const batch = imageUrls.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map((url) =>
          this.analyzeImageFromUrl(url, {
            language: options?.language,
            maxTags: options?.maxTags,
          })
        )
      );

      batchResults.forEach((result, index) => {
        const url = batch[index];
        if (result.status === 'fulfilled') {
          results.set(url, result.value);
        } else {
          ollamaLogger.error('Failed to analyze image', null, {
            url,
            error: result.reason,
          });
        }
      });

      // Small delay between batches to avoid overwhelming the service
      if (i + concurrency < imageUrls.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Get location-specific tags from image
   */
  async extractLocationTags(
    imageUrl: string
  ): Promise<{
    locations: ImageTag[];
    landmarks: ImageTag[];
    suggestedDestination?: string;
  }> {
    const analysis = await this.analyzeImageFromUrl(imageUrl, {
      language: 'zh',
    });

    const locations = analysis.tags.filter((t) => t.category === 'location');
    const landmarks = analysis.tags.filter((t) => t.category === 'landmark');

    let suggestedDestination: string | undefined;
    if (analysis.location) {
      suggestedDestination = analysis.location.name;
    } else if (locations.length > 0) {
      suggestedDestination = locations[0].name;
    } else if (landmarks.length > 0) {
      suggestedDestination = landmarks[0].name;
    }

    return {
      locations,
      landmarks,
      suggestedDestination,
    };
  }

  /**
   * Classify image for travel content organization
   */
  async classifyForTravel(imageUrl: string): Promise<{
    category: string;
    subcategory: string;
    travelRelevance: number; // 0-100
    suggestedFolder: string;
  }> {
    const analysis = await this.analyzeImageFromUrl(imageUrl);

    // Determine travel relevance based on tags
    const travelCategories = [
      'location',
      'landmark',
      'nature',
      'architecture',
      'food',
      'activity',
    ];
    const travelTags = analysis.tags.filter((t) =>
      travelCategories.includes(t.category)
    );
    const travelRelevance = Math.min(
      100,
      travelTags.reduce((sum, t) => sum + t.confidence * 20, 0)
    );

    // Suggest folder based on primary category
    const folderMap: Record<ImageTagCategory, string> = {
      location: '目的地',
      landmark: '景点',
      nature: '自然风光',
      architecture: '建筑',
      food: '美食',
      activity: '活动',
      object: '其他',
      scene: '场景',
      style: '摄影',
      time: '时刻',
      weather: '天气',
      transport: '交通',
    };

    return {
      category: analysis.classification.primaryCategory,
      subcategory: analysis.classification.subcategory || '',
      travelRelevance,
      suggestedFolder:
        folderMap[analysis.classification.primaryCategory] || '其他',
    };
  }

  /**
   * Search for similar tags in existing tag database
   */
  async suggestRelatedTags(
    tags: string[],
    allTags: ImageTag[]
  ): Promise<ImageTag[]> {
    // Simple tag suggestion based on category matching
    const inputCategories = new Set<ImageTagCategory>();
    tags.forEach((tag) => {
      const found = allTags.find(
        (t) => t.name === tag || t.localized?.zh === tag
      );
      if (found) {
        inputCategories.add(found.category);
      }
    });

    // Return tags from same categories that aren't in input
    return allTags
      .filter(
        (t) =>
          inputCategories.has(t.category) &&
          !tags.includes(t.name) &&
          !tags.includes(t.localized?.zh || '')
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);
  }

  // Private methods

  private buildChinesePrompt(maxTags: number): string {
    return `分析这张图片，提取用于旅行应用的智能标签。请返回JSON格式：

{
  "tags": [
    {
      "name": "标签名称",
      "confidence": 0.0-1.0之间的置信度,
      "category": "location|landmark|nature|architecture|food|activity|object|scene|style|time|weather|transport",
      "localized": {
        "zh": "中文名称",
        "en": "English name"
      }
    }
  ],
  "location": {
    "name": "识别出的地点名称（如能识别）",
    "type": "city|country|region|landmark|unknown",
    "confidence": 0.0-1.0
  },
  "landmarks": [
    {
      "name": "景点名称",
      "confidence": 0.0-1.0,
      "description": "简短描述"
    }
  ],
  "classification": {
    "primaryCategory": "主要分类",
    "subcategory": "子分类",
    "description": "图片内容简述（20字以内）"
  },
  "qualityScore": 0-100,
  "suggestedCaption": "建议的图片说明（可用于社交分享）",
  "metadata": {
    "dominantColors": ["颜色1", "颜色2"],
    "isBlurry": false,
    "hasText": false,
    "hasFaces": false
  }
}

要求：
1. 最多返回${maxTags}个标签
2. 优先识别旅行相关内容（景点、地标、美食等）
3. 如果能识别出具体地点或景点，请填写location和landmarks
4. 标签按置信度从高到低排序
5. 只返回JSON，不要其他文字`;
  }

  private buildEnglishPrompt(maxTags: number): string {
    return `Analyze this image and extract smart tags for a travel application. Return JSON format:

{
  "tags": [
    {
      "name": "tag name",
      "confidence": 0.0-1.0 confidence score,
      "category": "location|landmark|nature|architecture|food|activity|object|scene|style|time|weather|transport",
      "localized": {
        "zh": "Chinese name",
        "en": "English name"
      }
    }
  ],
  "location": {
    "name": "Identified location name (if recognizable)",
    "type": "city|country|region|landmark|unknown",
    "confidence": 0.0-1.0
  },
  "landmarks": [
    {
      "name": "Landmark name",
      "confidence": 0.0-1.0,
      "description": "Brief description"
    }
  ],
  "classification": {
    "primaryCategory": "Primary category",
    "subcategory": "Subcategory",
    "description": "Brief image description (under 20 words)"
  },
  "qualityScore": 0-100,
  "suggestedCaption": "Suggested caption for social sharing",
  "metadata": {
    "dominantColors": ["color1", "color2"],
    "isBlurry": false,
    "hasText": false,
    "hasFaces": false
  }
}

Requirements:
1. Return up to ${maxTags} tags
2. Prioritize travel-related content (attractions, landmarks, food, etc.)
3. Fill location and landmarks if specific places are recognizable
4. Sort tags by confidence (highest first)
5. Return ONLY JSON, no additional text`;
  }

  private parseAnalysisResult(
    response: string,
    language: 'zh' | 'en'
  ): ImageAnalysisResult {
    interface ParsedTag {
      name?: string;
      confidence?: number;
      category?: string;
      localized?: { zh?: string; en?: string };
    }

    interface ParsedLandmark {
      name?: string;
      confidence?: number;
      description?: string;
    }

    interface ParsedResult {
      tags?: ParsedTag[];
      location?: {
        name?: string;
        type?: string;
        confidence?: number;
      };
      landmarks?: ParsedLandmark[];
      classification?: {
        primaryCategory?: string;
        subcategory?: string;
        description?: string;
      };
      qualityScore?: number;
      suggestedCaption?: string;
      metadata?: {
        dominantColors?: string[];
        aspectRatio?: string;
        isBlurry?: boolean;
        hasText?: boolean;
        hasFaces?: boolean;
      };
    }

    const defaultResult: ImageAnalysisResult = {
      tags: [],
      classification: {
        primaryCategory: 'object',
        description: language === 'zh' ? '未能识别图片内容' : 'Unable to identify image content',
      },
      qualityScore: 50,
    };

    const { data: parsed, success, error } = parseJsonSafely<ParsedResult>(
      response,
      { tags: [] }
    );

    if (!success) {
      ollamaLogger.warn('Failed to parse image analysis', { error });
      return defaultResult;
    }

    // Validate and normalize tags
    const validCategories: ImageTagCategory[] = [
      'location',
      'landmark',
      'nature',
      'architecture',
      'food',
      'activity',
      'object',
      'scene',
      'style',
      'time',
      'weather',
      'transport',
    ];

    const tags: ImageTag[] = (parsed.tags || [])
      .filter(
        (t: ParsedTag) =>
          t &&
          t.name &&
          typeof t.confidence === 'number' &&
          t.confidence > 0.1
      )
      .map((t: ParsedTag) => ({
        name: String(t.name).trim(),
        confidence: Math.min(1, Math.max(0, Number(t.confidence))),
        category: validCategories.includes(t.category as ImageTagCategory)
          ? (t.category as ImageTagCategory)
          : 'object',
        localized: t.localized,
      }))
      .sort((a: ImageTag, b: ImageTag) => b.confidence - a.confidence);

    const result: ImageAnalysisResult = {
      tags,
      classification: {
        primaryCategory:
          (parsed.classification?.primaryCategory as ImageTagCategory) ||
          (tags.length > 0 ? tags[0].category : 'object'),
        subcategory: parsed.classification?.subcategory,
        description:
          parsed.classification?.description ||
          (language === 'zh' ? '图片分析完成' : 'Image analysis complete'),
      },
      qualityScore: Math.min(
        100,
        Math.max(0, Number(parsed.qualityScore) || 50)
      ),
      suggestedCaption: parsed.suggestedCaption,
      metadata: parsed.metadata,
    };

    // Add location if available
    if (parsed.location?.name) {
      result.location = {
        name: String(parsed.location.name),
        type: (['city', 'country', 'region', 'landmark'].includes(
          parsed.location.type || ''
        )
          ? parsed.location.type
          : 'unknown') as 'city' | 'country' | 'region' | 'landmark' | 'unknown',
        confidence: Math.min(
          1,
          Math.max(0, Number(parsed.location.confidence) || 0.5)
        ),
      };
    }

    // Add landmarks if available
    if (Array.isArray(parsed.landmarks) && parsed.landmarks.length > 0) {
      result.landmarks = parsed.landmarks
        .filter((l: ParsedLandmark) => l && l.name)
        .map((l: ParsedLandmark) => ({
          name: String(l.name),
          confidence: Math.min(1, Math.max(0, Number(l.confidence) || 0.5)),
          description: l.description,
        }));
    }

    return result;
  }
}

// Singleton instance
let imageTaggingServiceInstance: ImageTaggingService | null = null;

export function getImageTaggingService(): ImageTaggingService {
  if (!imageTaggingServiceInstance) {
    imageTaggingServiceInstance = new ImageTaggingService();
  }
  return imageTaggingServiceInstance;
}

export default ImageTaggingService;
