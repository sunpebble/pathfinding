/**
 * Ollama AI Service
 * Provides content extraction and summarization using Gemma3 model
 */

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeout?: number;
}

export interface OllamaGenerateOptions {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  system?: string;
}

export interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface GuideExtraction {
  title: string;
  summary: string;
  highlights: string[];
  destinations: Array<{
    name: string;
    type: string;
    description: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  }>;
  tips: string[];
  bestTime: string;
  duration: string;
  budget: string;
  tags: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface ContentSummary {
  title: string;
  summary: string;
  keyPoints: string[];
  category: string;
  quality: number; // 0-100 quality score
}

const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: process.env.OLLAMA_BASE_URL || 'https://ol.svc.kunish.org',
  model: process.env.OLLAMA_MODEL || 'gemma3:latest',
  timeout: 120000,
};

/**
 * OllamaService - AI-powered content extraction and summarization
 */
export class OllamaService {
  private config: OllamaConfig;

  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if Ollama service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if the configured model is available
   */
  async isModelAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
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
   * Generate text completion using Ollama
   */
  async generate(
    prompt: string,
    options: OllamaGenerateOptions = {}
  ): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.3,
          top_p: options.top_p ?? 0.9,
          num_predict: options.max_tokens ?? 2048,
        },
        system: options.system,
      }),
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}`
      );
    }

    const result = (await response.json()) as OllamaResponse;
    return result.response;
  }

  /**
   * Extract structured information from travel guide content
   */
  async extractGuideContent(
    htmlContent: string,
    metadata?: {
      url?: string;
      platform?: string;
    }
  ): Promise<GuideExtraction> {
    const systemPrompt = `You are an expert travel content analyzer. Extract structured information from travel guides and articles.
Always respond with valid JSON. Be precise and accurate in your extractions.
Focus on actionable travel information that would help travelers plan their trips.`;

    const prompt = `Analyze the following travel guide content and extract structured information.

Content:
${htmlContent.slice(0, 15000)} ${htmlContent.length > 15000 ? '... (content truncated)' : ''}

${metadata?.url ? `Source URL: ${metadata.url}` : ''}
${metadata?.platform ? `Platform: ${metadata.platform}` : ''}

Extract and return a JSON object with the following structure:
{
  "title": "Guide title",
  "summary": "A concise 2-3 sentence summary of the guide",
  "highlights": ["Key highlight 1", "Key highlight 2", ...],
  "destinations": [
    {
      "name": "Destination name",
      "type": "attraction|restaurant|hotel|scenic_spot|shopping|entertainment",
      "description": "Brief description",
      "coordinates": { "latitude": number, "longitude": number } // if mentioned
    }
  ],
  "tips": ["Practical travel tip 1", "Tip 2", ...],
  "bestTime": "Best time to visit",
  "duration": "Recommended trip duration",
  "budget": "Budget estimate or range",
  "tags": ["tag1", "tag2", ...],
  "sentiment": "positive|neutral|negative"
}

Return ONLY the JSON object, no additional text.`;

    const response = await this.generate(prompt, {
      system: systemPrompt,
      temperature: 0.2,
      max_tokens: 3000,
    });

    try {
      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      return JSON.parse(jsonMatch[0]) as GuideExtraction;
    } catch (error) {
      console.error('Failed to parse guide extraction:', error);
      // Return default structure on parse failure
      return {
        title: 'Unknown',
        summary: '',
        highlights: [],
        destinations: [],
        tips: [],
        bestTime: '',
        duration: '',
        budget: '',
        tags: [],
        sentiment: 'neutral',
      };
    }
  }

  /**
   * Generate a summary for content
   */
  async summarizeContent(
    content: string,
    maxLength: number = 500
  ): Promise<ContentSummary> {
    const systemPrompt = `You are a content summarization expert. Create concise, informative summaries that capture the essence of travel-related content.`;

    const prompt = `Summarize the following content in ${maxLength} characters or less.

Content:
${content.slice(0, 10000)}

Return a JSON object:
{
  "title": "A descriptive title",
  "summary": "The summary (max ${maxLength} chars)",
  "keyPoints": ["Key point 1", "Key point 2", ...],
  "category": "travel_guide|destination_review|food_guide|tips|itinerary|other",
  "quality": 0-100 // content quality score based on depth, accuracy, usefulness
}

Return ONLY the JSON object.`;

    const response = await this.generate(prompt, {
      system: systemPrompt,
      temperature: 0.3,
      max_tokens: 1000,
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      return JSON.parse(jsonMatch[0]) as ContentSummary;
    } catch {
      return {
        title: 'Untitled',
        summary: content.slice(0, maxLength),
        keyPoints: [],
        category: 'other',
        quality: 50,
      };
    }
  }

  /**
   * Extract POI (Point of Interest) mentions from content
   */
  async extractPOIs(content: string): Promise<
    Array<{
      name: string;
      type: string;
      description: string;
      address?: string;
      coordinates?: { latitude: number; longitude: number };
      rating?: number;
      priceRange?: string;
    }>
  > {
    const systemPrompt = `You are a location and POI extraction expert. Identify and extract all mentioned places, attractions, restaurants, hotels, and other points of interest from travel content.`;

    const prompt = `Extract all Points of Interest (POIs) mentioned in this content:

${content.slice(0, 12000)}

