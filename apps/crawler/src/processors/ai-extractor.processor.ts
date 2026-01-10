/**
 * AI Extractor Processor
 * Orchestrates AI-powered content extraction, summarization, and image generation
 */

import type { TravelGuide } from '@pathfinding/crawler-types';
import type {
  ContentSummary,
  GuideExtraction,
} from '../services/ollama.service.js';

import { supabase, TABLES } from '../lib/supabase.js';
import { getComfyUIService } from '../services/comfyui.service.js';
import { getN8nService } from '../services/n8n.service.js';
import { getOllamaService } from '../services/ollama.service.js';

export interface AIProcessingResult {
  guideId: string;
  extraction: GuideExtraction;
  summary: ContentSummary;
  quality: {
    overallScore: number;
    relevance: number;
    informativeness: number;
  };
  images?: Array<{
    filename: string;
    url: string;
    type: 'hero' | 'thumbnail';
  }>;
  processingTime: number;
}

export interface AIProcessorOptions {
  extractContent?: boolean;
  generateSummary?: boolean;
  analyzeQuality?: boolean;
  generateImages?: boolean;
  notifyOnComplete?: boolean;
}

const DEFAULT_OPTIONS: AIProcessorOptions = {
  extractContent: true,
  generateSummary: true,
  analyzeQuality: true,
  generateImages: false, // Disabled by default as it's resource-intensive
  notifyOnComplete: true,
};

/**
 * Process a travel guide with AI
 */