Return a JSON array of POIs:
[
  {
    "name": "POI name",
    "type": "attraction|restaurant|hotel|cafe|bar|shopping|museum|park|temple|beach|other",
    "description": "Brief description if available",
    "address": "Address if mentioned",
    "coordinates": { "latitude": number, "longitude": number },
    "rating": number (1-5 if mentioned),
    "priceRange": "budget|moderate|expensive|luxury"
  }
]

Return ONLY the JSON array.`;

    const response = await this.generate(prompt, {
      system: systemPrompt,
      temperature: 0.2,
      max_tokens: 3000,
    });

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }
      return JSON.parse(jsonMatch[0]);
    } catch {
      return [];
    }
  }

  /**
   * Generate image prompt for travel destination
   */
  async generateImagePrompt(
    destination: string,
    context?: string
  ): Promise<string> {
    const systemPrompt = `You are an expert at creating image generation prompts. Create detailed, visually descriptive prompts for travel destination images.`;

    const prompt = `Create an image generation prompt for: ${destination}
${context ? `Context: ${context}` : ''}

The prompt should describe:
- Scene composition and setting
- Lighting and atmosphere
- Key visual elements
- Style (photorealistic travel photography)

Return ONLY the image prompt, no explanation.`;

    const response = await this.generate(prompt, {
      system: systemPrompt,
      temperature: 0.7,
      max_tokens: 300,
    });

    return response.trim();
  }

  /**
   * Analyze content quality and relevance
   */
  async analyzeContentQuality(content: string): Promise<{
    overallScore: number;
    relevance: number;
    informativeness: number;
    readability: number;
    uniqueness: number;
    issues: string[];
    suggestions: string[];
  }> {
    const systemPrompt = `You are a content quality analyst specializing in travel content. Evaluate content based on relevance, informativeness, readability, and uniqueness.`;

    const prompt = `Analyze the quality of this travel content:

${content.slice(0, 8000)}

Return a JSON object:
{
  "overallScore": 0-100,
  "relevance": 0-100, // how relevant to travel/tourism
  "informativeness": 0-100, // depth of useful information
  "readability": 0-100, // clarity and structure
  "uniqueness": 0-100, // originality vs generic content
  "issues": ["Issue 1", ...], // problems found
  "suggestions": ["Suggestion 1", ...] // improvements
}

Return ONLY the JSON object.`;

    const response = await this.generate(prompt, {
      system: systemPrompt,
      temperature: 0.3,
      max_tokens: 1000,
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found');
      }
      return JSON.parse(jsonMatch[0]);
    } catch {
      return {
        overallScore: 50,
        relevance: 50,
        informativeness: 50,
        readability: 50,
        uniqueness: 50,
        issues: ['Unable to analyze content'],
        suggestions: [],
      };
    }
  }

  /**
   * Translate content to target language
   */
  async translateContent(
    content: string,
    targetLang: string = 'zh'
  ): Promise<string> {
    const langMap: Record<string, string> = {
      zh: 'Chinese (Simplified)',
      en: 'English',
      ja: 'Japanese',
      ko: 'Korean',
    };

    const prompt = `Translate the following travel content to ${langMap[targetLang] || targetLang}. 
Maintain the original formatting and preserve any place names in their original form with translations in parentheses.

Content:
${content}

Translation:`;

    return this.generate(prompt, {
      temperature: 0.3,
      max_tokens: content.length * 2,
    });
  }

  /**
   * Extract day-based itinerary structure from travel guide content
   */
  async extractDayBasedItinerary(
    content: string,
    destinations: string[] = []
  ): Promise<{
    summary: string;
    tips: string[];
    bestTime: string;
    duration: string;
    budget: string;
    days: Array<{
      dayNumber: number;
      theme: string;
      pois: Array<{
        name: string;
        type: string;
        description: string;
      }>;
    }>;
  }> {
    const systemPrompt = `你是一位专业的旅行行程规划师。从旅行攻略中提取结构化的按天行程信息。
始终返回有效的JSON格式。专注于提取实际可执行的旅行信息。`;

    const prompt = `分析以下旅行攻略，提取按天结构化的行程信息。

内容:
${content.slice(0, 12000)}

${destinations.length > 0 ? `目的地: ${destinations.join(', ')}` : ''}

返回JSON对象:
{
  "summary": "2-3句话的行程摘要",
  "tips": ["实用建议1", "实用建议2", ...],
  "bestTime": "最佳旅行时间",
  "duration": "建议天数",
  "budget": "预算范围",
  "days": [
    {
      "dayNumber": 1,
      "theme": "当日主题（如：市区游览、海边休闲）",
      "pois": [
        {
          "name": "景点/餐厅/酒店名称",
          "type": "attraction|restaurant|hotel|shopping|entertainment",
          "description": "简短描述或推荐理由"
        }
      ]
    }
  ]
}

如果内容中没有明确的天数划分，请根据提到的景点数量合理分配（每天3-5个景点）。
只返回JSON对象，不要其他文字。`;

    const response = await this.generate(prompt, {
      system: systemPrompt,
      temperature: 0.2,
      max_tokens: 4000,
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Failed to parse itinerary extraction:', error);
      return {
        summary: '',
        tips: [],
        bestTime: '',
        duration: '',
        budget: '',
        days: [],
      };
    }
  }
}

// Singleton instance
let ollamaServiceInstance: OllamaService | null = null;

export function getOllamaService(): OllamaService {
  if (!ollamaServiceInstance) {
    ollamaServiceInstance = new OllamaService();
  }
  return ollamaServiceInstance;
}

export default OllamaService;