export async function processGuideWithAI(
  guide: TravelGuide,
  options: AIProcessorOptions = {}
): Promise<AIProcessingResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  const ollamaService = getOllamaService();
  const n8nService = getN8nService();
  const comfyUIService = getComfyUIService();

  // Check AI service availability
  const ollamaAvailable = await ollamaService.healthCheck();
  if (!ollamaAvailable) {
    throw new Error('Ollama AI service is not available');
  }

  const result: AIProcessingResult = {
    guideId: guide.id,
    extraction: {
      title: guide.title || '',
      summary: '',
      highlights: [],
      destinations: [],
      tips: [],
      bestTime: '',
      duration: '',
      budget: '',
      tags: [],
      sentiment: 'neutral',
    },
    summary: {
      title: guide.title || '',
      summary: '',
      keyPoints: [],
      category: 'other',
      quality: 50,
    },
    quality: {
      overallScore: 50,
      relevance: 50,
      informativeness: 50,
    },
    processingTime: 0,
  };

  // Prepare content for processing
  const content = prepareContentForAI(guide);

  // Extract structured content
  if (opts.extractContent) {
    try {
      result.extraction = await ollamaService.extractGuideContent(content, {
        url: guide.source_url,
        platform: guide.source_platform,
      });
      console.warn(`[AI] Extracted content for guide: ${guide.title}`);
    } catch (error) {
      console.error('Content extraction failed:', error);
    }
  }

  // Generate summary
  if (opts.generateSummary) {
    try {
      result.summary = await ollamaService.summarizeContent(content);
      console.warn(`[AI] Generated summary for guide: ${guide.title}`);
    } catch (error) {
      console.error('Summary generation failed:', error);
    }
  }

  // Analyze quality
  if (opts.analyzeQuality) {
    try {
      const qualityAnalysis =
        await ollamaService.analyzeContentQuality(content);
      result.quality = {
        overallScore: qualityAnalysis.overallScore,
        relevance: qualityAnalysis.relevance,
        informativeness: qualityAnalysis.informativeness,
      };
      console.warn(
        `[AI] Quality score for guide "${guide.title}": ${qualityAnalysis.overallScore}`
      );
    } catch (error) {
      console.error('Quality analysis failed:', error);
    }
  }

  // Generate images
  if (opts.generateImages) {
    const comfyAvailable = await comfyUIService.healthCheck();
    if (comfyAvailable) {
      try {
        // Generate hero image based on extracted destinations
        const mainDestination =
          result.extraction.destinations[0]?.name ||
          guide.title ||
          'travel destination';
        const imagePrompt = await ollamaService.generateImagePrompt(
          mainDestination,
          result.extraction.summary
        );

        const images = await comfyUIService.generateTravelImage({
          prompt: imagePrompt,
          width: 1920,
          height: 1080,
          steps: 25,
        });

        result.images = images.map((img) => ({
          filename: img.filename,
          url: img.url,
          type: 'hero' as const,
        }));

        console.warn(
          `[AI] Generated ${images.length} images for guide: ${guide.title}`
        );
      } catch (error) {
        console.error('Image generation failed:', error);
      }
    }
  }

  result.processingTime = Date.now() - startTime;

  // Save AI extraction results to database
  await saveAIExtractionResults(guide.id, result);

  // Send notification
  if (opts.notifyOnComplete) {
    const n8nAvailable = await n8nService.healthCheck();
    if (n8nAvailable) {
      await n8nService.sendCrawlNotification({
        type: 'crawl_completed',
        jobId: guide.id,
        jobName: `AI Processing: ${guide.title}`,
        platform: guide.source_platform,
        status: 'completed',
        message: `AI processing completed for "${guide.title}" with quality score: ${result.quality.overallScore}`,
        statistics: {
          recordsExtracted: result.extraction.destinations.length,
          durationSeconds: Math.round(result.processingTime / 1000),
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  return result;
}

/**
 * Batch process multiple guides with AI
 */
export async function batchProcessGuidesWithAI(
  guides: TravelGuide[],
  options: AIProcessorOptions = {}
): Promise<AIProcessingResult[]> {
  const results: AIProcessingResult[] = [];

  for (const guide of guides) {
    try {
      const result = await processGuideWithAI(guide, options);
      results.push(result);
      // Add delay between processing to avoid overwhelming the AI service
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to process guide "${guide.title}":`, error);
    }
  }

  return results;
}

/**
 * Prepare guide content for AI processing
 */
function prepareContentForAI(guide: TravelGuide): string {
  const parts: string[] = [];

  if (guide.title) {
    parts.push(`Title: ${guide.title}`);
  }

  if (guide.content) {
    parts.push(`Content:\n${guide.content}`);
  } else if (guide.content_html) {
    // Strip HTML tags for AI processing
    const textContent = guide.content_html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    parts.push(`Content:\n${textContent}`);
  }

  if (guide.tags && guide.tags.length > 0) {
    parts.push(`Tags: ${guide.tags.join(', ')}`);
  }

  if (guide.author_name) {
    parts.push(`Author: ${guide.author_name}`);
  }

  if (guide.published_at) {
    parts.push(`Published: ${guide.published_at}`);
  }

  return parts.join('\n\n');
}

/**
 * Save AI extraction results to database
 */
async function saveAIExtractionResults(
  guideId: string,
  result: AIProcessingResult
): Promise<void> {
  if (!guideId) return;

  try {
    const { error } = await supabase
      .from(TABLES.TRAVEL_GUIDES)
      .update({
        ai_extraction: {
          extraction: result.extraction,
          summary: result.summary,
          quality: result.quality,
          processed_at: new Date().toISOString(),
          processing_time_ms: result.processingTime,
        },
        quality_score: result.quality.overallScore,
        updated_at: new Date().toISOString(),
      })
      .eq('id', guideId);

    if (error) {
      console.error('Failed to save AI extraction results:', error);
    }
  } catch (error) {
    console.error('Database error saving AI results:', error);
  }
}

/**
 * Generate images for guides that don't have them
 */
export async function generateMissingImages(
  limit: number = 10
): Promise<number> {
  const comfyUIService = getComfyUIService();
  const ollamaService = getOllamaService();

  const comfyAvailable = await comfyUIService.healthCheck();
  if (!comfyAvailable) {
    console.warn('ComfyUI service is not available');
    return 0;
  }

  // Get guides without images
  const { data: guides, error } = await supabase
    .from(TABLES.TRAVEL_GUIDES)
    .select('id, title, ai_extraction')
    .is('cover_image_url', null)
    .not('ai_extraction', 'is', null)
    .limit(limit);

  if (error || !guides) {
    console.error('Failed to fetch guides:', error);
    return 0;
  }

  let generatedCount = 0;

  for (const guide of guides) {
    try {
      const extraction = guide.ai_extraction as {
        extraction?: GuideExtraction;
      };
      const destination =
        extraction?.extraction?.destinations?.[0]?.name || guide.title;

      const imagePrompt = await ollamaService.generateImagePrompt(
        destination,
        extraction?.extraction?.summary
      );

      const images = await comfyUIService.generateTravelImage({
        prompt: imagePrompt,
        width: 1920,
        height: 1080,
      });

      if (images.length > 0) {
        await supabase
          .from(TABLES.TRAVEL_GUIDES)
          .update({
            hero_image_url: images[0].url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', guide.id);

        generatedCount++;
        console.warn(`[AI] Generated image for guide: ${guide.title}`);
      }

      // Delay between generations
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.error(
        `Failed to generate image for guide "${guide.title}":`,
        error
      );
    }
  }

  return generatedCount;
}

/**
 * Reprocess guides with low quality scores
 */
export async function reprocessLowQualityGuides(
  minScore: number = 30,
  limit: number = 20
): Promise<number> {
  const { data: guides, error } = await supabase
    .from(TABLES.TRAVEL_GUIDES)
    .select('*')
    .lt('quality_score', minScore)
    .order('quality_score', { ascending: true })
    .limit(limit);

  if (error || !guides) {
    console.error('Failed to fetch low quality guides:', error);
    return 0;
  }

  let reprocessedCount = 0;

  for (const guide of guides) {
    try {
      await processGuideWithAI(guide as TravelGuide, {
        extractContent: true,
        generateSummary: true,
        analyzeQuality: true,
        generateImages: false,
        notifyOnComplete: false,
      });
      reprocessedCount++;
    } catch (error) {
      console.error(`Failed to reprocess guide "${guide.title}":`, error);
    }
  }

  return reprocessedCount;
}

export default {
  processGuideWithAI,
  batchProcessGuidesWithAI,
  generateMissingImages,
  reprocessLowQualityGuides,
};
